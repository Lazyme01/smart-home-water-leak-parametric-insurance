function analyzeReading(reading, previous = null) {
  const reasons = [];
  if (reading.moisture >= 75) reasons.push('High moisture detected near the sensor');
  if (reading.flow >= 18) reasons.push('Unusually high water flow');
  if (previous && reading.pressure < previous.pressure * 0.65) reasons.push('Sudden pipe pressure drop');
  if (previous && reading.flow >= 10 && previous.flow >= 10) reasons.push('Persistent elevated water flow');
  if (!reasons.length && reading.flow >= 10 && reading.moisture >= 45) reasons.push('Elevated flow with rising moisture');

  if (!reasons.length) return { severity: 'none', reasons, autoClose: false };
  const severity = reading.flow >= 30 || reading.moisture >= 90 ? 'critical'
    : reading.flow >= 18 || reading.moisture >= 75 ? 'high' : 'medium';
  return { severity, reasons, autoClose: severity === 'high' || severity === 'critical' };
}

function demoReading(mode, previous = null) {
  const presets = {
    normal: { flow: 4.2, pressure: 2.8, moisture: 12, temperature: 21 },
    small_leak: { flow: 12.5, pressure: 2.45, moisture: 55, temperature: 21 },
    major_leak: { flow: 22.8, pressure: 1.55, moisture: 82, temperature: 22 },
    pipe_burst: { flow: 38.6, pressure: 0.72, moisture: 96, temperature: 22 },
    sensor_failure: { flow: 0, pressure: 0, moisture: 0, temperature: 21 },
    offline: null
  };
  const value = presets[mode];
  if (!value) return null;
  const jitter = mode === 'normal' ? (Math.random() * 0.8 - 0.4) : 0;
  return { ...value, flow: Math.max(0, value.flow + jitter), previous };
}

function incidentDedupeKey(deviceId, mode, timestamp = Date.now()) {
  return `${deviceId}:${mode}:${Math.floor(timestamp / 60000)}`;
}

module.exports = { analyzeReading, demoReading, incidentDedupeKey };
