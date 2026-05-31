$f = 'd:\Games\Vishal Colab\Ecom\frontend\src\pages\Checkout.tsx'
$lines = [System.IO.File]::ReadAllLines($f)
$keep = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -le 173; $i++) { $keep.Add($lines[$i]) }
for ($i = 218; $i -lt $lines.Length; $i++) { $keep.Add($lines[$i]) }
[System.IO.File]::WriteAllLines($f, $keep.ToArray())
Write-Host "Done. Removed lines 175-218. New total: $($keep.Count)"
