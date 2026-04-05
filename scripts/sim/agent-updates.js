import {
  CONTRACT_EVENTS,
  DEATH_EVENTS,
  LIFE_STAGES,
  MISSION_TIER_BY_RANK,
  RETIRE_EVENTS,
  RANKS,
  STATUS,
  ZODIAC_SIGNS,
} from '../data.js';
import { randomItem } from '../utils.js';
import { addWorldEvent, logEvent } from './event-log.js';
import { evaluateContractEvent } from './event-evaluator.js';
import { deriveTraits, refreshAgentTraits } from './traits.js';
import { addStatXp } from './stat-progression.js';
import { createAgent } from './agent-factory.js';
import { maybeInflictAppendageLoss } from './appendages.js';

const EXPERIENCE_DECAY_WINDOW = 80;
const MAX_APOSTLES = 12;
const RANK_RISK_MULTIPLIER = {
  0: 0.74,
  1: 0.84,
  2: 0.94,
  3: 1.05,
  4: 1.18,
};

function getRankRiskMultiplier(agent) {
  return RANK_RISK_MULTIPLIER[agent.rank] ?? 1;
}

function getMissionTier(agent) {
  if (agent.rank === 4 && Math.random() < 0.6) {
    return MISSION_TIER_BY_RANK[3];
  }

  return MISSION_TIER_BY_RANK[agent.rank] ?? MISSION_TIER_BY_RANK[0];
}

function pickContractForTier(tier) {
  const filteredEvents = CONTRACT_EVENTS.filter((event) => tier.allowedCategories.includes(event.category));
  return randomItem(filteredEvents.length ? filteredEvents : CONTRACT_EVENTS);
}

export function getExperienceModifier(agent) {
  const experience = agent.experience ?? 0;
  return 1 + (Math.log10(experience + 1) * 0.25);
}

function maybePromoteAgent(agent, state) {
  // Apostle rank is reserved for the explicit capped promotion path.
  const newRank = Math.min(3, Math.floor(agent.kills / 3));

  if (newRank <= agent.rank) {
    return;
  }

  agent.rank = newRank;
  logEvent(agent, state.worldTick, `promoted to ${RANKS[agent.rank]}`, 'milestone');

  if (agent.status === STATUS.STRUGGLING) {
    agent.status = STATUS.ALIVE;
  }

  addWorldEvent(state, agent.name, `reached rank: ${RANKS[agent.rank]}`, 'milestone');
  refreshAgentTraits(agent);
}

function improveOutcome(outcomeKey) {
  if (outcomeKey === 'failure') {
    return 'compromised';
  }

  if (outcomeKey === 'compromised') {
    return 'success';
  }

  return outcomeKey;
}

export function processContract(agent, state) {
  const tier = getMissionTier(agent);
  if (Math.random() >= tier.contractChance) {
    return;
  }

  const event = pickContractForTier(tier);
  agent.lastMissionTier = tier.key;
  const evaluation = evaluateContractEvent(agent, event, Math.random);
  const rankRisk = getRankRiskMultiplier(agent);
  const expMod = getExperienceModifier(agent);
  const rerollChance = Math.min(0.65, 0.12 * expMod);
  const shouldImprove = (evaluation.outcomeKey === 'failure' || evaluation.outcomeKey === 'compromised')
    && Math.random() < rerollChance;
  const resolvedOutcomeKey = shouldImprove ? improveOutcome(evaluation.outcomeKey) : evaluation.outcomeKey;
  const outcome = event.outcomes[resolvedOutcomeKey];
  const missionTag = `${tier.label} contract`;
  const outcomeText = shouldImprove
    ? `${missionTag}: ${outcome.text}, recovered through veteran timing`
    : `${missionTag}: ${evaluation.outcome.text}`;
  const {
    heatDelta,
  } = evaluation;

  agent.contracts += 1;
  agent.lastContractTick = state.worldTick;
  agent.kills += outcome.killDelta;
  agent.failures += outcome.failureDelta;
  agent.heat += heatDelta * Math.max(0.82, rankRisk * 0.75) * tier.heatMultiplier;
  if (agent.traits?.includes('Unstable')) {
    agent.heat += Math.random() * 2.5;
  }
  if (outcome.type === 'success' || outcome.type === 'milestone') {
    const baseGain = outcome.type === 'milestone' ? 2 : 1;
    agent.experience += baseGain * tier.experienceMultiplier;
    event.primaryStats.forEach((statKey) => {
      addStatXp(agent, statKey, (2 + (baseGain * 1.5)) * tier.experienceMultiplier);
    });
  }

  if (resolvedOutcomeKey === 'compromised') {
    maybeInflictAppendageLoss(agent, state, {
      chance: 0.09,
      sourceText: 'mission compromise ended with maiming damage',
      type: 'critical',
    });
  }

  if (resolvedOutcomeKey === 'failure') {
    maybeInflictAppendageLoss(agent, state, {
      chance: 0.17,
      sourceText: 'failed mission left lasting physical loss',
      type: 'critical',
    });
  }

  if (agent.rank === 4) {
    agent.experience += 0.15;
  }

  agent.experience = Number(agent.experience.toFixed(1));

  logEvent(agent, state.worldTick, outcomeText, outcome.type);

  if (outcome.killDelta > 0) {
    maybePromoteAgent(agent, state);
  }

  if (agent.failures > 3 && agent.status === STATUS.ALIVE) {
    agent.status = STATUS.STRUGGLING;
  }

  if (agent.failures > 6) {
    agent.status = STATUS.CRITICAL;
  }
}

export function applyHeat(agent) {
  agent.heat = Math.max(0, agent.heat - 2.6);

  if (agent.heat > 88) {
    agent.status = STATUS.CRITICAL;
  }
}

export function maybeKillAgent(agent, state) {
  const { grit } = deriveTraits(agent.stats);
  const rankRisk = getRankRiskMultiplier(agent);
  const tier = getMissionTier(agent);
  const expMod = getExperienceModifier(agent);
  let deathThreshold = agent.status === STATUS.CRITICAL
    ? 0.039
    : agent.status === STATUS.STRUGGLING
      ? 0.0115
      : 0.0033;

  if (agent.rank === 4) {
    deathThreshold *= 0.25;
  }

  const adjustedDeathThreshold = Math.min(
    0.22,
    ((deathThreshold * rankRisk * tier.deathMultiplier / expMod) * (1 - (grit * 0.5))) * 0.52,
  );
  if (Math.random() >= adjustedDeathThreshold) {
    return false;
  }

  const reason = randomItem(DEATH_EVENTS);
  agent.status = STATUS.DEAD;
  agent.deathTick = state.worldTick;
  logEvent(agent, state.worldTick, reason, 'death');
  addWorldEvent(state, agent.name, reason, 'death');
  return true;
}

export function maybeRetireAgent(agent, state) {
  if (agent.status === STATUS.DEAD) {
    return;
  }

  if (agent.rank !== 4 || agent.heat >= 24 || Math.random() >= 0.0015) {
    return;
  }

  const sign = agent.profile?.zodiacSign;
  const seat = sign ? state.apostleSeats?.[sign] : null;
  const disciple = seat
    ? state.agents.find((entry) => (
      entry.id === seat.discipleId
      && isAliveClubOperative(entry)
      && entry.rank < 4
    ))
    : null;

  const reason = randomItem(RETIRE_EVENTS);
  agent.status = STATUS.RETIRED;
  logEvent(agent, state.worldTick, `${reason} Retired from the ${sign || 'UNMARKED'} Apostle seat.`, 'milestone');
  addWorldEvent(state, agent.name, `retired from ${sign || 'an unmarked'} Apostle seat`, 'milestone');

  if (sign) {
    setSeatHolder(state, sign, null);
  }

  if (!disciple || !sign) {
    return;
  }

  ensureApostleTraits(disciple, sign);
  setSeatHolder(state, sign, disciple);
  setSeatDisciple(state, sign, null);
  pushSeatHistory(state, sign, `${disciple.name} inherited the seat after ${agent.name} retired`);
  logEvent(disciple, state.worldTick, `inherited the ${sign} Apostle seat after ${agent.name} retired`, 'milestone');
  addWorldEvent(state, disciple.name, `inherited the ${sign} seat from ${agent.name}`, 'milestone');
}

export function applyExperienceDecay(agent, state) {
  if (agent.status !== STATUS.ALIVE || agent.stage !== LIFE_STAGES.OPERATIVE) {
    return;
  }

  if ((agent.experience ?? 0) <= 0) {
    return;
  }

  const idleTicks = state.worldTick - (agent.lastContractTick ?? state.worldTick);
  if (idleTicks < EXPERIENCE_DECAY_WINDOW) {
    return;
  }

  const decayAmount = Math.max(0.05, 0.015 * Math.log10(agent.experience + 1));
  agent.experience = Number(Math.max(0, agent.experience - decayAmount).toFixed(1));
}

export function maybePromoteApostle() {
  return false;
}

function isAliveClubOperative(agent) {
  return agent.alignment !== 'enemy'
    && agent.stage === LIFE_STAGES.OPERATIVE
    && agent.status !== STATUS.DEAD
    && agent.status !== STATUS.RETIRED
    && agent.status !== STATUS.WASHED;
}

function ensureApostleSeatState(state) {
  if (!state.apostleSeats) {
    state.apostleSeats = {};
  }

  ZODIAC_SIGNS.forEach((sign) => {
    if (!state.apostleSeats[sign]) {
      state.apostleSeats[sign] = {
        sign,
        holderId: null,
        holderName: 'VACANT',
        discipleId: null,
        discipleName: 'UNASSIGNED',
        history: [],
      };
    }
  });
}

function pushSeatHistory(state, sign, text) {
  ensureApostleSeatState(state);
  const seat = state.apostleSeats[sign];
  seat.history.unshift({ tick: state.worldTick, text });

  if (seat.history.length > 8) {
    seat.history.pop();
  }
}

function setSeatHolder(state, sign, holder) {
  ensureApostleSeatState(state);
  const seat = state.apostleSeats[sign];
  seat.holderId = holder?.id ?? null;
  seat.holderName = holder?.name ?? 'VACANT';
}

function setSeatDisciple(state, sign, disciple) {
  ensureApostleSeatState(state);
  const seat = state.apostleSeats[sign];
  seat.discipleId = disciple?.id ?? null;
  seat.discipleName = disciple?.name ?? 'UNASSIGNED';
}

function getPerformanceScore(agent) {
  const statValues = Object.values(agent.stats);
  const avgStats = statValues.reduce((sum, value) => sum + value, 0) / statValues.length;
  const hiddenPotential = agent.profile?.hiddenPotential ?? 50;
  return (agent.kills * 2.2)
    + (agent.contracts * 0.8)
    - (agent.failures * 1.5)
    + (avgStats * 0.45)
    + (hiddenPotential * 0.75);
}

function markTopHalfARankerPotential(state) {
  const aRankers = state.agents
    .filter((agent) => isAliveClubOperative(agent) && agent.rank === 3)
    .sort((left, right) => getPerformanceScore(right) - getPerformanceScore(left));

  const potentialSet = new Set(
    aRankers
      .slice(0, Math.ceil(aRankers.length / 2))
      .map((agent) => agent.id),
  );

  state.agents.forEach((agent) => {
    if (!agent.profile) {
      return;
    }

    agent.profile.apostlePotential = potentialSet.has(agent.id);
  });
}

function ensureApostleTraits(agent, zodiacSign) {
  if (!agent.profile) {
    agent.profile = {};
  }

  if (!Array.isArray(agent.traits)) {
    agent.traits = [];
  }

  agent.rank = 4;
  agent.profile.zodiacSign = zodiacSign;
  agent.profile.transhuman = true;
  agent.profile.hiddenPotential = Math.max(90, agent.profile.hiddenPotential ?? 90);

  if (!agent.traits.includes('Apostle')) {
    agent.traits.push('Apostle');
  }

  if (!agent.traits.includes('Beyond Human')) {
    agent.traits.push('Beyond Human');
  }
}

function getAliveApostles(state) {
  return state.agents.filter((agent) => (
    isAliveClubOperative(agent)
    && agent.rank === 4
    && agent.profile?.zodiacSign
  ));
}

function assignMissingSigns(state) {
  const usedSigns = new Set();
  getAliveApostles(state).forEach((agent) => {
    usedSigns.add(agent.profile.zodiacSign);
  });

  const freeSigns = ZODIAC_SIGNS.filter((sign) => !usedSigns.has(sign));
  const signQueue = [...freeSigns];

  state.agents.forEach((agent) => {
    if (!isAliveClubOperative(agent) || agent.rank !== 4) {
      return;
    }

    if (agent.profile?.zodiacSign) {
      return;
    }

    const nextSign = signQueue.shift();
    if (!nextSign) {
      return;
    }

    ensureApostleTraits(agent, nextSign);
  });
}

function maybeRunApostleDuel(state) {
  const apostles = getAliveApostles(state);
  if (!apostles.length || Math.random() >= 0.22) {
    return;
  }

  const challengers = state.agents
    .filter((agent) => (
      isAliveClubOperative(agent)
      && agent.rank === 3
      && agent.profile?.apostlePotential
      && !agent.profile?.zodiacSign
    ))
    .sort((left, right) => getPerformanceScore(right) - getPerformanceScore(left));

  if (!challengers.length) {
    return;
  }

  const challenger = challengers[0];
  const defender = randomItem(apostles);
  const challengerPower = getPerformanceScore(challenger) + (Math.random() * 30);
  const defenderPower = getPerformanceScore(defender) + 20 + (Math.random() * 40);

  if (challengerPower <= defenderPower) {
    return;
  }

  const seat = defender.profile.zodiacSign;
  defender.status = STATUS.DEAD;
  defender.deathTick = state.worldTick;
  logEvent(defender, state.worldTick, `was killed in a succession duel for the ${seat} seat`, 'death');
  addWorldEvent(state, defender.name, `fell in a succession duel for ${seat}`, 'death');

  ensureApostleTraits(challenger, seat);
  setSeatHolder(state, seat, challenger);
  setSeatDisciple(state, seat, null);
  pushSeatHistory(state, seat, `${challenger.name} killed ${defender.name} and claimed the seat`);
  logEvent(challenger, state.worldTick, `defeated ${defender.name} and claimed the ${seat} Apostle seat`, 'milestone');
  addWorldEvent(state, challenger.name, `killed ${defender.name} and claimed ${seat}`, 'milestone');
}

function ensureApostleSeat(state, zodiacSign) {
  const existing = state.agents.find((agent) => (
    isAliveClubOperative(agent)
    && agent.rank === 4
    && agent.profile?.zodiacSign === zodiacSign
  ));

  if (existing) {
    setSeatHolder(state, zodiacSign, existing);
    return;
  }

  const seatedDisciple = state.agents.find((agent) => (
    agent.id === state.apostleSeats?.[zodiacSign]?.discipleId
    && isAliveClubOperative(agent)
    && agent.rank < 4
  ));

  if (seatedDisciple) {
    ensureApostleTraits(seatedDisciple, zodiacSign);
    setSeatHolder(state, zodiacSign, seatedDisciple);
    setSeatDisciple(state, zodiacSign, null);
    pushSeatHistory(state, zodiacSign, `${seatedDisciple.name} inherited the vacant seat as disciple`);
    logEvent(seatedDisciple, state.worldTick, `inherited the vacant ${zodiacSign} Apostle seat`, 'milestone');
    addWorldEvent(state, seatedDisciple.name, `inherited the ${zodiacSign} Apostle seat`, 'milestone');
    return;
  }

  const potentialARankers = state.agents
    .filter((agent) => (
      isAliveClubOperative(agent)
      && agent.rank === 3
      && agent.profile?.apostlePotential
      && !agent.profile?.zodiacSign
    ))
    .sort((left, right) => getPerformanceScore(right) - getPerformanceScore(left));

  const fallbackOperatives = state.agents
    .filter((agent) => (
      isAliveClubOperative(agent)
      && agent.rank >= 2
      && !agent.profile?.zodiacSign
    ))
    .sort((left, right) => getPerformanceScore(right) - getPerformanceScore(left));

  let successor = potentialARankers[0] || fallbackOperatives[0] || null;

  if (!successor) {
    successor = createAgent(state.worldTick, {
      ageRange: [19, 27],
      forceStage: LIFE_STAGES.OPERATIVE,
    });
    successor.rank = 3;
    successor.kills = 9;
    successor.contracts = 18;
    successor.failures = 1;
    successor.heat = 34;
    successor.profile.hiddenPotential = 96;
    successor.profile.apostlePotential = true;
    state.agents.push(successor);
  }

  ensureApostleTraits(successor, zodiacSign);
  setSeatHolder(state, zodiacSign, successor);
  setSeatDisciple(state, zodiacSign, null);
  pushSeatHistory(state, zodiacSign, `${successor.name} took the seat by appointment`);
  logEvent(successor, state.worldTick, `ascended to the ${zodiacSign} Apostle seat`, 'milestone');
  addWorldEvent(state, successor.name, `took the ${zodiacSign} Apostle seat`, 'milestone');
}

function assignSeatDisciple(state, zodiacSign) {
  const seat = state.apostleSeats?.[zodiacSign];
  const holder = state.agents.find((agent) => agent.id === seat?.holderId);
  if (!seat || !holder || !isAliveClubOperative(holder)) {
    return;
  }

  const usedDiscipleIds = new Set(
    Object.values(state.apostleSeats)
      .map((entry) => entry.discipleId)
      .filter(Boolean),
  );

  const validCurrentDisciple = state.agents.find((agent) => (
    agent.id === seat.discipleId
    && isAliveClubOperative(agent)
    && agent.rank < 4
    && agent.id !== holder.id
  ));

  if (validCurrentDisciple) {
    setSeatDisciple(state, zodiacSign, validCurrentDisciple);
    return;
  }

  const candidates = state.agents
    .filter((agent) => (
      isAliveClubOperative(agent)
      && agent.rank === 3
      && agent.profile?.apostlePotential
      && !agent.profile?.zodiacSign
      && !usedDiscipleIds.has(agent.id)
      && agent.id !== holder.id
    ))
    .sort((left, right) => getPerformanceScore(right) - getPerformanceScore(left));

  if (!candidates.length) {
    setSeatDisciple(state, zodiacSign, null);
    return;
  }

  const disciple = candidates[0];
  setSeatDisciple(state, zodiacSign, disciple);
  pushSeatHistory(state, zodiacSign, `${disciple.name} was named disciple to ${holder.name}`);
}

export function reconcileApostles(state) {
  ensureApostleSeatState(state);
  markTopHalfARankerPotential(state);
  assignMissingSigns(state);
  maybeRunApostleDuel(state);

  ZODIAC_SIGNS.forEach((sign) => {
    ensureApostleSeat(state, sign);
    assignSeatDisciple(state, sign);
  });
}
