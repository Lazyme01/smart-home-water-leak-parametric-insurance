function calculateDiscount(plan, device) {
  const connectivityEligible = Boolean(device && device.connected);
  const uptimeEligible = Boolean(device && device.uptime >= 90);
  const shutoffEligible = Boolean(device && device.autoShutoff);
  const base = Number(plan.monitoringDiscountPercent) || 0;
  const eligible = connectivityEligible && uptimeEligible && shutoffEligible;
  const percent = eligible ? Math.min(base, 25) : 0;
  const amount = Math.round(plan.monthlyPremium * percent) / 100;
  return {
    connectivityEligible, uptimeEligible, shutoffEligible, eligible,
    percent, amount, grossPremium: plan.monthlyPremium,
    netPremium: plan.monthlyPremium - amount,
    capPercent: 25
  };
}

function evaluateClaim({ incident, policy, plan, now = new Date() }) {
  const checks = [
    { rule: 'Active policy predates incident', passed: policy.status === 'active' && policy.startsAt <= incident.createdAt },
    { rule: 'Incident severity is covered', passed: ['medium', 'high', 'critical'].includes(incident.severity) },
    { rule: 'Flow trigger reached', passed: incident.evidence.flow >= plan.triggerFlow },
    { rule: 'Moisture trigger reached', passed: incident.evidence.moisture >= plan.triggerMoisture },
    { rule: 'Reliable simulated telemetry', passed: incident.simulated && incident.evidence.telemetryReliable === true },
    { rule: 'Waiting period satisfied', passed: now >= new Date(new Date(policy.startsAt).getTime() + plan.waitingDays * 86400000) },
    { rule: 'No listed exclusion applies', passed: !incident.evidence.excluded }
  ];
  const suspicious = incident.severity === 'critical' || incident.evidence.telemetryReliable !== true;
  const passed = checks.every(check => check.passed);
  const baseAmount = Math.max(0, incident.evidence.estimatedLoss - plan.deductible);
  const amount = passed ? Math.min(baseAmount, plan.maxPayout, plan.coverageLimit) : 0;
  const status = suspicious ? 'Under Review' : passed ? 'Approved' : 'Rejected';
  return { checks, eligible: passed, amount, status, calculation: { estimatedLoss: incident.evidence.estimatedLoss, deductible: plan.deductible, maxPayout: plan.maxPayout, coverageLimit: plan.coverageLimit, payable: amount } };
}

module.exports = { calculateDiscount, evaluateClaim };
