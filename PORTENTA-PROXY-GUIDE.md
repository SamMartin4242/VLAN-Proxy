# Portenta H7 Proxy Integration Guide

## 🎯 What We're Doing

Modifying your Portenta H7 firmware to route all HTTP requests through the proxy server. This allows you to:
- Monitor all device traffic on the dashboard
- Add authentication later
- Control internet access
- Debug connectivity issues

---

## 📁 Files Created

### 1. ProxyHelper.h
**Location:** `c:\Users\sam.martin\Documents\RIQ__M7\src\Rev21\ProxyHelper.h`

**What it does:** Simple helper class that wraps target URLs with proxy routing.

**Key Functions:**
- `buildProxyUrl(targetUrl)` - Converts `"http://example.com"` to `"http://192.168.8.112:8080/http://example.com"`
- `isEnabled()` - Check if proxy is enabled
- `getProxyHost()` - Get proxy server IP
- `getProxyPort()` - Get proxy port

---

## 🔧 How to Modify Your Code

### Option 1: Quick Test (Minimal Changes)

Find where you make HTTP requests in `IoTConnect.cpp`:

**BEFORE (around line 384):**
```cpp
String IOTConnectClient::SyncCall(String incpid, String UniID, String serverName, String urlPath){
    String PayLoad ="";
    String postData = "{\"cpId\":\""+incpid+"\",\"uniqueId\":\""+UniID+"\",\"option\":{\"attribute\":false,\"setting\":false,\"protocol\":true,\"device\":false,\"sdkConfig\":false,\"rule\":false}}";
    if(WiFi.status()== WL_CONNECTED){
            HttpClient http(netMQ);
            hr:
            http.beginRequest();
            http.post(serverName.c_str(), urlPath.c_str());
            // ... rest of code
```

**AFTER (with proxy):**
```cpp
#include "ProxyHelper.h"  // Add at top of file

String IOTConnectClient::SyncCall(String incpid, String UniID, String serverName, String urlPath){
    String PayLoad ="";
    String postData = "{\"cpId\":\""+incpid+"\",\"uniqueId\":\""+UniID+"\",\"option\":{\"attribute\":false,\"setting\":false,\"protocol\":true,\"device\":false,\"sdkConfig\":false,\"rule\":false}}";
    if(WiFi.status()== WL_CONNECTED){
            HttpClient http(netMQ);
            
            // Use proxy if enabled
            if (ProxyHelper::isEnabled()) {
                // Route through proxy server
                http.post(ProxyHelper::getProxyHost(), ProxyHelper::getProxyPort(), 
                          (String("/https://") + serverName + urlPath).c_str());
            } else {
                // Direct connection (original)
                http.post(serverName.c_str(), urlPath.c_str());
            }
            
            // ... rest of code stays the same
```

### Option 2: Create Wrapper Function (Cleaner)

Add to `IoTConnect.h`:

```cpp
#include "ProxyHelper.h"

class IOTConnectClient {
private:
    // Helper to make HTTP request (with or without proxy)
    int httpPost(HttpClient& http, String serverName, String urlPath) {
        if (ProxyHelper::isEnabled()) {
            // Build proxy URL: http://192.168.8.112:8080/https://serverName/urlPath
            String proxyUrl = String("/https://") + serverName + urlPath;
            return http.post(ProxyHelper::getProxyHost(), 
                           ProxyHelper::getProxyPort(), 
                           proxyUrl.c_str());
        } else {
            return http.post(serverName.c_str(), urlPath.c_str());
        }
    }
    
public:
    // ... rest of your class
};
```

Then use it:

```cpp
// Instead of:
http.post(serverName.c_str(), urlPath.c_str());

// Use:
httpPost(http, serverName, urlPath);
```

---

## 🔍 Where to Make Changes

### Files to Modify:

1. **IoTConnect.cpp** (lines 384, 489)
   - `SyncCall()` function - Initial sync with Azure
   - `HTTPConnection()` function - HTTP telemetry sending

2. **M7.cpp** (if you have direct HTTP calls)
   - Any `HttpClient` usage
   - Weather API calls
   - Other external API calls

### Search for These Patterns:

```cpp
HttpClient http(netMQ);
http.post(serverName.c_str(), urlPath.c_str());

// Or:
http.get(serverName.c_str(), urlPath.c_str());
```

---

## 🧪 Testing Steps

### Step 1: Add Include

At the top of `IoTConnect.cpp`:

```cpp
#include "IoTConnect.h"
#include "ProxyHelper.h"  // ← Add this line
```

### Step 2: Modify ONE Function First

Start with the `SyncCall()` function (line 384) - this runs on startup.

### Step 3: Compile

```powershell
cd c:\Users\sam.martin\Documents\RIQ__M7
pio run
```

### Step 4: Upload

```powershell
pio run --target upload
```

### Step 5: Watch Dashboard!

Open the dashboard in your browser:
```
http://localhost:8080/dashboard
```

You should see the Portenta H7's HTTP requests appear in real-time! 🎉

---

## 🎛️ Configuration

### Enable/Disable Proxy

In `ProxyHelper.h`:

```cpp
#define PROXY_ENABLED true   // Set to false to bypass proxy
#define PROXY_HOST "192.168.8.112"  // Your PC IP
#define PROXY_PORT 8080
```

### Update IP Address

If your PC's IP changes:

1. Find new IP:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```

2. Update `ProxyHelper.h`:
   ```cpp
   #define PROXY_HOST "192.168.8.XXX"  // New IP
   ```

3. Recompile and upload

---

## 📊 What You'll See on Dashboard

When Portenta H7 connects through proxy:

### Request Example:
```
📤 REQUEST
GET /https://discovery.iotconnect.io/api/sdk/cpid/...
From: 192.168.8.XXX
```

### Response Example:
```
📥 RESPONSE
200 /https://discovery.iotconnect.io/api/sdk/cpid/...
```

### Live Stats:
- **Total Requests:** Count of all requests
- **Successful:** 2xx/3xx responses
- **Errors:** 4xx/5xx responses
- **Uptime:** How long proxy has been running

---

## 🐛 Troubleshooting

### Portenta Can't Reach Proxy

**Check 1: Is proxy running?**
```powershell
curl http://localhost:8080/proxy-health
```

**Check 2: Is firewall blocking?**
```powershell
New-NetFirewallRule -DisplayName "IoT Proxy" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

**Check 3: Can Portenta ping PC?**
```cpp
// In your code, try:
WiFiClient client;
if (client.connect("192.168.8.112", 8080)) {
    Serial.println("Proxy reachable!");
} else {
    Serial.println("Can't reach proxy!");
}
```

### Proxy Not Logging Requests

**Check:** Is broadcastToDashboard being called?

Look in `server.js` logs for:
```
📡 PROXY REQUEST: { ... }
```

If you see this in console but NOT on dashboard, reload the dashboard page.

### Compilation Errors

**Error:** `ProxyHelper.h: No such file or directory`

**Fix:** Make sure file is in `src/Rev21/` folder:
```
c:\Users\sam.martin\Documents\RIQ__M7\src\Rev21\ProxyHelper.h
```

**Error:** `undefined reference to ProxyHelper::buildProxyUrl`

**Fix:** ProxyHelper is all inline/static, should not happen. Check include.

---

## 🚀 Next Steps

1. **Test with minimal changes** - Modify just `SyncCall()` first
2. **Watch dashboard** - Verify proxy works
3. **Add to other functions** - HTTPConnection(), M7.cpp calls, etc.
4. **Test Azure connectivity** - Verify device can still reach IoT Hub through proxy
5. **Add authentication** - We'll implement rotating keys next!

---

## 💡 Pro Tips

### Conditional Proxy

Want to enable proxy only for certain URLs?

```cpp
// In ProxyHelper.h
static bool shouldProxy(String url) {
    // Only proxy external APIs, not local network
    if (url.startsWith("http://192.168.")) {
        return false;
    }
    return PROXY_ENABLED;
}

static String buildProxyUrl(const char* targetUrl) {
    if (!shouldProxy(String(targetUrl))) {
        return String(targetUrl);
    }
    // ... proxy logic
}
```

### Debug Logging

Add to your code:

```cpp
Serial.print("Target: ");
Serial.println(targetUrl);
Serial.print("Proxy URL: ");
Serial.println(ProxyHelper::buildProxyUrl(targetUrl));
```

### Environment-Specific Proxy

Use SD card config:

```cpp
// In ProxyHelper.h, read from config
static const char* getProxyHost() {
    // Read from SD card config or use default
    return Config.proxyHost ? Config.proxyHost : "192.168.8.112";
}
```

---

**Ready to test?** Let me know when you've made the changes and we'll watch the dashboard together! 🎯

*Last Updated: October 16, 2025*
