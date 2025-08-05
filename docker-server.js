/**
 * Docker Server Entry Point
 * Starts the mock server with health check endpoint
 */

const express = require('express');
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount the mock server routes
app.use(require('./src/mockServer/server'));

// Start server
const port = process.env.MOCK_SERVER_PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Mock server running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});