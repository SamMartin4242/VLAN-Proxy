# Phase 1: Network Planning

## Current Network Assessment

### Current Network Information
*Gathered from network scan on October 16, 2025:*

**Main Network:**
- Current IP Range: `192.168.8.0/24`
- Router/Gateway IP: `192.168.8.1` (MSG M519)
- Subnet Mask: `255.255.255.0`
- DNS Servers: `172.16.10.8, fdd6:5be3:c874::1`
- DHCP Server: `192.168.8.1`
- Your PC IP: `192.168.8.112` (WiFi)

**Available Equipment:**
- Router Model: `MSG M519` (Meraki or similar enterprise router)
- Switch Model (if separate): `Integrated or separate - TBD`
- Does your router/switch support VLANs?: `[X] Yes  [ ] No  [ ] Unknown` (MSG M519 supports VLANs)
- Can you access router/switch admin interface?: `[ ] Yes  [ ] No` (Need to verify)

**Computer for Proxy Server:**
- OS Available: `[X] Windows 10  [ ] Linux  [ ] Mac  [ ] Need to install`
- Can run VM?: `[X] Yes (Hyper-V enabled, VirtualBox installed)`
- Number of Network Interfaces: `WiFi (active) + 1 Ethernet port (currently disconnected)`
- Current IP: `192.168.8.112`
- Note: Has WSL and Hyper-V available

**IoT Device Details:**
- Device Type: `Arduino Portenta H7 (ARM Cortex-M7/M4)`
- Current IP (if known): `TBD - will assign 192.168.10.101`
- Connection Type: `[X] Wired Ethernet  [ ] WiFi`
- Does it support proxy settings?: `[ ] Yes  [X] No  [ ] Unknown` (Embedded device - no native proxy support)
- Ports/Protocols it uses: `HTTP/HTTPS (data visualization server), custom protocols TBD`
- Connection: Ethernet via USB-C or built-in Ethernet PHY

---

## Proposed Network Design

### IP Address Scheme

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼─────────┐
                    │  Main Router   │
                    │  192.168.1.1   │
                    └──────┬─────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
      ┌─────▼─────┐              ┌───────▼────────┐
      │Main Network│              │  Managed Switch │
      │192.168.1.0 │              │  (VLAN Capable) │
      │   /24      │              └───────┬────────┘
      └────────────┘                      │
                                    ┌─────┴─────┐
                              ┌─────▼─────┐     │
                              │VLAN 1     │     │VLAN 10
                              │(Default)  │     │(IoT)
                              └───────────┘     │
                                          ┌─────▼──────┐
                                          │Proxy Server│
                                          │Two IFs:    │
                                          │.1.X & .10.1│
                                          └─────┬──────┘
                                                │
                                          ┌─────▼──────┐
                                          │ IoT Device │
                                          │192.168.10.X│
                                          └────────────┘
```

**Recommended IP Addressing (Customized for Your Network)

**Main Network (VLAN 1 - Default) - EXISTING:**
- Network: `192.168.8.0/24` (Your current network)
- Gateway: `192.168.8.1` (MSG M519 Router)
- DHCP Range: `Managed by router`
- Your PC: `192.168.8.112` (WiFi)
- Node.js Proxy Server: `192.168.8.150` (Static - will run on your PC)

**IoT VLAN (VLAN 10) - NEW:**
- Network: `192.168.10.0/24`
- Gateway: `192.168.10.1` (Your PC running Node.js proxy)
- DHCP Range: `192.168.10.100 - 192.168.10.200` (Optional)
- Portenta H7: `192.168.10.101` (Static assignment recommended)

---

## VLAN Design

### VLAN Configuration

| VLAN ID | VLAN Name    | Purpose          | Subnet          | Gateway       |
|---------|--------------|------------------|-----------------|---------------|
| 1       | Default      | Main Network     | 192.168.1.0/24  | 192.168.1.1   |
| 10      | IoT-Devices  | IoT Isolation    | 192.168.10.0/24 | 192.168.10.1  |

### Port Assignments

| Port    | VLAN Mode | VLAN ID | Device Connected | Notes                    |
|---------|-----------|---------|------------------|--------------------------|
| Port 1  | Access    | 1       | Proxy Server     | Main network connection  |
| Port 2  | Access    | 10      | IoT Device       | Isolated IoT connection  |
| Port 3  | Trunk     | 1,10    | Proxy Server     | If using single cable    |
| Port 24 | Trunk     | 1,10    | Uplink to Router | If applicable            |

**Note:** Adjust port numbers based on your actual switch.

---

## Proxy Server Planning

### Hardware Requirements

**Minimum Specs:**
- CPU: 2 cores
- RAM: 2 GB
- Disk: 20 GB
- Network: 2 interfaces (or 1 with VLAN support)

**Recommended:**
- CPU: 4 cores
- RAM: 4 GB
- Disk: 40 GB (for logs)
- Network: 2 physical interfaces

### Software Selection

**Recommended: Squid Proxy on Ubuntu**
- **Pros:** 
  - Free and open source
  - Well-documented
  - Easy to configure
  - Good logging
  - Supports transparent proxy
- **Cons:** 
  - Linux knowledge required
  - CLI configuration

**Alternative: Windows Proxy**
- CCProxy (Windows)
- Wingate
- **Pros:** GUI configuration
- **Cons:** May require license, less flexible

**Selected Option:** `___________________`

### Proxy Server Network Configuration

```
Interface 1 (eth0 or ens33):
- Network: Main Network (VLAN 1)
- IP: 192.168.1.50/24
- Gateway: 192.168.1.1
- Purpose: Internet access, management

Interface 2 (eth1 or ens34):
- Network: IoT VLAN (VLAN 10)
- IP: 192.168.10.1/24
- Gateway: None (this IS the gateway for IoT VLAN)
- Purpose: IoT device gateway
```

---

## Implementation Approach

### Option A: Full Hardware VLAN Setup (Recommended)
**Requirements:**
- Managed switch with VLAN support
- Separate computer/VM for proxy
- Physical network cables

**Steps:**
1. Configure VLANs on managed switch
2. Assign ports to VLANs
3. Set up proxy server with 2 interfaces
4. Configure routing and firewall

**Best for:** Learning full enterprise setup, production-like environment

---

### Option B: Software-based VLAN (If no managed switch)
**Requirements:**
- Linux machine with 2+ network interfaces
- Can use USB-to-Ethernet adapter for 2nd interface

**Steps:**
1. Create VLAN interface in Linux
2. Configure Linux as router/proxy
3. Connect IoT device to 2nd interface

**Best for:** Testing concepts, limited hardware

---

### Option C: Virtual Lab (Fully Virtualized)
**Requirements:**
- Hypervisor (VirtualBox, VMware, Hyper-V)
- Multiple VMs

**Components:**
- VM1: Router (pfSense or Linux)
- VM2: Proxy Server (Ubuntu + Squid)
- VM3: IoT Device Simulator

**Best for:** Learning without physical hardware, safe testing

---

## Selected Approach

**I will use:** `[X] Option B (Software-based VLAN) + Node.js Proxy`

**Reasoning:** 
- Your MSG M519 router supports VLANs, but for learning purposes we'll use a simpler software-based approach
- Your Windows PC has Ethernet + WiFi, perfect for two network interfaces
- You're comfortable with Node.js - we'll build a custom proxy server
- Can test without needing router admin access initially
- Easy to tear down and rebuild for learning
- Industry-standard concepts, beginner-friendly implementation

---

## Security Considerations

### Traffic Flow Rules

**What IoT VLAN CAN do:**
- ✅ Access Internet via Proxy (ports 80, 443)
- ✅ DNS queries (port 53)
- ✅ Specific protocols/ports required by IoT device

**What IoT VLAN CANNOT do:**
- ❌ Direct internet access (bypass proxy)
- ❌ Access main network devices (192.168.1.x)
- ❌ Access other VLANs
- ❌ Ping/scan other network segments

### Firewall Rules (Conceptual)

```
# Allow IoT VLAN to Proxy
Allow: 192.168.10.0/24 -> 192.168.10.1:3128 (Squid proxy)
Allow: 192.168.10.0/24 -> 192.168.10.1:53 (DNS)

# Block IoT to Main Network
Deny: 192.168.10.0/24 -> 192.168.1.0/24

# Allow Proxy to Internet
Allow: Proxy (192.168.1.50) -> Internet (any)

# Default
Deny: 192.168.10.0/24 -> Any
```

---

## Testing Plan

### Connectivity Tests
- [ ] Ping IoT device from proxy server
- [ ] Ping proxy gateway from IoT device
- [ ] IoT device cannot ping main network devices
- [ ] IoT device cannot reach internet directly
- [ ] IoT device CAN reach internet via proxy

### Verification Tests
- [ ] Check proxy logs show IoT traffic
- [ ] Confirm traffic isolation with packet capture
- [ ] Test IoT device normal functionality

---

## Next Steps - Phase 1 Checklist

- [ ] **Step 1.1:** Fill in "Current Network Information" section
- [ ] **Step 1.2:** Verify equipment capabilities (VLAN support)
- [ ] **Step 1.3:** Select implementation approach (A, B, or C)
- [ ] **Step 1.4:** Finalize IP addressing scheme
- [ ] **Step 1.5:** Document IoT device requirements (ports/protocols)
- [ ] **Step 1.6:** Create equipment shopping list (if needed)
- [ ] **Step 1.7:** Review and approve network design

**Once complete, proceed to Phase 2: VLAN Configuration**

---

## Questions to Answer Before Proceeding

1. **What is your IoT device?** (helps determine protocol requirements)
   - Answer: `___________________`

2. **Do you own a managed switch?** (determines hardware vs software approach)
   - Answer: `___________________`

3. **Can you dedicate a computer/VM for proxy server?** (24/7 or testing only)
   - Answer: `___________________`

4. **What's your networking experience level?** (helps determine complexity)
   - Answer: `[ ] Beginner  [ ] Intermediate  [ ] Advanced`

5. **Do you need this to be permanent or just for learning?**
   - Answer: `___________________`

---

*Phase 1 Planning - Created: October 16, 2025*
