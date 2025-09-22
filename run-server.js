#!/usr/bin/env node

// Simple script to run the server without nodemon
// This prevents the restart loop during document generation

console.log('🚀 Starting server without nodemon...');
console.log('📝 This prevents restart loops during document generation');

// Import and start the server
import('./server.js').catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
