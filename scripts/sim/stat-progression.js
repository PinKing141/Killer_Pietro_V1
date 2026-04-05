import { STAT_LEVEL_START_BANDS } from '../data.js';

const STAT_KEYS = [
  'strength',
  'agility',
  'endurance',
  'resilience',
  'dexterity',
  'intelligence',
  'perception',
  'discipline',
  'instinct',
];

const MAX_STAT_LEVEL = 100;
const APOSTLE_LEVEL_BONUS = 20;

function getXpRequiredForLevel(level) {
  return Math.round(180 * (1.12 ** level));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampLevel(level) {
  return Math.max(0, Math.min(MAX_STAT_LEVEL, level));
}

function getPotentialLevelCap(agent) {
  const hiddenPotential = Math.max(35, Math.min(99, agent.profile?.hiddenPotential ?? 70));
  const baseCap = Math.round(8 + (hiddenPotential * 0.92));
  const apostleBonus = agent.rank >= 4 || agent.profile?.transhuman ? APOSTLE_LEVEL_BONUS : 0;
  return Math.max(10, Math.min(MAX_STAT_LEVEL, baseCap + apostleBonus));
}

function getInitialLevelRange(agent) {
  if (agent.stage === 'child') {
    return STAT_LEVEL_START_BANDS.CHILD;
  }

  if (agent.stage === 'trainee') {
    return STAT_LEVEL_START_BANDS.TRAINEE;
  }

  if (agent.rank >= 4) {
    return STAT_LEVEL_START_BANDS.APOSTLE;
  }

  if (agent.rank >= 3) {
    return STAT_LEVEL_START_BANDS.A;
  }

  if (agent.rank >= 2) {
    return STAT_LEVEL_START_BANDS.B;
  }

  if (agent.rank >= 1) {
    return STAT_LEVEL_START_BANDS.C;
  }

  return STAT_LEVEL_START_BANDS.D;
}

export function ensureStatProgress(agent) {
  if (!agent.statProgress) {
    agent.statProgress = {};
  }

  STAT_KEYS.forEach((key) => {
    if (!agent.statProgress[key]) {
      agent.statProgress[key] = {
        level: 0,
        xp: 0,
      };
    }
  });

  return agent.statProgress;
}

export function seedInitialStatProgress(agent, options = {}) {
  ensureStatProgress(agent);

  const alreadySeeded = agent.statProgressSeeded === true;
  if (alreadySeeded && !options.force) {
    return;
  }

  const [minLevel, maxLevel] = getInitialLevelRange(agent);
  const levelCap = getPotentialLevelCap(agent);

  STAT_KEYS.forEach((key) => {
    const level = Math.min(levelCap, clampLevel(randomInt(minLevel, maxLevel)));
    const required = level >= levelCap ? 0 : getXpRequiredForLevel(level);
    agent.statProgress[key] = {
      level,
      xp: required > 0 ? randomInt(0, Math.max(0, required - 1)) : 0,
    };
  });

  agent.statProgressSeeded = true;
}

export function addStatXp(agent, statKey, xpGain) {
  if (!STAT_KEYS.includes(statKey) || xpGain <= 0) {
    return;
  }

  ensureStatProgress(agent);
  const progress = agent.statProgress[statKey];
  const levelCap = getPotentialLevelCap(agent);

  if (progress.level >= levelCap) {
    progress.level = levelCap;
    progress.xp = 0;
    return;
  }

  progress.xp += xpGain;

  while (progress.level < levelCap) {
    const required = getXpRequiredForLevel(progress.level);
    if (progress.xp < required) {
      break;
    }

    progress.xp -= required;
    progress.level += 1;
  }

  if (progress.level >= levelCap) {
    progress.level = levelCap;
    progress.xp = 0;
  }
}

export function getStatLevelSnapshot(agent, statKey) {
  ensureStatProgress(agent);
  const progress = agent.statProgress[statKey];
  const levelCap = getPotentialLevelCap(agent);
  const required = progress.level >= levelCap ? 0 : getXpRequiredForLevel(progress.level);
  const progressPercent = required === 0
    ? 100
    : Math.min(100, Math.round((progress.xp / required) * 100));

  return {
    level: progress.level,
    xp: progress.xp,
    required,
    progressPercent,
  };
}

export function hasMaxLevelStat(agent) {
  ensureStatProgress(agent);
  const levelCap = getPotentialLevelCap(agent);
  return STAT_KEYS.some((key) => agent.statProgress[key].level >= levelCap);
}

export function getHighestStatLevel(agent) {
  ensureStatProgress(agent);
  return STAT_KEYS.reduce((max, key) => Math.max(max, agent.statProgress[key].level), 0);
}
