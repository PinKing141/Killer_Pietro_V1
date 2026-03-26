import { LIFE_STAGES, RANK_CLASS, RANKS, STATUS } from './data.js';

export function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function padTick(tick) {
  return String(tick).padStart(4, '0');
}

export function ensureSentence(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function isInactive(status) {
  return status === STATUS.DEAD || status === STATUS.RETIRED;
}

export function countActiveAgents(agents) {
  return agents.filter((agent) => !isInactive(agent.status)).length;
}

export function getHeatColor(heat) {
  if (heat > 70) {
    return 'var(--red)';
  }

  if (heat > 40) {
    return '#c49a5a';
  }

  return 'var(--green)';
}

export function getStatusDotClass(status) {
  switch (status) {
    case STATUS.DEAD:
      return 'dot-dead';
    case STATUS.RETIRED:
      return 'dot-retired';
    case STATUS.CRITICAL:
      return 'dot-critical';
    case STATUS.STRUGGLING:
      return 'dot-struggling';
    default:
      return 'dot-alive';
  }
}

export function getStageLabel(stage) {
  switch (stage) {
    case LIFE_STAGES.CHILD:
      return 'Child';
    case LIFE_STAGES.TRAINEE:
      return 'Trainee';
    case LIFE_STAGES.OPERATIVE:
      return 'Operative';
    default:
      return 'Unknown';
  }
}

export function getRankClass(agent) {
  if (agent.status === STATUS.DEAD) {
    return 'rank-dead';
  }

  if (agent.status === STATUS.RETIRED) {
    return 'rank-retired';
  }

  if (agent.stage === LIFE_STAGES.CHILD) {
    return 'rank-child';
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    return 'rank-trainee';
  }

  return RANK_CLASS[agent.rank];
}

export function getRankLabel(agent) {
  if (agent.status === STATUS.DEAD) {
    return 'DEAD';
  }

  if (agent.status === STATUS.RETIRED) {
    return 'RETIRED';
  }

  if (agent.stage === LIFE_STAGES.CHILD) {
    return 'CHILD';
  }

  if (agent.stage === LIFE_STAGES.TRAINEE) {
    return 'TRAINEE';
  }

  return RANKS[agent.rank];
}

export function sortAgentsForRoster(agents) {
  const sortValue = (status) => (isInactive(status) ? 1 : 0);
  const stageValue = (stage) => {
    switch (stage) {
      case LIFE_STAGES.OPERATIVE:
        return 0;
      case LIFE_STAGES.TRAINEE:
        return 1;
      case LIFE_STAGES.CHILD:
        return 2;
      default:
        return 3;
    }
  };

  return [...agents].sort((left, right) => {
    if (sortValue(left.status) !== sortValue(right.status)) {
      return sortValue(left.status) - sortValue(right.status);
    }

    if (stageValue(left.stage) !== stageValue(right.stage)) {
      return stageValue(left.stage) - stageValue(right.stage);
    }

    return right.rank - left.rank;
  });
}
