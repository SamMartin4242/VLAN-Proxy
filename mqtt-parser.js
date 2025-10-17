// MQTT Packet Parser for extracting Azure IoT Hub hostname from CONNECT packet
// This allows the proxy to dynamically route to the correct IoT Hub

class MQTTPacketParser {
  static parseConnectPacket(buffer) {
    try {
      let offset = 0;
      
      // Fixed header
      const packetType = (buffer[offset] >> 4) & 0x0F;
      if (packetType !== 1) { // CONNECT = 1
        return null;
      }
      
      offset++; // Skip packet type
      
      // Remaining length (variable length encoding)
      let remainingLength = 0;
      let multiplier = 1;
      let byte;
      do {
        byte = buffer[offset++];
        remainingLength += (byte & 127) * multiplier;
        multiplier *= 128;
      } while ((byte & 128) !== 0);
      
      // Protocol name length
      const protocolNameLength = buffer.readUInt16BE(offset);
      offset += 2;
      
      // Protocol name (should be "MQTT")
      const protocolName = buffer.toString('utf8', offset, offset + protocolNameLength);
      offset += protocolNameLength;
      
      if (protocolName !== 'MQTT') {
        console.log(`Warning: Unexpected protocol name: ${protocolName}`);
      }
      
      // Protocol level
      const protocolLevel = buffer[offset++];
      
      // Connect flags
      const connectFlags = buffer[offset++];
      const hasUsername = (connectFlags & 0x80) !== 0;
      const hasPassword = (connectFlags & 0x40) !== 0;
      
      // Keep alive
      const keepAlive = buffer.readUInt16BE(offset);
      offset += 2;
      
      // Client ID length
      const clientIdLength = buffer.readUInt16BE(offset);
      offset += 2;
      
      // Client ID
      const clientId = buffer.toString('utf8', offset, offset + clientIdLength);
      offset += clientIdLength;
      
      let username = null;
      let hostname = null;
      
      // Username (if present)
      if (hasUsername && offset < buffer.length) {
        const usernameLength = buffer.readUInt16BE(offset);
        offset += 2;
        username = buffer.toString('utf8', offset, offset + usernameLength);
        offset += usernameLength;
        
        // Azure IoT Hub format: {iothubname}.azure-devices.net/{deviceId}/?api-version=2020-09-30
        if (username.includes('.azure-devices.net')) {
          const match = username.match(/([^\/]+\.azure-devices\.net)/);
          if (match) {
            hostname = match[1];
          }
        }
      }
      
      // Try to extract hostname from Client ID if not found in username
      if (!hostname && clientId.includes('.azure-devices.net')) {
        const match = clientId.match(/([^\/]+\.azure-devices\.net)/);
        if (match) {
          hostname = match[1];
        }
      }
      
      return {
        protocolName,
        protocolLevel,
        clientId,
        username,
        hostname,
        keepAlive,
        hasPassword,
      };
    } catch (err) {
      console.error('Error parsing MQTT CONNECT packet:', err);
      return null;
    }
  }
  
  static getPacketType(buffer) {
    if (buffer.length === 0) return null;
    const type = (buffer[0] >> 4) & 0x0F;
    const types = {
      1: 'CONNECT',
      2: 'CONNACK',
      3: 'PUBLISH',
      4: 'PUBACK',
      5: 'PUBREC',
      6: 'PUBREL',
      7: 'PUBCOMP',
      8: 'SUBSCRIBE',
      9: 'SUBACK',
      10: 'UNSUBSCRIBE',
      11: 'UNSUBACK',
      12: 'PINGREQ',
      13: 'PINGRESP',
      14: 'DISCONNECT',
    };
    return types[type] || `UNKNOWN(${type})`;
  }
}

module.exports = MQTTPacketParser;
