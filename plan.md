# VLAN + Proxy Server Test Setup Plan

## Project Overview
Create a test environment to understand how to isolate IoT devices on a VLAN and route their traffic through a proxy server to the internet. This setup simulates enterprise network requirements where IoT devices need network segmentation and controlled internet access.

## Goals
1. Set up a VLAN to isolate IoT device traffic
2. Configure a proxy server to handle internet-bound traffic from the VLAN
3. Route all IoT device traffic through the proxy
4. Test and validate the setup with a real IoT device
5. Document the configuration for client implementation

## Architecture Overview

```
[IoT Device] <---> [VLAN-enabled Switch/Router] <---> [Proxy Server] <---> [Internet]
                            (VLAN 10)                    (Squid/etc)
```

## Prerequisites

### Hardware/Network Requirements
- [ ] Network switch with VLAN support (or router with VLAN capability)
- [ ] Computer/VM to act as proxy server (Linux preferred)
- [ ] IoT device for testing
- [ ] Access to network infrastructure configuration

### Software Requirements
- [ ] Proxy server software (Squid, Nginx, or similar)
- [ ] SSH access to network equipment (if managed switch)
- [ ] Network configuration tools

## Implementation Phases

### Phase 1: Network Planning
**Objective:** Design the network topology and IP scheme

- [ ] Document current network configuration
- [ ] Choose VLAN ID (e.g., VLAN 10 for IoT devices)
- [ ] Define IP address ranges:
  - Main network: (e.g., 192.168.1.0/24)
  - IoT VLAN: (e.g., 192.168.10.0/24)
  - Proxy server IPs: (one on main network, one on IoT VLAN)
- [ ] Identify which switch port will connect to IoT device
- [ ] Identify where proxy server will be hosted (physical/VM)

### Phase 2: VLAN Configuration
**Objective:** Create and configure the VLAN on network equipment

#### On Managed Switch/Router:
- [ ] Create VLAN (VLAN 10 - IoT)
- [ ] Assign port for IoT device as access port on VLAN 10
- [ ] Configure trunk port if connecting to external router
- [ ] Set up DHCP for VLAN 10 (or static IP configuration)
- [ ] Document switch configuration

#### Alternative (Software-based VLAN on Linux):
- [ ] Use Linux machine with multiple NICs
- [ ] Configure VLAN interface using `vconfig` or `ip` commands
- [ ] Set up routing between interfaces

### Phase 3: Proxy Server Setup
**Objective:** Install and configure proxy server software

#### Installation (Linux - Squid Proxy):
- [ ] Install Ubuntu/Debian VM or use existing Linux machine
- [ ] Install Squid proxy: `apt-get install squid`
- [ ] Configure network interfaces:
  - Interface 1: Connected to main network
  - Interface 2: Connected to IoT VLAN (or VLAN subinterface)

#### Squid Configuration:
- [ ] Configure `/etc/squid/squid.conf`:
  - Set ACLs for IoT VLAN network
  - Define allowed ports (80, 443, custom ports)
  - Enable logging for troubleshooting
  - Set up transparent proxy (optional)
- [ ] Configure IP forwarding on proxy server
- [ ] Set up iptables rules for traffic routing
- [ ] Test proxy server with curl commands

### Phase 4: Routing Configuration
**Objective:** Ensure IoT VLAN traffic routes through proxy

- [ ] Configure default gateway on IoT VLAN to point to proxy server
- [ ] Set up NAT/masquerading on proxy server
- [ ] Configure firewall rules:
  - Allow traffic from IoT VLAN to proxy
  - Block direct internet access from IoT VLAN
  - Allow proxy-to-internet traffic
- [ ] Test routing with traceroute/ping

### Phase 5: IoT Device Configuration
**Objective:** Connect and test IoT device through the setup

- [ ] Connect IoT device to VLAN-configured switch port
- [ ] Configure IoT device network settings:
  - Static IP or DHCP from VLAN
  - Gateway: Proxy server IP
  - DNS servers
  - Proxy settings (if device supports explicit proxy)
- [ ] Test basic connectivity (ping gateway)
- [ ] Test internet connectivity through proxy
- [ ] Monitor proxy logs for device traffic

### Phase 6: Testing & Validation
**Objective:** Verify complete setup functionality

- [ ] Connectivity tests:
  - Ping from IoT device to proxy server
  - Ping from IoT device to internet (should route through proxy)
  - Access HTTP/HTTPS endpoints from IoT device
- [ ] Security tests:
  - Verify IoT device cannot access other VLANs
  - Verify traffic is going through proxy (check logs)
  - Test blocked ports/protocols
- [ ] Performance tests:
  - Measure latency
  - Test bandwidth through proxy
- [ ] IoT device functionality tests:
  - Test normal IoT device operations
  - Verify device can reach required endpoints
  - Check for any connectivity issues

### Phase 7: Documentation
**Objective:** Document the setup for client implementation

- [ ] Network diagram with all components
- [ ] IP addressing scheme
- [ ] Switch/router configuration commands
- [ ] Proxy server configuration files
- [ ] Firewall rules documentation
- [ ] IoT device configuration steps
- [ ] Troubleshooting guide
- [ ] Known issues and solutions

## Technical Details to Document

### Network Configuration
```
VLAN ID: 10
VLAN Name: IoT-Devices
VLAN Subnet: 192.168.10.0/24
Gateway: 192.168.10.1 (Proxy Server)
```

### Proxy Server
```
Operating System: Ubuntu 22.04 LTS (or other)
Proxy Software: Squid
Interface 1 (eth0): 192.168.1.X (main network)
Interface 2 (eth0.10): 192.168.10.1 (IoT VLAN)
Proxy Port: 3128
```

### Switch Configuration
```
Switch Model: [To be filled]
IoT Device Port: [To be filled]
Trunk Port (if applicable): [To be filled]
```

## Tools & Resources

### Configuration Tools
- Network switch CLI/Web interface
- Linux networking tools: ip, ifconfig, iptables
- Squid proxy configuration
- tcpdump/wireshark for packet analysis

### Testing Tools
- ping, traceroute
- curl with proxy settings
- netcat for port testing
- nmap for network scanning

### Monitoring Tools
- Squid access logs: `/var/log/squid/access.log`
- Firewall logs
- Network monitoring tools

## Common Challenges & Solutions

### Challenge 1: IoT Device Won't Connect
- Check VLAN assignment on switch port
- Verify IP addressing (DHCP or static)
- Check physical connectivity

### Challenge 2: Proxy Authentication
- Some IoT devices don't support proxy authentication
- Solution: Use IP-based ACLs instead

### Challenge 3: SSL/TLS Traffic
- Encrypted traffic through proxy
- May need SSL bump for HTTPS inspection (advanced)

### Challenge 4: Device-Specific Protocols
- IoT devices may use non-HTTP protocols
- Configure proxy to allow required ports

## Timeline Estimate
- Phase 1 (Planning): 1-2 hours
- Phase 2 (VLAN Setup): 2-3 hours
- Phase 3 (Proxy Setup): 3-4 hours
- Phase 4 (Routing): 2-3 hours
- Phase 5 (IoT Config): 1-2 hours
- Phase 6 (Testing): 2-3 hours
- Phase 7 (Documentation): 2-3 hours

**Total Estimated Time: 13-20 hours**

## Next Steps
1. Review and adjust plan based on available equipment
2. Gather necessary hardware/access credentials
3. Begin Phase 1: Network Planning
4. Document actual configuration as you progress

## Notes
- Start simple: Basic VLAN + proxy before adding complexity
- Test each phase before moving to next
- Keep detailed notes of all configuration changes
- Take configuration backups before making changes
- Consider using VMs for initial testing before production setup

---
*Created: October 16, 2025*
*Project: VLAN + Proxy Test Environment*
