@echo off
setlocal enabledelayedexpansion
title KLE Tech Grievance Management Platform Launcher

echo ============================================================
echo   KLE TECHNOLOGICAL UNIVERSITY - GRIEVANCE PLATFORM v4
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
if exist "%ROOT_DIR%..\frontend" (
    set "BACKEND_DIR=%ROOT_DIR%"
    set "FRONTEND_DIR=%ROOT_DIR%..\frontend"
) else if exist "%ROOT_DIR%backend" (
    set "BACKEND_DIR=%ROOT_DIR%backend"
    set "FRONTEND_DIR=%ROOT_DIR%frontend"
) else if exist "%ROOT_DIR%complaint-system-v3-fixed\complaint-system-v3\backend" (
    set "BACKEND_DIR=%ROOT_DIR%complaint-system-v3-fixed\complaint-system-v3\backend"
    set "FRONTEND_DIR=%ROOT_DIR%complaint-system-v3-fixed\complaint-system-v3\frontend"
) else (
    echo [ERROR] Could not locate backend and frontend folders.
    pause
    exit /b 1
)

echo [1/3] Checking MySQL and Running Non-Destructive Database Migration...
pushd "%BACKEND_DIR%"
call python migrate_v4.py
if errorlevel 1 (
    echo.
    echo [WARNING] Database migration could not connect to MySQL.
    echo If using XAMPP, please start Apache and MySQL from the XAMPP Control Panel.
    echo Starting backend and frontend in 3 seconds...
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/3] Launching FastAPI Backend Server on http://localhost:5000 ...
start "KLE Grievance FastAPI Backend" /D "%BACKEND_DIR%" cmd /k "set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && python -m uvicorn main:app --host 0.0.0.0 --port 5000"
popd

echo [3/3] Launching Frontend React App on http://localhost:3000 ...
start "KLE Grievance Frontend" /D "%FRONTEND_DIR%" cmd /k "npm start"

echo.
echo ============================================================
echo   KLE Tech Grievance Platform is starting!
echo.
echo   Frontend URL: http://localhost:3000
echo   Backend API:  http://localhost:5000
echo   Swagger Docs: http://localhost:5000/docs
echo.
echo   LOGIN CREDENTIALS ^(All use Password@1234^):
echo   -------------------------------------------------
echo   Student:           ravi@kletech.ac.in
echo   Dept Coordinator:  cse.coord@kletech.ac.in
echo   Bus Coordinator:   bus.coord@kletech.ac.in
echo   Administrator:     admin@kletech.ac.in
echo ============================================================
echo.
