# 从 YamAuth 脚手架复制并重命名，生成新项目。
# 用法（在模板仓库根目录）：
#   .\scripts\new-project.ps1 -Name AcmeShop -OutputPath E:\Sources\AcmeShop
#   .\scripts\new-project.ps1 -Name AcmeShop -OutputPath E:\Sources\AcmeShop `
#       -DbServer 192.168.1.10 -DbUser sa -DbPassword '***' -DbBase AcmeShop1Base -DbSecondary AcmeShop2Data
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Z][A-Za-z0-9]+$')]
    [string]$Name,

    [Parameter(Mandatory)]
    [string]$OutputPath,

    [string]$DbBase,
    [string]$DbSecondary,
    [string]$DbServer = '127.0.0.1',
    [int]$DbPort = 1433,
    [string]$DbUser = 'sa',
    [string]$DbPassword = 'ChangeMe',
    [string]$AdminUser = 'admin',
    [string]$AdminPassword = 'Admin@123',
    [string]$WebPackage,
    [string]$DockerPrefix,

    [switch]$Force,
    [switch]$InitGit,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'database-config.ps1')

function ConvertTo-KebabCase([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return $value }
    $s = [regex]::Replace($value, '([a-z0-9])([A-Z])', '$1-$2')
    return $s.ToLowerInvariant()
}

function Test-PathExcluded([string]$relativePath, [string[]]$patterns) {
    $normalized = $relativePath -replace '\\', '/'
    if ($normalized -match '(^|/)\.vs(/|$)') { return $true }
    if ($normalized -match '(^|/)_template_test(/|$)') { return $true }
    if ($normalized -match '(^|/)_buildcheck(/|$)') { return $true }
    if ($normalized -match '(^|/)(bin|obj|node_modules|dist|logs|TestResults|coverage|terminals|agent-transcripts)(/|$)') { return $true }
    foreach ($pattern in $patterns) {
        $p = $pattern.Trim() -replace '\\', '/'
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        if ($p -eq '.git' -and ($normalized -eq '.git' -or $normalized.StartsWith('.git/'))) { return $true }
        if ($p.EndsWith('/**')) {
            $prefix = $p.Substring(0, $p.Length - 3).TrimEnd('/')
            if ($normalized -eq $prefix -or $normalized.StartsWith("$prefix/")) { return $true }
        }
        elseif ($p -match '^\*\*/(.+)/\*\*$') {
            $segment = $Matches[1]
            if ($normalized -match "(^|/)$([regex]::Escape($segment))(/|$)") { return $true }
        }
        elseif ($p.StartsWith('**/')) {
            $suffix = $p.Substring(3)
            if ($normalized.EndsWith("/$suffix") -or $normalized -eq $suffix) { return $true }
        }
        elseif ($normalized -eq $p) { return $true }
    }
    return $false
}

function Copy-TemplateTree([string]$sourceRoot, [string]$destRoot, [string[]]$excludePatterns) {
    $items = Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force
    foreach ($item in $items) {
        $rel = $item.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
        if ([string]::IsNullOrWhiteSpace($rel)) { continue }
        if (Test-PathExcluded $rel $excludePatterns) { continue }

        $target = Join-Path $destRoot $rel
        if ($item.PSIsContainer) {
            if (-not (Test-Path -LiteralPath $target)) {
                if ($WhatIf) { Write-Host "[WhatIf] mkdir $target" }
                else { New-Item -ItemType Directory -Path $target -Force | Out-Null }
            }
        }
        else {
            $parent = Split-Path -Parent $target
            if (-not (Test-Path -LiteralPath $parent)) {
                if ($WhatIf) { Write-Host "[WhatIf] mkdir $parent" }
                else { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            }
            if ($WhatIf) { Write-Host "[WhatIf] copy $($item.FullName)" }
            else {
                try { Copy-Item -LiteralPath $item.FullName -Destination $target -Force -ErrorAction Stop }
                catch { Write-Warning "Skip locked file: $rel" }
            }
        }
    }
}

function Rename-ProjectPaths([string]$root, [hashtable]$pathReplacements) {
    $ordered = $pathReplacements.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending
    $files = Get-ChildItem -LiteralPath $root -Recurse -Force -File | Sort-Object { $_.FullName.Length } -Descending
    $dirs = Get-ChildItem -LiteralPath $root -Recurse -Force -Directory | Sort-Object { $_.FullName.Length } -Descending
    foreach ($item in ($files + $dirs)) {
        $name = $item.Name
        $newName = $name
        foreach ($rep in $ordered) {
            if ($newName.Contains($rep.Key)) {
                $newName = $newName.Replace($rep.Key, $rep.Value)
            }
        }
        if ($newName -eq $name) { continue }
        $parent = if ($item.PSIsContainer) { $item.Parent.FullName } else { $item.DirectoryName }
        if ([string]::IsNullOrWhiteSpace($parent)) { continue }
        if ($WhatIf) { Write-Host "[WhatIf] rename $($item.FullName) -> $newName" }
        else { Rename-Item -LiteralPath $item.FullName -NewName $newName -Force }
    }
}

function Update-TextFile([string]$filePath, [array]$textReplacements) {
    $ext = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $textExtensions = @(
        '.cs', '.csproj', '.sln', '.json', '.md', '.yml', '.yaml', '.ts', '.vue', '.ps1', '.sh',
        '.props', '.gitignore', '.dockerignore', '.env', '.example', '.conf', '.xml', '.txt', '.stub.md'
    )
    $name = [IO.Path]::GetFileName($filePath)
    if ($name -eq 'Dockerfile.api' -or $name -eq 'Dockerfile.web' -or $name -eq 'nginx.conf') { }
    elseif ($textExtensions -notcontains $ext -and $name -notmatch '^(Dockerfile|\.env)') { return }

    try {
        $bytes = [IO.File]::ReadAllBytes($filePath)
        if ($bytes -contains 0) { return }
        $content = [Text.Encoding]::UTF8.GetString($bytes)
    }
    catch { return }

    $original = $content
    foreach ($rep in $textReplacements) {
        $content = $content.Replace($rep.Old, $rep.New)
    }
    if ($content -ne $original) {
        if ($WhatIf) { Write-Host "[WhatIf] patch $filePath" }
        else {
            $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
        }
    }
}

$templateRoot = Split-Path -Parent $PSScriptRoot
$tokensPath = Join-Path $templateRoot 'template\template.tokens.json'
if (-not (Test-Path $tokensPath)) { throw "Missing $tokensPath" }
$tokens = Get-Content $tokensPath -Raw | ConvertFrom-Json
$src = $tokens.source

$kebab = if ($DockerPrefix) { $DockerPrefix.ToLowerInvariant() } else { ConvertTo-KebabCase $Name }
$webPkg = if ($WebPackage) { $WebPackage.ToLowerInvariant() } else { "$kebab-web" }
$dbBaseName = if ($DbBase) { $DbBase } else { "${Name}1Base" }
$dbSecondaryName = if ($DbSecondary) { $DbSecondary } else { "${Name}2Bzss" }

$dest = [IO.Path]::GetFullPath($OutputPath)
if ($dest.StartsWith($templateRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputPath must be outside the template repository. Example: E:\Sources\$Name"
}
if ((Test-Path -LiteralPath $dest) -and -not $Force) {
    throw "Output path already exists: $dest (use -Force to overwrite)"
}

Write-Host "Template : $templateRoot"
Write-Host "Project  : $Name"
Write-Host "Output   : $dest"
Write-Host "DbBase   : $dbBaseName"
Write-Host "DbSecond : $dbSecondaryName"
Write-Host "DbServer : ${DbServer}:${DbPort} ($DbUser)"
Write-Host "Web pkg  : $webPkg"
Write-Host ""

$excludePatterns = Get-Content (Join-Path $templateRoot 'template\exclude.txt') |
    Where-Object { $_ -and -not $_.TrimStart().StartsWith('#') }

if ((Test-Path -LiteralPath $dest) -and $Force -and -not $WhatIf) {
    Remove-Item -LiteralPath $dest -Recurse -Force
}

if (-not $WhatIf) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

Copy-TemplateTree -sourceRoot $templateRoot -destRoot $dest -excludePatterns $excludePatterns

$pathReplacements = @{}
$pathReplacements[$src.dbSecondary] = $dbSecondaryName
$pathReplacements[$src.dbBase] = $dbBaseName
$pathReplacements[$src.projectName] = $Name

Rename-ProjectPaths -root $dest -pathReplacements $pathReplacements

$oldSln = Join-Path $dest "$($src.projectName).sln"
$newSln = Join-Path $dest "$Name.sln"
if ((Test-Path -LiteralPath $oldSln) -and -not $WhatIf) {
    Rename-Item -LiteralPath $oldSln -NewName "$Name.sln" -Force
}
elseif ($WhatIf -and (Test-Path -LiteralPath $oldSln)) {
    Write-Host "[WhatIf] rename $oldSln -> $newSln"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$textReplacements = @(
    @{ Old = $src.dbSecondary; New = $dbSecondaryName }
    @{ Old = $src.dbBase; New = $dbBaseName }
    @{ Old = $src.webPackage; New = $webPkg }
    @{ Old = "$($src.dockerPrefix)-web"; New = "$kebab-web" }
    @{ Old = "$($src.dockerPrefix)-api"; New = "$kebab-api" }
    @{ Old = "$($src.dockerPrefix)_mssql"; New = "${kebab}_mssql" }
    @{ Old = $src.dockerPrefix; New = $kebab }
    @{ Old = $src.jwtIssuer; New = $Name }
    @{ Old = $src.jwtAudience; New = "$Name.Web" }
    @{ Old = $src.smtpFromName; New = $Name }
    @{ Old = $src.projectName; New = $Name }
)

$files = Get-ChildItem -LiteralPath $dest -Recurse -File -Force
foreach ($file in $files) {
    $rel = $file.FullName.Substring($dest.Length).TrimStart('\', '/')
    if (Test-PathExcluded $rel $excludePatterns) { continue }
    Update-TextFile -filePath $file.FullName -textReplacements $textReplacements
}

$dbConfig = New-DatabaseConfigObject `
    -ProjectName $Name `
    -Server $DbServer `
    -Port $DbPort `
    -User $DbUser `
    -Password $DbPassword `
    -DbBase $dbBaseName `
    -DbSecondary $dbSecondaryName `
    -AdminUser $AdminUser `
    -AdminPassword $AdminPassword
Write-ProjectDatabaseConfig -RepoRoot $dest -Config $dbConfig -WhatIf:$WhatIf

$readmeStub = Join-Path $templateRoot 'template\README.stub.md'
$readmeDest = Join-Path $dest 'README.md'
if (Test-Path -LiteralPath $readmeStub) {
    $readme = [IO.File]::ReadAllText($readmeStub, $utf8NoBom)
    $readme = $readme.Replace('{{ProjectName}}', $Name)
    $readme = $readme.Replace('{{DbBase}}', $dbBaseName)
    $readme = $readme.Replace('{{DbSecondary}}', $dbSecondaryName)
    $readme = $readme.Replace('{{GeneratedDate}}', (Get-Date -Format 'yyyy-MM-dd'))
    if ($WhatIf) { Write-Host "[WhatIf] write $readmeDest" }
    else { [IO.File]::WriteAllText($readmeDest, $readme, $utf8NoBom) }
}

$docsReadme = Join-Path $dest 'docs\README.md'
if (Test-Path -LiteralPath $docsReadme) {
    $doc = [IO.File]::ReadAllText($docsReadme, $utf8NoBom)
    $doc = $doc -replace '(?m)^>[^\r\n]*\r?\n', ''
    $bannerStub = Join-Path $templateRoot 'template\docs-banner.stub.md'
    if (Test-Path -LiteralPath $bannerStub) {
        $banner = [IO.File]::ReadAllText($bannerStub, $utf8NoBom)
        $banner = $banner.Replace('{{ProjectName}}', $Name)
        $banner = $banner.Replace('{{GeneratedDate}}', (Get-Date -Format 'yyyy-MM-dd'))
    }
    else {
        $banner = "> Project: $Name (from YamAuth scaffold $(Get-Date -Format 'yyyy-MM-dd')).`r`n`r`n"
    }
    if (-not $doc.StartsWith('> **项目**') -and -not $doc.StartsWith('> Project:')) {
        if ($WhatIf) { Write-Host "[WhatIf] prepend banner to docs/README.md" }
        else { [IO.File]::WriteAllText($docsReadme, $banner + $doc.TrimStart(), $utf8NoBom) }
    }
}

if ($InitGit -and -not $WhatIf) {
    Push-Location $dest
    git init | Out-Null
    git add -A
    git commit -m "Initial commit from YamAuth scaffold template ($Name)"
    Pop-Location
    Write-Host "Git repository initialized."
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. cd $dest"
Write-Host "  2. .\scripts\init-db.ps1                    # DB config: scripts/database.local.json"
Write-Host "     .\scripts\init-db.ps1 -StartDocker      # optional: local SQL in Docker"
Write-Host "  3. .\scripts\test-backend.ps1         # or .\scripts\test-backend.cmd"
Write-Host "  4. .\scripts\run-api.ps1              # or .\scripts\run-api.cmd"
Write-Host "  5. .\scripts\dev-web.ps1              # or .\scripts\dev-web.cmd"
Write-Host ""
Write-Host "See docs/template-guide.md for details."
