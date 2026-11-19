$ErrorActionPreference = 'Stop'

$modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
$destination = Join-Path $PSScriptRoot 'hand_landmarker.task'

Invoke-WebRequest -Uri $modelUrl -OutFile $destination
Write-Host "Modelo descargado en: $destination"
