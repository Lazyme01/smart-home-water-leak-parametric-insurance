const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['homeowner', 'admin'], default: 'homeowner' },
  phone: String
}, { timestamps: true });

const propertySchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  type: { type: String, default: 'House' },
  yearBuilt: Number
}, { timestamps: true });

const deviceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, default: 'AquaShield FlowGuard' },
  online: { type: Boolean, default: true },
  connected: { type: Boolean, default: true },
  autoShutoff: { type: Boolean, default: true },
  sensorStatus: { type: String, enum: ['ok', 'failure'], default: 'ok' },
  valve: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  mode: { type: String, default: 'normal' },
  uptime: { type: Number, default: 98 },
  lastSeen: Date
}, { timestamps: true });

const sensorSchema = new Schema({
  device: { type: Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  flow: { type: Number, required: true, min: 0 },
  pressure: { type: Number, required: true, min: 0 },
  moisture: { type: Number, required: true, min: 0, max: 100 },
  temperature: { type: Number, default: 21 },
  simulated: { type: Boolean, default: true }
}, { timestamps: true });

const incidentSchema = new Schema({
  device: { type: Schema.Types.ObjectId, ref: 'IoTDevice', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
  valveClosed: { type: Boolean, default: false },
  acknowledgedAt: Date,
  resolvedAt: Date,
  evidence: { type: Schema.Types.Mixed, required: true },
  simulated: { type: Boolean, default: true },
  dedupeKey: { type: String, required: true, unique: true }
}, { timestamps: true });

const planSchema = new Schema({
  name: { type: String, unique: true, required: true },
  monthlyPremium: { type: Number, required: true },
  coverageLimit: { type: Number, required: true },
  triggerFlow: { type: Number, required: true },
  triggerMoisture: { type: Number, required: true },
  maxPayout: { type: Number, required: true },
  monitoringDiscountPercent: { type: Number, required: true },
  deductible: { type: Number, default: 0 },
  waitingDays: { type: Number, default: 0 },
  exclusions: [String],
  description: String
});

const policySchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  plan: { type: Schema.Types.ObjectId, ref: 'InsurancePlan', required: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  startsAt: { type: Date, default: Date.now },
  monthlyPremium: Number,
  discount: { type: Schema.Types.Mixed, required: true }
}, { timestamps: true });
policySchema.index({ owner: 1, property: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const claimSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  incident: { type: Schema.Types.ObjectId, ref: 'LeakIncident', required: true, unique: true },
  policy: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Under Review', 'Paid'], default: 'Pending' },
  amount: { type: Number, default: 0 },
  decision: { type: Schema.Types.Mixed, required: true },
  timeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const payoutSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  claim: { type: Schema.Types.ObjectId, ref: 'Claim', required: true, unique: true },
  amount: { type: Number, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['SIMULATED_PAID'], default: 'SIMULATED_PAID' },
  simulated: { type: Boolean, default: true },
  paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

const notificationSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
  simulated: { type: Boolean, default: false }
}, { timestamps: true });

const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entityType: String,
  entityId: String,
  details: Schema.Types.Mixed
}, { timestamps: true });

module.exports = {
  User: model('User', userSchema),
  Property: model('Property', propertySchema),
  IoTDevice: model('IoTDevice', deviceSchema),
  SensorReading: model('SensorReading', sensorSchema),
  LeakIncident: model('LeakIncident', incidentSchema),
  InsurancePlan: model('InsurancePlan', planSchema),
  InsurancePolicy: model('InsurancePolicy', policySchema),
  Claim: model('Claim', claimSchema),
  PayoutTransaction: model('PayoutTransaction', payoutSchema),
  Notification: model('Notification', notificationSchema),
  AuditLog: model('AuditLog', auditSchema)
};
