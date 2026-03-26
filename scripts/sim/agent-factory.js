import {
  FIRST_NAMES,
  LIFE_STAGES,
  LAST_NAMES,
  MAX_ACTIVE_AGENTS,
  STATUS,
} from '../data.js';
import { countActiveAgents, randomItem, rng } from '../utils.js';
import { addWorldEvent } from './event-log.js';
import { createProfile, getLifeStage } from './development.js';

function randomName() {
  return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

function createAgentStats() {
  return {
    strength: rng(20, 85),
    agility: rng(20, 85),
    endurance: rng(20, 85),
    resilience: rng(20, 85),
    dexterity: rng(20, 85),
    intelligence: rng(20, 85),
    perception: rng(20, 85),
    discipline: rng(20, 85),
    instinct: rng(20, 85),
  };
}

function getSpawnText(agent) {
  if (agent.stage === LIFE_STAGES.CHILD) {
    return 'entered the intake ledger. Potential: unmeasured.';
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    return 'entered the training block. Discipline still settling.';
  }

  return 'entered the city. Background: unknown.';
}

export function createAgent(worldTick, options = {}) {
  const stats = createAgentStats();
  const profile = createProfile(options.ageRange);
  const stage = getLifeStage(profile.age);

  return {
    id: `${Date.now()}-${Math.random()}`,
    name: randomName(),
    rank: 0,
    status: STATUS.ALIVE,
    kills: 0,
    failures: 0,
    contracts: 0,
    stats,
    profile,
    stage,
    trainingTicks: 0,
    heat: 0,
    log: [],
    spawnTick: worldTick,
    deathTick: null,
  };
}

export function spawnAgentIntoState(state, options = {}) {
  if (countActiveAgents(state.agents) >= MAX_ACTIVE_AGENTS) {
    return null;
  }

  const agent = createAgent(state.worldTick, {
    ageRange: options.ageRange ?? [10, 16],
  });
  state.agents.push(agent);
  addWorldEvent(state, agent.name, getSpawnText(agent), 'info');
  return agent;
}

export function seedInitialAgents(state, totalAgents) {
  for (let index = 0; index < totalAgents; index += 1) {
    const agent = createAgent(state.worldTick, {
      ageRange: [16, 23],
    });

    agent.profile.ageProgress = rng(0, 10);
    agent.trainingTicks = rng(0, 5);

    if (agent.stage === LIFE_STAGES.OPERATIVE) {
      agent.kills = Math.floor(Math.random() * 6);
      agent.rank = Math.min(4, Math.floor(agent.kills / 4));
      agent.heat = Math.random() * 30;
    } else {
      agent.heat = Math.random() * 8;
    }

    state.agents.push(agent);
  }
}
