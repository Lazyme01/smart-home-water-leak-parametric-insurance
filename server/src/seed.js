require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Property, IoTDevice, SensorReading, InsurancePlan, InsurancePolicy, LeakIncident, Claim, PayoutTransaction } = require('./models');
const { calculateDiscount, evaluateClaim } = require('./services/insurance');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const plans = await Promise.all([
    { name: 'Basic', monthlyPremium: 499, coverageLimit: 50000, triggerFlow: 15, triggerMoisture: 70, maxPayout: 12000, monitoringDiscountPercent: 10, deductible: 1500, waitingDays: 2, exclusions: ['Gradual seepage', 'Pre-existing damage'], description: 'Essential protection for everyday leaks.' },
    { name: 'Standard', monthlyPremium: 899, coverageLimit: 150000, triggerFlow: 12, triggerMoisture: 60, maxPayout: 35000, monitoringDiscountPercent: 15, deductible: 1000, waitingDays: 1, exclusions: ['Pre-existing damage'], description: 'Balanced cover with faster parametric triggers.' },
    { name: 'Premium', monthlyPremium: 1499, coverageLimit: 500000, triggerFlow: 10, triggerMoisture: 50, maxPayout: 75000, monitoringDiscountPercent: 20, deductible: 0, waitingDays: 0, exclusions: ['Intentional damage'], description: 'Higher limits and the broadest demo protection.' }
  ].map(plan => InsurancePlan.findOneAndUpdate({ name: plan.name }, plan, { upsert: true, new: true, setDefaultsOnInsert: true })));
  const password = await bcrypt.hash('AquaDemo123!', 12);
  const homeowner = await User.findOneAndUpdate({ email: 'homeowner@aquashield.demo' }, { name: 'Aarav Sharma', email: 'homeowner@aquashield.demo', password, role: 'homeowner' }, { upsert: true, new: true });
  const admin = await User.findOneAndUpdate({ email: 'admin@aquashield.demo' }, { name: 'AquaShield Admin', email: 'admin@aquashield.demo', password, role: 'admin' }, { upsert: true, new: true });
  const property = await Property.findOneAndUpdate({ owner: homeowner._id, name: 'Lakeview Home' }, { owner: homeowner._id, name: 'Lakeview Home', address: '24, Lakeview Road, Bengaluru', type: 'Apartment' }, { upsert: true, new: true });
  const device = await IoTDevice.findOneAndUpdate({ deviceId: 'AS-DEMO-001' }, { owner: homeowner._id, property: property._id, deviceId: 'AS-DEMO-001', online: true, connected: true, autoShutoff: true, valve: 'OPEN', mode: 'normal', uptime: 99 }, { upsert: true, new: true });
  let policy = await InsurancePolicy.findOne({ owner: homeowner._id, property: property._id, status: 'active' });
  if (!policy) {
    const plan = plans[1], discount = calculateDiscount(plan, device);
    policy = await InsurancePolicy.create({ owner: homeowner._id, property: property._id, plan: plan._id, monthlyPremium: discount.netPremium, discount, startsAt: new Date(Date.now() - 3 * 86400000) });
  }
  if (!(await SensorReading.exists({ device: device._id }))) {
    await SensorReading.create({ device: device._id, owner: homeowner._id, flow: 4.1, pressure: 2.8, moisture: 12, temperature: 21, simulated: true });
  }
  const sampleIncident = await LeakIncident.findOneAndUpdate(
    { dedupeKey: `seed:${device._id}:sample-major-leak` },
    { $setOnInsert: {
      device: device._id, owner: homeowner._id, property: property._id,
      severity: 'high', reason: 'Sample event: high flow combined with elevated moisture',
      valveClosed: true, status: 'resolved',
      evidence: { flow: 22.8, pressure: 1.55, moisture: 82, telemetryReliable: true, estimatedLoss: 24000 },
      dedupeKey: `seed:${device._id}:sample-major-leak`, simulated: true,
      createdAt: new Date(Date.now() - 60 * 60 * 1000), resolvedAt: new Date(Date.now() - 58 * 60 * 1000)
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const samplePlan = plans.find(plan => plan.name === 'Standard');
  const decision = evaluateClaim({ incident: sampleIncident, policy, plan: samplePlan });
  const sampleClaim = await Claim.findOneAndUpdate(
    { incident: sampleIncident._id },
    { $setOnInsert: {
      owner: homeowner._id, incident: sampleIncident._id, policy: policy._id,
      status: 'Paid', amount: decision.amount, decision,
      timeline: [
        { status: 'Approved', note: 'Sample claim passed the demonstration policy rules', at: new Date(Date.now() - 59 * 60 * 1000) },
        { status: 'Paid', note: 'SIMULATED sample payout; no money moved', at: new Date(Date.now() - 58 * 60 * 1000) }
      ],
      createdAt: new Date(Date.now() - 59 * 60 * 1000)
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await PayoutTransaction.findOneAndUpdate(
    { claim: sampleClaim._id },
    { $setOnInsert: { owner: homeowner._id, claim: sampleClaim._id, amount: decision.amount, reference: `DEMO-SEED-${String(sampleClaim._id).slice(-8).toUpperCase()}`, status: 'SIMULATED_PAID', simulated: true, paidAt: new Date(Date.now() - 58 * 60 * 1000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Seeded plans and demo accounts. Homeowner: ${homeowner.email}; admin: ${admin.email}; password: AquaDemo123!`);
  await mongoose.disconnect();
}

seed().catch(async error => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
