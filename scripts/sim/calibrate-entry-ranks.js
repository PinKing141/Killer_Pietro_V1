import { createAgent } from './agent-factory.js';
import { progressDevelopment } from './development.js';
import { createState } from '../state.js';
import { STATUS } from '../data.js';

const TARGET_SAMPLE_SIZE = 1000;

function runOneCandidate(index) {
  const state = createState();
  const agent = createAgent(0, { ageRange: [8, 8] });
  agent.id = `cal-${index}`;

  // Keep the calibration focused on entry evaluation; funnel scores are set to passing so
  // final outcomes reflect first-mission washout + rank assignment behavior.
  agent.profile.funnelPhase = 3;
  agent.profile.clearanceScore = 72;

  while (agent.stage !== 'operative' && agent.status !== STATUS.WASHED && agent.profile.age < 18) {
    state.worldTick += 1;
    progressDevelopment(agent, state);
  }

  return {
    stage: agent.stage,
    status: agent.status,
    rank: agent.rank,
  };
}

function percent(count, total) {
  if (!total) {
    return 0;
  }

  return Number(((count / total) * 100).toFixed(2));
}

function runCalibration() {
  const all = [];

  for (let i = 0; i < TARGET_SAMPLE_SIZE; i += 1) {
    all.push(runOneCandidate(i));
  }

  const graduates = all.filter((entry) => entry.stage === 'operative' && entry.status !== STATUS.WASHED);
  const washed = all.filter((entry) => entry.status === STATUS.WASHED);

  const rankCounts = {
    D: graduates.filter((entry) => entry.rank === 0).length,
    C: graduates.filter((entry) => entry.rank === 1).length,
    B: graduates.filter((entry) => entry.rank === 2).length,
    A: graduates.filter((entry) => entry.rank === 3).length,
    S: graduates.filter((entry) => entry.rank === 4).length,
  };

  console.log('ENTRY RANK CALIBRATION (1,000 CANDIDATES)');
  console.log(`graduates: ${graduates.length} (${percent(graduates.length, all.length)}%)`);
  console.log(`washed: ${washed.length} (${percent(washed.length, all.length)}%)`);
  console.log('--- among graduates ---');
  console.log(`D: ${rankCounts.D} (${percent(rankCounts.D, graduates.length)}%)`);
  console.log(`C: ${rankCounts.C} (${percent(rankCounts.C, graduates.length)}%)`);
  console.log(`B: ${rankCounts.B} (${percent(rankCounts.B, graduates.length)}%)`);
  console.log(`A: ${rankCounts.A} (${percent(rankCounts.A, graduates.length)}%)`);
  console.log(`S: ${rankCounts.S} (${percent(rankCounts.S, graduates.length)}%)`);
}

runCalibration();
