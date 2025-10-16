# IoT Proxy Server - Quick Start Guide

## What We Built

A **Node.js HTTP/HTTPS proxy server** that:
- ✅ Routes traffic from your Portenta H7 to the internet
- ✅ Logs all requests for monitoring
- ✅ Provides statistics and health checks
- ✅ Ready for authentication (we'll add rotating keys later)

## Installation & Setup

### Step 1: Install Dependencies

```powershell
cd c:\Users\sam.martin\Documents\VLAN+Proxy
npm install
```

This will install:
- `express` - Web server framework
- `http-proxy` - Proxy functionality
- `morgan` - HTTP request logger
- `cors` - Cross-origin support

### Step 2: Start the Proxy Server

```powershell
npm start
```

You should see:
```
======================================================================
🚀 IoT Proxy Server Started!
======================================================================
📡 HTTP Proxy:  http://0.0.0.0:8080
📊 Stats:       http://localhost:8080/proxy-stats
💚 Health:      http://localhost:8080/proxy-health
======================================================================
🔐 Authentication: DISABLED
📝 Logging: ENABLED
📁 Log Directory: c:\Users\sam.martin\Documents\VLAN+Proxy\logs
======================================================================

✅ Ready to proxy requests from Portenta H7!
```

---

## Testing the Proxy

### Test 1: From Your PC (Quick Test)

Open a new PowerShell window:

```powershell
# Test 1: Simple GET request
curl http://localhost:8080/http://api.ipify.org?format=json

# Test 2: Check proxy stats
curl http://localhost:8080/proxy-stats

# Test 3: Health check
curl http://localhost:8080/proxy-health
```

### Test 2: From Browser

Open your browser to:
- http://localhost:8080/proxy-health
- http://localhost:8080/proxy-stats

---

## How to Use the Proxy

### Method 1: Full URL in Path (Easiest)

```
http://localhost:8080/http://example.com/api/data
                      └─ Target URL here
```

**Example:**
```powershell
curl http://localhost:8080/http://google.com
```

### Method 2: Using Custom Header

```javascript
fetch('http://localhost:8080/api/data', {
  headers: {
    'X-Proxy-Target': 'http://api.example.com'
  }
})
```

---

## Configure Portenta H7 to Use Proxy

### Current Setup:
Your Portenta H7 uses `HttpClient` class (from your code).

### Option A: Modify HttpClient to Use Proxy

In your `M7.cpp` or wherever you make HTTP requests:

```cpp
// Instead of:
// http.begin(client, "http://api.example.com/data");

// Use proxy URL:
http.begin(client, "http://192.168.8.112:8080/http://api.example.com/data");
                   └─ Your PC IP    └─ Proxy port  └─ Target URL
```

### Option B: Set Proxy in WiFiClient

If your HTTP library supports proxy configuration:

```cpp
// Set proxy server
WiFiClient client;
client.setProxy("192.168.8.112", 8080);

// Then make normal requests
http.begin(client, "http://api.example.com/data");
```

### Option C: Create Helper Function

```cpp
String buildProxyUrl(const char* targetUrl) {
  String proxyHost = "192.168.8.112";
  int proxyPort = 8080;
  return "http://" + proxyHost + ":" + String(proxyPort) + "/" + String(targetUrl);
}

// Usage:
String url = buildProxyUrl("http://api.example.com/data");
http.begin(client, url);
```

---

## Monitoring & Logs

### View Live Logs

The proxy logs to console in real-time. Watch for:

```
📡 PROXY REQUEST: {
  "timestamp": "2025-10-16T...",
  "method": "GET",
  "url": "/http://api.example.com/data",
  "target": "http://api.example.com/data",
  "ip": "192.168.8.112"
}

✅ PROXY RESPONSE: {
  "status": 200,
  "url": "/http://api.example.com/data"
}
```

### Log Files

Logs are saved in: `c:\Users\sam.martin\Documents\VLAN+Proxy\logs\`

**Files:**
- `proxy-access.log` - HTTP access log (Apache format)
- `proxy-detailed.log` - Detailed JSON logs

**View logs:**
```powershell
# Tail access log
Get-Content .\logs\proxy-access.log -Tail 20 -Wait

# View detailed log
Get-Content .\logs\proxy-detailed.log | Select-Object -Last 5
```

---

## Check Proxy Statistics

```powershell
curl http://localhost:8080/proxy-stats
```

**Response:**
```json
{
  "requests": 42,
  "errors": 0,
  "uptime": 3600,
  "timestamp": "2025-10-16T..."
}
```

---

## Configuration Options

Edit `server.js` to change settings:

```javascript
const CONFIG = {
  HTTP_PORT: 8080,        // Change proxy port
  HTTPS_PORT: 8443,       // HTTPS port (if enabled)
  
  BIND_ADDRESS: '0.0.0.0', // '0.0.0.0' = all interfaces
                           // '127.0.0.1' = localhost only
  
  LOG_REQUESTS: true,      // Enable request logging
  LOG_RESPONSES: true,     // Enable response logging
  
  REQUIRE_AUTH: false,     // Enable authentication (later)
  AUTH_TOKEN: 'secret',    // Authentication token
};
```

**After changes:**
```powershell
# Stop server (Ctrl+C)
# Restart
npm start
```

---

## Network Configuration

### Your PC IP Address

The Portenta H7 needs to reach your PC. Find your IP:

```powershell
ipconfig | Select-String "IPv4"
```

**You should see:** `192.168.8.112`

### Firewall Rules

**Windows Firewall might block the proxy!**

**Option 1: Allow Node.js through firewall**
- Windows will prompt when you start the server
- Click "Allow access"

**Option 2: Manual firewall rule**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "IoT Proxy Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

**Option 3: Temporarily disable firewall (testing only)**
```powershell
# Not recommended for production!
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

---

## Testing with Portenta H7

### Step 1: Modify Your Code

Find where you make HTTP requests (likely in `IoTConnect.cpp` or `M7.cpp`).

**Example modification:**

```cpp
// Original code (example)
String endpoint = "http://api.example.com/data";

// Modified to use proxy
String proxyHost = "192.168.8.112";  // Your PC IP
int proxyPort = 8080;
String endpoint = "http://" + proxyHost + ":" + String(proxyPort) + "/http://api.example.com/data";

// Make request as normal
http.begin(client, endpoint);
int httpCode = http.GET();
```

### Step 2: Upload to Portenta H7

```powershell
# Compile and upload via PlatformIO
cd c:\Users\sam.martin\Documents\RIQ__M7
pio run --target upload
```

### Step 3: Monitor Both Sides

**Terminal 1: Proxy Server Logs**
```powershell
cd c:\Users\sam.martin\Documents\VLAN+Proxy
npm start
```

**Terminal 2: Portenta H7 Serial Monitor**
```powershell
cd c:\Users\sam.martin\Documents\RIQ__M7
pio device monitor -b 115200
```

### Step 4: Watch the Magic! ✨

When Portenta H7 makes a request, you'll see:
- Proxy logs the request
- Proxy forwards to internet
- Response comes back
- Portenta H7 receives data

---

## Troubleshooting

### Proxy Won't Start

**Error: Port 8080 already in use**
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <process_id> /F
```

**Error: Cannot find module**
```powershell
# Reinstall dependencies
rm -r node_modules
npm install
```

### Portenta H7 Can't Connect

**Check 1: Can you ping your PC from another device?**
```powershell
ping 192.168.8.112
```

**Check 2: Is the proxy running?**
```powershell
curl http://localhost:8080/proxy-health
```

**Check 3: Firewall blocking?**
```powershell
# Test from another PC on same network
curl http://192.168.8.112:8080/proxy-health
```

**Check 4: IP address correct?**
```powershell
ipconfig | Select-String "IPv4"
# Verify it matches what you put in Portenta H7 code
```

### Requests Failing

**Check proxy logs for errors**
- Look for ❌ symbols in console
- Check `logs/proxy-detailed.log`

**Common issues:**
- Target URL malformed
- DNS resolution failure
- Timeout (increase timeout in proxy)
- HTTPS certificate issues

---

## Next Steps

### Phase 3A: ✅ Basic Proxy (You Are Here!)
- [x] Node.js proxy server running
- [x] Logging and monitoring
- [ ] Test with Portenta H7

### Phase 3B: Add Features
- [ ] Proxy authentication (rotating keys)
- [ ] Request filtering/blocking
- [ ] Response caching
- [ ] Rate limiting
- [ ] HTTPS support

### Phase 3C: Production Ready
- [ ] Run as Windows service
- [ ] Persistent storage
- [ ] Dashboard UI
- [ ] Metrics and alerting

---

## Quick Command Reference

```powershell
# Start proxy server
cd c:\Users\sam.martin\Documents\VLAN+Proxy
npm start

# Test proxy
curl http://localhost:8080/proxy-health
curl http://localhost:8080/http://api.ipify.org?format=json

# View logs
Get-Content .\logs\proxy-access.log -Tail 20 -Wait

# Check stats
curl http://localhost:8080/proxy-stats

# Find your IP
ipconfig | Select-String "IPv4"

# Allow through firewall
New-NetFirewallRule -DisplayName "IoT Proxy" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

---

## Support

If you run into issues:
1. Check the logs in `logs/` directory
2. Verify network connectivity
3. Test with curl before trying Portenta H7
4. Check Windows Firewall settings

---

**Ready to start the proxy server?**

```powershell
npm install
npm start
```

**Then test it:**
```powershell
curl http://localhost:8080/proxy-health
```

🚀 Let me know when it's running and we'll configure the Portenta H7!

*Proxy Server Quick Start - Created: October 16, 2025*
