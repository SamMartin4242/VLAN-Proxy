# MSG M519 Web GUI Configuration - Step-by-Step VLAN Setup

## You're Connected! Let's Create the VLAN Setup

### Overview of What We're Creating

```
Main Network (VLAN 1)          IoT Network (VLAN 10)
SSID: Skyus-BBE3      ←→      SSID: RBRIQ-IoT-VLAN10
192.168.8.0/24                 192.168.10.0/24
Your PC: .112                  Portenta H7: .101
```

---

## Step 1: Create VLAN 10

### Navigate to VLANs

1. **Look for menu options (usually left sidebar or top menu):**
   - "Networking" or "Network" or "Advanced"
   - Then look for: "VLANs" or "Local Networks" or "LAN"

2. **Common locations:**
   - `Networking → VLANs`
   - `Network → Local Networks → VLANs`
   - `Advanced → VLAN Configuration`
   - `Settings → Network → VLANs`

### Create New VLAN

3. **Click "Add VLAN" or "Create Network" or "+" button**

4. **Fill in VLAN 10 Settings:**

   **Basic Settings:**
   ```
   VLAN ID:           10
   VLAN Name:         IoT-Devices
   Description:       IoT Device Network (Optional)
   ```

   **IP Configuration:**
   ```
   IP Address:        192.168.10.1
   Subnet Mask:       255.255.255.0
   (or CIDR: /24)
   ```

   **DHCP Settings:**
   ```
   Enable DHCP:       ✓ (Check/Enable)
   DHCP Start:        192.168.10.100
   DHCP End:          192.168.10.200
   Lease Time:        86400 seconds (or 24 hours)
   Default Gateway:   192.168.10.1 (same as VLAN IP)
   DNS Servers:       8.8.8.8, 8.8.4.4
   (or leave as router default)
   ```

5. **Click "Save" or "Apply" or "Create"**

6. **Verify VLAN is created:**
   - You should see "VLAN 10" in the list
   - Status should be "Active" or "Enabled"

---

## Step 2: Create WiFi SSID for VLAN 10

### Navigate to WiFi/WLAN Settings

1. **Look for:**
   - "WiFi" or "WLAN" or "Wireless"
   - Then: "SSIDs" or "Networks" or "Access Points"

2. **Common locations:**
   - `WiFi → SSIDs`
   - `Wireless → WLAN Configuration`
   - `Network → WiFi → SSIDs`
   - `Settings → Wireless`

### Create New SSID

3. **Click "Add SSID" or "Create Network" or "+" button**

4. **Fill in SSID Settings:**

   **Basic Settings:**
   ```
   Enable SSID:       ✓ (Check/Enable)
   SSID Name:         RBRIQ-IoT-VLAN10
   Broadcast SSID:    ✓ (Enabled/Visible)
   SSID Hidden:       ☐ (Unchecked)
   ```

   **Security Settings:**
   ```
   Security Mode:     WPA2-PSK (or WPA2-Personal)
   Encryption:        AES (if separate option)
   Password/Key:      RapidIQ123
   ```

   **Network Settings:**
   ```
   VLAN:              10 ← **CRITICAL: Map to VLAN 10!**
   (or Network:       IoT-Devices)
   ```

   **Radio Settings:**
   ```
   WiFi Band:         2.4 GHz (better range for IoT)
   (or Both 2.4/5GHz if you want)
   Channel:           Auto (or leave default)
   ```

   **Advanced (Optional):**
   ```
   Max Clients:       32 (or leave default)
   Client Isolation:  ☐ (Unchecked for now)
   ```

5. **Click "Save" or "Apply" or "Create"**

6. **Verify SSID is created:**
   - You should see "RBRIQ-IoT-VLAN10" in SSID list
   - Status: "Broadcasting" or "Active"
   - VLAN: 10

---

## Step 3: Configure Firewall Rules (Optional - For Isolation)

### Navigate to Firewall

1. **Look for:**
   - "Security" or "Firewall" or "Advanced"
   - Then: "Firewall Rules" or "Access Control" or "Filtering"

2. **Common locations:**
   - `Security → Firewall`
   - `Firewall → Rules`
   - `Advanced → Firewall Rules`
   - `Network Security → Access Rules`

### Create Rule 1: Block VLAN 10 → VLAN 1

3. **Click "Add Rule" or "Create Rule" or "+"**

4. **Fill in Rule Settings:**

   ```
   Rule Name:         Block-IoT-to-Main
   Description:       Prevent IoT from accessing main network
   
   Source:
     Zone/Network:    VLAN 10 (or IoT-Devices)
     (or IP Range:    192.168.10.0/24)
   
   Destination:
     Zone/Network:    VLAN 1 (or Default LAN)
     (or IP Range:    192.168.8.0/24)
   
   Action:            DENY (or Block/Drop)
   
   Logging:           ✓ Enable (for testing)
   
   Enabled:           ✓ Enable
   ```

5. **Click "Save" or "Apply"**

### Create Rule 2: Allow VLAN 10 → Internet

6. **Click "Add Rule" again**

7. **Fill in Rule Settings:**

   ```
   Rule Name:         Allow-IoT-Internet
   Description:       Allow IoT devices to access internet
   
   Source:
     Zone/Network:    VLAN 10 (or IoT-Devices)
     (or IP Range:    192.168.10.0/24)
   
   Destination:
     Zone:            WAN (or Internet/Any)
   
   Action:            ALLOW (or Permit)
   
   NAT:               ✓ Enable (if separate option)
   
   Enabled:           ✓ Enable
   ```

8. **Click "Save" or "Apply"**

### Optional Rule 3: Allow Management Access

9. **If you want to manage IoT devices from main network:**

   ```
   Rule Name:         Allow-Main-to-IoT
   
   Source:            VLAN 1 (192.168.8.0/24)
   Destination:       VLAN 10 (192.168.10.0/24)
   Action:            ALLOW
   Enabled:           ✓
   ```

---

## Step 4: Save Configuration

1. **Look for "Save Changes" or "Apply Configuration" button**
   - Usually at top-right or bottom of page
   - May say "Apply All Changes" or "Commit"

2. **Click Save/Apply**

3. **Router may reboot or take 30-60 seconds to apply changes**

---

## Step 5: Verify Configuration

### Check VLAN 10 is Active

1. Navigate back to VLANs section
2. Confirm you see:
   ```
   VLAN 10 - IoT-Devices
   Status: Active
   IP: 192.168.10.1/24
   DHCP: Enabled
   ```

### Check SSID is Broadcasting

1. **From your phone or another device:**
   - Scan for WiFi networks
   - You should see: `RBRIQ-IoT-VLAN10`

2. **Try connecting (optional test):**
   - Connect with password: `RapidIQ123`
   - Check what IP you get (should be 192.168.10.x)

---

## Step 6: Test with Portenta H7

### Prepare Portenta H7

Your firmware is already configured! It will automatically:
1. Scan for networks
2. Find any SSID starting with "RBRIQ"
3. Connect with password "RapidIQ123"

### Power On and Monitor

1. **Connect to Portenta H7 serial monitor**
   - Baud: 115200
   - Port: Your Portenta H7 COM port
   - Monitor the `Ser2` output

2. **Power on Portenta H7**

3. **Watch serial output for:**
   ```
   Connecting to WiFi
   Looking for Networks
   Connected to: RBRIQ-IoT-VLAN10
   Device_IP: 192.168.10.xxx
   ```

### Verify IP Address

4. **Portenta H7 should get IP in range:**
   - `192.168.10.100` - `192.168.10.200`
   - Gateway: `192.168.10.1`

---

## Step 7: Test Connectivity

### From Your PC (192.168.8.112)

```powershell
# Ping the IoT gateway (should work)
ping 192.168.10.1

# Ping Portenta H7 (should FAIL if firewall working)
ping 192.168.10.101
```

### From Portenta H7 (via serial or code)

```cpp
// Should succeed - gateway
ping 192.168.10.1

// Should succeed - internet (if NAT working)
ping 8.8.8.8

// Should fail - blocked by firewall
ping 192.168.8.112
```

### Check Router Status

1. **In router GUI, look for:**
   - "Status" → "Connected Clients" → "WLAN Clients"
   - You should see Portenta H7 connected to VLAN 10

2. **Check DHCP Leases:**
   - Navigate to: DHCP → Active Leases
   - Look for lease in 192.168.10.x range

---

## Troubleshooting Common Issues

### Can't Find VLAN Settings?

**Try these menu paths:**
- Configuration → LAN → VLANs
- Networking → Local Networks
- Advanced Settings → VLANs
- System → Network → VLANs

**Look for screenshots in router documentation**

### Can't See SSID After Creating?

**Checks:**
1. Is SSID enabled? (toggle switch)
2. Is "Broadcast SSID" enabled?
3. Did you click "Apply Changes"?
4. Wait 30 seconds and rescan WiFi
5. Check radio is enabled (2.4GHz/5GHz)

### Portenta H7 Won't Connect?

**Checks:**
1. SSID name EXACTLY: `RBRIQ-IoT-VLAN10` (case-sensitive!)
2. Password EXACTLY: `RapidIQ123`
3. SSID is broadcasting (not hidden)
4. 2.4GHz radio is enabled (Portenta H7 might not support 5GHz)
5. Check Portenta H7 serial output for errors

### Can't Access Router After Changes?

**Recovery:**
1. Your PC should still be on VLAN 1 (192.168.8.x)
2. Access router at: http://192.168.8.1
3. If locked out: Factory reset button (hold 10 seconds)

---

## Quick Reference - Configuration Summary

### VLAN 10 Settings
```
VLAN ID:      10
Name:         IoT-Devices  
IP:           192.168.10.1
Subnet:       255.255.255.0 (/24)
DHCP:         Enabled
DHCP Range:   192.168.10.100-200
Gateway:      192.168.10.1
DNS:          8.8.8.8, 8.8.4.4
```

### SSID Settings
```
SSID:         RBRIQ-IoT-VLAN10
Password:     RapidIQ123
Security:     WPA2-PSK
VLAN:         10
Band:         2.4 GHz
Broadcast:    Enabled
```

### Firewall Rules
```
Rule 1: DENY   VLAN 10 → VLAN 1
Rule 2: ALLOW  VLAN 10 → Internet (NAT)
Rule 3: ALLOW  VLAN 1 → VLAN 10 (optional)
```

---

## What You Should See After Success

### Router Status Page
```
VLANs:
  VLAN 1 (Default)    - 192.168.8.0/24   - Active
  VLAN 10 (IoT)       - 192.168.10.0/24  - Active

SSIDs:
  Skyus-BBE3          - VLAN 1  - 5 clients
  RBRIQ-IoT-VLAN10    - VLAN 10 - 1 client (Portenta H7)

Firewall:
  3 rules active
```

### Your Phone WiFi Scan
```
Available Networks:
  - Skyus-BBE3          ⭐⭐⭐⭐ Connected
  - RBRIQ-IoT-VLAN10    ⭐⭐⭐⭐ Available  ← New!
  - Other networks...
```

### Portenta H7 Serial Output
```
Starting SD Card
SD Initialized
Getting Unique ID
Unique ID: [Your Device ID]
Connecting to WiFi
  Looking for Networks
  Connected to: RBRIQ-IoT-VLAN10      ← Success!
  Device_IP: 192.168.10.101           ← VLAN 10 IP!
Getting Time
Time: 2025-10-16T[current time]
Connecting to IOTconnect
Connected
Setup Complete
```

---

## Next Steps After VLAN Setup

Once VLAN 10 is working and Portenta H7 is connected:

### Phase 3: Add Proxy Server (Optional)
- Run Node.js proxy on a device connected to both VLANs
- Route all Portenta H7 traffic through proxy
- Add traffic logging and filtering

### Phase 4: Test Real Scenarios
- Test IoT data transmission
- Verify isolation
- Test failover and recovery
- Document for client

---

## Need Help?

**If you get stuck, tell me:**
1. What screen/menu are you on?
2. What options do you see?
3. Any error messages?
4. Screenshot if possible

**I'll guide you through the exact steps for your specific router interface!**

---

**Ready? Start with Step 1 - Navigate to VLANs section!**

What do you see in the router GUI? What menu options are available?

*MSG M519 GUI Setup Guide - Created: October 16, 2025*
