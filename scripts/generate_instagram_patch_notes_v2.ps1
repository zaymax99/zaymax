param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $ProjectRoot "social\instagram-story-patch-notes-v2"
$screenshotDir = Join-Path $ProjectRoot "app-store-screenshots\iphone-6.5"
$logoPath = Join-Path $ProjectRoot "assets\images\icon.png"

$width = 1080
$height = 1920

$white = [System.Drawing.Color]::FromArgb(255, 246, 246, 247)
$muted = [System.Drawing.Color]::FromArgb(255, 166, 166, 172)
$subtle = [System.Drawing.Color]::FromArgb(255, 105, 106, 112)
$gold = [System.Drawing.Color]::FromArgb(255, 222, 184, 86)
$green = [System.Drawing.Color]::FromArgb(255, 118, 203, 145)
$panel = [System.Drawing.Color]::FromArgb(224, 17, 18, 21)
$panelSoft = [System.Drawing.Color]::FromArgb(188, 24, 25, 29)
$border = [System.Drawing.Color]::FromArgb(205, 70, 71, 78)

function New-ZFont {
  param(
    [float]$Size,
    [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
  )
  return [System.Drawing.Font]::new("Segoe UI", $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-RoundedPath {
  param(
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = [Math]::Min($Radius * 2, [Math]::Min($Rect.Width, $Rect.Height))
  $arc = [System.Drawing.RectangleF]::new($Rect.X, $Rect.Y, $diameter, $diameter)
  $path.AddArc($arc, 180, 90)
  $arc.X = $Rect.Right - $diameter
  $path.AddArc($arc, 270, 90)
  $arc.Y = $Rect.Bottom - $diameter
  $path.AddArc($arc, 0, 90)
  $arc.X = $Rect.X
  $path.AddArc($arc, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-RoundedPanel {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius,
    [System.Drawing.Color]$Fill,
    [System.Drawing.Color]$Stroke,
    [float]$StrokeWidth = 2
  )
  $path = New-RoundedPath -Rect $Rect -Radius $Radius
  $brush = [System.Drawing.SolidBrush]::new($Fill)
  $Graphics.FillPath($brush, $path)
  if ($StrokeWidth -gt 0) {
    $pen = [System.Drawing.Pen]::new($Stroke, $StrokeWidth)
    $Graphics.DrawPath($pen, $path)
    $pen.Dispose()
  }
  $brush.Dispose()
  $path.Dispose()
}

function Draw-RoundedImage {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )
  $path = New-RoundedPath -Rect $Rect -Radius $Radius
  $state = $Graphics.Save()
  $Graphics.SetClip($path)
  $Graphics.DrawImage($Image, $Rect)
  $Graphics.Restore($state)
  $path.Dispose()
}

function Draw-Text {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Color]$Color,
    [float]$X,
    [float]$Y,
    [float]$W,
    [float]$H,
    [System.Drawing.StringAlignment]$Align = [System.Drawing.StringAlignment]::Near
  )
  $brush = [System.Drawing.SolidBrush]::new($Color)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = $Align
  $format.LineAlignment = [System.Drawing.StringAlignment]::Near
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $Graphics.DrawString($Text, $Font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $W, $H), $format)
  $format.Dispose()
  $brush.Dispose()
}

function Draw-BrandHeader {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Logo,
    [string]$Page
  )
  $logoRect = [System.Drawing.RectangleF]::new(72, 76, 74, 74)
  Draw-RoundedPanel -Graphics $Graphics -Rect $logoRect -Radius 37 -Fill ([System.Drawing.Color]::FromArgb(235, 4, 5, 7)) -Stroke $border -StrokeWidth 2
  # Crop tightly around the white mark and place the crop inside the circular badge.
  # Its black source rectangle stays fully inside the badge and blends into the fill.
  $markRect = [System.Drawing.RectangleF]::new(82, 96, 54, 32)
  $markSource = [System.Drawing.RectangleF]::new(
    $Logo.Width * 0.09,
    $Logo.Height * 0.22,
    $Logo.Width * 0.82,
    $Logo.Height * 0.52
  )
  $Graphics.DrawImage($Logo, $markRect, $markSource, [System.Drawing.GraphicsUnit]::Pixel)

  $brandFont = New-ZFont -Size 28 -Style ([System.Drawing.FontStyle]::Bold)
  $metaFont = New-ZFont -Size 15 -Style ([System.Drawing.FontStyle]::Bold)
  $pageFont = New-ZFont -Size 18 -Style ([System.Drawing.FontStyle]::Bold)
  Draw-Text -Graphics $Graphics -Text "ZAYMAX" -Font $brandFont -Color $white -X 168 -Y 78 -W 420 -H 38
  Draw-Text -Graphics $Graphics -Text "PATCH NOTES · 1.0.1" -Font $metaFont -Color $muted -X 168 -Y 120 -W 420 -H 26
  Draw-Text -Graphics $Graphics -Text $Page -Font $pageFont -Color $muted -X 840 -Y 92 -W 168 -H 34 -Align ([System.Drawing.StringAlignment]::Far)
  $brandFont.Dispose()
  $metaFont.Dispose()
  $pageFont.Dispose()
}

function Draw-Tag {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [float]$X,
    [float]$Y,
    [float]$W,
    [System.Drawing.Color]$Accent = $gold
  )
  $rect = [System.Drawing.RectangleF]::new($X, $Y, $W, 48)
  Draw-RoundedPanel -Graphics $Graphics -Rect $rect -Radius 24 -Fill ([System.Drawing.Color]::FromArgb(205, 31, 28, 19)) -Stroke ([System.Drawing.Color]::FromArgb(150, $Accent.R, $Accent.G, $Accent.B)) -StrokeWidth 1.5
  $font = New-ZFont -Size 15 -Style ([System.Drawing.FontStyle]::Bold)
  Draw-Text -Graphics $Graphics -Text $Text -Font $font -Color $Accent -X ($X + 18) -Y ($Y + 12) -W ($W - 36) -H 24
  $font.Dispose()
}

function Draw-ProgressDots {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Active
  )
  for ($i = 1; $i -le 3; $i++) {
    $dotWidth = if ($i -eq $Active) { 56 } else { 18 }
    $x = 72 + (($i - 1) * 70)
    $fill = if ($i -eq $Active) { $gold } else { [System.Drawing.Color]::FromArgb(255, 75, 76, 82) }
    Draw-RoundedPanel -Graphics $Graphics -Rect ([System.Drawing.RectangleF]::new($x, 1836, $dotWidth, 8)) -Radius 4 -Fill $fill -Stroke $fill -StrokeWidth 0
  }
}

function Draw-FeatureCard {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Index,
    [string]$Title,
    [string]$Body,
    [float]$X,
    [float]$Y,
    [float]$W,
    [float]$H,
    [System.Drawing.Color]$Accent = $gold
  )
  Draw-RoundedPanel -Graphics $Graphics -Rect ([System.Drawing.RectangleF]::new($X, $Y, $W, $H)) -Radius 28 -Fill $panel -Stroke $border -StrokeWidth 1.5
  Draw-RoundedPanel -Graphics $Graphics -Rect ([System.Drawing.RectangleF]::new($X + 20, $Y + 20, 48, 48)) -Radius 24 -Fill ([System.Drawing.Color]::FromArgb(220, 31, 30, 27)) -Stroke ([System.Drawing.Color]::FromArgb(160, $Accent.R, $Accent.G, $Accent.B)) -StrokeWidth 1.2
  $indexFont = New-ZFont -Size 15 -Style ([System.Drawing.FontStyle]::Bold)
  $titleFont = New-ZFont -Size 21 -Style ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-ZFont -Size 16 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $Graphics -Text $Index -Font $indexFont -Color $Accent -X ($X + 20) -Y ($Y + 32) -W 48 -H 24 -Align ([System.Drawing.StringAlignment]::Center)
  Draw-Text -Graphics $Graphics -Text $Title -Font $titleFont -Color $white -X ($X + 88) -Y ($Y + 20) -W ($W - 108) -H 30
  Draw-Text -Graphics $Graphics -Text $Body -Font $bodyFont -Color $muted -X ($X + 88) -Y ($Y + 55) -W ($W - 108) -H ($H - 65)
  $indexFont.Dispose()
  $titleFont.Dispose()
  $bodyFont.Dispose()
}

function New-StoryCanvas {
  param([System.Drawing.Image]$Background)
  $canvas = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $canvas.SetResolution(72, 72)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.DrawImage($Background, 0, 0, $width, $height)
  $veil = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 0, 0, 0))
  $graphics.FillRectangle($veil, 0, 0, $width, $height)
  $veil.Dispose()
  return @{ Canvas = $canvas; Graphics = $graphics }
}

$logo = [System.Drawing.Image]::FromFile($logoPath)
$background1 = [System.Drawing.Image]::FromFile((Join-Path $outputDir "background-01.png"))
$background2 = [System.Drawing.Image]::FromFile((Join-Path $outputDir "background-02.png"))
$background3 = [System.Drawing.Image]::FromFile((Join-Path $outputDir "background-03.png"))
$homeScreen = [System.Drawing.Image]::FromFile((Join-Path $screenshotDir "01-heute.png"))
$trainingScreen = [System.Drawing.Image]::FromFile((Join-Path $screenshotDir "03-aktives-training.png"))

try {
  # Story 1: Cover and new visual language
  $story = New-StoryCanvas -Background $background1
  $canvas = $story.Canvas
  $graphics = $story.Graphics
  Draw-BrandHeader -Graphics $graphics -Logo $logo -Page "01 / 03"
  Draw-Tag -Graphics $graphics -Text "DAS DESIGN-UPDATE" -X 72 -Y 218 -W 224

  $headlineA = New-ZFont -Size 60 -Style ([System.Drawing.FontStyle]::Bold)
  $headlineB = New-ZFont -Size 98 -Style ([System.Drawing.FontStyle]::Bold)
  $subFont = New-ZFont -Size 30 -Style ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-ZFont -Size 19 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "DAS NEUE" -Font $headlineA -Color $white -X 72 -Y 302 -W 700 -H 80
  Draw-Text -Graphics $graphics -Text "ZAYMAX" -Font $headlineB -Color $white -X 66 -Y 360 -W 780 -H 124
  Draw-Text -Graphics $graphics -Text "Runder. Ruhiger. Schneller." -Font $subFont -Color $gold -X 72 -Y 492 -W 760 -H 46
  Draw-Text -Graphics $graphics -Text "Ein klarer Look für dein stärkstes Training." -Font $bodyFont -Color $muted -X 72 -Y 542 -W 760 -H 34

  $shadowRect = [System.Drawing.RectangleF]::new(296, 638, 488, 1064)
  Draw-RoundedPanel -Graphics $graphics -Rect $shadowRect -Radius 64 -Fill ([System.Drawing.Color]::FromArgb(170, 0, 0, 0)) -Stroke ([System.Drawing.Color]::Transparent) -StrokeWidth 0
  $phoneRect = [System.Drawing.RectangleF]::new(308, 622, 464, 1004)
  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(295, 609, 490, 1030)) -Radius 64 -Fill ([System.Drawing.Color]::FromArgb(240, 11, 12, 14)) -Stroke ([System.Drawing.Color]::FromArgb(185, 205, 205, 210)) -StrokeWidth 2
  Draw-RoundedImage -Graphics $graphics -Image $homeScreen -Rect $phoneRect -Radius 50
  $phonePath = New-RoundedPath -Rect $phoneRect -Radius 50
  $phonePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 83, 84, 90), 2)
  $graphics.DrawPath($phonePen, $phonePath)
  $phonePen.Dispose()
  $phonePath.Dispose()

  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(72, 1682, 936, 112)) -Radius 34 -Fill $panelSoft -Stroke $border -StrokeWidth 1.5
  $smallLabel = New-ZFont -Size 14 -Style ([System.Drawing.FontStyle]::Bold)
  $footerTitle = New-ZFont -Size 24 -Style ([System.Drawing.FontStyle]::Bold)
  Draw-Text -Graphics $graphics -Text "NEUE OBERFLÄCHE" -Font $smallLabel -Color $subtle -X 100 -Y 1704 -W 300 -H 24
  Draw-Text -Graphics $graphics -Text "Schwarz. Gläsern. Komplett abgerundet." -Font $footerTitle -Color $white -X 100 -Y 1734 -W 820 -H 38
  Draw-ProgressDots -Graphics $graphics -Active 1

  $canvas.Save((Join-Path $outputDir "zaymax-story-01-neues-design.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $smallLabel.Dispose()
  $footerTitle.Dispose()
  $headlineA.Dispose()
  $headlineB.Dispose()
  $subFont.Dispose()
  $bodyFont.Dispose()
  $graphics.Dispose()
  $canvas.Dispose()

  # Story 2: Training controls
  $story = New-StoryCanvas -Background $background2
  $canvas = $story.Canvas
  $graphics = $story.Graphics
  Draw-BrandHeader -Graphics $graphics -Logo $logo -Page "02 / 03"
  Draw-Tag -Graphics $graphics -Text "AKTIVES TRAINING" -X 72 -Y 218 -W 206 -Accent $green

  $headline = New-ZFont -Size 58 -Style ([System.Drawing.FontStyle]::Bold)
  $subFont = New-ZFont -Size 21 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "MEHR KONTROLLE.`nWENIGER TIPPEN." -Font $headline -Color $white -X 72 -Y 300 -W 900 -H 146
  Draw-Text -Graphics $graphics -Text "Passe jeden Satz direkt im laufenden Workout an." -Font $subFont -Color $muted -X 72 -Y 466 -W 760 -H 34

  Draw-FeatureCard -Graphics $graphics -Index "01" -Title "PRO SATZ" -Body "Wdh. und Gewicht einzeln" -X 72 -Y 586 -W 430 -H 126 -Accent $gold
  Draw-FeatureCard -Graphics $graphics -Index "02" -Title "DIREKT ÄNDERN" -Body "Plus, Minus und Kommazahlen" -X 72 -Y 734 -W 430 -H 126 -Accent $gold
  Draw-FeatureCard -Graphics $graphics -Index "03" -Title "FORTSCHRITT" -Body "Grüner Haken und Medaille" -X 72 -Y 882 -W 430 -H 126 -Accent $green

  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(535, 560, 473, 1026)) -Radius 64 -Fill ([System.Drawing.Color]::FromArgb(232, 8, 9, 11)) -Stroke ([System.Drawing.Color]::FromArgb(170, 210, 184, 100)) -StrokeWidth 2
  Draw-RoundedImage -Graphics $graphics -Image $trainingScreen -Rect ([System.Drawing.RectangleF]::new(548, 573, 447, 968)) -Radius 50

  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(72, 1622, 936, 172)) -Radius 36 -Fill $panel -Stroke ([System.Drawing.Color]::FromArgb(170, 118, 203, 145)) -StrokeWidth 1.5
  $labelFont = New-ZFont -Size 14 -Style ([System.Drawing.FontStyle]::Bold)
  $calloutFont = New-ZFont -Size 26 -Style ([System.Drawing.FontStyle]::Bold)
  $calloutBody = New-ZFont -Size 18 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "NEU IM WORKOUT" -Font $labelFont -Color $green -X 104 -Y 1650 -W 360 -H 25
  Draw-Text -Graphics $graphics -Text "Ändern. Abhaken. Direkt weitermachen." -Font $calloutFont -Color $white -X 104 -Y 1682 -W 820 -H 42
  Draw-Text -Graphics $graphics -Text "Mit Pausentimer, Steigerungsanzeige und schnellem Feedback." -Font $calloutBody -Color $muted -X 104 -Y 1732 -W 820 -H 34
  Draw-ProgressDots -Graphics $graphics -Active 2

  $canvas.Save((Join-Path $outputDir "zaymax-story-02-training.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $headline.Dispose()
  $subFont.Dispose()
  $labelFont.Dispose()
  $calloutFont.Dispose()
  $calloutBody.Dispose()
  $graphics.Dispose()
  $canvas.Dispose()

  # Story 3: History, journal and local data
  $story = New-StoryCanvas -Background $background3
  $canvas = $story.Canvas
  $graphics = $story.Graphics
  $darkener = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(78, 0, 0, 0))
  $graphics.FillRectangle($darkener, 0, 0, $width, $height)
  $darkener.Dispose()
  Draw-BrandHeader -Graphics $graphics -Logo $logo -Page "03 / 03"
  Draw-Tag -Graphics $graphics -Text "DEIN FORTSCHRITT" -X 72 -Y 218 -W 216

  $headline = New-ZFont -Size 60 -Style ([System.Drawing.FontStyle]::Bold)
  $subFont = New-ZFont -Size 21 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "MEHR ALS`nNUR TRAINING." -Font $headline -Color $white -X 72 -Y 300 -W 900 -H 150
  Draw-Text -Graphics $graphics -Text "Deine Routine, deine Daten – alles an einem Ort." -Font $subFont -Color $muted -X 72 -Y 468 -W 820 -H 34

  Draw-FeatureCard -Graphics $graphics -Index "01" -Title "HISTORIE" -Body "Leistungen, Gewicht und Gefühl" -X 72 -Y 590 -W 456 -H 142 -Accent $gold
  Draw-FeatureCard -Graphics $graphics -Index "02" -Title "TAGEBUCH & BMI" -Body "Körperdaten und Trainingstage" -X 552 -Y 590 -W 456 -H 142 -Accent $gold
  Draw-FeatureCard -Graphics $graphics -Index "03" -Title "LOKALES BACKUP" -Body "Als JSON sichern und laden" -X 72 -Y 758 -W 456 -H 142 -Accent $gold
  Draw-FeatureCard -Graphics $graphics -Index "04" -Title "DEUTSCH / ENGLISH" -Body "Sprache jederzeit wechseln" -X 552 -Y 758 -W 456 -H 142 -Accent $gold

  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(72, 1010, 936, 500)) -Radius 64 -Fill ([System.Drawing.Color]::FromArgb(200, 10, 11, 13)) -Stroke ([System.Drawing.Color]::FromArgb(130, 222, 184, 86)) -StrokeWidth 1.5
  $bigVersion = New-ZFont -Size 138 -Style ([System.Drawing.FontStyle]::Bold)
  $versionLabel = New-ZFont -Size 18 -Style ([System.Drawing.FontStyle]::Bold)
  $closing = New-ZFont -Size 40 -Style ([System.Drawing.FontStyle]::Bold)
  $closingBody = New-ZFont -Size 21 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "UPDATE" -Font $versionLabel -Color $gold -X 112 -Y 1060 -W 300 -H 32
  Draw-Text -Graphics $graphics -Text "1.0.1" -Font $bigVersion -Color $white -X 100 -Y 1088 -W 700 -H 180
  Draw-Text -Graphics $graphics -Text "MINIMAL. LOKAL. ZAYMAX." -Font $closing -Color $white -X 112 -Y 1305 -W 820 -H 58
  Draw-Text -Graphics $graphics -Text "Kein Account. Keine Werbung. Dein Training bleibt bei dir." -Font $closingBody -Color $muted -X 112 -Y 1374 -W 800 -H 70

  Draw-RoundedPanel -Graphics $graphics -Rect ([System.Drawing.RectangleF]::new(72, 1574, 936, 220)) -Radius 44 -Fill ([System.Drawing.Color]::FromArgb(222, 238, 238, 240)) -Stroke $white -StrokeWidth 1
  $finalLabel = New-ZFont -Size 16 -Style ([System.Drawing.FontStyle]::Bold)
  $finalTitle = New-ZFont -Size 37 -Style ([System.Drawing.FontStyle]::Bold)
  $finalBody = New-ZFont -Size 19 -Style ([System.Drawing.FontStyle]::Regular)
  Draw-Text -Graphics $graphics -Text "ZAYMAX 1.0.1" -Font $finalLabel -Color ([System.Drawing.Color]::FromArgb(255, 80, 80, 84)) -X 108 -Y 1610 -W 360 -H 28
  Draw-Text -Graphics $graphics -Text "DEIN UPDATE. DEIN WORKOUT." -Font $finalTitle -Color ([System.Drawing.Color]::FromArgb(255, 10, 10, 12)) -X 108 -Y 1650 -W 820 -H 52
  Draw-Text -Graphics $graphics -Text "Runder, schneller und persönlicher als je zuvor." -Font $finalBody -Color ([System.Drawing.Color]::FromArgb(255, 78, 78, 83)) -X 108 -Y 1710 -W 800 -H 34
  Draw-ProgressDots -Graphics $graphics -Active 3

  $canvas.Save((Join-Path $outputDir "zaymax-story-03-mehr-features.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $headline.Dispose()
  $subFont.Dispose()
  $bigVersion.Dispose()
  $versionLabel.Dispose()
  $closing.Dispose()
  $closingBody.Dispose()
  $finalLabel.Dispose()
  $finalTitle.Dispose()
  $finalBody.Dispose()
  $graphics.Dispose()
  $canvas.Dispose()
}
finally {
  $logo.Dispose()
  $background1.Dispose()
  $background2.Dispose()
  $background3.Dispose()
  $homeScreen.Dispose()
  $trainingScreen.Dispose()
}

Get-ChildItem -LiteralPath $outputDir -Filter "zaymax-story-*.png" | Sort-Object Name | Select-Object Name, Length, FullName
