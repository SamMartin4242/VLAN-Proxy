# MSG M519 CLI Configuration Guide - VLAN Setup

## SSH Access to Router

### Step 1: Connect via SSH

```powershell
# From PowerShell
ssh admin@192.168.8.1
```

**When prompted:**
- Type `yes` to accept fingerprint
- Enter password (check router label, or try default: `admin`)

---

## Cradlepoint CLI Commands

### Initial Setup - Check Current Configuration

```bash
# Once connected, check your privilege level
show version

# Show current network configuration
show network

# Show current VLANs
show vlan

# Show current WiFi SSIDs
show wlan

# Show IP configuration
show ip interface brief
```

---

## Create VLAN 10 for IoT Devices

### Method 1: Using Cradlepoint CLI (NCOS)

Cradlepoint uses **NCOS (NetCloud OS)** - commands may vary by firmware version.

```bash
# Enter configuration mode
config

# Create VLAN 10
network create vlan10
set vlan 10
set name "IoT-Devices"
set ip_address 192.168.10.1
set netmask 255.255.255.0
set dhcp_server enabled
set dhcp_start 192.168.10.100
set dhcp_end 192.168.10.200
set dhcp_lease_time 86400
commit

# Verify VLAN created
show vlan 10
```

---

## Create WiFi SSID for VLAN 10

```bash
# Create new SSID mapped to VLAN 10
config

# Add new SSID
wlan create iot_ssid
set ssid "RBRIQ-IoT-VLAN10"
set security wpa2_psk
set passphrase "RapidIQ123"
set vlan 10
set band 2.4ghz
set broadcast_ssid enabled
set enabled true
commit

# Verify SSID created
show wlan
```

---

## Configure Firewall Rules (Isolation)

```bash
config

# Create firewall rule to block VLAN 10 to VLAN 1
firewall create rule block_iot_to_main
set source_zone vlan10
set destination_zone vlan1
set action deny
set log enabled
set enabled true
commit

# Create firewall rule to allow VLAN 10 to Internet
firewall create rule allow_iot_internet
set source_zone vlan10
set destination_zone wan
set action allow
set nat enabled
set enabled true
commit

# Verify rules
show firewall rules
```

---

## Alternative: Web-Based NetCloud API Commands

If direct CLI doesn't work, Cradlepoint supports **REST API** configuration:

```bash
# Get API token (from NetCloud portal)
# Then use curl/PowerShell to configure

# Example PowerShell API call
$headers = @{
    "X-CP-API-ID" = "your-api-id"
    "X-CP-API-KEY" = "your-api-key"
    "X-ECM-API-ID" = "your-ecm-id"
    "X-ECM-API-KEY" = "your-ecm-key"
}

$body = @{
    "configuration" = @{
        "vlans" = @(
            @{
                "vlan_id" = 10
                "name" = "IoT-Devices"
                "ip_address" = "192.168.10.1"
                "netmask" = "255.255.255.0"
            }
        )
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://www.cradlepointecm.com/api/v2/configuration_managers/" -Method PUT -Headers $headers -Body $body
```

---

## Quick Reference CLI Commands

### Navigation
```bash
# Show help
?
help

# Enter config mode
config

# Exit config mode
exit

# Save configuration
commit
save

# Show running config
show running-config

# Show startup config
show startup-config
```

### Network Commands
```bash
# Show interfaces
show interface

# Show IP addresses
show ip interface

# Show routing table
show ip route

# Show DHCP leases
show dhcp leases

# Show connected clients
show wlan clients
```

### Monitoring
```bash
# Show system status
show system status

# Show cellular status
show cellular status

# Show WiFi status
show wlan status

# Show firewall logs
show log firewall

# Real-time traffic monitor
monitor traffic interface wlan0
```

---

## Expected Output After Configuration

### After Creating VLAN 10:
```
VLAN ID: 10
Name: IoT-Devices
IP Address: 192.168.10.1
Netmask: 255.255.255.0
DHCP Server: Enabled
DHCP Range: 192.168.10.100 - 192.168.10.200
Status: Active
```

### After Creating SSID:
```
SSID: RBRIQ-IoT-VLAN10
Security: WPA2-PSK
VLAN: 10
Band: 2.4GHz
Status: Broadcasting
Connected Clients: 0
```

### After Firewall Rules:
```
Rule 1: block_iot_to_main
  Source: VLAN 10 (192.168.10.0/24)
  Destination: VLAN 1 (192.168.8.0/24)
  Action: DENY
  Status: Active

Rule 2: allow_iot_internet
  Source: VLAN 10 (192.168.10.0/24)
  Destination: WAN (Any)
  Action: ALLOW
  NAT: Enabled
  Status: Active
```

---

## Troubleshooting CLI Access

### Can't Connect via SSH?

**Check SSH is enabled:**
```powershell
# Test if port 22 is open
Test-NetConnection -ComputerName 192.168.8.1 -Port 22
```

**If SSH not enabled, try Telnet:**
```powershell
telnet 192.168.8.1
```

**If both fail:**
- Access via web browser: http://192.168.8.1
- Enable SSH/Telnet in Settings → System → Remote Access

### Wrong Username/Password?

**Common defaults:**
- Username: `admin`
- Password: `admin`
- Password: Router serial number (check label)
- Password: Last 8 digits of MAC address

**Check router label for credentials**

### NetCloud Managed Device?

If router is managed by NetCloud:
- Changes must be made through NetCloud portal
- Direct CLI may be restricted
- Login at: https://www.cradlepointecm.com/

---

## Step-by-Step Manual Process

### 1. Connect to Router
```powershell
ssh admin@192.168.8.1
# Enter password when prompted
```

### 2. Check Current Setup
```bash
show version
show network
show vlan
show wlan
```

### 3. Create VLAN 10
```bash
config
# Use appropriate commands based on your firmware version
# (Commands above in "Create VLAN 10" section)
commit
```

### 4. Create IoT SSID
```bash
config
# Use commands from "Create WiFi SSID" section
commit
```

### 5. Test Configuration
```bash
show vlan 10
show wlan
ping 192.168.10.1
```

### 6. Save Configuration
```bash
save
# Or
write memory
```

---

## If CLI Commands Don't Match

Cradlepoint firmware versions have different CLI syntaxes:
- **NCOS 6.x**: Modern command structure
- **NCOS 7.x**: Updated syntax
- **Legacy**: Older command set

### Get Help in CLI:
```bash
# Show available commands
?

# Get help for specific command
help network
help vlan
help wlan

# Tab completion works!
show <TAB><TAB>
config <TAB><TAB>
```

---

## Alternative: Configuration File Method

### Export Current Config:
```bash
show running-config > config_backup.txt
```

### Edit Config File:
Add these sections:
```json
{
  "vlans": [
    {
      "vlan_id": 10,
      "name": "IoT-Devices",
      "ip_address": "192.168.10.1",
      "subnet_mask": "255.255.255.0",
      "dhcp_server": {
        "enabled": true,
        "start_ip": "192.168.10.100",
        "end_ip": "192.168.10.200"
      }
    }
  ],
  "wlans": [
    {
      "ssid": "RBRIQ-IoT-VLAN10",
      "security": "wpa2_psk",
      "passphrase": "RapidIQ123",
      "vlan_id": 10,
      "band": "2.4ghz",
      "enabled": true
    }
  ]
}
```

### Import Config:
```bash
configure load config_modified.txt
commit
```

---

## What to Do Next

### Option 1: Try SSH Connection
1. Open PowerShell
2. Run: `ssh admin@192.168.8.1`
3. Accept fingerprint (type `yes`)
4. Enter password
5. Follow commands above

### Option 2: Document What You See
1. Connect via SSH
2. Run `show version`
3. Run `show ?` to see available commands
4. Share output with me
5. I'll give you exact commands for your firmware

### Option 3: Use Web Interface
1. Open browser: http://192.168.8.1
2. Login with admin credentials
3. Navigate to Network → VLANs
4. Create VLAN 10 via GUI
5. Then create SSID mapped to VLAN 10

---

## Quick Test After Configuration

### From Your PC (VLAN 1):
```powershell
# Should work - same VLAN
ping 192.168.8.1

# Should fail - different VLAN (once rules applied)
ping 192.168.10.1
```

### From Portenta H7 (VLAN 10):
```cpp
// In Arduino Serial Monitor
// Should work - gateway
ping 192.168.10.1

// Should work - internet
ping 8.8.8.8

// Should fail - blocked by firewall
ping 192.168.8.112
```

---

## Ready to Connect?

Let's try the SSH connection. In PowerShell, run:

```powershell
ssh admin@192.168.8.1
```

Then:
1. Type `yes` when asked about fingerprint
2. Enter password (try `admin` or check router label)
3. Once connected, run `show version`
4. Share the output with me
5. I'll give you the exact commands for your router model!

---

*MSG M519 CLI Configuration Guide - Created: October 16, 2025*
