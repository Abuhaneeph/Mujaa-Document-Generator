@echo off
echo Installing Python dependencies for DOCX to PDF conversion and merging...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ✅ Python dependencies installed successfully!
    echo You can now run the server with: npm start
) else (
    echo.
    echo ❌ Failed to install Python dependencies
    echo Please check the error messages above
)

pause
