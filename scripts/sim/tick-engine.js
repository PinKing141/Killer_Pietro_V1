import { LIFE_STAGES, MIN_ACTIVE_AGENTS } from '../data.js';
import { countActiveAgents, isInactive } from '../utils.js';
import { spawnAgentIntoState } from './agent-factory.js';
import {
  applyHeat,
  maybeKillAgent,
  maybeRetireAgent,
  processContract,
} from './agent-updates.js';
import { countOperatives, processTraineeDrill, progressDevelopment } from './development.js';

function advanceAgent(agent, state) {
  if (isInactive(agent.status)) {
    return;
  }

  const development = progressDevelopment(agent, state);

  if (development.stageChanged) {
    return;
  }

  if (agent.stage === LIFE_STAGES.CHILD) {
    return;
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    processTraineeDrill(agent, state);
    applyHeat(agent);
    return;
  }

  processContract(agent, state);
  applyHeat(agent);

  if (maybeKillAgent(agent, state)) {
    return;
  }

  maybeRetireAgent(agent, state);
}

export function advanceSimulation(state) {
  state.worldTick += 1;

  state.agents.forEach((agent) => {
    advanceAgent(agent, state);
  });

  if (countOperatives(state.agents) < MIN_ACTIVE_AGENTS && Math.random() < 0.3) {
    spawnAgentIntoState(state, {
      ageRange: [18, 22],
    });
  } else if (countActiveAgents(state.agents) < MIN_ACTIVE_AGENTS + 4 && Math.random() < 0.08) {
    spawnAgentIntoState(state, {
      ageRange: [10, 16],
    });
  }
}
