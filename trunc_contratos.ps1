$content = Get-Content 'd:\RDadmin\frontend\src\Contratos.jsx' -Raw -Encoding UTF8
$lines = $content -split "`r?`n"
$keep = $lines[0..364] -join "`r`n"
Set-Content 'd:\RDadmin\frontend\src\Contratos.jsx' -Value $keep -Encoding UTF8 -NoNewline
Write-Host "Done. Lines kept: " ($lines[0..364]).Count
