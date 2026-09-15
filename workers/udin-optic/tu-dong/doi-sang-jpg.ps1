<#
  doi-sang-jpg.ps1 — đổi mọi ảnh trong MỘT thư mục sang JPG, KHÔNG cần cài thêm gì.

  VÌ SAO LÀ POWERSHELL CHỨ KHÔNG PHẢI MỘT GÓI NPM. Node không giải mã được WebP, và repo này
  có ĐÚNG KHÔNG dependency nào (`package.json` rỗng cả `dependencies` lẫn `devDependencies`).
  Thêm `sharp` vào một repo không dependency là một thay đổi kiến trúc, để lấy một việc mà
  Windows đã làm sẵn: WIC có codec WebP từ Windows 10 1809, và `PresentationCore` gọi thẳng nó.
  Đo 15/09 trên chính máy này: ảnh Udin 1728x1728 giải mã và ghi JPG được, không cài gì.

  GIÁ PHẢI TRẢ, nói trước: file này CHỈ CHẠY TRÊN WINDOWS. Repo đã Windows-only ở nhiều chỗ
  (đường dẫn nhà chung, bộ khởi động .cmd), nên đây không phải ràng buộc MỚI — nhưng nó là một
  ràng buộc, và nó phải được khai chứ không được giấu.

  WebP là ảnh CÓ MẤT DỮ LIỆU, JPG cũng vậy — nên đây là một lượt nén chồng lên nén. Chất lượng
  92 là chỗ mắt thường không thấy khác mà file không phình. Ảnh gốc .webp GIỮ NGUYÊN, không xoá:
  xoá dữ liệu gốc là việc phải hỏi Đức (luật gốc), và chính máy chủ Bridge cũng cố ý KHÔNG có
  `file.delete` vì lý do đó.

  Dùng:  powershell -NoProfile -ExecutionPolicy Bypass -File doi-sang-jpg.ps1 -ThuMuc <dir> [-Duoi .webp] [-ChatLuong 92]
  In ra: mỗi dòng một JSON — máy đọc được, không phải chữ cho người.
#>
param(
  [Parameter(Mandatory = $true)][string]$ThuMuc,
  [string]$Duoi = '.webp',
  [int]$ChatLuong = 92
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore

if (-not (Test-Path -LiteralPath $ThuMuc -PathType Container)) {
  Write-Output (@{ loi = "khong thay thu muc: $ThuMuc" } | ConvertTo-Json -Compress)
  exit 2
}

$nguon = @(Get-ChildItem -LiteralPath $ThuMuc -File | Where-Object { $_.Extension -ieq $Duoi })
foreach ($f in $nguon) {
  $ra = [IO.Path]::ChangeExtension($f.FullName, '.jpg')
  try {
    $doc = [IO.File]::OpenRead($f.FullName)
    try {
      $dec = [Windows.Media.Imaging.BitmapDecoder]::Create($doc, 'None', 'OnLoad')
      $khung = $dec.Frames[0]
      $enc = New-Object Windows.Media.Imaging.JpegBitmapEncoder
      $enc.QualityLevel = $ChatLuong
      $enc.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($khung))
      $ghi = [IO.File]::Open($ra, 'Create')
      try { $enc.Save($ghi) } finally { $ghi.Close() }
    } finally { $doc.Close() }
    Write-Output (@{
      nguon = $f.Name; ra = [IO.Path]::GetFileName($ra)
      byteNguon = $f.Length; byteRa = (Get-Item -LiteralPath $ra).Length
      rong = $khung.PixelWidth; cao = $khung.PixelHeight
    } | ConvertTo-Json -Compress)
  } catch {
    Write-Output (@{ nguon = $f.Name; loi = $_.Exception.Message } | ConvertTo-Json -Compress)
  }
}
if ($nguon.Count -eq 0) { Write-Output (@{ trong = $true; thuMuc = $ThuMuc; duoi = $Duoi } | ConvertTo-Json -Compress) }
