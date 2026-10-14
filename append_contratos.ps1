$main = Get-Content 'd:\RDadmin\frontend\src\Contratos.jsx' -Raw -Encoding UTF8
$append = Get-Content 'd:\RDadmin\estimacion_append.jsx' -Raw -Encoding UTF8
$result = $main + "`r`n" + $append
Set-Content 'd:\RDadmin\frontend\src\Contratos.jsx' -Value $result -Encoding UTF8 -NoNewline
Write-Host "Done. Total bytes: $($result.Length)"
