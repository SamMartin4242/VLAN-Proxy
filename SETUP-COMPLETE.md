# ✅ Proxy + Dashboard Setup Complete!

## 🎉 What's Running

### Proxy Server with Real-Time Dashboard
- **URL:** http://localhost:8080
- **Dashboard:** http://localhost:8080/dashboard
- **Health Check:** http://localhost:8080/proxy-health
- **Stats API:** http://localhost:8080/proxy-stats

### Features:
✅ HTTP/HTTPS proxy routing  
✅ Real-time WebSocket dashboard  
✅ Live traffic visualization  
✅ Request/response logging  
✅ Statistics tracking  
✅ Beautiful gradient UI  
✅ Auto-reconnecting dashboard  

---

## 📁 Files Created

### Proxy Server (Node.js)
1. **server.js** - Main proxy server with WebSocket support
2. **dashboard.html** - Real-time traffic visualization
3. **package.json** - Node.js dependencies (express, http-proxy, ws, morgan, cors)
4. **logs/** - Directory for access logs and detailed logs

### Portenta H7 (Arduino C++)
1. **ProxyHelper.h** - C++ helper class for routing through proxy
   - Location: `c:\Users\sam.martin\Documents\RIQ__M7\src\Rev21\ProxyHelper.h`
   - Converts URLs: `http://example.com` → `http://192.168.8.112:8080/http://example.com`

### Documentation
1. **PROXY-QUICKSTART.md** - Setup guide for proxy server
2. **PORTENTA-PROXY-GUIDE.md** - How to modify Portenta H7 code
3. **phase1-complete.md** - Network discovery summary
4. **nodejs-proxy-plan.md** - Proxy architecture
5. Plus other planning docs...

---

## 🚀 What to Do Next

### Option 1: Test Dashboard with curl
Open a new PowerShell window and run:

```powershell
# Test proxy routing
Invoke-WebRequest -Uri "http://localhost:8080/http://api.ipify.org?format=json" -UseBasicParsing

# Check the dashboard - you should see the request appear in real-time!
```

### Option 2: Modify Portenta H7 Code

Follow the guide in **PORTENTA-PROXY-GUIDE.md**:

1. Open `IoTConnect.cpp`
2. Add at top:
   ```cpp
   #include "ProxyHelper.h"
   ```
3. Find the `SyncCall()` function (line 384)
4. Replace:
   ```cpp
   http.post(serverName.c_str(), urlPath.c_str());
   ```
   With:
   ```cpp
   if (ProxyHelper::isEnabled()) {
       String proxyUrl = String("/https://") + serverName + urlPath;
       http.post(ProxyHelper::getProxyHost(), 
                 ProxyHelper::getProxyPort(), 
                 proxyUrl.c_str());
   } else {
       http.post(serverName.c_str(), urlPath.c_str());
   }
   ```
5. Compile and upload:
   ```powershell
   cd c:\Users\sam.martin\Documents\RIQ__M7
   pio run --target upload
   ```
6. Watch the dashboard! 🎉

---

## 📊 Dashboard Features

### Live Statistics
- **Total Requests** - All requests processed
- **Successful** - 2xx/3xx responses
- **Errors** - 4xx/5xx responses  
- **Uptime** - How long the proxy has been running

### Traffic Log
- 📤 **Blue** - Outgoing requests from Portenta H7
- 📥 **Green** - Successful responses
- ❌ **Red** - Error responses
- Real-time updates via WebSocket
- Auto-scrolling
- Timestamp on every entry
- Clear logs button

### Visual Design
- Beautiful gradient purple background
- Glass-morphism cards
- Smooth animations
- Mobile responsive
- Dark theme optimized for monitoring

---

## 🎯 How It Works

```
[Portenta H7] --WiFi--> [Your PC: 192.168.8.112:8080]
                              ↓
                        [Proxy Server]
                              ↓
                        [WebSocket Broadcast]
                              ↓
                        [Dashboard (Browser)]
                              ↓
                        [Internet APIs]
```

1. **Portenta H7** makes HTTP request to proxy (192.168.8.112:8080)
2. **Proxy** receives request, logs it
3. **WebSocket** broadcasts request to dashboard in real-time
4. **Dashboard** displays request with animation
5. **Proxy** forwards request to target server
6. **Response** comes back through proxy
7. **WebSocket** broadcasts response to dashboard
8. **Dashboard** shows response status
9. **Statistics** update automatically

---

## 🔍 Monitoring & Debugging

### Watch Proxy Console
The PowerShell window running the server shows:
```
📡 PROXY REQUEST: { ... }
✅ PROXY RESPONSE: { ... }
```

### View Log Files
```powershell
# Access log (Apache format)
Get-Content .\logs\proxy-access.log -Tail 20 -Wait

# Detailed JSON log
Get-Content .\logs\proxy-detailed.log | Select-Object -Last 5
```

### Check Server Status
```powershell
# Health check
curl http://localhost:8080/proxy-health

# Statistics
curl http://localhost:8080/proxy-stats
```

---

## 🛠️ Configuration

### Proxy Settings (server.js)
```javascript
const CONFIG = {
  HTTP_PORT: 8080,        // Change proxy port
  BIND_ADDRESS: '0.0.0.0', // '0.0.0.0' = all interfaces
  REQUIRE_AUTH: false,     // Enable authentication (later)
  LOG_REQUESTS: true,      // Log all requests
};
```

### Portenta H7 Settings (ProxyHelper.h)
```cpp
#define PROXY_ENABLED true              // Enable/disable proxy
#define PROXY_HOST "192.168.8.112"      // Your PC IP
#define PROXY_PORT 8080                  // Proxy port
```

---

## 🎨 Dashboard Customization

Want to change the dashboard appearance?

### Colors
Edit `dashboard.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change to your favorite gradient! */
```

### Max Log Entries
```javascript
// In dashboard.html, find:
while (container.children.length > 50) {
    // Change 50 to any number
}
```

### Update Frequency
```javascript
setInterval(updateUptime, 1000);  // Update every 1000ms (1 second)
```

---

## 🐛 Troubleshooting Quick Reference

### Dashboard Won't Connect
1. Check server is running: `curl http://localhost:8080/proxy-health`
2. Reload dashboard page
3. Check browser console (F12) for errors

### No Traffic Appearing
1. Is Portenta H7 code modified to use proxy?
2. Is ProxyHelper.h included?
3. Check Portenta serial monitor for connection errors
4. Verify IP address is correct (192.168.8.112)

### Firewall Issues
```powershell
New-NetFirewallRule -DisplayName "IoT Proxy Dashboard" `
    -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

---

## 📈 Next Phase: Authentication & Rotating Keys

Once you have traffic flowing through the proxy, we can add:

1. **Token-based authentication**
   - Each request requires valid token
   - Token sent in header: `X-Proxy-Auth: <token>`

2. **Rotating credentials**
   - Tokens expire every X hours/days
   - New tokens delivered via Azure Device Twin
   - No firmware update needed to rotate

3. **Per-device tokens**
   - Each Portenta H7 gets unique token
   - Track which device made which request
   - Revoke individual device access

4. **Token management dashboard**
   - View active tokens
   - Manually revoke tokens
   - See token usage statistics

---

## 🎯 Success Criteria

You'll know everything is working when:

✅ Dashboard shows "🟢 Connected" status  
✅ Test curl request appears on dashboard  
✅ Statistics increment correctly  
✅ Portenta H7 requests appear in real-time  
✅ Responses show correct status codes  
✅ Logs are being written to files  

---

## 💡 Cool Things to Try

### 1. Multiple Devices
Connect multiple Portenta H7 devices - dashboard shows all traffic!

### 2. Filter by Device
Add device ID to logs:
```cpp
// In Portenta code
http.sendHeader("X-Device-ID", String(uniqueId));
```

Dashboard will show which device made each request!

### 3. Request Blocking
Add to `server.js`:
```javascript
// Block certain URLs
if (target.includes('badsite.com')) {
    return res.status(403).json({ error: 'Blocked' });
}
```

### 4. Response Modification
Intercept and modify responses:
```javascript
proxy.on('proxyRes', (proxyRes, req, res) => {
    // Inject custom headers
    proxyRes.headers['X-Proxy-Stamp'] = Date.now();
});
```

---

## 📚 Learn More

### How Proxies Work
- Check out: PROXY-QUICKSTART.md

### Modify Portenta H7
- Guide: PORTENTA-PROXY-GUIDE.md

### Network Planning
- Details: network-planning.md

### Overall Project
- Plan: plan.md

---

**You now have a complete proxy server with live dashboard!** 🎉

**Ready to:**
1. Test the dashboard with curl commands
2. Modify Portenta H7 code to use proxy
3. Add authentication and rotating keys

What would you like to do next?

*Setup Complete - October 16, 2025*
