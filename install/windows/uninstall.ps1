[CmdletBinding()]
param(
  [string]$InstallRoot = "$env:LOCALAPPDATA\BlueTanuki\app",
  [string]$DataRoot = "$env:APPDATA\BlueTanuki",
  [switch]$Purge,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function Normalize-Path($Path) {
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-SafeTarget($Target, $Label) {
  $normalized = Normalize-Path $Target
  $root = [System.IO.Path]::GetPathRoot($normalized)
  $trimmed = $normalized.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $rootTrimmed = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $denied = @(
    (Normalize-Path $env:USERPROFILE),
    (Normalize-Path $env:LOCALAPPDATA),
    (Normalize-Path $env:APPDATA)
  )

  if ($trimmed -eq $rootTrimmed) {
    Fail "$Label points to a filesystem root: $normalized"
  }
  foreach ($path in $denied) {
    $deniedTrimmed = $path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    if ($trimmed -eq $deniedTrimmed) {
      Fail "$Label points to a broad user directory: $normalized"
    }
  }
  return $normalized
}

function Remove-Target($Target, $Label) {
  $safe = Assert-SafeTarget $Target $Label
  if (-not (Test-Path -LiteralPath $safe)) {
    Write-Host "Skip missing ${Label}: $safe"
    return
  }
  if ($DryRun) {
    Write-Host "Would remove ${Label}: $safe"
    return
  }
  Remove-Item -LiteralPath $safe -Recurse -Force
  Write-Host "Removed ${Label}: $safe"
}

function Remove-FileIfPresent($Path, $Label) {
  $safe = Normalize-Path $Path
  if (-not (Test-Path -LiteralPath $safe)) {
    Write-Host "Skip missing ${Label}: $safe"
    return
  }
  if ($DryRun) {
    Write-Host "Would remove ${Label}: $safe"
    return
  }
  Remove-Item -LiteralPath $safe -Force
  Write-Host "Removed ${Label}: $safe"
}

$installRootResolved = Assert-SafeTarget $InstallRoot "InstallRoot"
$dataRootResolved = Assert-SafeTarget $DataRoot "DataRoot"
$binRoot = Join-Path $dataRootResolved "bin"
$launcher = Join-Path $binRoot "blue-tanuki.ps1"
$cmdLauncher = Join-Path $binRoot "blue-tanuki.cmd"

Remove-Target $installRootResolved "app"
Remove-FileIfPresent $launcher "PowerShell launcher"
Remove-FileIfPresent $cmdLauncher "cmd launcher"

if ((Test-Path -LiteralPath $binRoot) -and -not $Purge) {
  $remaining = @(Get-ChildItem -Force -LiteralPath $binRoot -ErrorAction SilentlyContinue)
  if ($remaining.Count -eq 0) {
    Remove-Target $binRoot "empty bin directory"
  }
}

if ($Purge) {
  Remove-Target $dataRootResolved "data root"
  Write-Host "BLUE-TANUKI uninstalled with data purge."
}
else {
  Write-Host "BLUE-TANUKI app removed. Data retained at: $dataRootResolved"
  Write-Host "Re-run with -Purge to remove env, audit, session, and local data."
}
