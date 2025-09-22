@echo off
echo Creating deployment package for cPanel...

REM Create deployment folder
mkdir deployment 2>nul

REM Copy essential files
copy server.js deployment\
copy docx_to_pdf_converter.py deployment\
copy package.json deployment\

REM Create required directories
mkdir deployment\templates 2>nul
mkdir deployment\uploads 2>nul
mkdir deployment\data 2>nul
mkdir deployment\temp 2>nul

REM Copy templates
xcopy templates deployment\templates\ /E /I /Q

REM Create .htaccess for Node.js
echo RewriteEngine On > deployment\.htaccess
echo RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L] >> deployment\.htaccess

REM Create installation instructions
echo # cPanel Deployment Instructions > deployment\INSTALL.md
echo. >> deployment\INSTALL.md
echo 1. Upload all files to public_html/document-generator >> deployment\INSTALL.md
echo 2. Go to cPanel ^> Node.js >> deployment\INSTALL.md
echo 3. Create application with startup file: server.js >> deployment\INSTALL.md
echo 4. Install dependencies through cPanel Node.js interface >> deployment\INSTALL.md
echo 5. Start the application >> deployment\INSTALL.md

echo.
echo ✅ Deployment package created in 'deployment' folder
echo 📁 Upload the contents of this folder to your cPanel
echo.
pause
