@echo off
chcp 65001 > nul

echo.
echo ========================================
echo    Soridam Quick Start (Next.js 16)
echo    Port: 3001
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Stopping port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F 2>nul
)
timeout /t 1 /nobreak >nul
if exist ".next\dev\lock" (
    del /f ".next\dev\lock" 2>nul
    echo Lock file removed.
)
echo Done.

echo [2/3] Checking packages...
if not exist node_modules (
    echo Installing packages...
    call npm install
    if errorlevel 1 (
        echo npm install failed!
        pause
        exit /b 1
    )
) else (
    echo node_modules exists.
)

echo [3/3] Starting Next.js dev server...
echo.
echo ========================================
echo    Next.js 16.1.6 + React 19.2.3
echo    http://localhost:3001
echo ========================================
echo.
echo Press Ctrl+C to stop.
echo.

start /min "" cmd /c "timeout /t 5 /nobreak >nul && start chrome.exe --incognito http://localhost:3001"

cmd /k "npm run dev -- -p 3001"
