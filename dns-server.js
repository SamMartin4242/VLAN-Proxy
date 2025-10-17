// ============================================================================
// Simple DNS Server for Proxy Routing
// ============================================================================
// Routes Azure IoT Hub hostname to local proxy, forwards everything else
// ============================================================================

const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const CONFIG = {
  DNS_PORT: 53,
  PROXY_IP: '192.168.8.112',
  AZURE_HOSTNAME: 'RIQ-IOTHUB.azure-devices.net',
  UPSTREAM_DNS: '8.8.8.8',  // Google DNS for other queries
  BIND_ADDRESS: '0.0.0.0',
};

const server = dgram.createSocket('udp4');

console.log('');
console.log('======================================================================');
console.log('🌐 DNS Server for IoT Proxy');
console.log('======================================================================');
console.log(`📡 Listening on: ${CONFIG.BIND_ADDRESS}:${CONFIG.DNS_PORT}`);
console.log(`🔀 Azure Route: ${CONFIG.AZURE_HOSTNAME} → ${CONFIG.PROXY_IP}`);
console.log(`📤 Upstream DNS: ${CONFIG.UPSTREAM_DNS}`);
console.log('======================================================================');
console.log('');

server.on('message', async (msg, rinfo) => {
  try {
    const query = dnsPacket.decode(msg);
    
    if (query.questions && query.questions.length > 0) {
      const question = query.questions[0];
      const hostname = question.name.toLowerCase();
      
      console.log(`🔍 DNS Query from ${rinfo.address}: ${hostname} (${question.type})`);
      
      // Check if this is the Azure IoT Hub hostname
      if (hostname === CONFIG.AZURE_HOSTNAME.toLowerCase() && question.type === 'A') {
        // Respond with proxy IP
        const response = dnsPacket.encode({
          type: 'response',
          id: query.id,
          flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE | dnsPacket.AUTHORITATIVE_ANSWER,
          questions: query.questions,
          answers: [{
            type: 'A',
            class: 'IN',
            name: hostname,
            ttl: 300,
            data: CONFIG.PROXY_IP,
          }],
        });
        
        server.send(response, rinfo.port, rinfo.address);
        console.log(`   ✅ Responded: ${hostname} → ${CONFIG.PROXY_IP} (PROXY)`);
      } else {
        // Forward to upstream DNS
        forwardDNSQuery(msg, query, rinfo);
      }
    }
  } catch (err) {
    console.error(`❌ DNS Error: ${err.message}`);
  }
});

function forwardDNSQuery(originalMsg, query, clientInfo) {
  const upstreamSocket = dgram.createSocket('udp4');
  
  const timeout = setTimeout(() => {
    upstreamSocket.close();
    console.log(`   ⏱️ Timeout forwarding query`);
  }, 5000);
  
  upstreamSocket.on('message', (upstreamResponse) => {
    clearTimeout(timeout);
    server.send(upstreamResponse, clientInfo.port, clientInfo.address);
    upstreamSocket.close();
    
    try {
      const decoded = dnsPacket.decode(upstreamResponse);
      const answers = decoded.answers.map(a => `${a.name} → ${a.data}`).join(', ');
      console.log(`   ✅ Forwarded: ${answers}`);
    } catch (err) {
      console.log(`   ✅ Forwarded response`);
    }
  });
  
  upstreamSocket.send(originalMsg, 53, CONFIG.UPSTREAM_DNS);
}

server.on('error', (err) => {
  console.error(`❌ DNS Server Error: ${err.message}`);
  if (err.code === 'EACCES') {
    console.error('');
    console.error('🚫 ERROR: Port 53 requires administrator privileges!');
    console.error('   Please run as Administrator (Right-click PowerShell → Run as Administrator)');
    console.error('');
  } else if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('🚫 ERROR: Port 53 is already in use!');
    console.error('   Another DNS server may be running.');
    console.error('');
  }
  process.exit(1);
});

server.bind(CONFIG.DNS_PORT, CONFIG.BIND_ADDRESS, () => {
  console.log('✅ DNS Server ready to route Azure traffic through proxy!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Shutting down DNS server...');
  server.close(() => {
    console.log('✅ DNS server closed');
    process.exit(0);
  });
});
