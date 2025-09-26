# cPanel Node.js Deployment Guide

## Quick Fix for Port Conflicts

The server has been updated to handle port conflicts automatically. Here's what was changed:

### 1. **Port Detection**
- The server now automatically finds an available port if the default port (3000) is in use
- It tries ports sequentially: 3000, 3001, 3002, etc.

### 2. **Production Mode Detection**
- In production/cPanel environments, the server tries the specified port first
- If that fails, it falls back to automatic port detection

### 3. **Environment Variables**
The server now supports these environment variables:
- `PORT` - Primary port (cPanel will set this)
- `NODE_PORT` - Alternative port variable
- `NODE_ENV` - Set to 'production' for cPanel
- `CPANEL` - Set to 'true' to enable cPanel mode

## cPanel Setup Instructions

### 1. **Upload Files**
Upload these files to your cPanel Node.js application directory:
- `server.js` (main server file)
- `package.json` (dependencies)
- `templates/` folder (with all template files)
- `data/` folder (with policy number files)

### 2. **Install Dependencies**
In cPanel Node.js terminal, run:
```bash
npm install
```

### 3. **Set Environment Variables**
In cPanel Node.js settings, set:
- `NODE_ENV=production`
- `CPANEL=true`
- `PORT` (cPanel will set this automatically)

### 4. **Start Application**
The application will automatically:
- Detect the port assigned by cPanel
- Fall back to port detection if there are conflicts
- Start successfully without manual port configuration

## Troubleshooting

### If you still get port errors:
1. Check that all files are uploaded correctly
2. Ensure `package.json` is in the root directory
3. Verify that the `templates/` folder exists with all required files
4. Check cPanel Node.js logs for specific error messages

### Common Issues:
- **Missing templates**: Ensure all `.docx` files are in the `templates/` directory
- **Permission errors**: Check file permissions in cPanel File Manager
- **Memory issues**: The server includes automatic memory management

## Testing

Once deployed, test these endpoints:
- `GET /api/health` - Check server status
- `GET /api/memory` - Check memory usage
- `POST /api/generate-documents` - Test document generation

The server will automatically log which port it's using in the startup message.
