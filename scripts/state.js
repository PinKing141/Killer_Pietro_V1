import { DEFAULT_SPEED } from './data.js';

export function createState() {
  return {
    agents: [],
    worldEvents: [],
    worldTick: 0,
    selectedId: null,
    paused: false,
    speed: DEFAULT_SPEED,
    tickInterval: null,
  };
}
