# Phase 2 Complete: WiFi Hotspot Setup Instructions

## Overview
Your Portenta H7 uses WiFi (not Ethernet), so we need to create a WiFi hotspot for the isolated network.

## Architecture Update

```
Internet
   ↓
192.168.8.1 (Your Router)
   ↓
[Your PC WiFi Client] 192.168.8.112 ← Internet access
   ↓
[Node.js Proxy/Router] ← Traffic routing & logging
   ↓
[Your PC WiFi Hotspot] 192.168.10.1 ← IoT Gateway  
   ↓
[Portenta H7] 192.168.10.101 ← IoT Device
```

## The Challenge

Your PC has **ONE WiFi adapter** which cannot be both:
- Connected to internet (client mode) AND
- Broadcasting a hotspot (access point mode)

At the same time!

## Solutions (Pick One)

### ⭐ Solution A: USB WiFi Adapter (BEST)
**Cost:** $15-30 | **Setup Time:** 30 minutes

**What to buy:**
- TP-Link Archer T3U Plus (~$25)
- ASUS USB-AC53 Nano (~$25)
- TP-Link TL-WN725N (~$12)

**Setup:**
1. Plug in USB WiFi adapter
2. Install drivers (Windows Update usually handles this)
3. Use built-in WiFi for internet (192.168.8.x)
4. Use USB WiFi for hotspot (192.168.10.x)

**Result:** ✅ Both networks active simultaneously

---

### Solution B: Use Ethernet for Internet
**Cost:** $0 (if you have Ethernet cable) | **Setup Time:** 15 minutes

**Setup:**
1. Connect Ethernet cable from PC to router/wall jack
2. Disable WiFi client mode
3. Use WiFi adapter ONLY for hotspot
4. Configure hotspot as 192.168.10.1

**Result:** ✅ Works but less portable

---

### Solution C: Windows Mobile Hotspot (TESTING ONLY)
**Cost:** $0 | **Setup Time:** 10 minutes

**Limitation:** Can't have BOTH networks active - you'll need to switch

**Setup:**
1. Settings → Mobile hotspot
2. Create hotspot
3. When testing, disconnect from main WiFi
4. Connect Portenta H7 to hotspot
5. Limited internet access

**Result:** ⚠️ Good for initial testing only

---

## Recommended: Let's Test with Solution C First

Since you likely don't have a USB WiFi adapter yet, let's test the concept with Windows Mobile Hotspot.

### Step-by-Step Setup

#### 1. Check WiFi Capability

Run this command to check if your WiFi supports hotspot:

```powershell
netsh wlan show drivers
```

Look for line: `Hosted network supported: Yes`

- If **Yes**: Continue ✅
- If **No**: You'll need USB WiFi adapter ❌

#### 2. Create WiFi Hotspot Script

I've already created `create-hotspot.ps1` in your VLAN+Proxy folder.

**Run it:**
```powershell
cd c:\Users\sam.martin\Documents\VLAN+Proxy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\create-hotspot.ps1
```

**This script will:**
- Check WiFi compatibility
- Create SSID: `IoT-Test-Network`
- Password: `TestIoT2025`
- IP: `192.168.10.1`

#### 3. Alternative: Manual Windows Setup

If script doesn't work, use Windows GUI:

1. **Open Settings**
   - Press `Win + I`
   - Go to: Network & Internet → Mobile hotspot

2. **Configure Hotspot**
   - Network name: `IoT-Test-Network`
   - Network password: `TestIoT2025`
   - Share my Internet connection from: `Wi-Fi`
   
3. **Turn ON Mobile hotspot**

4. **Configure IP Address**
   ```powershell
   # Find hotspot adapter name
   Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*Virtual*"}
   
   # Set IP (replace adapter name with yours)
   New-NetIPAddress -InterfaceAlias "Local Area Connection* 12" -IPAddress 192.168.10.1 -PrefixLength 24
   ```

---

## Testing the Hotspot

### Verify Hotspot is Running

```powershell
# Check hotspot status
netsh wlan show hostednetwork

# Check IP configuration
ipconfig | Select-String -Context 2,4 "192.168.10"

# List all network adapters
Get-NetAdapter | Format-Table Name,InterfaceDescription,Status,LinkSpeed
```

**Expected Output:**
- Status: Started
- SSID: IoT-Test-Network
- IP: 192.168.10.1
- Subnet: 255.255.255.0

---

## Modify Portenta H7 Firmware

### Add IoT-Test-Network to WiFi Scan List

Edit `RapidIQM7Defines.h`:

```cpp
const char* SSID_LIST[] = {
    "IoT-Test-Network",  // ADD THIS LINE
    "Walmartwifi",
    "almartwifi"
};
```

### Alternative: Use RBRIQ Naming

Your firmware already scans for any SSID starting with "RBRIQ":
- Rename hotspot to: `RBRIQ-Test`
- Password: `RapidIQ123`

The Portenta H7 will auto-connect!

---

## Portenta H7 Network Configuration

### Current Auto-Connect Logic

Your firmware (`M7.cpp` lines 1480-1520):
1. Scans for available networks
2. Sorts by signal strength (strongest first)
3. Tries to connect to known networks in `SSID_LIST[]`
4. If not found, tries any SSID starting with `"RBRIQ"` (password: `RapidIQ123`)

### Option A: Modify Firmware (Recommended)
Add `"IoT-Test-Network"` to the SSID list.

### Option B: Use RBRIQ Naming (No Code Change)
Rename your hotspot to `RBRIQ-YourName` and it will auto-connect.

### Option C: Hardcode for Testing
Temporarily change line ~1840 in `M7.cpp`:
```cpp
void Connect_to_Internet(void){
  bool connection = false; 
  Ser2.println("  Connecting to WiFi");
  Ser2.println("    Looking for Networks");
  
  // TEMPORARY: Force connection to test hotspot
  WiFi.begin("IoT-Test-Network", "TestIoT2025");
  
  while (WiFi.status() != WL_CONNECTED && millis() < 30000) {
    delay(500);
    Ser2.print(".");
  }
  // ... rest of function
}
```

---

## Phase 2 Checklist

### Part A: Create Hotspot on PC
- [ ] Check WiFi supports hosted network (`netsh wlan show drivers`)
- [ ] Run `create-hotspot.ps1` script OR use Windows Mobile Hotspot
- [ ] Verify hotspot is broadcasting (SSID: `IoT-Test-Network`)
- [ ] Confirm IP address is `192.168.10.1`
- [ ] Test from phone: Can you see the SSID and connect?

### Part B: Configure Portenta H7
- [ ] Decide: Modify firmware OR rename hotspot to RBRIQ-XXX?
- [ ] If modifying: Add `"IoT-Test-Network"` to `SSID_LIST[]`
- [ ] Compile and upload firmware to Portenta H7
- [ ] Power on Portenta H7
- [ ] Monitor serial output (`Ser2` on pins PA_0/PI_9)
- [ ] Verify Portenta H7 connects and gets IP `192.168.10.x`

### Part C: Test Connectivity
- [ ] Portenta H7 can ping `192.168.10.1` (your PC)
- [ ] Your PC can ping `192.168.10.101` (Portenta H7)
- [ ] Check: Can Portenta H7 reach internet directly? (Shouldn't yet!)

---

## Expected Behavior After Phase 2

```
✅ Hotspot created: IoT-Test-Network (192.168.10.0/24)
✅ PC Gateway IP: 192.168.10.1
✅ Portenta H7 connects to hotspot
✅ Portenta H7 gets IP: 192.168.10.101
✅ Basic ping connectivity works
❌ No internet for Portenta H7 (will add in Phase 3)
❌ No proxy yet (Phase 3)
❌ No traffic logging yet (Phase 3)
```

---

## Troubleshooting

### Hotspot Won't Start
**Error:** "The hosted network couldn't be started"

**Solutions:**
1. Update WiFi driver
2. Disable/re-enable WiFi adapter
3. Run as Administrator
4. Try USB WiFi adapter

### Portenta H7 Won't Connect
**Check:**
1. SSID name is EXACT match (case-sensitive)
2. Password is correct
3. Portenta H7 is in range
4. Check serial output for WiFi scan results
5. Try renaming hotspot to `RBRIQ-Test`

### Can't Ping Between Devices
**Check:**
1. Windows Firewall rules
2. Hotspot IP is `192.168.10.1`
3. Portenta H7 got IP via DHCP or static
4. Both devices on same subnet

### IP Address Conflicts
**Solution:**
```powershell
# Reset hotspot network
netsh wlan stop hostednetwork
netsh wlan start hostednetwork

# Renew IP
ipconfig /release
ipconfig /renew
```

---

## Next Steps: Phase 3

Once Phase 2 is complete (hotspot running, Portenta H7 connected), we'll:
1. Create Node.js proxy server
2. Configure routing/NAT
3. Enable internet access through proxy
4. Add traffic logging
5. Test IoT device communication

---

## Quick Reference

### Hotspot Configuration
```
SSID:     IoT-Test-Network
Password: TestIoT2025
IP:       192.168.10.1
Subnet:   255.255.255.0
DHCP:     192.168.10.100-200 (automatic)
```

### Portenta H7 Configuration
```
SSID:     IoT-Test-Network
Password: TestIoT2025
IP:       192.168.10.101 (DHCP or Static)
Gateway:  192.168.10.1
DNS:      8.8.8.8
```

### Important PowerShell Commands
```powershell
# Check hotspot status
netsh wlan show hostednetwork

# Start hotspot
netsh wlan start hostednetwork

# Stop hotspot
netsh wlan stop hostednetwork

# Show IP config
ipconfig

# Test connectivity
ping 192.168.10.1
ping 192.168.10.101
```

---

**Ready to start Phase 2?** Let me know if you want to:
1. Run the hotspot creation script
2. Modify the Portenta H7 firmware
3. Test USB WiFi adapter option
4. Or proceed with current setup

*Phase 2 Setup Guide - Created: October 16, 2025*
