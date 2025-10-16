# Understanding Customer VLAN Requirements - Key Questions Answered

## Question 1: Is Connecting to a VLAN Different Than a Regular Network?

### Short Answer: **NO, from the IoT device's perspective!**

Your Portenta H7 doesn't care if it's connecting to a VLAN or a regular network. The device configuration is **identical**.

### From Portenta H7's Perspective:

**Regular Network:**
```cpp
WiFi.begin("Customer-WiFi", "password123");
// Gets IP: 192.168.1.50
// Gateway: 192.168.1.1
```

**VLAN Network:**
```cpp
WiFi.begin("Customer-IoT-VLAN", "password123");
// Gets IP: 192.168.10.50
// Gateway: 192.168.10.1
```

**The code is EXACTLY the same!** ✅

### What IS Different (Behind the Scenes):

**The network administrator configures:**
- Switch to tag traffic with VLAN ID (802.1Q)
- Router to route between VLANs
- Firewall rules to isolate VLANs
- Each VLAN gets its own WiFi SSID

**Your device just sees:**
- A WiFi network name
- A password
- An IP address
- A gateway

---

## Question 2: Rotating Keys - WiFi Password or Proxy Password?

This is a **GREAT question** and depends on their security model!

### Scenario A: Rotating WiFi Passwords (More Common for Guest Networks)

**What they mean:**
- The WiFi password changes periodically (e.g., every 30 days)
- Example: Month 1 password = "IoT-Jan2025", Month 2 = "IoT-Feb2025"

**Your device needs:**
- Way to update WiFi credentials remotely
- Or manual update via config file/OTA update

**Implementation:**
```cpp
// Store credentials that can be updated
char wifi_ssid[32] = "Customer-IoT-VLAN";
char wifi_pass[64] = "rotating-password-here";

// Update via:
// 1. OTA firmware update
// 2. Azure Device Twin update
// 3. SD card config file
```

---

### Scenario B: Rotating Proxy Credentials (More Common for Enterprise)

**What they mean:**
- WiFi password is static/permanent
- **Proxy server** requires authentication with rotating credentials
- Example: Proxy user token rotates every 7 days

**Your device needs:**
- Support for HTTP/HTTPS proxy authentication
- Token refresh mechanism

**Implementation:**
```cpp
// Proxy configuration
char proxy_host[] = "proxy.customer.com";
int proxy_port = 8080;
char proxy_user[] = "iot-device-001";
char proxy_token[128] = "token-rotates-every-week";

// HTTP request with proxy auth
HTTPClient http;
http.begin(client, "http://api.example.com/data");
http.setProxyAuth(proxy_user, proxy_token);
http.GET();
```

---

### Scenario C: Certificate-Based Authentication (Most Secure)

**What they might mean:**
- WiFi uses WPA2-Enterprise (802.1X)
- Device authenticates with certificate, not password
- Certificates expire and need renewal

**Your device needs:**
- Store client certificate
- Support for EAP-TLS or similar
- Certificate renewal process

---

## Which One Is It?

### You Need to Ask Your Customer:

**Question 1: WiFi Authentication**
> "For the IoT VLAN WiFi network, what authentication will be used?"

**Possible answers:**
- **WPA2-PSK** (pre-shared key/password) - Simple, password-based
- **WPA2-Enterprise** - Certificate or username/password (RADIUS)
- **Open with Captive Portal** - No password, but web login required

**Question 2: Proxy Authentication**
> "Will there be a proxy server that IoT devices must use? If so, does it require authentication?"

**Possible answers:**
- **No proxy** - Direct internet access from VLAN
- **Transparent proxy** - No auth required, traffic just routed through it
- **Authenticated proxy** - Username/password or token required
- **IP-based filtering** - Only specific IPs allowed (no auth)

**Question 3: Rotation Schedule**
> "What credentials rotate, and how often?"

**Possible answers:**
- **WiFi password rotates** monthly/quarterly
- **Proxy token rotates** weekly/monthly
- **Certificates expire** annually
- **Nothing rotates** - static credentials

---

## Most Likely Scenario (Based on IoT Best Practices)

### For Industrial IoT Deployments:

**WiFi VLAN Setup:**
```
SSID:              Customer-IoT-VLAN-10
Security:          WPA2-PSK (static password)
Password:          [Set once, rarely changes]
VLAN:              10
Network:           192.168.10.0/24
```

**Proxy Setup:**
```
Type:              Transparent Proxy OR IP-based filtering
Authentication:    None (devices whitelisted by MAC/IP)
Ports Allowed:     80, 443, 8883 (MQTT), custom ports
Rotation:          None needed
```

**Why this is common:**
- IoT devices are difficult to update remotely
- Password rotation creates operational headaches
- Security through network isolation + firewall rules
- Devices authenticated by MAC address or IP
- Proxy logs all traffic for monitoring

---

## What You SHOULD Do for Testing

### Recommendation: Test Multiple Scenarios

Create test configurations for:

### Test 1: Simple Static Setup (Start Here)
```cpp
// Static WiFi credentials
#define IOT_SSID "Customer-IoT-VLAN"
#define IOT_PASS "StaticPassword123"

// No proxy authentication
// Direct internet via NAT
```

### Test 2: Proxy with Authentication
```cpp
// WiFi - static
#define IOT_SSID "Customer-IoT-VLAN"
#define IOT_PASS "StaticPassword123"

// Proxy - authenticated
#define PROXY_HOST "192.168.10.1"
#define PROXY_PORT 3128
#define PROXY_USER "portenta-h7-001"
#define PROXY_PASS "proxy-password"
```

### Test 3: Dynamic Credentials (Cloud-Updated)
```cpp
// Store in SD card config.json
{
  "wifi_ssid": "Customer-IoT-VLAN",
  "wifi_pass": "CurrentPassword",
  "proxy_token": "current-rotating-token",
  "last_updated": "2025-10-16"
}

// Update via Azure Device Twin
// Or download new config from cloud periodically
```

---

## Your Current Code Already Supports Dynamic Updates!

Looking at your `M7.cpp` code, you already have:

### ✅ Azure IoT Hub Integration
```cpp
// Direct method callbacks can update credentials
void DirectMethodCallbackMessage(String &topic, String &payload)

// Device Twin can push new config
void TwinCallbackMessage(String &topic, String &payload)
```

### ✅ SD Card Configuration
```cpp
// Can read WiFi credentials from SD
String Read_SD_All(const char* File_Name)
save_SystemConfig_to_SD(String Send_Save, String rid)
```

### ✅ OTA Updates
```cpp
// Can deploy new firmware with updated credentials
void update_M4_firmware(String payload, String rid)
```

**You're already set up for credential rotation!** 🎉

---

## Action Items - What to Ask Customer

### Email/Meeting Questions:

**1. Network Access:**
```
- What is the IoT VLAN SSID name?
- What is the WiFi password?
- Is the password static or does it rotate? If rotating, how often?
- What is the IP subnet for the IoT VLAN? (e.g., 192.168.10.0/24)
```

**2. Proxy Configuration:**
```
- Is there a proxy server that IoT devices must use?
- If yes, what is the proxy IP and port?
- Does the proxy require authentication?
- If authenticated, what are the credentials?
- Do proxy credentials rotate? If so, how often?
```

**3. Firewall/Security:**
```
- What outbound ports are allowed? (80, 443, 8883, etc.)
- What domains/IPs must the device reach?
  - Azure IoT Hub endpoints
  - NTP servers for time sync
  - OTA update servers
- Are devices whitelisted by MAC address?
```

**4. Updates and Maintenance:**
```
- How will credential changes be communicated?
- Can we update device config via Azure Device Twin?
- What is the process for onboarding new devices?
```

---

## Bottom Line / TL;DR

### From Your Portenta H7's Perspective:

**Connecting to a VLAN is NO DIFFERENT than connecting to a regular WiFi network.**

The device configuration is identical:
1. SSID name
2. Password
3. IP address (from DHCP)
4. Gateway IP
5. (Optional) Proxy settings

### The "Rotating Keys" Could Mean:

**Most Likely:**
- Proxy authentication tokens that rotate
- Or client certificates that expire

**Less Likely:**
- WiFi password that changes periodically
- (This is operationally difficult with IoT devices)

### What You Need to Build:

1. **Static credential version** (baseline)
2. **Dynamic credential update** via Azure Device Twin (you already have this!)
3. **Proxy authentication support** (if required)
4. **Config file on SD card** for easy field updates (you already have this!)

---

## My Recommendation

### For Your Demo/Testing:

**Keep it simple:**
1. Don't worry about VLAN setup on your router
2. Your existing network (192.168.8.x) is fine for testing
3. Build a Node.js proxy server with authentication
4. Test credential rotation via Azure Device Twin updates

**This demonstrates:**
- ✅ Device can work with proxy
- ✅ Credentials can be updated remotely
- ✅ Architecture is VLAN-ready (no code changes needed)
- ✅ You understand the security model

### For Customer Deployment:

**Get their specific requirements:**
- WiFi SSID/password for IoT VLAN
- Proxy IP/port (if any)
- Authentication method
- Rotation schedule
- Allowed ports/protocols

**Then adjust your config accordingly!**

---

## Summary

**Q: Is VLAN different than regular network?**
**A:** No, not from device perspective. Same WiFi connection, just different network segment.

**Q: What are the rotating keys for?**
**A:** Could be WiFi password OR proxy credentials. You need to ask customer which one (probably proxy tokens).

**Q: Do we need to test with VLANs?**
**A:** Not essential. Focus on proxy authentication and remote credential updates via Azure. The VLAN part is just network infrastructure - your code doesn't change.

---

**Want me to help you:**
1. Draft questions to send to your customer?
2. Build a Node.js proxy with authentication?
3. Create a credential rotation test via Azure Device Twin?

Let me know what's most useful! 🚀

*Customer VLAN Requirements Analysis - Created: October 16, 2025*
