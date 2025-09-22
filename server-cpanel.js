import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - cPanel health check
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Document Generator</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { color: green; font-weight: bold; }
        .endpoint { margin: 10px 0; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🚀 Document Generator Server</h1>
      <p class="status">✅ Status: Running</p>
      <p>Environment: Production</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
      <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
      
      <h2>Available Endpoints:</h2>
      <div class="endpoint">
        <a href="/api/health">/api/health</a> - Health check (JSON)
      </div>
      <div class="endpoint">
        <a href="/api/status">/api/status</a> - Status check (JSON)
      </div>
      <div class="endpoint">
        <a href="/api/test">/api/test</a> - Test endpoint (JSON)
      </div>
      
      <h2>Next Steps:</h2>
      <p>1. Replace this file with your full server.js</p>
      <p>2. Upload your templates folder</p>
      <p>3. Install Python dependencies</p>
      <p>4. Test document generation</p>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'running',
    environment: 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    message: 'Server is healthy'
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'running',
    server: 'cpanel-compatible',
    timestamp: new Date().toISOString(),
    message: 'Ready for deployment'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    message: 'Test successful!',
    timestamp: new Date().toISOString(),
    success: true
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 cPanel-Compatible Server Started`);
  console.log(`📡 Running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: Production`);
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
