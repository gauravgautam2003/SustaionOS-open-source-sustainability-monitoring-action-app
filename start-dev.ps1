$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-Window {
  param(
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $escapedCommand = $Command.Replace('"', '\"')
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location `"$WorkingDirectory`"; Write-Host `"$Title`"; $escapedCommand"
  )
}

$pythonCommand = if (Get-Command python -ErrorAction SilentlyContinue) {
  "python ml_service/server.py"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  "py ml_service/server.py"
} else {
  throw "Python was not found in PATH."
}

Start-Window -Title "SustainOS Python ML" -WorkingDirectory $root -Command $pythonCommand
Start-Window -Title "SustainOS Backend" -WorkingDirectory (Join-Path $root "server") -Command "npm run dev"
Start-Window -Title "SustainOS Frontend" -WorkingDirectory (Join-Path $root "Client") -Command "npm run dev"

Write-Host ""
Write-Host "Started Python ML, backend, and frontend windows."
Write-Host "If you want local LLM mode, run Ollama separately before opening the chat:"
Write-Host "  ollama pull llama3.2:1b"
Write-Host "  ollama serve"
