const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeReading, demoReading, incidentDedupeKey } = require('../src/services/leakDetection');
const { calculateDiscount, evaluateClaim } = require('../src/services/insurance');
const { requireRole } = require('../src/middleware/auth');
const { Claim, LeakIncident, PayoutTransaction } = require('../src/models');

test('normal telemetry remains clear and demo values are explicitly bounded', () => {
  const reading = demoReading('normal');
  assert.equal(analyzeReading(reading).severity, 'none');
  assert.ok(reading.flow > 0 && reading.flow < 10);
  assert.equal(demoReading('offline'), null);
});

test('high moisture and flow trigger serious response; minor leak does not auto-close', () => {
  assert.equal(analyzeReading(demoReading('small_leak')).autoClose, false);
  assert.equal(analyzeReading(demoReading('major_leak')).severity, 'high');
  assert.equal(analyzeReading(demoReading('pipe_burst')).autoClose, true);
});

test('persistent elevated flow is detected without claiming certified thresholds', () => {
  const result = analyzeReading({ flow: 11, pressure: 2.8, moisture: 10 }, { flow: 11, pressure: 2.8, moisture: 10 });
  assert.equal(result.severity, 'medium');
  assert.match(result.reasons[0], /Persistent elevated water flow/);
});

test('incident idempotency key is stable within its mode and time bucket', () => {
  assert.equal(incidentDedupeKey('device-1', 'major_leak', 120000), incidentDedupeKey('device-1', 'major_leak', 179999));
  assert.notEqual(incidentDedupeKey('device-1', 'major_leak', 120000), incidentDedupeKey('device-1', 'pipe_burst', 120000));
  assert.notEqual(incidentDedupeKey('device-1', 'major_leak', 120000), incidentDedupeKey('device-1', 'major_leak', 180000));
});

test('discount requires every eligibility signal and respects the cap', () => {
  const plan = { monthlyPremium: 1000, monitoringDiscountPercent: 40 };
  const complete = calculateDiscount(plan, { connected: true, uptime: 98, autoShutoff: true });
  assert.equal(complete.percent, 25);
  assert.equal(complete.netPremium, 750);
  assert.equal(calculateDiscount(plan, { connected: false, uptime: 98, autoShutoff: true }).amount, 0);
});

test('claim evaluation rejects pre-policy events and caps qualifying payouts', () => {
  const plan = { triggerFlow: 10, triggerMoisture: 50, waitingDays: 0, deductible: 1000, maxPayout: 12000, coverageLimit: 50000 };
  const incident = { severity: 'high', createdAt: new Date('2026-01-03'), simulated: true, evidence: { flow: 20, moisture: 90, telemetryReliable: true, estimatedLoss: 30000 } };
  const policy = { status: 'active', startsAt: new Date('2026-01-01') };
  assert.equal(evaluateClaim({ incident, policy, plan }).amount, 12000);
  assert.equal(evaluateClaim({ incident: { ...incident, createdAt: new Date('2025-01-01') }, policy, plan }).status, 'Rejected');
});

test('critical or ambiguous claims go to review; ordinary trigger failures are rejected', () => {
  const plan = { triggerFlow: 10, triggerMoisture: 50, waitingDays: 0, deductible: 0, maxPayout: 20000, coverageLimit: 50000 };
  const policy = { status: 'active', startsAt: new Date('2020-01-01') };
  const incident = { severity: 'critical', createdAt: new Date(), simulated: true, evidence: { flow: 35, moisture: 95, telemetryReliable: true, estimatedLoss: 40000 } };
  assert.equal(evaluateClaim({ incident, policy, plan }).status, 'Under Review');
  assert.equal(evaluateClaim({ incident: { ...incident, severity: 'high', evidence: { ...incident.evidence, flow: 1 } }, policy, plan }).status, 'Rejected');
  const unreliable = { ...incident, severity: 'high', evidence: { ...incident.evidence, telemetryReliable: false } };
  assert.equal(evaluateClaim({ incident: unreliable, policy, plan }).status, 'Under Review');
  assert.equal(evaluateClaim({ incident: unreliable, policy, plan }).amount, 0);
});

test('administrator authorization denies homeowners and permits admins', () => {
  const middleware = requireRole('admin');
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  let continued = false;
  middleware({ user: { role: 'homeowner' } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
  middleware({ user: { role: 'admin' } }, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('database uniqueness constraints enforce claim and payout idempotency', () => {
  const hasUniqueIndex = (schema, field) => schema.indexes().some(([keys, options]) => keys[field] === 1 && options.unique === true);
  assert.equal(hasUniqueIndex(Claim.schema, 'incident'), true);
  assert.equal(hasUniqueIndex(PayoutTransaction.schema, 'claim'), true);
  assert.equal(hasUniqueIndex(LeakIncident.schema, 'dedupeKey'), true);
});
