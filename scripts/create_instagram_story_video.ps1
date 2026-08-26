param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$storyDir = Join-Path $ProjectRoot "social\instagram-story-patch-notes-v2"
$input1 = Join-Path $storyDir "zaymax-story-01-neues-design.png"
$input2 = Join-Path $storyDir "zaymax-story-02-training.png"
$input3 = Join-Path $storyDir "zaymax-story-03-mehr-features.png"
$output = Join-Path $storyDir "zaymax-patch-notes-instagram-story.mp4"

$localFfmpeg = Join-Path $ProjectRoot ".video-tools\node_modules\.pnpm\ffmpeg-static@5.2.0\node_modules\ffmpeg-static\ffmpeg.exe"
$ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $localFfmpeg) {
  $ffmpeg = $localFfmpeg
} elseif ($ffmpegCommand) {
  $ffmpeg = $ffmpegCommand.Source
} else {
  throw "FFmpeg wurde nicht gefunden."
}

foreach ($input in @($input1, $input2, $input3)) {
  if (-not (Test-Path -LiteralPath $input)) {
    throw "Story-Grafik fehlt: $input"
  }
}

$filter = @"
[0:v]scale=1080:1920,zoompan=z='min(1.0+0.035*on/131,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=132:s=1080x1920:fps=30,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v0];
[1:v]scale=1080:1920,zoompan=z='min(1.0+0.028*on/131,1.028)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=132:s=1080x1920:fps=30,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v1];
[2:v]scale=1080:1920,zoompan=z='min(1.0+0.032*on/131,1.032)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=132:s=1080x1920:fps=30,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v2];
[v0][v1]xfade=transition=fadeblack:duration=0.6:offset=3.8[x1];
[x1][v2]xfade=transition=fadeblack:duration=0.6:offset=7.6,fade=t=in:st=0:d=0.25,fade=t=out:st=11.65:d=0.35,format=yuv420p[vout]
"@ -replace "`r?`n", ""

$arguments = @(
  "-y",
  "-i", $input1,
  "-i", $input2,
  "-i", $input3,
  "-filter_complex", $filter,
  "-map", "[vout]",
  "-t", "12",
  "-r", "30",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "18",
  "-profile:v", "high",
  "-level", "4.1",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-an",
  $output
)

& $ffmpeg @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Der Videoexport ist mit Exitcode $LASTEXITCODE fehlgeschlagen."
}

Get-Item -LiteralPath $output | Select-Object Name, Length, FullName
