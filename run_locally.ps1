Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   BATON 2.0 - Project Continuity Intelligence Platform" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. PostgreSQL Cluster (Port 5435)
$pgConn = Get-NetTCPConnection -LocalPort 5435 -ErrorAction SilentlyContinue
if (-not $pgConn) {
    Write-Host "[1/3] Starting PostgreSQL cluster on port 5435..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -ArgumentList "-D", "$PSScriptRoot\pg_data", "-p", "5435" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/3] PostgreSQL is already active on port 5435." -ForegroundColor Green
}

# 2. FastAPI Backend (Port 8000)
$beConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $beConn) {
    Write-Host "[2/3] Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[2/3] FastAPI Backend is already active on port 8000." -ForegroundColor Green
}

# 3. Next.js Production Frontend (Port 3000)
$feConn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $feConn) {
    Write-Host "[3/3] Starting Next.js Frontend on port 3000..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run start -- -p 3000"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[3/3] Next.js Frontend is already active on port 3000." -ForegroundColor Green
}

Write-Host "Opening BATON 2.0 in browser: http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

