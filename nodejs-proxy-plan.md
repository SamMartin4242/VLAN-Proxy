# Node.js Transparent Proxy Server for IoT VLAN

## Overview
A Node.js-based HTTP/HTTPS proxy server that will act as the gateway for your Portenta H7 IoT device. This proxy will:
- Route traffic from isolated VLAN to internet
- Log all IoT device requests
- Provide security controls
- Integrate with your existing Node.js visualization server

## Architecture

```
                Your PC (192.168.8.112)
        ┌───────────────────────────────────────┐
        │                                       │
        │  ┌─────────────────────────────────┐ │
        │  │   WiFi Interface                │ │
        │  │   IP: 192.168.8.112            │ │
        │  │   Gateway: 192.168.8.1         │ │
        │  │   (Internet Access)            │ │
        │  └──────────┬──────────────────────┘ │
        │             │                         │
        │  ┌──────────▼──────────────────────┐ │
        │  │  Node.js Proxy Server          │ │
        │  │  Port 3000: Visualization      │ │
        │  │  Port 8080: HTTP Proxy         │ │
        │  │  Port 8443: HTTPS Proxy        │ │
        │  └──────────┬──────────────────────┘ │
        │             │                         │
        │  ┌──────────▼──────────────────────┐ │
        │  │   Ethernet Interface            │ │
        │  │   IP: 192.168.10.1             │ │
        │  │   (IoT VLAN Gateway)           │ │
        │  └──────────┬──────────────────────┘ │
        └─────────────┼─────────────────────────┘
                      │
              ┌───────▼────────┐
              │  Portenta H7   │
              │  192.168.10.101│
              └────────────────┘
```

## Implementation Plan

### Phase 1: Setup Ethernet Interface (Software VLAN)
1. Connect Ethernet cable from PC to Portenta H7
2. Configure PC Ethernet with static IP: 192.168.10.1
3. Enable Internet Connection Sharing (ICS) OR use Node.js routing

### Phase 2: Create Node.js Proxy Server
1. Initialize Node.js project in VLAN+Proxy folder
2. Install dependencies (http-proxy, express)
3. Create transparent proxy with logging
4. Add routing/NAT functionality

### Phase 3: Configure Portenta H7
1. Set static IP: 192.168.10.101
2. Set gateway: 192.168.10.1 (your PC)
3. Set DNS: 8.8.8.8
4. Test connectivity

### Phase 4: Test & Validate
1. Ping tests
2. HTTP/HTTPS requests through proxy
3. Check proxy logs
4. Verify visualization server still works

## Why Node.js Instead of Squid?

**Advantages for Your Use Case:**
- ✅ You already use Node.js - familiar environment
- ✅ Easy to integrate with your visualization server
- ✅ Can customize for Portenta H7 specific needs
- ✅ Simple logging and debugging
- ✅ Cross-platform (works on Windows)
- ✅ Can extend with custom features

**Industry Standard Equivalent:**
- Squid Proxy (what enterprises use)
- HAProxy
- Nginx reverse proxy
- But for learning + your existing stack, Node.js is perfect!

## Next Steps

1. ✅ **Phase 1 Complete** - Network planning done
2. 🔄 **Phase 2** - Configure Windows Ethernet interface
3. ⏳ **Phase 3** - Create Node.js proxy server
4. ⏳ **Phase 4** - Configure Portenta H7
5. ⏳ **Phase 5** - Test everything

---
*Created: October 16, 2025*
