import { LIFE_STAGES, STATUS } from '../data.js';
import { isInactive, rng } from '../utils.js';
import { addWorldEvent, logEvent } from './event-log.js';
import { initializeAppendages, maybeInflictAppendageLoss } from './appendages.js';
import { addStatXp, ensureStatProgress } from './stat-progression.js';
import { refreshAgentTraits } from './traits.js';
import { pickDistrictForRegion, pickFactionForRegion, pickRandomOrigin } from './world-map-data.js';

const AGE_PROGRESS_SPAN = 365;
const MAX_STAT_VALUE = 105;
const APOSTLE_STAT_BONUS = 20;
const PHASE_EVAL_INTERVAL = 5;
const OPERATIVE_CLEARANCE_SCORE = 69;
const GROWTH_INTERVALS = {
  [LIFE_STAGES.CHILD]: 4,
  [LIFE_STAGES.TRAINEE]: 3,
  [LIFE_STAGES.OPERATIVE]: 6,
};

const GROWTH_FOCUS = {
  [LIFE_STAGES.CHILD]: {
    endurance: 0.18,
    resilience: 0.16,
    discipline: 0.12,
    agility: 0.10,
    strength: 0.08,
  },
  [LIFE_STAGES.TRAINEE]: {
    agility: 0.16,
    dexterity: 0.18,
    intelligence: 0.14,
    perception: 0.12,
    instinct: 0.12,
    discipline: 0.10,
  },
  [LIFE_STAGES.OPERATIVE]: {
    discipline: 0.03,
    instinct: 0.04,
    perception: 0.03,
    agility: 0.02,
  },
};

const SURVIVAL_PHASES = [
  {
    label: 'adaptation filter',
    weights: {
      endurance: 0.4,
      resilience: 0.4,
      discipline: 0.2,
    },
  },
  {
    label: 'skill separation filter',
    weights: {
      agility: 0.3,
      dexterity: 0.3,
      intelligence: 0.25,
      discipline: 0.15,
    },
  },
  {
    label: 'pressure testing filter',
    weights: {
      instinct: 0.35,
      perception: 0.3,
      discipline: 0.2,
      resilience: 0.15,
    },
  },
  {
    label: 'live trial filter',
    weights: {
      strength: 0.1,
      agility: 0.1,
      endurance: 0.1,
      resilience: 0.1,
      dexterity: 0.1,
      intelligence: 0.1,
      perception: 0.1,
      discipline: 0.15,
      instinct: 0.15,
    },
  },
];

const DRILL_OUTCOMES = {
  clean: {
    text: 'ran the blade lane clean with no contact and no noise',
    type: 'success',
    heatDelta: 0,
    failureDelta: 0,
  },
  success: {
    text: 'cleared a pressure drill with one minor break in form',
    type: 'info',
    heatDelta: 1,
    failureDelta: 0,
  },
  compromised: {
    text: 'hesitated on the turn and took a marking round in the ambush lane',
    type: 'critical',
    heatDelta: 3,
    failureDelta: 1,
  },
  failure: {
    text: 'froze in the pressure lane and failed two route calls before whistle',
    type: 'critical',
    heatDelta: 5,
    failureDelta: 1,
  },
};

const TRAINEE_PROGRAMME_OUTCOMES = [
  {
    key: 'injury',
    text: 'caught a tendon strain in close-quarters rotation and was reassigned to recovery detail',
    type: 'critical',
  },
  {
    key: 'mentorBoost',
    text: 'was put under mentor oversight and showed a measurable control jump',
    type: 'milestone',
  },
  {
    key: 'behavioralIncident',
    text: 'triggered a behavioral incident in scenario review and was flagged for discipline watch',
    type: 'critical',
  },
];

const STAT_LABELS = {
  agility: 'agility',
  dexterity: 'dexterity',
  discipline: 'discipline',
  endurance: 'endurance',
  instinct: 'instinct',
  intelligence: 'intelligence',
  perception: 'perception',
  resilience: 'resilience',
  strength: 'strength',
};

function getStatPotentialCap(agent) {
  const potential = Math.max(35, Math.min(99, agent.profile?.hiddenPotential ?? 70));
  const apostleBonus = agent.rank >= 4 || agent.profile?.transhuman ? APOSTLE_STAT_BONUS : 0;
  return Math.min(MAX_STAT_VALUE + APOSTLE_STAT_BONUS, potential + apostleBonus);
}

function clampStat(value, maxCap = MAX_STAT_VALUE) {
  return Math.min(maxCap, Number(value.toFixed(2)));
}

function calculateWeightedScore(agent, weights, rngFn) {
  const baseScore = Object.entries(weights).reduce((score, [statKey, weight]) => (
    score + (agent.stats[statKey] * weight)
  ), 0);
  const volatility = 0.9 + (rngFn() * 0.2);
  return baseScore * volatility;
}

function getGrowthMultiplier(agent, stage, statKey, rngFn) {
  const ageFactor = stage === LIFE_STAGES.CHILD
    ? 1.15
    : stage === LIFE_STAGES.TRAINEE
      ? 1.0
      : 0.35;

  const learningFactor = 0.7 + (agent.stats.discipline / 250) + (agent.stats.intelligence / 300);
  const randomness = 0.8 + (rngFn() * 0.4);
  const diminishingReturns = agent.stats[statKey] >= 90
    ? 0.25
    : agent.stats[statKey] >= 80
      ? 0.55
      : 1;

  return ageFactor * learningFactor * randomness * diminishingReturns;
}

function getTrainingText(stage, focusStat) {
  const statLabel = STAT_LABELS[focusStat] || 'control';

  if (stage === LIFE_STAGES.CHILD) {
    return `completed another conditioning cycle, hardening ${statLabel}`;
  }

  if (stage === LIFE_STAGES.TRAINEE) {
    return `finished a training block with sharper ${statLabel}`;
  }

  return `kept up field drills and sharpened ${statLabel}`;
}

function applyStageGrowth(agent, stage, rngFn) {
  const focus = GROWTH_FOCUS[stage];
  const cap = getStatPotentialCap(agent);
  let topStat = 'discipline';
  let topGain = 0;
  let totalGain = 0;

  Object.entries(focus).forEach(([statKey, baseGrowth]) => {
    const gain = baseGrowth * getGrowthMultiplier(agent, stage, statKey, rngFn);
    agent.stats[statKey] = clampStat(agent.stats[statKey] + gain, cap);
    addStatXp(agent, statKey, gain * 8);
    totalGain += gain;

    if (gain > topGain) {
      topGain = gain;
      topStat = statKey;
    }
  });

  return {
    topStat,
    totalGain,
  };
}

function maybeAdvanceAge(agent) {
  agent.profile.ageProgress += 1;

  if (agent.profile.ageProgress < AGE_PROGRESS_SPAN) {
    return false;
  }

  agent.profile.age += 1;
  agent.yearsTrained = (agent.yearsTrained ?? 0) + 1;
  agent.profile.ageProgress = 0;
  return true;
}

function evaluateTrainee(agent, rngFn) {
  const score = (
    (agent.stats.strength * 0.1)
    + (agent.stats.agility * 0.15)
    + (agent.stats.dexterity * 0.15)
    + (agent.stats.intelligence * 0.15)
    + (agent.stats.perception * 0.1)
    + (agent.stats.discipline * 0.1)
    + (agent.stats.instinct * 0.15)
    + (agent.stats.resilience * 0.1)
  );
  const randomness = (rngFn() * 14) - 7;
  return score + randomness;
}

function runIntakeTrialDay(agent, state, rngFn) {
  if (!agent.profile.intakeTrialActive) {
    return {
      resolved: false,
      stageChanged: false,
    };
  }

  const daysRemaining = agent.profile.intakeTrialDaysRemaining ?? 5;
  const daysSurvived = 5 - daysRemaining;
  const baseScore = (
    (agent.stats.endurance * 0.35)
    + (agent.stats.resilience * 0.25)
    + (agent.stats.instinct * 0.2)
    + (agent.stats.discipline * 0.2)
  );
  let score = baseScore + (rngFn() * 16);

  // Each intake child gets one bullet to survive pressure moments in the wilderness trial.
  if (!agent.profile.intakeBulletUsed && rngFn() < 0.2) {
    agent.profile.intakeBulletUsed = true;
    score += 9;
    logEvent(agent, state.worldTick, 'spent the single trial bullet to survive an ambush at dusk', 'critical');
  }

  const threshold = 49 + (daysSurvived * 2.5);
  agent.profile.intakeTrialDaysRemaining = Math.max(0, daysRemaining - 1);

  if (score < threshold) {
    agent.status = STATUS.DEAD;
    agent.deathTick = state.worldTick;
    if (state.intakeStats && state.intakeStats.year === state.currentDate.getFullYear()) {
      state.intakeStats.diedInTrial += 1;
    }
    const deathText = 'collapsed during the five-day wilderness trial with no food and only rationed water';
    logEvent(agent, state.worldTick, deathText, 'death');
    addWorldEvent(state, agent.name, deathText, 'death');
    agent.profile.intakeTrialActive = false;
    return {
      resolved: true,
      stageChanged: true,
    };
  }

  if (agent.profile.intakeTrialDaysRemaining === 0) {
    agent.profile.intakeTrialActive = false;
    agent.stage = LIFE_STAGES.TRAINEE;
    if (state.intakeStats && state.intakeStats.year === state.currentDate.getFullYear()) {
      state.intakeStats.passedToTrainee += 1;
    }
    const acceptanceText = 'survived five wilderness days and was accepted into trainee intake';
    logEvent(agent, state.worldTick, acceptanceText, 'milestone');
    addWorldEvent(state, agent.name, acceptanceText, 'milestone');
    return {
      resolved: true,
      stageChanged: true,
    };
  }

  return {
    resolved: true,
    stageChanged: false,
  };
}

function resolveTraineeFailure(agent, state, rngFn) {
  const roll = rngFn();

  if (roll < 0.45) {
    const text = 'failed the first mission trial and was executed on the spot';
    agent.status = STATUS.DEAD;
    agent.deathTick = state.worldTick;
    logEvent(agent, state.worldTick, text, 'death');
    addWorldEvent(state, agent.name, text, 'death');
    return;
  }

  if (roll < 0.85) {
    const text = 'failed the first mission trial and died in the field before extraction';
    agent.status = STATUS.DEAD;
    agent.deathTick = state.worldTick;
    logEvent(agent, state.worldTick, text, 'death');
    addWorldEvent(state, agent.name, text, 'death');
    return;
  }

  const text = 'failed the first mission trial, disappeared, and later resurfaced as an enemy operative';
  agent.stage = LIFE_STAGES.OPERATIVE;
  agent.status = STATUS.ALIVE;
  agent.alignment = 'enemy';
  agent.rank = Math.max(agent.rank, 1);
  agent.heat = Math.max(agent.heat, 35);
  if (!Array.isArray(agent.traits)) {
    agent.traits = [];
  }

  if (!agent.traits.includes('Turncoat')) {
    agent.traits.push('Turncoat');
  }

  logEvent(agent, state.worldTick, text, 'critical');
  addWorldEvent(state, agent.name, text, 'critical');
}

function assignInitialRank(agent, baseRank, rngFn) {
  const statValues = Object.values(agent.stats);
  const peak = Math.max(...statValues);
  const average = statValues.reduce((sum, value) => sum + value, 0) / statValues.length;
  const assassinBuild = agent.stats.dexterity > 85 && agent.stats.instinct > 80;
  const ghostBuild = agent.stats.agility > 85 && agent.stats.perception > 80;

  if (peak >= 90 && average > 75 && (assassinBuild || ghostBuild) && rngFn() < 0.03) {
    return 3;
  }

  if ((peak >= 88 && (assassinBuild || ghostBuild)) || average > 72) {
    if (rngFn() < 0.24) {
      return 2;
    }
  }

  if ((assassinBuild || ghostBuild) && rngFn() < 0.62) {
    return 1;
  }

  if (average > 66 && rngFn() < 0.42) {
    return 1;
  }

  return baseRank;
}

export function assignInitialEntryRank(agent, rngFn = Math.random) {
  return assignInitialRank(agent, 0, rngFn);
}

export function processTraineeProgrammeEvent(agent, state, rngFn = Math.random) {
  if (agent.stage !== LIFE_STAGES.TRAINEE || rngFn() >= 0.1) {
    return null;
  }

  const roll = rngFn();
  const outcome = roll < 0.32
    ? TRAINEE_PROGRAMME_OUTCOMES[0]
    : roll < 0.66
      ? TRAINEE_PROGRAMME_OUTCOMES[1]
      : TRAINEE_PROGRAMME_OUTCOMES[2];

  if (outcome.key === 'injury') {
    bumpStat(agent, 'agility', -0.55);
    bumpStat(agent, 'endurance', -0.45);
    bumpStat(agent, 'resilience', -0.25);
    agent.heat += 3;
    agent.failures += 1;
    maybeInflictAppendageLoss(agent, state, {
      chance: 0.2,
      sourceText: 'training injury escalated into permanent damage',
      type: 'critical',
    });
  }

  if (outcome.key === 'mentorBoost') {
    bumpStat(agent, 'discipline', 0.55);
    bumpStat(agent, 'intelligence', 0.35);
    bumpStat(agent, 'perception', 0.3);
    bumpStat(agent, 'instinct', 0.2);
    agent.heat = Math.max(0, agent.heat - 2);
  }

  if (outcome.key === 'behavioralIncident') {
    bumpStat(agent, 'discipline', -0.4);
    bumpStat(agent, 'instinct', 0.25);
    bumpStat(agent, 'intelligence', -0.2);
    agent.heat += 4;
    if (rngFn() < 0.45) {
      agent.failures += 1;
    }
  }

  refreshAgentTraits(agent, rngFn);
  logEvent(agent, state.worldTick, outcome.text, outcome.type);
  addWorldEvent(state, agent.name, outcome.text, outcome.type);

  if (agent.failures > 2 && agent.status === STATUS.ALIVE) {
    agent.status = STATUS.STRUGGLING;
  }

  if (agent.failures > 4) {
    agent.status = STATUS.CRITICAL;
  }

  return outcome.key;
}

function maybePromoteStage(agent, state, previousStage, rngFn) {
  const nextStage = getLifeStage(agent.profile.age);

  if (nextStage === previousStage) {
    return false;
  }

  if (previousStage === LIFE_STAGES.TRAINEE && nextStage === LIFE_STAGES.OPERATIVE) {
    const clearedFunnel = (agent.profile.funnelPhase ?? 0) >= (SURVIVAL_PHASES.length - 1);
    const hasClearanceScore = (agent.profile.clearanceScore ?? 0) >= OPERATIVE_CLEARANCE_SCORE;

    if (!clearedFunnel || !hasClearanceScore) {
      return false;
    }

    const finalScore = evaluateTrainee(agent, rngFn);
    if (finalScore < 45) {
      resolveTraineeFailure(agent, state, rngFn);
      return true;
    }

    agent.stage = nextStage;
    agent.rank = assignInitialEntryRank(agent, rngFn);
    const rankText = agent.rank > 0
      ? 'passed first mission with abnormal performance and entered live deployment ahead of baseline'
      : 'passed first mission and entered live deployment at D rank';
    logEvent(agent, state.worldTick, rankText, 'milestone');
    addWorldEvent(state, agent.name, rankText, 'milestone');
    return true;
  }

  agent.stage = nextStage;

  const text = nextStage === LIFE_STAGES.TRAINEE
    ? 'advanced into trainee status after surviving the first conditioning block'
    : 'graduated into operative status and was cleared for live work';

  logEvent(agent, state.worldTick, text, 'milestone');
  addWorldEvent(state, agent.name, text, 'milestone');
  return true;
}

function maybeAdvanceSurvivalPhase(agent, state, rngFn) {
  if (agent.stage !== LIFE_STAGES.TRAINEE) {
    return;
  }

  const lastPhaseTick = agent.profile.lastPhaseTick ?? 0;
  const funnelPhase = agent.profile.funnelPhase ?? 0;

  if ((agent.trainingTicks - lastPhaseTick) < PHASE_EVAL_INTERVAL) {
    return;
  }

  const phaseIndex = Math.min(funnelPhase, SURVIVAL_PHASES.length - 1);
  const phase = SURVIVAL_PHASES[phaseIndex];
  const score = calculateWeightedScore(agent, phase.weights, rngFn);
  const roundedScore = Number(score.toFixed(2));

  agent.profile.lastPhaseTick = agent.trainingTicks;
  agent.profile.clearanceScore = roundedScore;

  if (roundedScore < 44) {
    const text = `washed out during the ${phase.label} and was transferred out`;
    agent.status = STATUS.WASHED;
    logEvent(agent, state.worldTick, text, 'critical');
    addWorldEvent(state, agent.name, text, 'critical');
    return;
  }

  if (roundedScore < 56) {
    agent.failures += 1;
    agent.status = STATUS.STRUGGLING;
    logEvent(agent, state.worldTick, `nearly washed out in the ${phase.label} (score ${roundedScore})`, 'critical');
    return;
  }

  if (roundedScore >= OPERATIVE_CLEARANCE_SCORE && phaseIndex < SURVIVAL_PHASES.length - 1) {
    agent.profile.funnelPhase += 1;
    const nextLabel = SURVIVAL_PHASES[agent.profile.funnelPhase].label;
    const text = `cleared the ${phase.label} (score ${roundedScore}) and advanced to ${nextLabel}`;
    logEvent(agent, state.worldTick, text, 'milestone');
    addWorldEvent(state, agent.name, text, 'milestone');
    return;
  }

  logEvent(agent, state.worldTick, `held in the ${phase.label} for another cycle (score ${roundedScore})`, 'info');
}

function bumpStat(agent, statKey, delta) {
  agent.stats[statKey] = clampStat(agent.stats[statKey] + delta, getStatPotentialCap(agent));

  if (delta > 0) {
    addStatXp(agent, statKey, delta * 7);
  }
}

function getDrillOutcomeKey(score) {
  if (score >= 0.76) {
    return 'clean';
  }

  if (score >= 0.58) {
    return 'success';
  }

  if (score >= 0.42) {
    return 'compromised';
  }

  return 'failure';
}

export function createProfile(ageRange = [8, 16]) {
  const origin = pickRandomOrigin();
  const faction = pickFactionForRegion(origin.region);
  const district = pickDistrictForRegion(origin.region);

  const profile = {
    age: rng(ageRange[0], ageRange[1]),
    ageProgress: 0,
    height: rng(140, 190),
    origin: origin.countryCode,
    originRegion: origin.region,
    faction,
    district,
    hiddenPotential: rng(35, 99),
    apostlePotential: false,
    zodiacSign: null,
    transhuman: false,
    personalitySeed: Math.random(),
    funnelPhase: 0,
    lastPhaseTick: 0,
    clearanceScore: 0,
    intakeTrialActive: false,
    intakeTrialDaysRemaining: 0,
    intakeBulletUsed: false,
  };

  initializeAppendages(profile);
  return profile;
}

export function getLifeStage(age) {
  if (age < 8) {
    return LIFE_STAGES.CHILD;
  }

  if (age < 16) {
    return LIFE_STAGES.TRAINEE;
  }

  return LIFE_STAGES.OPERATIVE;
}

export function countOperatives(agents) {
  return agents.filter((agent) => !isInactive(agent.status) && agent.stage === LIFE_STAGES.OPERATIVE).length;
}

export function progressDevelopment(agent, state, rngFn = Math.random) {
  ensureStatProgress(agent);

  if (agent.profile.intakeTrialActive) {
    agent.trainingTicks += 1;
    return runIntakeTrialDay(agent, state, rngFn);
  }

  const previousStage = agent.stage;
  const growth = applyStageGrowth(agent, previousStage, rngFn);
  const interval = GROWTH_INTERVALS[previousStage];
  refreshAgentTraits(agent, rngFn);

  agent.trainingTicks += 1;
  maybeAdvanceSurvivalPhase(agent, state, rngFn);

  if (isInactive(agent.status)) {
    return {
      stageChanged: false,
      totalGain: growth.totalGain,
      topStat: growth.topStat,
    };
  }

  maybeAdvanceAge(agent);

  const stageChanged = maybePromoteStage(agent, state, previousStage, rngFn);

  if (!stageChanged && previousStage !== LIFE_STAGES.OPERATIVE && agent.trainingTicks % interval === 0) {
    logEvent(agent, state.worldTick, getTrainingText(previousStage, growth.topStat), 'info');
  }

  return {
    stageChanged,
    totalGain: growth.totalGain,
    topStat: growth.topStat,
  };
}

export function processTraineeDrill(agent, state, rngFn = Math.random) {
  if (agent.stage !== LIFE_STAGES.TRAINEE || rngFn() >= 0.28) {
    return null;
  }

  let score = (
    (agent.stats.agility * 0.22)
    + (agent.stats.dexterity * 0.22)
    + (agent.stats.intelligence * 0.18)
    + (agent.stats.perception * 0.16)
    + (agent.stats.instinct * 0.12)
    + (agent.stats.discipline * 0.10)
  ) / 100;

  if (agent.stats.discipline < 40) {
    score -= 0.06;
  }

  if (agent.stats.instinct > 70 && agent.stats.discipline < 45) {
    score += (rngFn() - 0.5) * 0.16;
  }

  score += rngFn() * 0.12;

  const outcomeKey = getDrillOutcomeKey(score);
  const outcome = DRILL_OUTCOMES[outcomeKey];

  agent.failures += outcome.failureDelta;
  agent.heat += outcome.heatDelta;

  if (outcomeKey === 'clean') {
    bumpStat(agent, 'dexterity', 0.2);
    bumpStat(agent, 'instinct', 0.14);
  } else if (outcomeKey === 'success') {
    bumpStat(agent, 'discipline', 0.08);
    bumpStat(agent, 'perception', 0.08);
  } else if (outcomeKey === 'failure') {
    maybeInflictAppendageLoss(agent, state, {
      chance: 0.08,
      sourceText: 'failed drill caused catastrophic bodily trauma',
      type: 'critical',
    });
  }

  refreshAgentTraits(agent, rngFn);

  logEvent(agent, state.worldTick, outcome.text, outcome.type);

  if (agent.failures > 2 && agent.status === STATUS.ALIVE) {
    agent.status = STATUS.STRUGGLING;
  }

  if (agent.failures > 4) {
    agent.status = STATUS.CRITICAL;
  }

  return outcomeKey;
}
