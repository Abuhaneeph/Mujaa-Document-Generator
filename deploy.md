# cPanel Deployment Guide

## Step 1: Prepare Files for Upload

### Required Files to Upload:
- `server.js` (main application)
- `docx_to_pdf_converter.py` (Python script)
- `package.json` (dependencies)
- `templates/` folder (all template files)
- `uploads/` folder (create if not exists)
- `data/` folder (for policy numbers)

### Files to Exclude:
- `node_modules/` (will be installed on server)
- `temp/` (temporary files)
- `.git/` (version control)
- `*.log` (log files)

## Step 2: cPanel File Manager Upload

1. **Login to cPanel**
2. **Open File Manager**
3. **Navigate to public_html** (or your domain folder)
4. **Create folder**: `document-generator`
5. **Upload all files** to this folder

## Step 3: Install Dependencies

### Via cPanel Terminal (if available):
```bash
cd public_html/document-generator
npm install
```

### Via SSH (if available):
```bash
cd /home/username/public_html/document-generator
npm install
```

## Step 4: Python Dependencies

Install Python packages on server:
```bash
pip install comtypes PyPDF2
```

## Step 5: Set Permissions

Set proper permissions:
- **Folders**: 755
- **Files**: 644
- **Python script**: 755

## Step 6: Configure Node.js App

1. **Go to cPanel → Node.js**
2. **Create Application**:
   - **Application Root**: `public_html/document-generator`
   - **Application URL**: `yourdomain.com/document-generator`
   - **Application Startup File**: `server.js`
   - **Node.js Version**: 18.x or higher

## Step 7: Environment Variables

In cPanel Node.js settings, add:
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

## Step 8: Start Application

1. **Start the Node.js application** in cPanel
2. **Check logs** for any errors
3. **Test the application** at your domain

## Step 9: Test Endpoints

Test these URLs:
- `https://yourdomain.com/document-generator/api/health`
- `https://yourdomain.com/document-generator/api/status`

## Troubleshooting

### Common Issues:
1. **Python not found**: Contact hosting support
2. **Permission denied**: Check file permissions
3. **Module not found**: Run `npm install`
4. **Port conflicts**: Use different port in .env

### Logs Location:
- **cPanel Error Logs**: cPanel → Error Logs
- **Node.js Logs**: cPanel → Node.js → Logs
