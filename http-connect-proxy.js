// ============================================================================
// Enterprise HTTP CONNECT Proxy Server
// ============================================================================
// Handles HTTP CONNECT tunneling for HTTPS/MQTTS traffic
// This is how real enterprise proxies (like Walmart's) work
// ============================================================================

const http = require('http');
const net = require('net');
const { URL } = require('url');

const CONFIG = {
  PROXY_PORT: 8080,
  BIND_ADDRESS: '0.0.0.0',
  REQUIRE_AUTH: false,
  AUTH_USERNAME: 'proxy',
  AUTH_PASSWORD: 'password',
  LOGGING: true,
};

let stats = {
  totalConnections: 0,
  activeConnections: 0,
  bytesTransferred: 0,
  connectRequests: 0,
  httpRequests: 0,
};

console.log('');
console.log('======================================================================');
console.log('🔐 Enterprise HTTP CONNECT Proxy Server');
console.log('======================================================================');
console.log(`📡 Listening on: ${CONFIG.BIND_ADDRESS}:${CONFIG.PROXY_PORT}`);
console.log(`🔒 Authentication: ${CONFIG.REQUIRE_AUTH ? 'ENABLED' : 'DISABLED'}`);
console.log('======================================================================');
console.log('');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle regular HTTP requests (not CONNECT)
  CONFIG.LOGGING && console.log(`📨 HTTP ${req.method} ${req.url}`);
  stats.httpRequests++;
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Enterprise HTTP CONNECT Proxy\n\nUse CONNECT method for HTTPS/MQTTS tunneling.\n');
});

// Handle CONNECT method for tunneling
server.on('connect', (req, clientSocket, head) => {
  const connectionId = ++stats.totalConnections;
  stats.activeConnections++;
  stats.connectRequests++;
  
  const [targetHost, targetPort] = req.url.split(':');
  
  console.log('');
  console.log(`🔌 CONNECT Request #${connectionId}`);
  console.log(`   From: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
  console.log(`   Target: ${targetHost}:${targetPort}`);
  console.log(`   Method: ${req.method} ${req.url}`);
  console.log(`   Headers:`, req.headers);
  
  // Check authentication if required
  if (CONFIG.REQUIRE_AUTH) {
    const auth = req.headers['proxy-authorization'];
    
    if (!auth) {
      console.log(`   ❌ Authentication required but not provided`);
      clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n');
      clientSocket.write('Proxy-Authenticate: Basic realm="Proxy"\r\n');
      clientSocket.write('\r\n');
      clientSocket.end();
      stats.activeConnections--;
      return;
    }
    
    // Validate Basic Auth
    const [type, credentials] = auth.split(' ');
    if (type !== 'Basic') {
      console.log(`   ❌ Invalid authentication type: ${type}`);
      clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
      clientSocket.end();
      stats.activeConnections--;
      return;
    }
    
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [username, password] = decoded.split(':');
    
    if (username !== CONFIG.AUTH_USERNAME || password !== CONFIG.AUTH_PASSWORD) {
      console.log(`   ❌ Invalid credentials: ${username}:${password}`);
      clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      clientSocket.end();
      stats.activeConnections--;
      return;
    }
    
    console.log(`   ✓ Authentication successful: ${username}`);
  }
  
  // Create connection to target server
  const serverSocket = net.connect(parseInt(targetPort), targetHost, () => {
    console.log(`   ✅ Connected to ${targetHost}:${targetPort}`);
    
    // Send 200 Connection Established to client
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n');
    clientSocket.write('Proxy-agent: Enterprise-HTTP-CONNECT-Proxy\r\n');
    clientSocket.write('\r\n');
    
    // Write any buffered data
    if (head && head.length > 0) {
      serverSocket.write(head);
      console.log(`   → Forwarded ${head.length} buffered bytes`);
    }
    
    console.log(`   🔄 Tunnel established - bidirectional forwarding active`);
  });
  
  // Handle connection errors
  serverSocket.on('error', (err) => {
    console.log(`   ❌ Server connection error: ${err.message}`);
    clientSocket.end();
  });
  
  clientSocket.on('error', (err) => {
    console.log(`   ❌ Client connection error: ${err.message}`);
    serverSocket.end();
  });
  
  // Bidirectional data forwarding
  let clientBytes = 0;
  let serverBytes = 0;
  
  clientSocket.on('data', (data) => {
    serverSocket.write(data);
    clientBytes += data.length;
    stats.bytesTransferred += data.length;
  });
  
  serverSocket.on('data', (data) => {
    clientSocket.write(data);
    serverBytes += data.length;
    stats.bytesTransferred += data.length;
  });
  
  // Handle connection close
  const cleanup = () => {
    stats.activeConnections--;
    console.log(`   🔌 Connection #${connectionId} closed`);
    console.log(`      ↑ Client → Server: ${clientBytes.toLocaleString()} bytes`);
    console.log(`      ↓ Server → Client: ${serverBytes.toLocaleString()} bytes`);
    console.log(`      Active connections: ${stats.activeConnections}`);
  };
  
  clientSocket.on('end', () => {
    serverSocket.end();
    cleanup();
  });
  
  serverSocket.on('end', () => {
    clientSocket.end();
    cleanup();
  });
});

server.on('error', (err) => {
  console.error(`❌ Proxy Server Error: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('🚫 ERROR: Port 8080 is already in use!');
    console.error('   Stop the other server first.');
    console.error('');
  }
  process.exit(1);
});

server.listen(CONFIG.PROXY_PORT, CONFIG.BIND_ADDRESS, () => {
  console.log('✅ Enterprise HTTP CONNECT Proxy ready!');
  console.log('   Devices can now connect using HTTP CONNECT tunneling.');
  console.log('');
  console.log('📚 Example CONNECT Request:');
  console.log('   CONNECT RIQ-IOTHUB.azure-devices.net:8883 HTTP/1.1');
  console.log('   Host: RIQ-IOTHUB.azure-devices.net:8883');
  console.log('');
});

// Stats endpoint
setInterval(() => {
  if (CONFIG.LOGGING && stats.connectRequests > 0) {
    console.log('');
    console.log('📊 Proxy Statistics:');
    console.log(`   Total Connections: ${stats.totalConnections}`);
    console.log(`   Active Connections: ${stats.activeConnections}`);
    console.log(`   CONNECT Requests: ${stats.connectRequests}`);
    console.log(`   HTTP Requests: ${stats.httpRequests}`);
    console.log(`   Bytes Transferred: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
  }
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Shutting down proxy server...');
  server.close(() => {
    console.log('✅ Proxy server closed');
    process.exit(0);
  });
});
