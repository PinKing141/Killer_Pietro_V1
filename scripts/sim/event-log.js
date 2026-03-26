import { LOG_LIMIT, WORLD_EVENT_LIMIT } from '../data.js';

export function logEvent(agent, worldTick, text, type) {
  agent.log.unshift({ tick: worldTick, text, type });

  if (agent.log.length > LOG_LIMIT) {
    agent.log.pop();
  }
}

export function addWorldEvent(state, agentName, text, type) {
  state.worldEvents.unshift({
    tick: state.worldTick,
    agentName,
    text,
    type,
  });

  if (state.worldEvents.length > WORLD_EVENT_LIMIT) {
    state.worldEvents.pop();
  }
}
