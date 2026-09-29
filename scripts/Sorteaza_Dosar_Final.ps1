[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Service Auto - Sortare Automata Dosar Final"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SORTARE AUTOMATA TALON + BULETIN + CERERE DESPAGUBIRE" -ForegroundColor Cyan
Write-Host "  Destinatie: C:\Users\pc1\Desktop\DOSARE\[NR_AUTO]\05_Dosar_Final\" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$sourceDir = ""
if ($args.Count -gt 0) {
    $sourceDir = ($args -join " ").Trim().Trim('"').Trim("'")
}

if (-not $sourceDir) {
    $rawInput = Read-Host "Introduceti calea folderului cu fotografii amestecate (sau trageti folderul aici)"
    if ($rawInput) {
        $sourceDir = $rawInput.Trim().Trim('"').Trim("'")
    }
}

if (-not $sourceDir -or -not (Test-Path -LiteralPath $sourceDir)) {
    Write-Host ""
    Write-Host "Nu a fost specificat un folder existent: $sourceDir" -ForegroundColor Red
    Write-Host ""
    Read-Host "Apasati Enter pentru a inchide..."
    exit 1
}

Write-Host ""
Write-Host "Se ruleaza sortarea pentru: $sourceDir" -ForegroundColor Green
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "sorteaza-dosar-final.mjs"
$destPath = $PSScriptRoot

& "node" $scriptPath $sourceDir $destPath

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Read-Host "Apasati Enter pentru a inchide..."
