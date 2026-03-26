import { INITIAL_AGENT_COUNT } from './data.js';
import { createRenderer } from './render.js';
import { advanceSimulation, seedInitialAgents, spawnAgentIntoState } from './sim.js';
import { createState } from './state.js';

const state = createState();

function stopTicking() {
  if (state.tickInterval === null) {
    return;
  }

  clearInterval(state.tickInterval);
  state.tickInterval = null;
}

function renderApp() {
  renderer.renderApp(state);
}

function runTick() {
  advanceSimulation(state);
  renderApp();
}

function startTicking() {
  stopTicking();
  state.tickInterval = setInterval(runTick, 1000 / state.speed);
}

function togglePause() {
  state.paused = !state.paused;

  if (state.paused) {
    stopTicking();
  } else {
    startTicking();
  }

  renderApp();
}

function setSpeed(nextSpeed) {
  state.speed = nextSpeed;

  if (!state.paused) {
    startTicking();
  }

  renderApp();
}

function selectAgent(agentId) {
  state.selectedId = agentId;
  renderApp();
}

function spawnAgent() {
  spawnAgentIntoState(state);
  renderApp();
}

const renderer = createRenderer({
  selectAgent,
  setSpeed,
  spawnAgent,
  togglePause,
});

function initialize() {
  seedInitialAgents(state, INITIAL_AGENT_COUNT);
  renderApp();
  startTicking();
}

initialize();
