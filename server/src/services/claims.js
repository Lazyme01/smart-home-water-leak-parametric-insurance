const crypto = require('crypto');
const { Claim, PayoutTransaction, Notification } = require('../models');

async function recordPayout(owner, claim, amount) {
  try {
    return await PayoutTransaction.create({
      owner, claim: claim._id, amount,
      reference: `DEMO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await PayoutTransaction.findOne({ claim: claim._id });
    if (!existing) throw error;
    return existing;
  }
}

async function createClaim({ owner, incident, policy, plan, io }) {
  const { evaluateClaim } = require('./insurance');
  const decision = evaluateClaim({ incident, policy, plan });
  try {
    const claim = await Claim.create({
      owner, incident: incident._id, policy: policy._id,
      status: decision.status, amount: decision.amount, decision,
      timeline: [{ status: decision.status, note: 'Automated demo rules evaluated incident evidence' }]
    });
    if (claim.status === 'Approved' && claim.amount > 0) {
      await recordPayout(owner, claim, claim.amount);
      claim.status = 'Paid';
      claim.timeline.push({ status: 'Paid', note: 'SIMULATED payout recorded; no money moved' });
      await claim.save();
    }
    const notification = await Notification.create({
      owner, type: 'claim', simulated: true,
      title: `Demo claim ${claim.status}`,
      message: claim.amount ? `Simulated payout: ₹${claim.amount.toLocaleString('en-IN')}` : 'Your incident claim requires review or was not eligible.'
    });
    io.to(`user:${owner}`).emit('notification:new', notification);
    io.to(`user:${owner}`).emit('claim:update', { claimId: claim._id, status: claim.status, amount: claim.amount, simulated: true });
    return claim;
  } catch (error) {
    if (error.code === 11000) return Claim.findOne({ incident: incident._id });
    throw error;
  }
}

module.exports = { createClaim, recordPayout };
