# Phase 2 REVISED: VLAN Setup on MSG M519 LTE Hotspot

## 🎉 EXCELLENT NEWS!

The **MSG M519** (Cradlepoint NetCloud Mobile Router) is an **ENTERPRISE-GRADE** router that:
- ✅ **Fully supports VLANs** (802.1Q tagging)
- ✅ Has web-based management interface
- ✅ Supports multiple SSIDs with VLAN mapping
- ✅ Built-in firewall and routing
- ✅ This is EXACTLY what your customer likely uses!

**This is PERFECT for testing!** You can create a true VLAN setup that matches what your customer wants.

---

## What is the MSG M519?

**Model:** Cradlepoint M519 / IBR600 series
**Type:** LTE Mobile Router with WiFi
**Use Case:** Field deployments, mobile connectivity, IoT applications
**Features:**
- LTE/5G cellular connectivity
- Dual-band WiFi (2.4GHz and 5GHz)
- VLAN support
- Multiple SSIDs (up to 4-8 depending on model)
- NetCloud management portal
- Firewall/ACL rules

**Your Router:**
- IP: `192.168.8.1`
- Hostname: `m519.lan`
- DNS: `csgrouters.com`

---

## Architecture - TRUE VLAN SETUP

```
                    [Internet]
                        ↓
                     [LTE/5G]
                        ↓
            ┌───────────────────────────┐
            │   MSG M519 Router         │
            │   192.168.8.1             │
            │                           │
            │  ┌─────────────────────┐  │
            │  │  WiFi Interface     │  │
            │  │  Multiple SSIDs     │  │
            │  └─────────────────────┘  │
            │         ↓        ↓         │
            │    VLAN 1    VLAN 10      │
            │   (Default)   (IoT)       │
            └──────┬───────────┬────────┘
                   │           │
       ┌───────────┘           └────────────┐
       │                                    │
  SSID: "Skyus-BBE3"              SSID: "IoT-VLAN10"
  192.168.8.0/24                  192.168.10.0/24
       │                                    │
  [Your PC]                          [Portenta H7]
  192.168.8.112                      192.168.10.101
```

---

## Phase 2 Plan: Configure VLANs on MSG M519

### Step 1: Access the Router Admin Interface

**Option A: Web Interface (Primary)**
1. Open browser to: `http://192.168.8.1`
2. Default credentials are usually:
   - Username: `admin`
   - Password: Check label on router OR `admin` OR router serial number

**Option B: NetCloud Management**
If your organization uses Cradlepoint NetCloud:
- Login at: https://www.cradlepointecm.com/
- Find your M519 device
- Remote management available

**Let's try accessing it now:**

---

### Step 2: Create VLAN 10 for IoT Devices

**In Router Admin Interface:**

1. **Navigate to:** `Networking` → `VLANs` (or `Networks` → `VLAN`)

2. **Create New VLAN:**
   - VLAN ID: `10`
   - VLAN Name: `IoT-Devices`
   - IP Subnet: `192.168.10.0/24`
   - Gateway: `192.168.10.1` (the router)
   - DHCP: Enabled
   - DHCP Range: `192.168.10.100 - 192.168.10.200`

3. **Configure VLAN Settings:**
   - Enable: `✓`
   - Routing: `Enabled` (to allow internet access)
   - NAT: `Enabled`

---

### Step 3: Create Separate WiFi SSID for VLAN 10

**In Router Admin Interface:**

1. **Navigate to:** `WiFi` → `SSIDs` → `Add New SSID`

2. **Configure IoT SSID:**
   - SSID Name: `RBRIQ-IoT-VLAN10`
   - Security: WPA2-PSK
   - Password: `RapidIQ123` (matches your Portenta H7 auto-connect!)
   - Band: 2.4GHz (better range for IoT)
   - VLAN: `10` ← **This is the key mapping!**
   - Broadcast SSID: `Yes`

3. **Save and Apply**

---

### Step 4: Configure Firewall Rules (Optional but Recommended)

**To enforce true isolation:**

1. **Navigate to:** `Security` → `Firewall` → `Access Rules`

2. **Create Rule: Block VLAN 10 to VLAN 1**
   - Name: `Block IoT to Main Network`
   - Source: `192.168.10.0/24` (VLAN 10)
   - Destination: `192.168.8.0/24` (VLAN 1)
   - Action: `DENY`
   - Log: `Yes` (for testing)

3. **Create Rule: Allow VLAN 10 to Internet**
   - Name: `Allow IoT Internet via NAT`
   - Source: `192.168.10.0/24`
   - Destination: `Any`
   - Action: `ALLOW`
   - NAT: `Enabled`

4. **Apply Rules**

---

### Step 5: Configure Your Portenta H7

**Good news!** Your firmware already supports this:

```cpp
// From RapidIQM7Defines.h - Already configured!
// Portenta H7 will auto-connect to any SSID starting with "RBRIQ"
// with password "RapidIQ123"
```

**We named the SSID:** `RBRIQ-IoT-VLAN10`
**Password:** `RapidIQ123`

**Portenta H7 will automatically:**
1. Scan for networks
2. Find `RBRIQ-IoT-VLAN10`
3. Connect with password `RapidIQ123`
4. Get DHCP address in `192.168.10.x` range

**No firmware changes needed!** ✅

---

### Step 6: Keep Your PC on Main Network

**Your PC stays on existing network:**
- SSID: `Skyus-BBE3` (or current connection)
- IP: `192.168.8.112`
- VLAN: 1 (default)

**This simulates:**
- PC = Management/Office network
- Portenta H7 = IoT device network

---

## Testing the VLAN Setup

### Verification Tests

**1. Check VLAN Isolation:**
```powershell
# From your PC (192.168.8.112)
ping 192.168.10.101    # Should FAIL (blocked by firewall)

# From Portenta H7 (via serial monitor)
# Try to ping 192.168.8.112  # Should FAIL (isolated)
```

**2. Check Internet Access:**
```powershell
# Portenta H7 should be able to reach internet
# Check serial output for successful HTTP requests
```

**3. Check Gateway:**
```powershell
# From Portenta H7
ping 192.168.10.1      # Should SUCCEED (router gateway)
```

---

## Adding the Proxy Server (Phase 3)

Once VLANs are set up, we have TWO options:

### Option A: Proxy on the Router (If Supported)
Some Cradlepoint models support running proxy/content filtering directly.

### Option B: Proxy on Dedicated Device
Run Node.js proxy on:
- Raspberry Pi with two network interfaces
- Small Linux VM or PC
- Your Windows PC with two connections

**For testing, we can run proxy on your PC:**
1. PC connects to BOTH VLANs (if possible)
2. OR PC connects via Ethernet to router management interface
3. Proxy routes traffic from VLAN 10

---

## Why This is Perfect for Your Use Case

### ✅ Advantages:

1. **Real VLAN Implementation**
   - True 802.1Q VLAN tagging
   - Hardware-based isolation
   - Production-like setup

2. **Matches Customer Environment**
   - Enterprise router (like customer has)
   - VLAN segmentation (what customer wants)
   - Multiple SSID support

3. **Field-Ready Testing**
   - Same equipment you use in field
   - LTE connectivity (realistic conditions)
   - Mobile/portable setup

4. **No Additional Hardware**
   - Use existing MSG M519
   - No USB WiFi adapter needed
   - No PC hotspot required

5. **Perfect Learning Environment**
   - Learn actual VLAN configuration
   - Router management experience
   - Firewall rule creation
   - Client-representative setup

---

## Expected Configuration Summary

### Main Network (VLAN 1 - Default)
```
SSID:     Skyus-BBE3 (existing)
VLAN:     1 (untagged)
Subnet:   192.168.8.0/24
Gateway:  192.168.8.1
DHCP:     192.168.8.100-200
Your PC:  192.168.8.112
```

### IoT Network (VLAN 10 - NEW)
```
SSID:     RBRIQ-IoT-VLAN10 (new)
VLAN:     10 (tagged)
Subnet:   192.168.10.0/24
Gateway:  192.168.10.1 (M519 router)
DHCP:     192.168.10.100-200
Portenta: 192.168.10.101
```

### Firewall Rules
```
1. DENY: VLAN 10 → VLAN 1 (isolation)
2. ALLOW: VLAN 10 → Internet (NAT)
3. ALLOW: VLAN 1 → VLAN 10 (management access)
```

---

## Phase 2 Action Steps

### Immediate Tasks:

1. **Access MSG M519 Admin Interface**
   - [ ] Open browser to http://192.168.8.1
   - [ ] Login with credentials
   - [ ] Verify you have admin access

2. **Create VLAN 10**
   - [ ] Navigate to VLAN settings
   - [ ] Create VLAN 10: 192.168.10.0/24
   - [ ] Enable DHCP on VLAN 10

3. **Create IoT SSID**
   - [ ] Add new SSID: `RBRIQ-IoT-VLAN10`
   - [ ] Password: `RapidIQ123`
   - [ ] Map to VLAN 10
   - [ ] Enable and broadcast

4. **Configure Firewall (Optional)**
   - [ ] Block inter-VLAN traffic
   - [ ] Allow VLAN 10 to internet

5. **Test with Portenta H7**
   - [ ] Power on Portenta H7
   - [ ] Watch serial output for connection
   - [ ] Verify IP in 192.168.10.x range
   - [ ] Test connectivity

---

## Troubleshooting Access to Router

If you can't access `http://192.168.8.1`:

**Check 1: Try alternate addresses**
```powershell
# Try these URLs
http://192.168.8.1
http://m519.lan
https://192.168.8.1
```

**Check 2: Find login credentials**
- Check router label/sticker
- Try default: admin/admin
- Try: admin/[serial number]
- Contact your IT/admin who set it up

**Check 3: Check if NetCloud managed**
```powershell
# Check if remotely managed
nslookup csgrouters.com
```
If NetCloud managed, you may need organization credentials.

---

## Next Steps

**Ready to configure the MSG M519?**

Let me know:
1. Can you access http://192.168.8.1?
2. Do you have admin credentials?
3. Is this router managed by NetCloud or local admin?

Once you confirm access, I'll guide you through the exact steps in the router interface!

---

**This is WAY better than the USB WiFi adapter approach!** 🎉

You're using real enterprise hardware with true VLAN capabilities - this will give you EXACT experience for your customer's environment!

*Phase 2 REVISED - MSG M519 VLAN Setup - Created: October 16, 2025*
