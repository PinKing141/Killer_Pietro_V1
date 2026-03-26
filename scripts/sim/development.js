import { LIFE_STAGES, STATUS } from '../data.js';
import { isInactive, rng } from '../utils.js';
import { addWorldEvent, logEvent } from './event-log.js';

const AGE_PROGRESS_SPAN = 12;
const MAX_STAT_VALUE = 95;
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

const DRILL_OUTCOMES = {
  clean: {
    text: 'cleared a live-blade obstacle run without touching a bell',
    type: 'success',
    heatDelta: 0,
    failureDelta: 0,
  },
  success: {
    text: 'finished a controlled pressure drill with only one stumble',
    type: 'info',
    heatDelta: 1,
    failureDelta: 0,
  },
  compromised: {
    text: 'hesitated in an ambush drill and took the padded round on the turn',
    type: 'critical',
    heatDelta: 3,
    failureDelta: 1,
  },
  failure: {
    text: 'froze during a pressure drill and washed the route twice before the whistle',
    type: 'critical',
    heatDelta: 5,
    failureDelta: 1,
  },
};

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

function clampStat(value) {
  return Math.min(MAX_STAT_VALUE, Number(value.toFixed(2)));
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
  let topStat = 'discipline';
  let topGain = 0;
  let totalGain = 0;

  Object.entries(focus).forEach(([statKey, baseGrowth]) => {
    const gain = baseGrowth * getGrowthMultiplier(agent, stage, statKey, rngFn);
    agent.stats[statKey] = clampStat(agent.stats[statKey] + gain);
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
  agent.profile.ageProgress = 0;
  return true;
}

function maybePromoteStage(agent, state, previousStage) {
  const nextStage = getLifeStage(agent.profile.age);
  agent.stage = nextStage;

  if (nextStage === previousStage) {
    return false;
  }

  const text = nextStage === LIFE_STAGES.TRAINEE
    ? 'advanced into trainee status after surviving the first conditioning block'
    : 'graduated into operative status and was cleared for live work';

  logEvent(agent, state.worldTick, text, 'milestone');
  addWorldEvent(state, agent.name, text, 'milestone');
  return true;
}

function bumpStat(agent, statKey, delta) {
  agent.stats[statKey] = clampStat(agent.stats[statKey] + delta);
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

export function createProfile(ageRange = [10, 16]) {
  return {
    age: rng(ageRange[0], ageRange[1]),
    ageProgress: 0,
    height: rng(140, 190),
    origin: 'unknown',
    personalitySeed: Math.random(),
  };
}

export function getLifeStage(age) {
  if (age < 14) {
    return LIFE_STAGES.CHILD;
  }

  if (age < 18) {
    return LIFE_STAGES.TRAINEE;
  }

  return LIFE_STAGES.OPERATIVE;
}

export function countOperatives(agents) {
  return agents.filter((agent) => !isInactive(agent.status) && agent.stage === LIFE_STAGES.OPERATIVE).length;
}

export function progressDevelopment(agent, state, rngFn = Math.random) {
  const previousStage = agent.stage;
  const growth = applyStageGrowth(agent, previousStage, rngFn);
  const interval = GROWTH_INTERVALS[previousStage];

  agent.trainingTicks += 1;
  maybeAdvanceAge(agent);

  const stageChanged = maybePromoteStage(agent, state, previousStage);

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
  }

  logEvent(agent, state.worldTick, outcome.text, outcome.type);

  if (agent.failures > 2 && agent.status === STATUS.ALIVE) {
    agent.status = STATUS.STRUGGLING;
  }

  if (agent.failures > 4) {
    agent.status = STATUS.CRITICAL;
  }

  return outcomeKey;
}
