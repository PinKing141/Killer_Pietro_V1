import { MENTAL_STATS, PHYSICAL_STATS, STATUS } from './data.js';
import {
  countActiveAgents,
  ensureSentence,
  getHeatColor,
  getRankClass,
  getRankLabel,
  getStageLabel,
  getStatusDotClass,
  padTick,
  sortAgentsForRoster,
} from './utils.js';

function getAttributeColor(value) {
  if (value >= 70) {
    return 'var(--green)';
  }

  if (value >= 45) {
    return 'var(--accent)';
  }

  return 'var(--red)';
}

function renderBar(value, color) {
  return `
    <div class="stat-bar">
      <div class="stat-fill" style="width:${value}%;background:${color}"></div>
    </div>
  `;
}

function renderStatBar(value) {
  return renderBar(value, getAttributeColor(value));
}

function renderHeatBar(value) {
  return renderBar(value, getHeatColor(value));
}

function renderAgentStatus(agent) {
  if (agent.status === STATUS.DEAD) {
    return `<div class="fate-label rank-dead">✕ DECEASED — T-${padTick(agent.deathTick)}</div>`;
  }

  if (agent.status === STATUS.RETIRED) {
    return '<div class="fate-label rank-retired">RETIRED</div>';
  }

  if (agent.status === STATUS.CRITICAL) {
    return '<div class="fate-label rank-dead">⚠ CRITICAL EXPOSURE</div>';
  }

  if (agent.status === STATUS.STRUGGLING) {
    return '<div class="fate-label fate-label-compromised">COMPROMISED</div>';
  }

  return '';
}

function renderStatRow(label, value, barRenderer = renderStatBar) {
  return `
    <div class="stat-row">
      <div class="stat-row-header">
        <span>${label}</span>
        <span class="stat-row-value">${value}</span>
      </div>
      ${barRenderer(value)}
    </div>
  `;
}

function renderStatSection(title, titleClass, statDefinitions, stats, footer = '') {
  const rows = statDefinitions
    .map(([label, key]) => renderStatRow(label, stats[key]))
    .join('');

  return `
    <div class="scene-stat-panel">
      <div class="scene-stat-panel-title ${titleClass}">${title}</div>
      ${rows}
      ${footer ? `<div class="scene-stat-divider">${footer}</div>` : ''}
    </div>
  `;
}

function renderWorldEvent(event) {
  return `
    <div class="world-event world-event-${event.type}">
      <span class="tick">T-${padTick(event.tick)}</span>
      <span class="agent-ref">${event.agentName}</span> ${ensureSentence(event.text)}
    </div>
  `;
}

function renderLogEvent(agentName, event, index) {
  return `
    <div class="event-entry ${event.type}" style="animation-delay:${index * 0.03}s">
      <span class="tick">T-${padTick(event.tick)}</span>
      ${ensureSentence(`${agentName} ${event.text}`)}
    </div>
  `;
}

function renderSceneMarkup(agent) {
  const failuresClass = agent.failures > 3 ? 'status-bad' : '';
  const physicalSection = renderStatSection('PHYSICAL', 'physical', PHYSICAL_STATS, agent.stats);
  const mentalSection = renderStatSection(
    'MENTAL',
    'mental',
    MENTAL_STATS,
    agent.stats,
    renderStatRow('Heat', Math.round(agent.heat), renderHeatBar),
  );
  const logMarkup = agent.log.length
    ? agent.log.map((event, index) => renderLogEvent(agent.name, event, index)).join('')
    : '<div class="event-log-empty">No events yet.</div>';
  const age = agent.profile?.age ?? '?';
  const height = agent.profile?.height ?? '?';
  const origin = agent.profile?.origin ?? 'unknown';

  return `
    <div class="scene-subject">
      <div class="subject-name">${agent.name}</div>
      <div class="subject-title">
        <span class="rank-badge ${getRankClass(agent)}">${getRankLabel(agent)}</span>
        &nbsp;· age ${age}
        &nbsp;· entered T-${padTick(agent.spawnTick)}
      </div>
      ${renderAgentStatus(agent)}
    </div>

    <div class="scene-stat-sections">
      ${physicalSection}
      ${mentalSection}
    </div>

    <div class="scene-summary-grid">
      <div class="stat-box">
        <div class="stat-label">Age</div>
        <div class="stat-value">${age}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Height</div>
        <div class="stat-value">${height} cm</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Origin</div>
        <div class="stat-value">${origin}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Kills</div>
        <div class="stat-value">${agent.kills}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Failures</div>
        <div class="stat-value ${failuresClass}">${agent.failures}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Contracts</div>
        <div class="stat-value">${agent.contracts}</div>
      </div>
    </div>

    <div class="event-log">${logMarkup}</div>
  `;
}

function renderEmptyScene() {
  return `
    <div class="empty-state">
      <span>SELECT A SUBJECT</span>
      to observe their path
    </div>
  `;
}

export function createRenderer(handlers) {
  const elements = {
    aliveCount: document.getElementById('alive-count'),
    pauseButton: document.getElementById('btn-pause'),
    roster: document.getElementById('roster'),
    sceneView: document.getElementById('scene-view'),
    speedButtons: Array.from(document.querySelectorAll('.speed-btn')),
    speedLabel: document.getElementById('speed-label'),
    spawnButton: document.getElementById('btn-spawn'),
    worldFeed: document.getElementById('world-feed'),
    worldTick: document.getElementById('world-tick'),
  };

  elements.pauseButton.addEventListener('click', handlers.togglePause);
  elements.spawnButton.addEventListener('click', handlers.spawnAgent);

  elements.speedButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.setSpeed(Number(button.dataset.speed));
    });
  });

  function renderWorldTick(state) {
    elements.worldTick.textContent = padTick(state.worldTick);
  }

  function renderAliveCount(state) {
    elements.aliveCount.textContent = countActiveAgents(state.agents);
  }

  function renderRoster(state) {
    elements.roster.innerHTML = '';

    sortAgentsForRoster(state.agents).forEach((agent) => {
      const card = document.createElement('div');
      const heatWidth = Math.min(100, agent.heat);
      const stageLabel = getStageLabel(agent.stage);

      card.className = `agent-card${agent.id === state.selectedId ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="agent-name">
          <span class="status-dot ${getStatusDotClass(agent.status)}"></span>
          ${agent.name}
          <span class="rank-badge ${getRankClass(agent)}" style="margin-left:auto">${getRankLabel(agent)}</span>
        </div>
        <div class="agent-meta">${stageLabel} · ${agent.profile.age}Y · ${agent.kills}K / ${agent.failures}F · contracts: ${agent.contracts}</div>
        <div class="stat-bar">
          <div class="stat-fill" style="width:${heatWidth}%;background:${getHeatColor(agent.heat)}"></div>
        </div>
      `;
      card.addEventListener('click', () => handlers.selectAgent(agent.id));
      elements.roster.appendChild(card);
    });
  }

  function renderScene(state) {
    const agent = state.agents.find((entry) => entry.id === state.selectedId);
    elements.sceneView.innerHTML = agent ? renderSceneMarkup(agent) : renderEmptyScene();
  }

  function renderWorldFeed(state) {
    elements.worldFeed.innerHTML = state.worldEvents.map(renderWorldEvent).join('');
  }

  function renderControls(state) {
    elements.pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
    elements.pauseButton.classList.toggle('active', state.paused);
    elements.speedLabel.textContent = `${state.speed}×`;

    elements.speedButtons.forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.speed) === state.speed);
    });
  }

  function renderApp(state) {
    renderWorldTick(state);
    renderAliveCount(state);
    renderRoster(state);
    renderScene(state);
    renderWorldFeed(state);
    renderControls(state);
  }

  return { renderApp };
}
