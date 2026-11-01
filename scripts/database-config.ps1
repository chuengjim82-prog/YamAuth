# Shared database config for new-project.ps1 and init-db.ps1.
# Source of truth: scripts/database.local.json (generated at project copy time).

function Build-SqlConnectionString {
    param(
        [string]$Server,
        [int]$Port,
        [string]$Database,
        [string]$User,
        [string]$Password
    )
    return "Server=$Server,$Port;Database=$Database;User Id=$User;Password=$Password;TrustServerCertificate=True;"
}

function New-DatabaseConfigObject {
    param(
        [string]$ProjectName,
        [string]$Server = '127.0.0.1',
        [int]$Port = 1433,
        [string]$User = 'sa',
        [string]$Password = 'ChangeMe',
        [string]$DbBase,
        [string]$DbSecondary,
        [string]$AdminUser = 'admin',
        [string]$AdminPassword = 'Admin@123'
    )
    [pscustomobject]@{
        projectName   = $ProjectName
        server        = $Server
        port          = $Port
        user          = $User
        password      = $Password
        dbBase        = $DbBase
        dbSecondary   = $DbSecondary
        adminUser     = $AdminUser
        adminPassword = $AdminPassword
    }
}

function Write-ProjectDatabaseConfig {
    param(
        [string]$RepoRoot,
        [pscustomobject]$Config,
        [switch]$WhatIf
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $name = $Config.projectName

    $localPath = Join-Path $RepoRoot 'scripts\database.local.json'
    $json = ($Config | Select-Object server, port, user, password, dbBase, dbSecondary, adminUser, adminPassword | ConvertTo-Json -Depth 5)
    if ($WhatIf) { Write-Host "[WhatIf] write $localPath" }
    else { [IO.File]::WriteAllText($localPath, $json, $utf8NoBom) }

    $baseConn = Build-SqlConnectionString -Server $Config.server -Port $Config.port -Database $Config.dbBase -User $Config.user -Password $Config.password
    $secondaryConn = Build-SqlConnectionString -Server $Config.server -Port $Config.port -Database $Config.dbSecondary -User $Config.user -Password $Config.password

    $codeGenPath = Join-Path $RepoRoot "src\$name.CodeGen\appsettings.json"
    $codeGenObj = @{
        Databases = @(
            @{ Name = $Config.dbBase; ConnectionString = $baseConn },
            @{ Name = $Config.dbSecondary; ConnectionString = $secondaryConn }
        )
        Output = @{
            EntityProject = "src/$name.Entity"
            RepositoryProject = "src/$name.Repository"
            ServiceProject = "src/$name.Service"
            ApiProject = "src/$name.Api"
        }
    }
    if ($WhatIf) { Write-Host "[WhatIf] write $codeGenPath" }
    else { [IO.File]::WriteAllText($codeGenPath, ($codeGenObj | ConvertTo-Json -Depth 5), $utf8NoBom) }

    $apiDevPath = Join-Path $RepoRoot "src\$name.Api\appsettings.Development.json"
    $apiDevObj = @{
        Db = @{
            Base = $baseConn
            Bzss = $secondaryConn
            LogSql = $true
        }
        Jwt = @{
            SecretKey = 'ChangeMe-At-Least-32-Bytes-Long-For-HS256-Algorithm!!'
        }
        Swagger = @{ Enabled = $true }
        Rbac = @{ SyncPermissionsOnStartup = $true }
        Serilog = @{ MinimumLevel = @{ Default = 'Debug' } }
    }
    if ($WhatIf) { Write-Host "[WhatIf] write $apiDevPath" }
    else { [IO.File]::WriteAllText($apiDevPath, ($apiDevObj | ConvertTo-Json -Depth 6), $utf8NoBom) }
}

function Get-ProjectDatabaseConfig {
    param(
        [string]$RepoRoot,
        [string]$ProjectName,
        [hashtable]$CliOverrides = @{}
    )
    $localPath = Join-Path $RepoRoot 'scripts\database.local.json'
    if (-not (Test-Path -LiteralPath $localPath)) {
        throw @"
Missing scripts/database.local.json
Copy scripts/database.local.json.example to scripts/database.local.json and edit,
or re-run new-project.ps1 with -DbServer / -DbUser / -DbPassword / -DbBase / -DbSecondary.
"@
    }

    $cfg = Get-Content -LiteralPath $localPath -Raw | ConvertFrom-Json

    $resolved = [ordered]@{
        ProjectName   = $ProjectName
        Server        = if ($CliOverrides.Server) { $CliOverrides.Server } else { $cfg.server }
        Port          = if ($CliOverrides.Port) { [int]$CliOverrides.Port } else { [int]$cfg.port }
        User          = if ($CliOverrides.User) { $CliOverrides.User } else { $cfg.user }
        Password      = if ($CliOverrides.Password) { $CliOverrides.Password } elseif ($cfg.password) { $cfg.password } else { $env:INIT_DB_PASSWORD }
        DbBase        = if ($CliOverrides.DbBase) { $CliOverrides.DbBase } else { $cfg.dbBase }
        DbSecondary   = if ($CliOverrides.DbSecondary) { $CliOverrides.DbSecondary } else { $cfg.dbSecondary }
        AdminUser     = if ($CliOverrides.AdminUser) { $CliOverrides.AdminUser } elseif ($cfg.adminUser) { $cfg.adminUser } else { 'admin' }
        AdminPassword = if ($CliOverrides.AdminPassword) { $CliOverrides.AdminPassword } elseif ($cfg.adminPassword) { $cfg.adminPassword } else { 'Admin@123' }
    }

    if ([string]::IsNullOrWhiteSpace($resolved.Password)) {
        throw 'Database password is empty. Set password in scripts/database.local.json, or pass -Password / INIT_DB_PASSWORD.'
    }

    return [pscustomobject]$resolved
}
