import {
  FIRST_NAMES,
  LIFE_STAGES,
  LAST_NAMES,
  MAX_ACTIVE_AGENTS,
  STATUS,
} from '../data.js';
import { isInactive, randomItem, rng } from '../utils.js';
import { addWorldEvent } from './event-log.js';
import { createProfile, getLifeStage } from './development.js';
import { ensureStatProgress, seedInitialStatProgress } from './stat-progression.js';
import { generateTraitLabels } from './traits.js';

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
  const district = agent.profile?.district || 'Outer Ward';
  const faction = agent.profile?.faction || 'Unattributed Cell';

  if (agent.stage === LIFE_STAGES.CHILD) {
    return `entered intake from ${district} under ${faction}. Potential: unmeasured.`;
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    return `entered trainee block from ${district}. Sponsor: ${faction}.`;
  }

  return `entered the city from ${district}. Faction ties: ${faction}.`;
}

export function createAgent(worldTick, options = {}) {
  const stats = createAgentStats();
  const profile = createProfile(options.ageRange);
  const stage = options.forceStage ?? getLifeStage(profile.age);
  const yearsTrained = Math.max(0, profile.age - 8);

  const agent = {
    id: `${Date.now()}-${Math.random()}`,
    name: randomName(),
    rank: 0,
    status: STATUS.ALIVE,
    kills: 0,
    failures: 0,
    contracts: 0,
    experience: 0,
    alignment: 'club',
    stats,
    traits: generateTraitLabels(stats),
    profile,
    stage,
    trainingTicks: 0,
    yearsTrained,
    lastMissionTier: null,
    heat: 0,
    log: [],
    spawnTick: worldTick,
    deathTick: null,
    lastContractTick: worldTick,
  };

  ensureStatProgress(agent);
  seedInitialStatProgress(agent);
  return agent;
}

export function spawnAgentIntoState(state, options = {}) {
  if (!options.ignoreCapacity) {
    const activeOperatives = state.agents.filter((agent) => (
      agent.stage === LIFE_STAGES.OPERATIVE && !isInactive(agent.status)
    )).length;

    if (activeOperatives >= MAX_ACTIVE_AGENTS) {
      return null;
    }
  }

  const agent = createAgent(state.worldTick, {
    ageRange: options.ageRange ?? [8, 16],
  });
  state.agents.push(agent);
  addWorldEvent(state, agent.name, getSpawnText(agent), 'info');
  return agent;
}

export function spawnAnnualIntakeWave(state, totalIntake = 100) {
  let spawned = 0;

  for (let index = 0; index < totalIntake; index += 1) {
    const candidate = createAgent(state.worldTick, {
      ageRange: [8, 11],
      forceStage: LIFE_STAGES.CHILD,
    });

    candidate.profile.intakeTrialActive = true;
    candidate.profile.intakeTrialDaysRemaining = 5;
    candidate.profile.intakeBulletUsed = false;
    candidate.yearsTrained = 0;
    state.agents.push(candidate);
    spawned += 1;
  }

  return spawned;
}

export function seedInitialAgents(state, totalAgents) {
  for (let index = 0; index < totalAgents; index += 1) {
    const agent = createAgent(state.worldTick, {
      ageRange: [16, 23],
    });

    agent.profile.ageProgress = rng(0, 10);
    agent.trainingTicks = rng(0, 5);
    agent.yearsTrained = Math.max(0, agent.profile.age - 8);

    if (agent.stage === LIFE_STAGES.OPERATIVE) {
      agent.kills = Math.floor(Math.random() * 6);
      agent.rank = Math.min(4, Math.floor(agent.kills / 4));
      agent.heat = Math.random() * 30;
      seedInitialStatProgress(agent, { force: true });
    } else {
      agent.heat = Math.random() * 8;
    }

    state.agents.push(agent);
  }
}
