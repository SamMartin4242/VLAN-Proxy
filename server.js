// ============================================================================
// IoT Proxy Server for Portenta H7 Testing
// ============================================================================
// This proxy server routes HTTP/HTTPS traffic from IoT devices
// Provides logging, monitoring, and optional authentication
// ============================================================================

const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Proxy server settings
  HTTP_PORT: 8080,
  HTTPS_PORT: 8443,
  
  // Network settings
  BIND_ADDRESS: '0.0.0.0', // Listen on all interfaces
  
  // Logging
  LOG_FILE: 'proxy-access.log',
  LOG_REQUESTS: true,
  LOG_RESPONSES: true,
  
  // Security (for future use)
  REQUIRE_AUTH: false,
  AUTH_TOKEN: 'your-secret-token-here',
  
  // Features
  ENABLE_CORS: true,
  ENABLE_HTTPS: false, // Set to true if you have SSL certs
};

// ============================================================================
// Setup Express App
// ============================================================================

const app = express();

// Enable CORS if configured
if (CONFIG.ENABLE_CORS) {
  app.use(cors());
}

// Parse JSON bodies
app.use(express.json());

// ============================================================================
// Logging Setup
// ============================================================================

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, CONFIG.LOG_FILE),
  { flags: 'a' }
);

// Custom logging format
morgan.token('body', (req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body).substring(0, 200);
  }
  return '-';
});

// Use morgan for HTTP request logging
app.use(morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - Body: :body',
  { stream: accessLogStream }
));

// Also log to console
app.use(morgan('dev'));

// ============================================================================
// Custom Request Logger
// ============================================================================

function logProxyRequest(req, target) {
  // Ignore favicon requests (browser noise)
  if (req.url.includes('favicon')) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    target: target,
    headers: req.headers,
    ip: req.connection.remoteAddress,
  };
  
  console.log('\n📡 PROXY REQUEST:', JSON.stringify(logEntry, null, 2));
  
  // Write to detailed log file
  const detailedLog = path.join(logsDir, 'proxy-detailed.log');
  fs.appendFileSync(detailedLog, JSON.stringify(logEntry) + '\n');
  
  // Broadcast to dashboard (will be defined after WebSocket setup)
  if (typeof broadcastToDashboard !== 'undefined') {
    broadcastToDashboard({
      type: 'request',
      data: logEntry
    });
  }
}

// ============================================================================
// Create HTTP Proxy
// ============================================================================

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  secure: false, // Allow self-signed certificates
  followRedirects: true,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('❌ Proxy Error:', err.message);
  console.error('   URL:', req.url);
  console.error('   Method:', req.method);
  
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Bad Gateway',
      message: 'Proxy encountered an error',
      details: err.message,
      timestamp: new Date().toISOString()
    }));
  }
});

// Log successful proxy responses
proxy.on('proxyRes', (proxyRes, req, res) => {
  const responseData = {
    status: proxyRes.statusCode,
    url: req.url,
    headers: proxyRes.headers,
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ PROXY RESPONSE:', responseData);
  
  // Broadcast to dashboard
  if (typeof broadcastToDashboard !== 'undefined') {
    broadcastToDashboard({
      type: 'response',
      data: responseData
    });
  }
});

// ============================================================================
// Authentication Middleware (Optional)
// ============================================================================

function checkAuth(req, res, next) {
  if (!CONFIG.REQUIRE_AUTH) {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = req.headers['x-proxy-token'];
  
  if (authHeader === `Bearer ${CONFIG.AUTH_TOKEN}` || token === CONFIG.AUTH_TOKEN) {
    return next();
  }
  
  console.log('🔒 Authentication failed for:', req.connection.remoteAddress);
  res.status(407).json({
    error: 'Proxy Authentication Required',
    message: 'Please provide valid authentication token'
  });
}

// ============================================================================
// Proxy Routes
// ============================================================================

// Health check endpoint
app.get('/proxy-health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    config: {
      http_port: CONFIG.HTTP_PORT,
      https_port: CONFIG.HTTPS_PORT,
      auth_required: CONFIG.REQUIRE_AUTH,
    }
  });
});

// Statistics endpoint
let requestCount = 0;
let errorCount = 0;

app.get('/proxy-stats', (req, res) => {
  res.json({
    requests: requestCount,
    errors: errorCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Dashboard endpoint
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  res.sendFile(dashboardPath);
});

// Favicon endpoint (prevent browser spam)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Main proxy handler
app.use('*', checkAuth, (req, res) => {
  requestCount++;
  
  // Extract target URL from request
  let target;
  
  // Check if full URL is in the path (like /http://example.com/api)
  if (req.originalUrl.startsWith('/http://') || req.originalUrl.startsWith('/https://')) {
    target = req.originalUrl.substring(1);
  }
  // Check for target in headers
  else if (req.headers['x-proxy-target']) {
    target = req.headers['x-proxy-target'];
  }
  // Check for Host header to construct target
  else if (req.headers.host) {
    const protocol = req.secure ? 'https' : 'http';
    target = `${protocol}://${req.headers.host}${req.originalUrl}`;
  }
  else {
    errorCount++;
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Could not determine target URL',
      hint: 'Provide target in URL path or X-Proxy-Target header'
    });
  }
  
  // Log the request
  logProxyRequest(req, target);
  
  // Proxy the request
  try {
    proxy.web(req, res, { target });
  } catch (err) {
    errorCount++;
    console.error('❌ Proxy exception:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

// ============================================================================
// Start HTTP Server
// ============================================================================

const httpServer = http.createServer(app);

// ============================================================================
// WebSocket Server for Real-Time Dashboard
// ============================================================================

const wss = new WebSocket.Server({ server: httpServer });

// Store connected WebSocket clients
const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 Dashboard connected');
  wsClients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to IoT Proxy Server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    console.log('🔌 Dashboard disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    wsClients.delete(ws);
  });
});

// Function to broadcast to all connected dashboards
function broadcastToDashboard(data) {
  const message = JSON.stringify(data);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

httpServer.listen(CONFIG.HTTP_PORT, CONFIG.BIND_ADDRESS, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 IoT Proxy Server Started!');
  console.log('='.repeat(70));
  console.log(`📡 HTTP Proxy:  http://${CONFIG.BIND_ADDRESS}:${CONFIG.HTTP_PORT}`);
  console.log(`📊 Dashboard:   http://localhost:${CONFIG.HTTP_PORT}/dashboard`);
  console.log(`📈 Stats:       http://localhost:${CONFIG.HTTP_PORT}/proxy-stats`);
  console.log(`💚 Health:      http://localhost:${CONFIG.HTTP_PORT}/proxy-health`);
  console.log('='.repeat(70));
  console.log(`🔐 Authentication: ${CONFIG.REQUIRE_AUTH ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📝 Logging: ${CONFIG.LOG_REQUESTS ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📁 Log Directory: ${logsDir}`);
  console.log('='.repeat(70));
  console.log('\n💡 Usage Examples:');
  console.log('   Direct URL:    http://localhost:8080/http://api.example.com/data');
  console.log('   With header:   Set "X-Proxy-Target: http://api.example.com/data"');
  console.log('   Dashboard:     http://localhost:8080/dashboard');
  console.log('='.repeat(70) + '\n');
  console.log('✅ Ready to proxy requests from Portenta H7!\n');
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down proxy server...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  errorCount++;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  errorCount++;
});

// ============================================================================
// Export for testing
// ============================================================================

module.exports = { app, httpServer, proxy };
