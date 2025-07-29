@echo off
echo Starting FlashCard App...
echo.

REM Check if node_modules exist and install if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo Starting Backend...
start "Backend Server" /min cmd /k "cd backend && npm run dev"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend Server" /min cmd /k "cd frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 8 /nobreak > nul

echo Opening browser...
start http://localhost:5173

:menu
echo.
echo ================================
echo FlashCard App is running!
echo ================================
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo.
echo Browser should open automatically.
echo Server windows are minimized to taskbar.
echo.
echo Options:
echo [S] - Stop all servers and exit
echo [R] - Restart servers  
echo [B] - Open browser again
echo [X] - Exit (leave servers running)
echo.

choice /c srxb /n /m "Choose option: "

if %errorlevel% equ 1 (
    echo.
    echo Stopping all servers...
    call stop.bat
    exit /b
)
if %errorlevel% equ 2 (
    echo.
    echo Restarting servers...
    call stop.bat
    timeout /t 2 /nobreak > nul
    goto restart
)
if %errorlevel% equ 3 (
    echo.
    echo Exiting... Servers will continue running.
    echo Use stop.bat to stop them later.
    echo.
    echo Press any key to close this window...
    pause > nul
    exit /b
)
if %errorlevel% equ 4 (
    echo.
    echo Opening browser...
    start http://localhost:5173
    goto menu
)

:restart
echo.
echo Starting Backend...
start "Backend Server" /min cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend Server" /min cmd /k "cd frontend && npm run dev"
timeout /t 8 /nobreak > nul

echo Opening browser...
start http://localhost:5173
goto menu