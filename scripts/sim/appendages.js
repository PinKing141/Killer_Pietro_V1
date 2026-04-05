import { randomItem } from '../utils.js';
import { addWorldEvent, logEvent } from './event-log.js';

const PROSTHETIC_FIT_TICKS = 20;
const REHAB_STEP_TICKS = 12;
const REHAB_REFUND_RATIO = 0.6;
const MAX_STAT_VALUE = 105;
const APOSTLE_STAT_BONUS = 20;

const APPENDAGE_SLOTS = [
  {
    key: 'leftArm',
    label: 'Left Arm',
    penalties: {
      dexterity: 12,
      strength: 6,
    },
  },
  {
    key: 'rightArm',
    label: 'Right Arm',
    penalties: {
      dexterity: 12,
      strength: 6,
    },
  },
  {
    key: 'leftLeg',
    label: 'Left Leg',
    penalties: {
      agility: 14,
      endurance: 6,
    },
  },
  {
    key: 'rightLeg',
    label: 'Right Leg',
    penalties: {
      agility: 14,
      endurance: 6,
    },
  },
  {
    key: 'leftEye',
    label: 'Left Eye',
    penalties: {
      perception: 16,
      dexterity: 4,
    },
  },
  {
    key: 'rightEye',
    label: 'Right Eye',
    penalties: {
      perception: 16,
      dexterity: 4,
    },
  },
];

function clampStat(value) {
  return Math.max(5, Number(value.toFixed(2)));
}

function getRecoveryStatCap(agent) {
  const potential = Math.max(35, Math.min(99, agent.profile?.hiddenPotential ?? 70));
  const apostleBonus = agent.rank >= 4 || agent.profile?.transhuman ? APOSTLE_STAT_BONUS : 0;
  return Math.min(MAX_STAT_VALUE + APOSTLE_STAT_BONUS, potential + apostleBonus);
}

function clampRecoverStat(value, maxCap = MAX_STAT_VALUE) {
  return Math.min(maxCap, Number(value.toFixed(2)));
}

function ensureAppendageRecovery(profile) {
  if (profile.appendageRecovery) {
    return;
  }

  profile.appendageRecovery = {
    leftArm: { phase: 'none', ticks: 0, refunded: 0 },
    rightArm: { phase: 'none', ticks: 0, refunded: 0 },
    leftLeg: { phase: 'none', ticks: 0, refunded: 0 },
    rightLeg: { phase: 'none', ticks: 0, refunded: 0 },
    leftEye: { phase: 'none', ticks: 0, refunded: 0 },
    rightEye: { phase: 'none', ticks: 0, refunded: 0 },
  };
}

function getSlotByKey(key) {
  return APPENDAGE_SLOTS.find((slot) => slot.key === key) || null;
}

export function initializeAppendages(profile) {
  if (profile.appendages) {
    ensureAppendageRecovery(profile);
    return;
  }

  profile.appendages = {
    leftArm: 'intact',
    rightArm: 'intact',
    leftLeg: 'intact',
    rightLeg: 'intact',
    leftEye: 'intact',
    rightEye: 'intact',
  };

  ensureAppendageRecovery(profile);
}

export function getMissingAppendages(agent) {
  const appendages = agent.profile?.appendages || {};

  return APPENDAGE_SLOTS
    .filter((slot) => appendages[slot.key] === 'missing')
    .map((slot) => slot.label);
}

export function getProstheticAppendages(agent) {
  const appendages = agent.profile?.appendages || {};

  return APPENDAGE_SLOTS
    .filter((slot) => appendages[slot.key] === 'prosthetic')
    .map((slot) => slot.label);
}

export function getAppendageSummary(agent) {
  const missing = getMissingAppendages(agent);
  const prosthetic = getProstheticAppendages(agent);

  if (!missing.length && !prosthetic.length) {
    return {
      short: 'INTACT',
      long: 'Intact',
    };
  }

  const parts = [];
  if (missing.length) {
    parts.push(`Missing ${missing.length}`);
  }

  if (prosthetic.length) {
    parts.push(`Prosthetic ${prosthetic.length}`);
  }

  const longParts = [];
  if (missing.length) {
    longParts.push(`Missing: ${missing.join(', ')}`);
  }

  if (prosthetic.length) {
    longParts.push(`Prosthetic: ${prosthetic.join(', ')}`);
  }

  return {
    short: parts.join(' / ').toUpperCase(),
    long: longParts.join(' · '),
  };
}

export function maybeInflictAppendageLoss(agent, state, options = {}) {
  const chance = options.chance ?? 0.1;
  const type = options.type ?? 'critical';
  const sourceText = options.sourceText ?? 'sustained severe trauma';

  initializeAppendages(agent.profile);

  if (Math.random() >= chance) {
    return null;
  }

  const appendages = agent.profile.appendages;
  const recovery = agent.profile.appendageRecovery;
  const intactSlots = APPENDAGE_SLOTS.filter((slot) => appendages[slot.key] === 'intact');

  if (!intactSlots.length) {
    return null;
  }

  const lostSlot = randomItem(intactSlots);
  appendages[lostSlot.key] = 'missing';
  recovery[lostSlot.key] = {
    phase: 'fitting',
    ticks: 0,
    refunded: 0,
  };

  Object.entries(lostSlot.penalties).forEach(([stat, penalty]) => {
    agent.stats[stat] = clampStat(agent.stats[stat] - penalty);
  });

  agent.heat += 5;
  agent.failures += 1;

  const text = `${sourceText}; lost ${lostSlot.label.toLowerCase()}`;
  logEvent(agent, state.worldTick, text, type);
  addWorldEvent(state, agent.name, text, type);
  return lostSlot.label;
}

export function progressAppendageRecovery(agent, state) {
  initializeAppendages(agent.profile);
  const appendages = agent.profile.appendages;
  const recovery = agent.profile.appendageRecovery;
  const cap = getRecoveryStatCap(agent);

  APPENDAGE_SLOTS.forEach((slot) => {
    const slotRecovery = recovery[slot.key];
    if (!slotRecovery || slotRecovery.phase === 'none' || slotRecovery.phase === 'stabilized') {
      return;
    }

    slotRecovery.ticks += 1;

    if (slotRecovery.phase === 'fitting' && slotRecovery.ticks >= PROSTHETIC_FIT_TICKS) {
      slotRecovery.phase = 'rehab';
      slotRecovery.ticks = 0;
      appendages[slot.key] = 'prosthetic';
      const fitText = `received a prosthetic replacement for ${slot.label.toLowerCase()}`;
      logEvent(agent, state.worldTick, fitText, 'milestone');
      addWorldEvent(state, agent.name, fitText, 'milestone');
      return;
    }

    if (slotRecovery.phase !== 'rehab' || slotRecovery.ticks % REHAB_STEP_TICKS !== 0) {
      return;
    }

    const totalPenalty = Object.values(slot.penalties).reduce((sum, value) => sum + value, 0);
    const maxRefund = totalPenalty * REHAB_REFUND_RATIO;
    if (slotRecovery.refunded >= maxRefund) {
      slotRecovery.phase = 'stabilized';
      return;
    }

    let refundedThisStep = 0;
    Object.entries(slot.penalties).forEach(([statKey, penalty]) => {
      const statRefundCap = penalty * REHAB_REFUND_RATIO;
      const alreadyRefundedRatio = slotRecovery.refunded / Math.max(1, totalPenalty);
      const statRefundedEstimate = alreadyRefundedRatio * penalty;
      if (statRefundedEstimate >= statRefundCap) {
        return;
      }

      const delta = Math.min(1, statRefundCap - statRefundedEstimate);
      agent.stats[statKey] = clampRecoverStat(agent.stats[statKey] + delta, cap);
      refundedThisStep += delta;
    });

    slotRecovery.refunded += refundedThisStep;

    if (slotRecovery.refunded >= maxRefund) {
      slotRecovery.phase = 'stabilized';
      const stabilizeText = `${slot.label} prosthetic rehab stabilized`;
      logEvent(agent, state.worldTick, stabilizeText, 'info');
    }
  });
}
