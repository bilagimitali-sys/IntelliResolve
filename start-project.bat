@echo off
setlocal enabledelayedexpansion
title KLE Tech Grievance Management Platform Launcher

echo ============================================================
echo   KLE TECHNOLOGICAL UNIVERSITY - GRIEVANCE PLATFORM v4
echo ============================================================
echo.

:: Detect project directory whether run from root, project folder, or backend folder
if exist "%~dp0..\frontend" (
    set "BACKEND_DIR=%~dp0"
    set "FRONTEND_DIR=%~dp0..\frontend"
) else if exist "%~dp0backend" (
    set "BACKEND_DIR=%~dp0backend"
    set "FRONTEND_DIR=%~dp0frontend"
) else if exist "%~dp0complaint-system-v3-fixed\complaint-system-v3\backend" (
    set "BACKEND_DIR=%~dp0complaint-system-v3-fixed\complaint-system-v3\backend"
    set "FRONTEND_DIR=%~dp0complaint-system-v3-fixed\complaint-system-v3\frontend"
) else (
    echo [ERROR] Could not locate backend and frontend folders.
    pause
    exit /b 1
)

echo [1/3] Checking MySQL & Running Non-Destructive Database Migration...
cd /d "%BACKEND_DIR%"
call node migrate-v4.js
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Database migration could not connect to MySQL.
    echo If using XAMPP, please start Apache and MySQL from the XAMPP Control Panel.
    echo Starting backend and frontend in 3 seconds...
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/3] Launching Backend Server on http://localhost:5000 ...
start "KLE Grievance Backend (Port 5000)" cmd /k "cd /d "%BACKEND_DIR%" && node server.js"

echo [3/3] Launching Frontend React App on http://localhost:3000 ...
start "KLE Grievance Frontend (Port 3000)" cmd /k "cd /d "%FRONTEND_DIR%" && npm start"

echo.
echo ============================================================
echo   KLE Tech Grievance Platform is starting!
echo.
echo   Frontend URL: http://localhost:3000
echo   Backend API:  http://localhost:5000
echo.
echo   LOGIN CREDENTIALS (All use Password@1234):
echo   -------------------------------------------------
echo   Student:           ravi@kletech.ac.in
echo   Dept Coordinator:  cse.coord@kletech.ac.in
echo   Bus Coordinator:   bus.coord@kletech.ac.in
echo   Administrator:     admin@kletech.ac.in
echo ============================================================
echo.
