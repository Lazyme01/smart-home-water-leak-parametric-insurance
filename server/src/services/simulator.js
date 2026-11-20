const { IoTDevice, SensorReading, LeakIncident, InsurancePolicy, InsurancePlan, Notification } = require('../models');
const { demoReading, analyzeReading, incidentDedupeKey } = require('./leakDetection');
const { createClaim } = require('./claims');

async function runDeviceMode(device, mode, io) {
  device.mode = mode;
  device.online = mode !== 'offline';
  device.connected = mode !== 'offline';
  device.sensorStatus = mode === 'sensor_failure' ? 'failure' : 'ok';
  if (!device.online) {
    await device.save();
    const notification = await Notification.create({ owner: device.owner, type: 'device', title: 'Device offline (DEMO)', message: `${device.deviceId} is simulated offline.`, simulated: true });
    io.to(`user:${device.owner}`).emit('notification:new', notification);
    io.to(`user:${device.owner}`).emit('device:offline', { deviceId: device.deviceId, simulated: true });
    return { device, reading: null, incident: null };
  }
  const previous = await SensorReading.findOne({ device: device._id }).sort({ createdAt: -1 });
  const value = demoReading(mode, previous);
  const reading = await SensorReading.create({ ...value, previous: undefined, device: device._id, owner: device.owner, simulated: true });
  device.lastSeen = reading.createdAt;
  if (mode === 'sensor_failure') {
    const notification = await Notification.create({ owner: device.owner, type: 'device', title: 'Sensor fault detected (DEMO)', message: `${device.deviceId} is reporting a simulated sensor failure; this reading is not reliable for claims.`, simulated: true });
    io.to(`user:${device.owner}`).emit('notification:new', notification);
  }
  const detection = analyzeReading(value, previous);
  let incident = null;
  if (detection.severity !== 'none') {
    const key = incidentDedupeKey(device._id, mode);
    incident = await LeakIncident.findOne({ dedupeKey: key });
    if (!incident) {
      incident = await LeakIncident.create({
        device: device._id, owner: device.owner, property: device.property,
        severity: detection.severity, reason: detection.reasons.join('; '),
        valveClosed: detection.autoClose && device.autoShutoff,
        evidence: { flow: reading.flow, pressure: reading.pressure, moisture: reading.moisture, telemetryReliable: true, estimatedLoss: detection.severity === 'critical' ? 45000 : detection.severity === 'high' ? 22000 : 9000 },
        dedupeKey: key, simulated: true
      });
      if (incident.valveClosed) device.valve = 'CLOSED';
      const notification = await Notification.create({ owner: device.owner, type: 'incident', title: `${detection.severity.toUpperCase()} leak alert (DEMO)`, message: `${incident.reason}${incident.valveClosed ? ' · Simulated valve closed.' : ''}`, simulated: true });
      io.to(`user:${device.owner}`).emit('notification:new', notification);
      const policy = await InsurancePolicy.findOne({ owner: device.owner, property: device.property, status: 'active' }).sort({ startsAt: -1 });
      if (policy) {
        const plan = await InsurancePlan.findById(policy.plan);
        await createClaim({ owner: device.owner, incident, policy, plan, io });
      }
    }
  }
  await device.save();
  const payload = { reading, device: { id: device._id, valve: device.valve, mode, online: device.online, sensorStatus: device.sensorStatus }, incident, simulated: true };
  io.to(`user:${device.owner}`).emit('sensor:update', payload);
  if (incident) io.to(`user:${device.owner}`).emit('incident:new', payload);
  return payload;
}

module.exports = { runDeviceMode };
