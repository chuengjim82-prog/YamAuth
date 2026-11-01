# Initializes SQL Server databases (create DB + run SQL scripts from init-db.manifest.json).

# Config source: scripts/database.local.json (written by new-project.ps1).

# Run from repository root:

#   .\scripts\init-db.ps1

#   .\scripts\init-db.ps1 -StartDocker

# CLI params override database.local.json when provided.

param(

    [string]$Server,

    [int]$Port = 0,

    [string]$User,

    [string]$Password,

    [string]$DbBase,

    [string]$DbSecondary,

    [string]$ProjectName,

    [string]$AdminUser,

    [string]$AdminPassword,

    [switch]$StartDocker,

    [switch]$SkipSql,

    [switch]$SkipAdminPatch,

    [switch]$SyncConfig,

    [switch]$WhatIf

)



$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

. (Join-Path $PSScriptRoot 'database-config.ps1')

function Get-ProjectNameFromSln {

    param([string]$Root)

    $sln = Get-ChildItem -LiteralPath $Root -Filter '*.sln' -File | Select-Object -First 1

    if (-not $sln) { $sln = Get-ChildItem -LiteralPath (Join-Path $Root 'src') -Filter '*.sln' -File | Select-Object -First 1 }

    if (-not $sln) { throw "No .sln found under $Root" }

    return [IO.Path]::GetFileNameWithoutExtension($sln.Name)

}



function Invoke-SqlCmdQuery {

    param(

        [string]$SqlCmd,

        [string]$Server,

        [int]$Port,

        [string]$User,

        [string]$Password,

        [string]$Query,

        [string]$Database = 'master'

    )

    & $SqlCmd -S "$Server,$Port" -U $User -P $Password -d $Database -Q $Query -I -x -b -C 2>$null | Out-Null

    return $LASTEXITCODE -eq 0

}



function Find-SqlCmdPath {

    $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue

    if ($cmd) { return $cmd.Source }

    $candidates = @(

        "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",

        "${env:ProgramFiles}\Microsoft SQL Server\160\Tools\Binn\SQLCMD.EXE",

        "${env:ProgramFiles(x86)}\Microsoft SQL Server\160\Tools\Binn\SQLCMD.EXE"

    )

    foreach ($p in $candidates) {

        if (Test-Path -LiteralPath $p) { return $p }

    }

    return $null

}



function Wait-SqlServer {

    param(

        [string]$SqlCmd,

        [string]$Server,

        [int]$Port,

        [string]$User,

        [string]$Password,

        [int]$TimeoutSeconds = 120

    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {

        if (Invoke-SqlCmdQuery -SqlCmd $SqlCmd -Server $Server -Port $Port -User $User -Password $Password -Query 'SELECT 1' -Database 'master') {

            return

        }

        Start-Sleep -Seconds 2

    }

    throw "SQL Server not ready on ${Server}:${Port} after ${TimeoutSeconds}s (connected via master)"

}



function Test-SqlServerMaster {

    param(

        [string]$SqlCmd,

        [string]$Server,

        [int]$Port,

        [string]$User,

        [string]$Password

    )

    if (-not (Invoke-SqlCmdQuery -SqlCmd $SqlCmd -Server $Server -Port $Port -User $User -Password $Password -Query 'SELECT 1' -Database 'master')) {

        throw @"

Cannot connect to SQL Server (${Server}:${Port}) via master.

- Target databases do NOT need to exist beforehand; init-db creates them.

- If login default database is missing, we always connect to master first.

- Check -Server / -Port / -User / -Password, or firewalls on remote hosts.

"@

    }

}



if (-not $ProjectName) {

    $ProjectName = Get-ProjectNameFromSln $repoRoot

}



$cliOverrides = @{}

if ($PSBoundParameters.ContainsKey('Server')) { $cliOverrides.Server = $Server }

if ($PSBoundParameters.ContainsKey('Port') -and $Port -gt 0) { $cliOverrides.Port = $Port }

if ($PSBoundParameters.ContainsKey('User')) { $cliOverrides.User = $User }

if ($PSBoundParameters.ContainsKey('Password')) { $cliOverrides.Password = $Password }

elseif (-not $Password) { $cliOverrides.Password = $env:INIT_DB_PASSWORD }

if ($PSBoundParameters.ContainsKey('DbBase')) { $cliOverrides.DbBase = $DbBase }

if ($PSBoundParameters.ContainsKey('DbSecondary')) { $cliOverrides.DbSecondary = $DbSecondary }

if ($PSBoundParameters.ContainsKey('AdminUser')) { $cliOverrides.AdminUser = $AdminUser }

if ($PSBoundParameters.ContainsKey('AdminPassword')) { $cliOverrides.AdminPassword = $AdminPassword }



$dbCfg = Get-ProjectDatabaseConfig -RepoRoot $repoRoot -ProjectName $ProjectName -CliOverrides $cliOverrides

$Server = $dbCfg.Server

$Port = $dbCfg.Port

$User = $dbCfg.User

$Password = $dbCfg.Password

$DbBase = $dbCfg.DbBase

$DbSecondary = $dbCfg.DbSecondary

$AdminUser = $dbCfg.AdminUser

$AdminPassword = $dbCfg.AdminPassword



$dbInitProject = Join-Path $repoRoot "src\$ProjectName.DbInit\$ProjectName.DbInit.csproj"

if (-not (Test-Path -LiteralPath $dbInitProject)) {

    throw "DbInit project not found: $dbInitProject"

}



Write-Host "Repository : $repoRoot"

Write-Host "Project    : $ProjectName"

Write-Host "Config     : scripts/database.local.json"

Write-Host "Server     : ${Server}:${Port}"

Write-Host "DbBase     : $DbBase"

Write-Host "DbSecondary: $DbSecondary"

Write-Host "Admin      : $AdminUser"

Write-Host "Scripts    : init_db.sql + init_db.seed.sql (+ secondary)"

Write-Host "Note       : target databases will be created if missing (via master)"

Write-Host ""



$sqlcmd = Find-SqlCmdPath



if ($StartDocker -and -not $WhatIf) {

    $compose = Join-Path $repoRoot 'deploy\docker-compose.yml'

    if (-not (Test-Path -LiteralPath $compose)) { throw "Missing $compose" }

    $env:MSSQL_SA_PASSWORD = $Password

    Push-Location $repoRoot

    docker compose -f deploy/docker-compose.yml --profile with-db up -d sqlserver

    Pop-Location

    Write-Host '[docker] sqlserver started (profile with-db)'

}



if ($StartDocker -and -not $WhatIf) {

    if (-not $sqlcmd) { throw 'sqlcmd is required when using -StartDocker' }

    Wait-SqlServer -SqlCmd $sqlcmd -Server $Server -Port $Port -User $User -Password $Password

}

elseif (-not $WhatIf -and $sqlcmd) {

    Test-SqlServerMaster -SqlCmd $sqlcmd -Server $Server -Port $Port -User $User -Password $Password

    Write-Host '[sql] master connection OK'

}



$dbInitArgs = @(

    '--project', $dbInitProject,

    '--',

    '--server', $Server,

    '--port', $Port,

    '--user', $User,

    '--password', $Password,

    '--db-base', $DbBase,

    '--db-secondary', $DbSecondary,

    '--admin-user', $AdminUser,

    '--admin-password', $AdminPassword,

    '--scripts-dir', $PSScriptRoot

)

if ($SkipSql) { $dbInitArgs += '--skip-sql' }

if ($SkipAdminPatch) { $dbInitArgs += '--skip-admin-patch' }



if ($WhatIf) {

    Write-Host "[WhatIf] dotnet run $($dbInitArgs -join ' ')"

}

else {

    dotnet run @dbInitArgs

    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

}



if ($SyncConfig) {

    $syncConfig = New-DatabaseConfigObject `

        -ProjectName $ProjectName `

        -Server $Server -Port $Port -User $User -Password $Password `

        -DbBase $DbBase -DbSecondary $DbSecondary `

        -AdminUser $AdminUser -AdminPassword $AdminPassword

    if ($WhatIf) { Write-Host '[WhatIf] sync scripts/database.local.json + CodeGen + Api Development' }

    else { Write-ProjectDatabaseConfig -RepoRoot $repoRoot -Config $syncConfig }

}



Write-Host ''

Write-Host 'Done. Next:'

Write-Host "  .\scripts\run-api.ps1"
Write-Host "  .\scripts\dev-web.ps1"

Write-Host "  Login: $AdminUser / $AdminPassword"

Write-Host ''

