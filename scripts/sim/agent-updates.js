import {
  CONTRACT_EVENTS,
  DEATH_EVENTS,
  RETIRE_EVENTS,
  RANKS,
  STATUS,
} from '../data.js';
import { randomItem } from '../utils.js';
import { addWorldEvent, logEvent } from './event-log.js';
import { evaluateContractEvent } from './event-evaluator.js';
import { deriveTraits } from './traits.js';

function maybePromoteAgent(agent, state) {
  const newRank = Math.min(4, Math.floor(agent.kills / 4));

  if (newRank <= agent.rank) {
    return;
  }

  agent.rank = newRank;
  logEvent(agent, state.worldTick, `promoted to ${RANKS[agent.rank]}`, 'milestone');

  if (agent.status === STATUS.STRUGGLING) {
    agent.status = STATUS.ALIVE;
  }

  addWorldEvent(state, agent.name, `reached rank: ${RANKS[agent.rank]}`, 'milestone');
}

export function processContract(agent, state) {
  if (Math.random() >= 0.4) {
    return;
  }

  const event = randomItem(CONTRACT_EVENTS);
  const evaluation = evaluateContractEvent(agent, event, Math.random);
  const {
    heatDelta,
    outcome,
  } = evaluation;

  agent.contracts += 1;
  agent.kills += outcome.killDelta;
  agent.failures += outcome.failureDelta;
  agent.heat += heatDelta;

  logEvent(agent, state.worldTick, outcome.text, outcome.type);

  if (outcome.killDelta > 0) {
    maybePromoteAgent(agent, state);
  }

  if (agent.failures > 2 && agent.status === STATUS.ALIVE) {
    agent.status = STATUS.STRUGGLING;
  }

  if (agent.failures > 4) {
    agent.status = STATUS.CRITICAL;
  }
}

export function applyHeat(agent) {
  agent.heat = Math.max(0, agent.heat - 2);

  if (agent.heat > 80) {
    agent.status = STATUS.CRITICAL;
  }
}

export function maybeKillAgent(agent, state) {
  const { grit } = deriveTraits(agent.stats);
  const deathThreshold = agent.status === STATUS.CRITICAL
    ? 0.15
    : agent.status === STATUS.STRUGGLING
      ? 0.05
      : 0.015;

  if (Math.random() >= deathThreshold * (1 - (grit * 0.5))) {
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

  if (agent.rank !== 4 || agent.heat >= 20 || Math.random() >= 0.03) {
    return;
  }

  const reason = randomItem(RETIRE_EVENTS);
  agent.status = STATUS.RETIRED;
  logEvent(agent, state.worldTick, reason, 'milestone');
  addWorldEvent(state, agent.name, reason, 'success');
}
