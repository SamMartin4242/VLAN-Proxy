# DNS-Based Proxy Routing for Azure IoT Hub

## 🎯 The Solution

Instead of modifying the Portenta firmware to use a proxy IP (which breaks TLS SNI), we use **DNS override** to transparently route Azure IoT Hub traffic through the proxy.

### How It Works:

```
1. Portenta DNS query: "What is RIQ-IOTHUB.azure-devices.net?"
2. Your PC DNS responds: "192.168.8.112" (proxy IP)
3. Portenta connects to: 192.168.8.112:8883
4. TLS SNI says: "RIQ-IOTHUB.azure-devices.net" ✅ (Azure accepts!)
5. Proxy forwards to: Real Azure at RIQ-IOTHUB.azure-devices.net
```

---

## 🚀 Setup Instructions

### Step 1: Start DNS Server (as Administrator)

**IMPORTANT:** Port 53 requires Administrator privileges!

```powershell
# Open PowerShell as Administrator
cd c:\Users\sam.martin\Documents\VLAN+Proxy
npm run start-dns
```

You should see:
```
🌐 DNS Server for IoT Proxy
📡 Listening on: 0.0.0.0:53
🔀 Azure Route: RIQ-IOTHUB.azure-devices.net → 192.168.8.112
```

### Step 2: Start MQTT Proxy (separate terminal)

```powershell
cd c:\Users\sam.martin\Documents\VLAN+Proxy
npm run start-mqtt
```

You should see all 3 ports listening (8080, 1883, 8883).

### Step 3: Upload Firmware

The firmware has been modified to:
- Use custom DNS server (192.168.8.112)
- Connect to Azure hostname (not IP)
- Generate SAS tokens with correct hostname

Upload via PlatformIO:
```powershell
cd c:\Users\sam.martin\Documents\RIQ__M7
pio run --target upload
```

### Step 4: Watch the Magic! ✨

Open 3 terminals to watch:

1. **DNS Server** - See DNS queries from Portenta
   ```
   🔍 DNS Query from 192.168.8.169: riq-iothub.azure-devices.net (A)
   ✅ Responded: riq-iothub.azure-devices.net → 192.168.8.112 (PROXY)
   ```

2. **MQTT Proxy** - See MQTT connection and forwarding
   ```
   🔌 MQTT Connection: 192.168.8.169:xxxxx
   ✅ MQTT: Connected to RIQ-IOTHUB.azure-devices.net:8883
   📡 MQTT: Forwarding packets...
   ```

3. **Portenta Serial** - See successful Azure connection
   ```
   Connecting to Azure IoT Hub via proxy.
   Connected to your Azure IoT Hub!
   ```

---

## 🔥 Firewall Configuration

The DNS server needs port 53 open:

```powershell
New-NetFirewallRule -DisplayName "IoT Proxy DNS" `
                    -Direction Inbound `
                    -LocalPort 53 `
                    -Protocol UDP `
                    -Action Allow `
                    -Description "DNS server for IoT proxy routing"
```

---

## 🧪 Testing

### Test DNS Resolution:

From Portenta (or any device on the network), test DNS:

```bash
nslookup RIQ-IOTHUB.azure-devices.net 192.168.8.112
```

Should return: `192.168.8.112`

### Test Direct Query:

From PowerShell:
```powershell
Resolve-DnsName -Name "RIQ-IOTHUB.azure-devices.net" -Server "192.168.8.112"
```

---

## 📊 What You'll See in Dashboard

Once connected, the dashboard (http://localhost:8080/dashboard) will show:

- **MQTT Connections**: From Portenta (192.168.8.169)
- **Target**: RIQ-IOTHUB.azure-devices.net:8883
- **Packets**: Bidirectional MQTT traffic
- **Bytes Transferred**: Real-time data flow
- **Active Connections**: Number of devices connected

---

## 🐛 Troubleshooting

### DNS Server won't start:
- ❌ "EACCES" → Run PowerShell as Administrator
- ❌ "EADDRINUSE" → Another DNS server is running (stop it first)

### Portenta can't resolve hostname:
- Check: Is DNS server running?
- Check: Is DNS server on 192.168.8.112?
- Check: Firmware uploaded with WiFi.setDNS() code?

### Proxy connects but Azure rejects:
- Check: Is TLS SNI showing correct Azure hostname?
- Check: Is SAS token generated with Azure hostname (not IP)?
- Check: Is device key correct in iot_configs.h?

### Connection timeout:
- Check: All 3 services running (DNS + MQTT Proxy + Dashboard)?
- Check: Firewall allows ports 53 (UDP), 1883, 8883, 8080 (TCP)?
- Check: Portenta can ping 192.168.8.112?

---

## 🎓 Learning Points

1. **DNS Override** - Transparent routing without firmware changes
2. **TLS SNI** - Why hostnames matter in TLS handshakes
3. **MQTT over TLS** - How MQTTS connections work
4. **Proxy Architecture** - Difference between HTTP and TCP/TLS proxies
5. **Enterprise IoT** - How VLAN + Proxy deployments work in production

---

## 🔄 Switching Back to Direct Connection

To bypass the proxy and connect directly to Azure:

1. Comment out DNS override in M7.cpp:
   ```cpp
   // WiFi.setDNS(proxyDNS);
   ```

2. Upload firmware

Portenta will use router's DNS and connect directly to Azure!

---

## 📝 Files Modified

- `RIQ__M7/src/Rev21/M7.cpp` - Added WiFi.setDNS(), updated connection logging
- `RIQ__M7/src/Rev21/iot_configs.h` - Restored Azure hostname
- `VLAN+Proxy/dns-server.js` - New DNS server for routing
- `VLAN+Proxy/server-mqtt.js` - MQTT proxy (existing)
- `VLAN+Proxy/package.json` - Added start-dns script

---

## ✅ Success Criteria

When everything works, you should see:

1. ✅ DNS server responds to queries
2. ✅ Portenta resolves Azure hostname to proxy IP
3. ✅ MQTT connection established through proxy
4. ✅ Proxy forwards to real Azure
5. ✅ Azure accepts connection (TLS SNI matches)
6. ✅ Telemetry flows through proxy
7. ✅ Dashboard shows live traffic

🎉 **You've successfully created an enterprise-grade IoT proxy setup!**

