// ============================================================================
// IoT Proxy Server with MQTT Support
// ============================================================================
// Handles both HTTP and MQTT (MQTTS) traffic for enterprise IoT deployments
// Provides real-time dashboard for monitoring all traffic
// ============================================================================

const http = require('http');
const net = require('net');
const tls = require('tls');
const httpProxy = require('http-proxy');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const MQTTPacketParser = require('./mqtt-parser');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // HTTP Proxy settings
  HTTP_PORT: 8080,
  
  // MQTT Proxy settings
  MQTT_PORT: 1883,      // Non-TLS MQTT
  MQTTS_PORT: 8883,     // TLS MQTT (Azure IoT Hub uses this)
  
  // Azure IoT Hub endpoint (hardcoded for TLS passthrough)
  AZURE_IOT_HUB_FQDN: 'RIQ-IOTHUB.azure-devices.net',
  AZURE_IOT_HUB_PORT: 8883,
  
  // Network settings
  BIND_ADDRESS: '0.0.0.0',
  
  // Logging
  LOG_REQUESTS: true,
  LOG_MQTT_PACKETS: false, // Set to true for verbose MQTT packet logging
  
  // Security
  REQUIRE_AUTH: false,
  AUTH_TOKEN: 'your-secret-token-here',
};

// ============================================================================
// Setup Express App for HTTP Proxy & Dashboard
// ============================================================================

const app = express();

app.use(cors());
app.use(express.json());

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// HTTP access logging
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'proxy-access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// ============================================================================
// Statistics Tracking
// ============================================================================

const stats = {
  http: {
    requests: 0,
    errors: 0,
  },
  mqtt: {
    connections: 0,
    packets: 0,
    bytesTransferred: 0,
    activeConnections: 0,
  },
  startTime: Date.now(),
};

// ============================================================================
// HTTP Proxy Setup (from previous version)
// ============================================================================

const httpProxyServer = httpProxy.createProxyServer({
  changeOrigin: true,
  secure: false,
});

httpProxyServer.on('error', (err, req, res) => {
  console.error('❌ HTTP Proxy Error:', err.message);
  stats.http.errors++;
  
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Bad Gateway',
      message: err.message,
      timestamp: new Date().toISOString()
    }));
  }
  
  broadcastToDashboard({
    type: 'error',
    protocol: 'HTTP',
    data: {
      message: err.message,
      timestamp: new Date().toISOString()
    }
  });
});

httpProxyServer.on('proxyRes', (proxyRes, req, res) => {
  broadcastToDashboard({
    type: 'response',
    protocol: 'HTTP',
    data: {
      status: proxyRes.statusCode,
      url: req.url,
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// Dashboard & Health Endpoints
// ============================================================================

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-mqtt.html'));
});

app.get('/proxy-health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    stats: {
      http: stats.http,
      mqtt: stats.mqtt,
    }
  });
});

app.get('/proxy-stats', (req, res) => {
  res.json({
    http: stats.http,
    mqtt: stats.mqtt,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Main HTTP proxy handler
app.use('*', (req, res) => {
  // Skip logging for favicon and dashboard
  if (req.url === '/favicon.ico' || req.url === '/dashboard' || 
      req.url === '/proxy-health' || req.url === '/proxy-stats') {
    return;
  }
  
  stats.http.requests++;
  
  let target;
  if (req.originalUrl.startsWith('/http://') || req.originalUrl.startsWith('/https://')) {
    target = req.originalUrl.substring(1);
  } else if (req.headers['x-proxy-target']) {
    target = req.headers['x-proxy-target'];
  } else if (req.headers.host && req.headers.host !== 'localhost:8080') {
    target = `http://${req.headers.host}${req.originalUrl}`;
  } else {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Unable to determine target URL'
    });
  }
  
  console.log(`📡 HTTP: ${req.method} ${target}`);
  
  broadcastToDashboard({
    type: 'request',
    protocol: 'HTTP',
    data: {
      method: req.method,
      url: target,
      timestamp: new Date().toISOString(),
      ip: req.connection.remoteAddress,
    }
  });
  
  httpProxyServer.web(req, res, { target });
});

// ============================================================================
// MQTT Proxy Server
// ============================================================================

const mqttConnections = new Map();

function createMQTTProxy(port, useTLS = false) {
  const server = net.createServer((clientSocket) => {
    const connectionId = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
    stats.mqtt.connections++;
    stats.mqtt.activeConnections++;
    
    console.log(`\n🔌 MQTT Connection: ${connectionId}`);
    console.log(`   Protocol: ${useTLS ? 'MQTTS (TLS)' : 'MQTT'}`);
    
    broadcastToDashboard({
      type: 'mqtt-connect',
      data: {
        connectionId,
        protocol: useTLS ? 'MQTTS' : 'MQTT',
        port,
        timestamp: new Date().toISOString(),
        remoteAddress: clientSocket.remoteAddress,
      }
    });
    
    let targetHost = null;
    let targetPort = null;
    let serverSocket = null;
    let isConnectedToServer = false;
    
    // For TLS connections, use hardcoded Azure hostname (can't parse encrypted MQTT)
    if (useTLS) {
      targetHost = CONFIG.AZURE_IOT_HUB_FQDN;
      targetPort = CONFIG.AZURE_IOT_HUB_PORT;
      
      console.log(`   Target: ${targetHost}:${targetPort} (TLS passthrough)`);
      
      broadcastToDashboard({
        type: 'mqtt-connect-details',
        data: {
          connectionId,
          hostname: targetHost,
          port: targetPort,
          protocol: 'MQTTS',
          timestamp: new Date().toISOString(),
        }
      });
      
      // Create TLS connection to Azure IoT Hub
      serverSocket = tls.connect({
        host: targetHost,
        port: targetPort,
        servername: targetHost,
      }, () => {
        console.log(`✅ MQTT: Connected to ${targetHost}:${targetPort}`);
        isConnectedToServer = true;
      });
      
      serverSocket.on('error', (err) => {
        console.error(`❌ MQTT: Server connection error: ${err.message}`);
        clientSocket.end();
      });
      
      // Bidirectional forwarding
      setupMQTTForwarding(clientSocket, serverSocket, connectionId);
      
      return; // Exit early for TLS
    }
    
    // For non-TLS, buffer and parse MQTT CONNECT packet
    let buffer = Buffer.alloc(0);
    
    // Parse MQTT CONNECT packet to get hostname
    clientSocket.once('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      // Parse the MQTT CONNECT packet
      const connectInfo = MQTTPacketParser.parseConnectPacket(buffer);
      
      if (connectInfo && connectInfo.hostname) {
        targetHost = connectInfo.hostname;
        targetPort = useTLS ? 8883 : 1883;
        
        console.log(`   Client ID: ${connectInfo.clientId}`);
        console.log(`   Username: ${connectInfo.username}`);
        console.log(`   Target: ${targetHost}:${targetPort}`);
        
        broadcastToDashboard({
          type: 'mqtt-connect-details',
          data: {
            connectionId,
            clientId: connectInfo.clientId,
            username: connectInfo.username,
            hostname: targetHost,
            timestamp: new Date().toISOString(),
          }
        });
        
        // Create connection to actual MQTT broker
        if (useTLS) {
          serverSocket = tls.connect({
            host: targetHost,
            port: targetPort,
            servername: targetHost,
          }, () => {
            console.log(`✅ MQTT: Connected to ${targetHost}:${targetPort}`);
            isConnectedToServer = true;
            serverSocket.write(buffer);
          });
        } else {
          serverSocket = net.connect({
            host: targetHost,
            port: targetPort,
          }, () => {
            console.log(`✅ MQTT: Connected to ${targetHost}:${targetPort}`);
            isConnectedToServer = true;
            serverSocket.write(buffer);
          });
        }
        
        // Setup bidirectional piping
        setupMQTTForwarding(clientSocket, serverSocket, connectionId);
        
      } else {
        console.error(`❌ MQTT: Could not extract hostname from CONNECT packet`);
        console.log(`   Packet type: ${MQTTPacketParser.getPacketType(buffer)}`);
        clientSocket.end();
      }
    });
    
    // Handle client disconnect
    clientSocket.on('end', () => {
      console.log(`🔌 MQTT: Client disconnected ${connectionId}`);
      stats.mqtt.activeConnections--;
      if (serverSocket) serverSocket.end();
      
      broadcastToDashboard({
        type: 'mqtt-disconnect',
        data: {
          connectionId,
          timestamp: new Date().toISOString(),
        }
      });
    });
    
    clientSocket.on('error', (err) => {
      console.error(`❌ MQTT: Client error ${connectionId}:`, err.message);
      stats.mqtt.activeConnections--;
      if (serverSocket) serverSocket.destroy();
    });
  });
  
  server.listen(port, CONFIG.BIND_ADDRESS, () => {
    console.log(`📡 MQTT${useTLS ? 'S' : ''} Proxy listening on ${CONFIG.BIND_ADDRESS}:${port}`);
  });
  
  return server;
}

function setupMQTTForwarding(clientSocket, serverSocket, connectionId) {
  // Client -> Server
  clientSocket.on('data', (data) => {
    stats.mqtt.packets++;
    stats.mqtt.bytesTransferred += data.length;
    
    if (CONFIG.LOG_MQTT_PACKETS) {
      console.log(`📤 MQTT ${connectionId}: Client -> Server (${data.length} bytes)`);
    }
    
    if (serverSocket && serverSocket.writable) {
      serverSocket.write(data);
    }
    
    broadcastToDashboard({
      type: 'mqtt-packet',
      data: {
        connectionId,
        direction: 'client-to-server',
        bytes: data.length,
        timestamp: new Date().toISOString(),
      }
    });
  });
  
  // Server -> Client
  serverSocket.on('data', (data) => {
    stats.mqtt.packets++;
    stats.mqtt.bytesTransferred += data.length;
    
    if (CONFIG.LOG_MQTT_PACKETS) {
      console.log(`📥 MQTT ${connectionId}: Server -> Client (${data.length} bytes)`);
    }
    
    if (clientSocket && clientSocket.writable) {
      clientSocket.write(data);
    }
    
    broadcastToDashboard({
      type: 'mqtt-packet',
      data: {
        connectionId,
        direction: 'server-to-client',
        bytes: data.length,
        timestamp: new Date().toISOString(),
      }
    });
  });
  
  // Handle server errors
  serverSocket.on('error', (err) => {
    console.error(`❌ MQTT: Server error ${connectionId}:`, err.message);
    clientSocket.end();
  });
  
  serverSocket.on('end', () => {
    console.log(`🔌 MQTT: Server closed connection ${connectionId}`);
    clientSocket.end();
  });
}

// ============================================================================
// WebSocket Server for Dashboard
// ============================================================================

const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

const wsClients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 Dashboard connected');
  wsClients.add(ws);
  
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to IoT Proxy Server (HTTP + MQTT)',
    timestamp: new Date().toISOString(),
    stats: {
      http: stats.http,
      mqtt: stats.mqtt,
    }
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

function broadcastToDashboard(data) {
  const message = JSON.stringify(data);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============================================================================
// Start All Servers
// ============================================================================

// HTTP Proxy
httpServer.listen(CONFIG.HTTP_PORT, CONFIG.BIND_ADDRESS, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 IoT Proxy Server Started (HTTP + MQTT)!');
  console.log('='.repeat(70));
  console.log(`📡 HTTP Proxy:   http://${CONFIG.BIND_ADDRESS}:${CONFIG.HTTP_PORT}`);
  console.log(`📡 MQTT Proxy:   mqtt://${CONFIG.BIND_ADDRESS}:${CONFIG.MQTT_PORT}`);
  console.log(`📡 MQTTS Proxy:  mqtts://${CONFIG.BIND_ADDRESS}:${CONFIG.MQTTS_PORT}`);
  console.log(`📊 Dashboard:    http://localhost:${CONFIG.HTTP_PORT}/dashboard`);
  console.log(`💚 Health:       http://localhost:${CONFIG.HTTP_PORT}/proxy-health`);
  console.log('='.repeat(70));
  console.log(`🔐 Authentication: ${CONFIG.REQUIRE_AUTH ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📝 MQTT Logging: ${CONFIG.LOG_MQTT_PACKETS ? 'VERBOSE' : 'SUMMARY'}`);
  console.log('='.repeat(70) + '\n');
  console.log('✅ Ready to proxy HTTP and MQTT traffic from Portenta H7!\n');
});

// MQTT Proxies
const mqttServer = createMQTTProxy(CONFIG.MQTT_PORT, false);
const mqttsServer = createMQTTProxy(CONFIG.MQTTS_PORT, true);

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down proxy server...');
  httpServer.close();
  mqttServer.close();
  mqttsServer.close();
  console.log('✅ Server closed');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

module.exports = { app, httpServer, mqttServer, mqttsServer };
