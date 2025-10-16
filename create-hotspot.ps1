# Phase 2: Configure Software-Based Isolated Network (WiFi Version)

## Overview
Since your Portenta H7 connects via **WiFi** (not Ethernet), we'll create a slightly different setup:
- Your PC will create a **WiFi hotspot** for the IoT VLAN (192.168.10.x)
- The Portenta H7 will connect to this hotspot
- Your PC's main WiFi will provide internet access
- Node.js proxy will route between the two networks

## Updated Architecture

```
                Your PC (192.168.8.112)
        ┌───────────────────────────────────────┐
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │   WiFi Adapter (Client Mode)    │ │
        │  │   IP: 192.168.8.112            │ │
        │  │   SSID: "Skyus-BBE3" etc.      │ │
        │  │   (Internet Access)            │ │
        │  └──────────┬──────────────────────┘ │
        │             │                         │
        │  ┌──────────▼──────────────────────┐ │
        │  │  Node.js Proxy/NAT Server      │ │
        │  │  - HTTP/HTTPS Proxy            │ │
        │  │  - Routing & Logging           │ │
        │  └──────────┬──────────────────────┘ │
        │             │                         │
        │  ┌──────────▼──────────────────────┐ │
        │  │   WiFi Hotspot (AP Mode)        │ │
        │  │   SSID: "IoT-Test-Network"     │ │
        │  │   IP: 192.168.10.1             │ │
        │  │   (IoT VLAN Gateway)           │ │
        │  └──────────┬──────────────────────┘ │
        └─────────────┼─────────────────────────┘
                      │ WiFi Signal
              ┌───────▼────────┐
              │  Portenta H7   │
              │  192.168.10.101│
              │  WiFi Client   │
              └────────────────┘
```

## Problem: Single WiFi Adapter

**Your PC has ONE WiFi adapter** which can't be in both Client mode (connected to internet) AND Access Point mode (hotspot) simultaneously.

### Solution Options:

#### ✅ Option A: USB WiFi Adapter (RECOMMENDED)
**Cost:** $15-30
- Buy a USB WiFi adapter
- Use built-in WiFi for internet (192.168.8.x)
- Use USB WiFi adapter for hotspot (192.168.10.x)
- **Pros:** Clean separation, both networks active
- **Cons:** Need to buy adapter

#### Option B: Ethernet for Main Network
- Connect PC to router via Ethernet cable for internet
- Use WiFi adapter for IoT hotspot
- **Pros:** No additional hardware needed
- **Cons:** Less portable, need Ethernet access

#### Option C: WiFi Switching
- Manually switch WiFi between internet and hotspot modes
- **Pros:** No additional hardware
- **Cons:** Can't have both active, tedious for testing

#### ⚠️ Option D: Virtual Machine with WiFi Passthrough
- Run Linux VM with dedicated WiFi adapter
- **Pros:** Professional isolation
- **Cons:** Complex setup, may need USB WiFi anyway

---

## Recommended Approach: Option A + Software Hotspot

### Step 1: Get USB WiFi Adapter

**Recommended Adapters (Windows 10 compatible):**
- TP-Link Archer T3U Plus ($20-25) - AC1300, good range
- ASUS USB-AC53 Nano ($25-30) - Compact, reliable
- TP-Link TL-WN725N ($10-15) - Budget option

**Requirements:**
- Windows 10 compatible
- Supports "Hosted Network" / "Mobile Hotspot"

---

## Phase 2A: Create WiFi Hotspot (Using Windows Built-in)

### Windows 10 Mobile Hotspot Setup

1. **Check if your WiFi supports hotspot:**
   ```powershell
   netsh wlan show drivers
   ```
   Look for: `Hosted network supported: Yes`

2. **Enable Mobile Hotspot:**
   - Settings → Network & Internet → Mobile hotspot
   - Share from: "Wi-Fi" (your internet connection)
   - Network name: `IoT-Test-Network`
   - Network password: `TestIoT2025`
   - Turn on Mobile Hotspot

3. **Configure hotspot IP addressing:**
   ```powershell
   # Get the hotspot adapter name (usually "Local Area Connection* XX")
   Get-NetAdapter | Where-Object {$_.InterfaceDescription -like "*Microsoft Wi-Fi Direct*"}
   
   # Set static IP (replace with your adapter name)
   netsh interface ip set address "Local Area Connection* 12" static 192.168.10.1 255.255.255.0
   ```

**Note:** The adapter name will vary. You'll need to find it first.

---

## Phase 2B: Alternative - Create Hotspot with PowerShell

### Manual Hotspot Creation

<function_calls>
<invoke name="create_file">
<parameter name="content"># PowerShell script to create WiFi hotspot for IoT VLAN
# Run as Administrator

Write-Host "Creating IoT WiFi Hotspot..." -ForegroundColor Green

# Configuration
$SSID = "IoT-Test-Network"
$Password = "TestIoT2025"
$IP = "192.168.10.1"
$Subnet = "255.255.255.0"

# Step 1: Check if hosted network is supported
Write-Host "`nChecking WiFi adapter capabilities..." -ForegroundColor Yellow
$drivers = netsh wlan show drivers
if ($drivers -match "Hosted network supported\s+:\s+Yes") {
    Write-Host "✓ Hosted network is supported" -ForegroundColor Green
} else {
    Write-Host "✗ Hosted network is NOT supported" -ForegroundColor Red
    Write-Host "You may need a USB WiFi adapter that supports hotspot mode" -ForegroundColor Yellow
    exit
}

# Step 2: Stop any existing hosted network
Write-Host "`nStopping any existing hosted network..." -ForegroundColor Yellow
netsh wlan stop hostednetwork

# Step 3: Configure the hosted network
Write-Host "`nConfiguring hosted network..." -ForegroundColor Yellow
netsh wlan set hostednetwork mode=allow ssid=$SSID key=$Password

# Step 4: Start the hosted network
Write-Host "`nStarting hosted network..." -ForegroundColor Yellow
$result = netsh wlan start hostednetwork

if ($result -match "started") {
    Write-Host "✓ Hosted network started successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start hosted network" -ForegroundColor Red
    Write-Host $result
    exit
}

# Step 5: Find the hotspot adapter
Write-Host "`nFinding hotspot network adapter..." -ForegroundColor Yellow
Start-Sleep -Seconds 2  # Wait for adapter to initialize

$adapter = Get-NetAdapter | Where-Object {
    $_.InterfaceDescription -like "*Microsoft Wi-Fi Direct Virtual Adapter*" -or
    $_.InterfaceDescription -like "*Microsoft Hosted Network Virtual Adapter*"
} | Select-Object -First 1

if ($adapter) {
    Write-Host "✓ Found adapter: $($adapter.Name)" -ForegroundColor Green
    
    # Step 6: Configure IP address
    Write-Host "`nConfiguring IP address $IP..." -ForegroundColor Yellow
    
    # Remove any existing IP configuration
    Remove-NetIPAddress -InterfaceAlias $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    Remove-NetRoute -InterfaceAlias $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    
    # Set new IP
    New-NetIPAddress -InterfaceAlias $adapter.Name -IPAddress $IP -PrefixLength 24
    
    Write-Host "✓ IP address configured" -ForegroundColor Green
    
    # Step 7: Display configuration
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "IoT WiFi Hotspot Configuration" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "SSID:     $SSID"
    Write-Host "Password: $Password"
    Write-Host "IP:       $IP"
    Write-Host "Subnet:   $Subnet"
    Write-Host "Gateway:  $IP (This PC)"
    Write-Host "Adapter:  $($adapter.Name)"
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`n✓ Hotspot is ready!" -ForegroundColor Green
    Write-Host "Connect your Portenta H7 to SSID: $SSID" -ForegroundColor Yellow
    
} else {
    Write-Host "✗ Could not find hotspot adapter" -ForegroundColor Red
    Write-Host "The hosted network may not have started properly" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
