import { LIFE_STAGES, MIN_ACTIVE_AGENTS } from '../data.js';
import { countActiveAgents, isInactive } from '../utils.js';
import { spawnAgentIntoState, spawnAnnualIntakeWave } from './agent-factory.js';
import { progressAppendageRecovery } from './appendages.js';
import { addWorldEvent } from './event-log.js';
import {
  applyExperienceDecay,
  applyHeat,
  maybeKillAgent,
  maybePromoteApostle,
  reconcileApostles,
  maybeRetireAgent,
  processContract,
} from './agent-updates.js';
import {
  countOperatives,
  processTraineeDrill,
  processTraineeProgrammeEvent,
  progressDevelopment,
} from './development.js';

function advanceAgent(agent, state) {
  if (isInactive(agent.status)) {
    return;
  }

  progressAppendageRecovery(agent, state);

  const development = progressDevelopment(agent, state);

  if (development.stageChanged) {
    return;
  }

  if (agent.stage === LIFE_STAGES.CHILD) {
    return;
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    processTraineeProgrammeEvent(agent, state);
    processTraineeDrill(agent, state);
    applyHeat(agent);
    return;
  }

  processContract(agent, state);
  maybePromoteApostle(agent, state);
  applyExperienceDecay(agent, state);
  applyHeat(agent);

  if (maybeKillAgent(agent, state)) {
    return;
  }

  maybeRetireAgent(agent, state);
}

function maybeRunAnnualIntake(state) {
  const date = state.currentDate;
  const year = date.getFullYear();
  const isJanFirst = date.getMonth() === 0 && date.getDate() === 1;

  if (!isJanFirst || state.lastIntakeYear === year) {
    return;
  }

  const intakeCount = 90 + Math.floor(Math.random() * 21);
  const spawned = spawnAnnualIntakeWave(state, intakeCount);
  state.lastIntakeYear = year;
  state.intakeStats = {
    year,
    count: spawned,
    diedInTrial: 0,
    passedToTrainee: 0,
  };

  addWorldEvent(
    state,
    'Orphanage Directorate',
    `launched annual intake: ${spawned} candidates (ages 8-11) entered the five-day wilderness trial with one bullet each`,
    'milestone',
  );
}

function advanceCalendarDate(state) {
  state.currentDate.setDate(state.currentDate.getDate() + 1);
}

export function advanceSimulation(state) {
  maybeRunAnnualIntake(state);
  state.worldTick += 1;

  state.agents.forEach((agent) => {
    advanceAgent(agent, state);
  });

  reconcileApostles(state);

  if (countOperatives(state.agents) < MIN_ACTIVE_AGENTS && Math.random() < 0.3) {
    spawnAgentIntoState(state, {
      ageRange: [18, 22],
    });
  } else if (countActiveAgents(state.agents) < MIN_ACTIVE_AGENTS + 4 && Math.random() < 0.08) {
    spawnAgentIntoState(state, {
      ageRange: [8, 16],
    });
  }

  advanceCalendarDate(state);
}
