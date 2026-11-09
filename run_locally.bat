@echo off
title BATON 2.0 Local Launcher
echo ==========================================================
echo    BATON 2.0 - Starting Local Services
echo ==========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0run_locally.ps1"
