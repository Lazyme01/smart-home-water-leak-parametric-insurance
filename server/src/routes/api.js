const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');
const { User, Property, IoTDevice, SensorReading, LeakIncident, InsurancePlan, InsurancePolicy, Claim, PayoutTransaction, Notification, AuditLog } = require('../models');
const { runDeviceMode } = require('../services/simulator');
const { calculateDiscount } = require('../services/insurance');
const { recordPayout } = require('../services/claims');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  next();
};
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone });
const issueToken = user => jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const own = (model, id, owner) => model.findOne({ _id: id, owner });

router.post('/auth/register', loginLimiter, [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 })
], validate, async (req, res, next) => {
  try {
    const user = await User.create({ name: req.body.name, email: req.body.email, password: await bcrypt.hash(req.body.password, 12) });
    res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    next(error);
  }
});
router.post('/auth/login', loginLimiter, [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()], validate, async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: issueToken(user), user: publicUser(user) });
});
router.get('/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/auth/logout', authenticate, (req, res) => res.json({ message: 'Logged out. Remove the local demo token.' }));

router.use(authenticate);
router.get('/users/profile', (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/users/profile', [body('name').optional().trim().isLength({ min: 2, max: 80 }), body('phone').optional().isString().isLength({ max: 30 })], validate, async (req, res) => {
  if (req.body.name !== undefined) req.user.name = req.body.name;
  if (req.body.phone !== undefined) req.user.phone = req.body.phone;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.get('/properties', async (req, res) => res.json({ properties: await Property.find({ owner: req.user._id }).sort({ createdAt: -1 }) }));
router.post('/properties', [body('name').trim().isLength({ min: 2, max: 80 }), body('address').trim().isLength({ min: 5, max: 240 }), body('type').optional().isString()], validate, async (req, res) => {
  const property = await Property.create({ owner: req.user._id, name: req.body.name, address: req.body.address, type: req.body.type || 'House' });
  res.status(201).json({ property });
});
router.get('/devices', async (req, res) => res.json({ devices: await IoTDevice.find({ owner: req.user._id }).populate('property', 'name address') }));
router.post('/devices', [body('propertyId').isMongoId(), body('deviceId').optional().isString().isLength({ min: 3, max: 60 })], validate, async (req, res) => {
  const property = await own(Property, req.body.propertyId, req.user._id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const device = await IoTDevice.create({ owner: req.user._id, property: property._id, deviceId: req.body.deviceId || `AS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, lastSeen: new Date() });
  res.status(201).json({ device });
});
router.get('/sensors/latest', async (req, res) => {
  const devices = await IoTDevice.find({ owner: req.user._id }).select('_id deviceId');
  const readings = await Promise.all(devices.map(async d => SensorReading.findOne({ device: d._id }).sort({ createdAt: -1 })));
  res.json({ readings: readings.filter(Boolean) });
});
router.get('/sensors', async (req, res) => {
  const device = req.query.deviceId ? await own(IoTDevice, req.query.deviceId, req.user._id) : null;
  if (req.query.deviceId && !device) return res.status(404).json({ error: 'Device not found' });
  const readings = await SensorReading.find({ owner: req.user._id, ...(device ? { device: device._id } : {}) }).sort({ createdAt: -1 }).limit(80);
  res.json({ readings: readings.reverse() });
});
router.post('/devices/:id/simulate', [body('mode').isIn(['normal', 'small_leak', 'major_leak', 'pipe_burst', 'sensor_failure', 'offline'])], validate, async (req, res, next) => {
  try {
    const device = await own(IoTDevice, req.params.id, req.user._id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (req.body.mode === 'offline') {
      const result = await runDeviceMode(device, 'offline', req.app.get('io'));
      return res.json(result);
    }
    const result = await runDeviceMode(device, req.body.mode, req.app.get('io'));
    res.json(result);
  } catch (error) { next(error); }
});
const simulationTimers = new Map();
router.post('/devices/:id/simulation/start', async (req, res) => {
  const device = await own(IoTDevice, req.params.id, req.user._id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (!simulationTimers.has(String(device._id))) {
    const timer = setInterval(async () => {
      try {
        const fresh = await IoTDevice.findById(device._id);
        if (fresh && fresh.mode !== 'offline') await runDeviceMode(fresh, fresh.mode, req.app.get('io'));
      } catch (error) { console.error('Simulation tick failed', error); }
    }, 5000);
    simulationTimers.set(String(device._id), timer);
  }
  res.json({ running: true, intervalMs: 5000, simulated: true });
});
router.post('/devices/:id/simulation/stop', async (req, res) => {
  const device = await own(IoTDevice, req.params.id, req.user._id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const timer = simulationTimers.get(String(device._id));
  if (timer) clearInterval(timer);
  simulationTimers.delete(String(device._id));
  res.json({ running: false, simulated: true });
});
router.post('/devices/:id/valve', [body('state').isIn(['OPEN', 'CLOSED']), body('acknowledged').optional().isBoolean().toBoolean(), body('safetyConfirmed').optional().isBoolean().toBoolean()], validate, async (req, res) => {
  const device = await own(IoTDevice, req.params.id, req.user._id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (req.body.state === 'OPEN') {
    const incident = await LeakIncident.findOne({ device: device._id, status: { $ne: 'resolved' } }).sort({ createdAt: -1 });
    if (incident && (req.body.acknowledged !== true || req.body.safetyConfirmed !== true)) return res.status(400).json({ error: 'Acknowledge the incident and confirm it is safe before reopening the valve' });
    if (incident) { incident.status = 'acknowledged'; incident.acknowledgedAt = new Date(); await incident.save(); }
  }
  device.valve = req.body.state;
  await device.save();
  await AuditLog.create({ actor: req.user._id, action: `valve_${req.body.state.toLowerCase()}`, entityType: 'IoTDevice', entityId: String(device._id), details: { simulated: true } });
  req.app.get('io').to(`user:${req.user._id}`).emit('valve:update', { deviceId: device._id, state: device.valve, simulated: true });
  res.json({ valve: device.valve, simulated: true });
});

router.get('/incidents', async (req, res) => res.json({ incidents: await LeakIncident.find({ owner: req.user._id }).populate('property', 'name').sort({ createdAt: -1 }).limit(100) }));
router.post('/incidents/:id/acknowledge', async (req, res) => {
  const incident = await own(LeakIncident, req.params.id, req.user._id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  incident.status = 'acknowledged'; incident.acknowledgedAt = new Date(); await incident.save();
  res.json({ incident });
});
router.post('/incidents/:id/resolve', [body('acknowledged').optional().isBoolean().toBoolean(), body('safetyConfirmed').optional().isBoolean().toBoolean()], validate, async (req, res) => {
  const incident = await own(LeakIncident, req.params.id, req.user._id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  if (incident.valveClosed && (req.body.acknowledged !== true || req.body.safetyConfirmed !== true)) return res.status(400).json({ error: 'Acknowledge and confirm the area is safe before resolving' });
  incident.status = 'resolved'; incident.resolvedAt = new Date(); await incident.save();
  res.json({ incident });
});

router.get('/plans', async (req, res) => res.json({ plans: await InsurancePlan.find().sort({ monthlyPremium: 1 }) }));
router.get('/policies', async (req, res) => res.json({ policies: await InsurancePolicy.find({ owner: req.user._id }).populate('plan').populate('property', 'name address').sort({ createdAt: -1 }) }));
router.post('/policies', [body('planId').isMongoId(), body('propertyId').isMongoId()], validate, async (req, res, next) => {
  const [plan, property, device] = await Promise.all([
    InsurancePlan.findById(req.body.planId), own(Property, req.body.propertyId, req.user._id),
    IoTDevice.findOne({ owner: req.user._id, property: req.body.propertyId })
  ]);
  if (!plan || !property) return res.status(404).json({ error: 'Plan or property not found' });
  const discount = calculateDiscount(plan, device);
  try {
    const policy = await InsurancePolicy.create({ owner: req.user._id, property: property._id, plan: plan._id, monthlyPremium: discount.netPremium, discount });
    await AuditLog.create({ actor: req.user._id, action: 'policy_activated', entityType: 'InsurancePolicy', entityId: String(policy._id), details: { plan: plan.name, discount } });
    const notification = await Notification.create({ owner: req.user._id, type: 'policy', title: 'Demo policy activated', message: `${plan.name} cover is active at ${discount.netPremium} INR/month${discount.eligible ? ` with a ${discount.percent}% device discount` : ' without a device discount'}.`, simulated: true });
    req.app.get('io').to(`user:${req.user._id}`).emit('notification:new', notification);
    res.status(201).json({ policy: await policy.populate(['plan', 'property']) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'This property already has an active policy' });
    next(error);
  }
});
router.post('/policies/:id/cancel', async (req, res) => {
  const policy = await own(InsurancePolicy, req.params.id, req.user._id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  policy.status = 'cancelled'; await policy.save();
  res.json({ policy });
});
router.get('/claims', async (req, res) => res.json({ claims: await Claim.find({ owner: req.user._id }).populate({ path: 'incident', populate: { path: 'device property' } }).populate({ path: 'policy', populate: 'plan' }).sort({ createdAt: -1 }) }));
router.get('/claims/:id', async (req, res) => {
  const claim = await Claim.findOne({ _id: req.params.id, owner: req.user._id }).populate({ path: 'incident', populate: { path: 'device property' } }).populate({ path: 'policy', populate: 'plan' });
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  const payout = await PayoutTransaction.findOne({ claim: claim._id });
  res.json({ claim, payout });
});
router.get('/payouts', async (req, res) => res.json({ payouts: await PayoutTransaction.find({ owner: req.user._id }).populate('claim').sort({ createdAt: -1 }) }));
router.get('/notifications', async (req, res) => res.json({ notifications: await Notification.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(50) }));
router.patch('/notifications/:id/read', async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  res.json({ notification });
});

router.get('/admin/summary', requireRole('admin'), async (req, res) => {
  const [users, devices, incidents, policies, claims, payouts, reviewClaims] = await Promise.all([
    User.countDocuments(), IoTDevice.countDocuments(), LeakIncident.countDocuments(), InsurancePolicy.countDocuments(),
    Claim.countDocuments(), PayoutTransaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Claim.find({ status: 'Under Review' }).populate('owner', 'name email').populate('incident').populate('policy')
  ]);
  res.json({ users, devices, incidents, policies, claims, simulatedPayoutTotal: payouts[0]?.total || 0, reviewClaims });
});
router.get('/admin/users', requireRole('admin'), async (req, res) => res.json({ users: await User.find().select('name email role createdAt').sort({ createdAt: -1 }) }));
router.get('/admin/devices', requireRole('admin'), async (req, res) => res.json({ devices: await IoTDevice.find().populate('owner', 'name email').populate('property', 'name').sort({ createdAt: -1 }) }));
router.patch('/admin/devices/:id', requireRole('admin'), [
  body('connected').optional().isBoolean(),
  body('autoShutoff').optional().isBoolean(),
  body('online').optional().isBoolean()
], validate, async (req, res) => {
  const updates = {};
  for (const key of ['connected', 'autoShutoff', 'online']) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'At least one device setting is required' });
  const device = await IoTDevice.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  await AuditLog.create({ actor: req.user._id, action: 'device_settings_updated', entityType: 'IoTDevice', entityId: String(device._id), details: updates });
  res.json({ device });
});
router.get('/admin/policies', requireRole('admin'), async (req, res) => res.json({ policies: await InsurancePolicy.find().populate('owner', 'name email').populate('plan').populate('property', 'name').sort({ createdAt: -1 }) }));
router.patch('/admin/policies/:id', requireRole('admin'), [body('status').isIn(['active', 'cancelled'])], validate, async (req, res) => {
  const policy = await InsurancePolicy.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  await AuditLog.create({ actor: req.user._id, action: `policy_${req.body.status}`, entityType: 'InsurancePolicy', entityId: String(policy._id), details: { simulated: true } });
  res.json({ policy });
});
router.get('/admin/plans', requireRole('admin'), async (req, res) => res.json({ plans: await InsurancePlan.find().sort({ monthlyPremium: 1 }) }));
router.patch('/admin/plans/:id', requireRole('admin'), [
  body('monthlyPremium').optional().isFloat({ min: 0, max: 100000 }),
  body('coverageLimit').optional().isFloat({ min: 0, max: 10000000 }),
  body('triggerFlow').optional().isFloat({ min: 0, max: 1000 }),
  body('triggerMoisture').optional().isFloat({ min: 0, max: 100 }),
  body('maxPayout').optional().isFloat({ min: 0, max: 10000000 }),
  body('monitoringDiscountPercent').optional().isFloat({ min: 0, max: 25 }),
  body('deductible').optional().isFloat({ min: 0, max: 10000000 }),
  body('waitingDays').optional().isInt({ min: 0, max: 365 })
], validate, async (req, res) => {
  const allowed = ['monthlyPremium', 'coverageLimit', 'triggerFlow', 'triggerMoisture', 'maxPayout', 'monitoringDiscountPercent', 'deductible', 'waitingDays'];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = Number(req.body[key]);
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No editable plan parameters provided' });
  const plan = await InsurancePlan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  await AuditLog.create({ actor: req.user._id, action: 'demo_plan_parameters_updated', entityType: 'InsurancePlan', entityId: String(plan._id), details: updates });
  res.json({ plan });
});
router.get('/admin/audit', requireRole('admin'), async (req, res) => res.json({ logs: await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(100) }));
router.get('/admin/claims', requireRole('admin'), async (req, res) => res.json({ claims: await Claim.find().populate('owner', 'name email').populate('incident').populate({ path: 'policy', populate: 'plan' }).sort({ createdAt: -1 }) }));
router.post('/admin/claims/:id/decision', requireRole('admin'), [body('decision').isIn(['approve', 'reject']), body('note').optional().isString().isLength({ max: 500 })], validate, async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (['Paid', 'Rejected'].includes(claim.status)) return res.status(409).json({ error: 'This claim has already been finalized' });
  claim.status = req.body.decision === 'approve' ? 'Approved' : 'Rejected';
  claim.reviewedBy = req.user._id;
  claim.timeline.push({ status: claim.status, note: req.body.note || 'Administrator demo review' });
  await claim.save();
  if (claim.status === 'Approved' && claim.amount > 0) {
    await recordPayout(claim.owner, claim, claim.amount);
    claim.status = 'Paid'; claim.timeline.push({ status: 'Paid', note: 'SIMULATED payout; no money moved' }); await claim.save();
  }
  await AuditLog.create({ actor: req.user._id, action: `claim_${req.body.decision}`, entityType: 'Claim', entityId: String(claim._id), details: { note: req.body.note, simulated: true } });
  await Notification.create({ owner: claim.owner, type: 'claim', title: `Demo claim ${claim.status}`, message: `Administrator decision recorded. ${claim.amount ? `Simulated payout ₹${claim.amount}.` : ''}`, simulated: true });
  req.app.get('io').to(`user:${claim.owner}`).emit('claim:update', { claimId: claim._id, status: claim.status, amount: claim.amount, simulated: true });
  res.json({ claim });
});

module.exports = router;
