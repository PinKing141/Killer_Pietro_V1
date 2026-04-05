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

function setRosterMode(nextMode) {
  state.rosterMode = nextMode;
  renderApp();
}

function setTraineeAgeFilter(nextFilter) {
  state.traineeAgeFilter = nextFilter;
  renderApp();
}

function setRightPanelMode(nextMode) {
  state.rightPanelMode = nextMode;
  renderApp();
}

function setMapRegionFilter(nextRegion) {
  state.mapRegionFilter = state.mapRegionFilter === nextRegion ? null : nextRegion;
  renderApp();
}

function toggleFavorite(agentId) {
  if (!agentId) {
    return;
  }

  if (state.favoriteIds.includes(agentId)) {
    state.favoriteIds = state.favoriteIds.filter((id) => id !== agentId);
  } else {
    state.favoriteIds = [...state.favoriteIds, agentId];
  }

  renderApp();
}

function spawnAgent() {
  spawnAgentIntoState(state);
  renderApp();
}

function setDebugPasscode(passcode) {
  if (passcode === 'AGAPE') {
    state.debugUnlocked = true;
    state.debugStatusText = 'UNLOCKED';
  } else {
    state.debugUnlocked = false;
    state.debugStatusText = passcode ? 'DENIED' : 'LOCKED';
  }

  renderApp();
}

const renderer = createRenderer({
  selectAgent,
  setSpeed,
  setRosterMode,
  setRightPanelMode,
  setMapRegionFilter,
  setTraineeAgeFilter,
  toggleFavorite,
  spawnAgent,
  setDebugPasscode,
  togglePause,
});

function initialize() {
  seedInitialAgents(state, INITIAL_AGENT_COUNT);
  renderApp();
  startTicking();
}

initialize();
