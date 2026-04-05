import { STATUS } from '../data.js';
import { createState } from '../state.js';
import { createAgent } from './agent-factory.js';
import { advanceSimulation } from './tick-engine.js';

const COHORT_SIZE = 300;
const MAX_TICKS = 1800;

function weightedRankRoll() {
  const roll = Math.random();

  if (roll < 0.34) {
    return 0;
  }

  if (roll < 0.62) {
    return 1;
  }

  if (roll < 0.82) {
    return 2;
  }

  if (roll < 0.94) {
    return 3;
  }

  return 4;
}

function seedOperativeCohort(state) {
  const initialIds = [];

  for (let i = 0; i < COHORT_SIZE; i += 1) {
    const agent = createAgent(state.worldTick, {
      ageRange: [18, 28],
      forceStage: 'operative',
    });

    const rank = weightedRankRoll();
    agent.id = `mort-${i}`;
    agent.rank = rank;
    agent.kills = rank * 4;
    agent.contracts = Math.floor(Math.random() * 6);
    agent.failures = Math.floor(Math.random() * 2);
    agent.heat = 6 + (Math.random() * 22);

    state.agents.push(agent);
    initialIds.push(agent.id);
  }

  return initialIds;
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function runCalibration() {
  const state = createState();

  // Skip Jan 1 annual intake so this run stays focused on operative mortality.
  state.currentDate = new Date(2000, 0, 2);
  state.lastIntakeYear = 2000;

  const initialIds = seedOperativeCohort(state);

  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    advanceSimulation(state);

    const activeFromCohort = state.agents.some((agent) => (
      initialIds.includes(agent.id)
      && (agent.status === STATUS.ALIVE || agent.status === STATUS.STRUGGLING || agent.status === STATUS.CRITICAL)
    ));

    if (!activeFromCohort) {
      break;
    }
  }

  const cohort = state.agents.filter((agent) => initialIds.includes(agent.id));
  const dead = cohort.filter((agent) => agent.status === STATUS.DEAD);
  const retired = cohort.filter((agent) => agent.status === STATUS.RETIRED);
  const alive = cohort.filter((agent) => (
    agent.status === STATUS.ALIVE || agent.status === STATUS.STRUGGLING || agent.status === STATUS.CRITICAL
  ));

  const contractsAtDeath = dead.map((agent) => agent.contracts);
  const contractsAll = cohort.map((agent) => agent.contracts);

  console.log('OPERATIVE MORTALITY CALIBRATION');
  console.log(`cohort size: ${cohort.length}`);
  console.log(`dead: ${dead.length}`);
  console.log(`retired: ${retired.length}`);
  console.log(`still active: ${alive.length}`);
  console.log(`avg contracts (all): ${mean(contractsAll).toFixed(2)}`);
  console.log(`avg contracts before death: ${mean(contractsAtDeath).toFixed(2)}`);
  console.log(`median contracts before death: ${median(contractsAtDeath).toFixed(2)}`);
}

runCalibration();
