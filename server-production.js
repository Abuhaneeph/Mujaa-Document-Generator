import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import archiver from "archiver";
import express from "express";
import multer from "multer";
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const execAsync = promisify(exec);

// Production configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Enable CORS for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware with production limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Production logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Root endpoint for cPanel health check
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Document Generator Server</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1>🚀 Document Generator Server</h1>
      <p>Status: Running</p>
      <p>Environment: ${NODE_ENV}</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li><a href="/api/health">/api/health</a> - Health check</li>
        <li><a href="/api/status">/api/status</a> - Status check</li>
        <li><a href="/api/test">/api/test</a> - Test endpoint</li>
      </ul>
    </body>
    </html>
  `);
});

// Health check for production
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'running',
    environment: NODE_ENV,
    server: 'production',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Production Server Started`);
  console.log(`📡 Server running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Process ID: ${process.pid}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;
