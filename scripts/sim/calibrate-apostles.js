import { STATUS } from '../data.js';
import { createState } from '../state.js';
import { seedInitialAgents } from './agent-factory.js';
import { advanceSimulation } from './tick-engine.js';

const TRIALS = 10;
const TICKS_PER_TRIAL = 10000;
const INITIAL_AGENTS = 10;

function countActiveApostles(agents) {
  return agents.filter((agent) => (
    agent.rank === 4
    && agent.status === STATUS.ALIVE
    && agent.alignment !== 'enemy'
  )).length;
}

function runTrial() {
  const state = createState();
  seedInitialAgents(state, INITIAL_AGENTS);

  let peakApostles = 0;
  let reachedCapTick = null;

  for (let tick = 0; tick < TICKS_PER_TRIAL; tick += 1) {
    advanceSimulation(state);

    const activeApostles = countActiveApostles(state.agents);
    if (activeApostles > peakApostles) {
      peakApostles = activeApostles;
    }

    if (activeApostles >= 12 && reachedCapTick === null) {
      reachedCapTick = state.worldTick;
      break;
    }
  }

  return {
    peakApostles,
    reachedCap: reachedCapTick !== null,
    reachedCapTick,
    finalActiveApostles: countActiveApostles(state.agents),
  };
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function runCalibration() {
  const results = [];

  for (let i = 0; i < TRIALS; i += 1) {
    results.push(runTrial());
  }

  const peaks = results.map((result) => result.peakApostles);
  const finals = results.map((result) => result.finalActiveApostles);
  const capHits = results.filter((result) => result.reachedCap);

  console.log('APOSTLE CAP CALIBRATION');
  console.log(`trials: ${TRIALS}`);
  console.log(`ticks per trial: ${TICKS_PER_TRIAL}`);
  console.log(`avg peak apostles: ${mean(peaks).toFixed(2)}`);
  console.log(`avg final active apostles: ${mean(finals).toFixed(2)}`);
  console.log(`max peak apostles: ${Math.max(...peaks)}`);
  console.log(`trials reaching 12 apostles: ${capHits.length}/${TRIALS}`);

  if (capHits.length) {
    const avgHitTick = mean(capHits.map((result) => result.reachedCapTick));
    console.log(`average tick when cap reached: ${avgHitTick.toFixed(0)}`);
  }
}

runCalibration();
