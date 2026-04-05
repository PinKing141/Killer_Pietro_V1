import {
  LIFE_STAGES,
  MENTAL_STATS,
  PHYSICAL_STATS,
  STAT_LEVEL_START_BANDS,
  STATUS,
} from './data.js';
import {
  countActiveAgents,
  ensureSentence,
  getHeatColor,
  getRankClass,
  getRankLabel,
  getStatusLabel,
  getStageLabel,
  getStatusDotClass,
  isInactive,
  padTick,
  sortAgentsForRoster,
} from './utils.js';
import { getStatLevelSnapshot } from './sim/stat-progression.js';
import { getAppendageSummary } from './sim/appendages.js';
import { getRegionForCountryCode, getRegionLabels } from './sim/world-map-data.js';

const STAT_TOOLTIPS = {
  strength: 'Raw close-quarters power and impact force under pressure.',
  agility: 'Mobility, speed changes, and movement control during pursuit or escape.',
  endurance: 'Ability to sustain long operations before fatigue causes mistakes.',
  resilience: 'Recovery and toughness after damage, setbacks, and stress cycles.',
  dexterity: 'Precision control for weapon handling, locks, and delicate execution.',
  intelligence: 'Planning depth, pattern analysis, and strategic adaptation quality.',
  perception: 'Environmental awareness, threat spotting, and reading subtle cues.',
  discipline: 'Consistency, restraint, and compliance with operational protocols.',
  instinct: 'Split-second intuition and reaction quality when information is incomplete.',
  heat: 'Exposure pressure from visibility, noise, and investigation intensity.',
};

const TRAIT_TOOLTIPS = {
  Prodigy: 'Rare innate ceiling far above baseline peers; accelerates long-term potential.',
  'Elite Potential': 'Profile indicates sustained top-tier growth if survival continues.',
  Fragile: 'Poor stress tolerance; high collapse risk in prolonged hostile conditions.',
  Unstable: 'High variance behavior: occasional brilliance but dangerous inconsistency.',
  'Tactical Genius': 'Exceptional adaptation and scenario solving under complexity.',
  'Hyper-Aware': 'Unusual sensory processing and threat tracking capacity.',
  'Dead Hands': 'Extremely refined precision in lethal and technical execution.',
  'Iron Body': 'Exceptional toughness and recovery profile under sustained strain.',
  Anomaly: 'Outlier profile beyond normal talent distributions; statistically rare.',
  Apostle: 'Top-order apex operative designation within the elite twelve.',
  'Beyond Human': 'Apostle physiology and cognition no longer track baseline human limits.',
  Turncoat: 'Former club asset who resurfaced as hostile external operative.',
};

function escapeTooltip(value) {
  return String(value).replace(/"/g, '&quot;');
}

function getStartBandTooltipText() {
  const order = ['CHILD', 'TRAINEE', 'D', 'C', 'B', 'A', 'APOSTLE'];
  const parts = order.map((key) => {
    const [min, max] = STAT_LEVEL_START_BANDS[key] || [0, 0];
    return `${key}:${min}-${max}`;
  });

  return `Stat Start Bands | ${parts.join(' | ')}`;
}

function renderTooltipLabel(label, tooltipText) {
  if (!tooltipText) {
    return `<span>${label}</span>`;
  }

  return `<span class="tooltip-anchor" data-tooltip="${escapeTooltip(tooltipText)}">${label}</span>`;
}

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

  if (agent.status === STATUS.WASHED) {
    return '<div class="fate-label fate-label-compromised">WASHED OUT</div>';
  }

  if (agent.status === STATUS.CRITICAL) {
    return '<div class="fate-label rank-dead">⚠ CRITICAL EXPOSURE</div>';
  }

  if (agent.status === STATUS.STRUGGLING) {
    return '<div class="fate-label fate-label-compromised">COMPROMISED</div>';
  }

  return '';
}

function renderStatRow(label, value, barRenderer = renderStatBar, suffix = '') {
  return `
    <div class="stat-row">
      <div class="stat-row-header">
        <span>${label}</span>
        <span class="stat-row-value">${value}${suffix}</span>
      </div>
      ${barRenderer(value)}
    </div>
  `;
}

function renderStatSection(title, titleClass, statDefinitions, agent, footer = '') {
  const rows = statDefinitions
    .map(([label, key]) => {
      const snapshot = getStatLevelSnapshot(agent, key);
      return `
        <div class="stat-row">
          <div class="stat-row-header">
            ${renderTooltipLabel(label, STAT_TOOLTIPS[key])}
            <span class="stat-row-value">${agent.stats[key]} · L${snapshot.level} (${snapshot.progressPercent}%)</span>
          </div>
          ${renderBar(snapshot.progressPercent, getAttributeColor(agent.stats[key]))}
        </div>
      `;
    })
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

function getHeatColorFromPercent(percent) {
  const clamped = Math.max(0, Math.min(100, percent));

  if (clamped >= 75) {
    return '#d94a4a';
  }

  if (clamped >= 50) {
    return '#c47b4a';
  }

  if (clamped >= 25) {
    return '#9c8a4d';
  }

  if (clamped > 0) {
    return '#4f6f94';
  }

  return '#24242c';
}

function renderRegionalWorldHeatMap(regionPercents, activeRegion = null) {
  const zones = [
    {
      key: 'North America',
      points: '80,70 760,70 760,350 690,390 620,370 550,390 460,380 400,350 310,330 260,300 180,280 140,240 95,170',
    },
    {
      key: 'South America',
      points: '500,370 600,390 670,440 720,530 720,640 690,760 610,820 560,780 545,700 515,630 500,550 470,480',
    },
    {
      key: 'Europe',
      points: '890,90 1110,90 1160,150 1140,225 1020,250 920,235 870,180',
    },
    {
      key: 'Africa & Middle East',
      points: '860,230 1110,230 1230,290 1270,390 1230,610 1080,700 930,680 880,540 860,420 820,330',
    },
    {
      key: 'North & Central Asia',
      points: '1100,70 1660,70 1770,180 1680,260 1500,280 1350,270 1180,235 1090,160',
    },
    {
      key: 'South & East Asia',
      points: '1160,270 1520,270 1720,360 1710,470 1610,550 1450,540 1310,500 1220,430 1130,350',
    },
    {
      key: 'Oceania',
      points: '1520,500 1890,500 1910,660 1830,800 1620,820 1535,730 1510,620',
    },
  ];

  const overlays = zones.map((zone) => {
    const percent = regionPercents[zone.key] ?? 0;
    const fill = getHeatColorFromPercent(percent);
    const isActive = zone.key === activeRegion;
    return `
      <polygon
        class="region-overlay${isActive ? ' active' : ''}"
        data-map-region="${zone.key}"
        points="${zone.points}"
        fill="${fill}"
      >
        <title>${zone.key}: ${percent}%</title>
      </polygon>
    `;
  }).join('');

  return `
    <div class="mini-map-wrap">
      <div class="mini-map-title">Global Heat Map</div>
      <div class="mini-map-controls">
        <button class="ctrl-btn mini-map-clear-btn" data-map-region="__ALL__" type="button">All Regions</button>
        <span class="mini-map-filter-label">${activeRegion ? `Filter: ${activeRegion}` : 'Filter: none'}</span>
      </div>
      <svg viewBox="0 0 2000 857" class="region-map-svg" role="img" aria-label="Regional activity heat map">
        <image href="./world.svg" x="0" y="0" width="2000" height="857" class="region-map-base" />
        ${overlays}
      </svg>
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

function getThreatLevel(agent) {
  if (agent.stage !== LIFE_STAGES.OPERATIVE) {
    return 'UNRATED';
  }

  return getRankLabel(agent).replace(' RANK', '');
}

function getRankThreatPresentation(agent) {
  if (agent.alignment === 'enemy') {
    return {
      label: 'Threat Level',
      value: getThreatLevel(agent),
    };
  }

  return {
    label: 'Rank',
    value: getRankLabel(agent),
  };
}

function getFavoriteBadge(agent, favoriteIds) {
  const isFavorite = favoriteIds.includes(agent.id);
  return `<button class="favorite-btn${isFavorite ? ' active' : ''}" data-agent-id="${agent.id}" type="button" title="Toggle favorite">${isFavorite ? '★' : '☆'}</button>`;
}

function renderSceneMarkup(agent, debugUnlocked = false) {
  const failuresClass = agent.failures > 3 ? 'status-bad' : '';
  const physicalSection = renderStatSection('PHYSICAL', 'physical', PHYSICAL_STATS, agent);
  const mentalSection = renderStatSection(
    'MENTAL',
    'mental',
    MENTAL_STATS,
    agent,
    renderStatRow('Heat', Math.round(agent.heat), renderHeatBar),
  );
  const logMarkup = agent.log.length
    ? agent.log.map((event, index) => renderLogEvent(agent.name, event, index)).join('')
    : '<div class="event-log-empty">No events yet.</div>';
  const age = agent.profile?.age ?? '?';
  const height = agent.profile?.height ?? '?';
  const origin = agent.profile?.origin ?? 'unknown';
  const yearsTrained = agent.yearsTrained ?? Math.max(0, (agent.profile?.age ?? 8) - 8);
  const missionTier = agent.lastMissionTier ? `${agent.lastMissionTier}-tier` : 'none';
  const threatLevel = getThreatLevel(agent);
  const rankThreat = getRankThreatPresentation(agent);
  const alignmentLabel = agent.alignment === 'enemy' ? 'ENEMY OPERATIVE' : 'GLORIA OPERATIVE';
  const enemyBadge = agent.alignment === 'enemy' ? '<span class="enemy-badge">ENEMY</span>' : '';
  const zodiacSign = agent.profile?.zodiacSign;
  const apostleStateLabel = zodiacSign ? '&nbsp;· BEYOND HUMAN' : '';
  const favoriteBadge = `<button class="favorite-btn${agent.isFavorite ? ' active' : ''}" data-agent-id="${agent.id}" type="button" title="Toggle favorite">${agent.isFavorite ? '★' : '☆'}</button>`;
  const traitMarkup = Array.isArray(agent.traits) && agent.traits.length
    ? `<div class="trait-row">${agent.traits.map((trait) => `<span class="trait-chip tooltip-anchor" data-tooltip="${escapeTooltip(TRAIT_TOOLTIPS[trait] ?? 'Derived profile trait shaped by growth, pressure, and outcomes.')}">${trait}</span>`).join('')}</div>`
    : '';
  const experience = agent.experience ?? 0;
  const veterancy = (1 + (Math.log10(experience + 1) * 0.25)).toFixed(2);
  const statusLabel = getStatusLabel(agent.status);
  const appendageSummary = getAppendageSummary(agent);
  const appendageLabel = appendageSummary.long;
  const hiddenPotentialBox = debugUnlocked
    ? `
      <div class="stat-box">
        <div class="stat-label">Hidden Potential</div>
        <div class="stat-value">${agent.profile?.hiddenPotential ?? '?'}</div>
      </div>
    `
    : '';

  return `
    <div class="scene-subject">
      <div class="subject-name">${agent.name}</div>
      <div class="subject-title">
        <span class="rank-badge ${getRankClass(agent)}">${getRankLabel(agent)}</span>
        ${favoriteBadge}
        ${enemyBadge}
        &nbsp;· ${alignmentLabel}
        ${apostleStateLabel}
        &nbsp;· age ${age}
        &nbsp;· entered T-${padTick(agent.spawnTick)}
      </div>
      ${traitMarkup}
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
        <div class="stat-label">Years Trained</div>
        <div class="stat-value">${yearsTrained}</div>
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
      <div class="stat-box">
        <div class="stat-label">Experience</div>
        <div class="stat-value">${experience}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Veterancy</div>
        <div class="stat-value">${veterancy}×</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Mission Tier</div>
        <div class="stat-value">${missionTier}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${rankThreat.label}</div>
        <div class="stat-value">${rankThreat.value}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Status</div>
        <div class="stat-value">${statusLabel}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Appendages</div>
        <div class="stat-value">${appendageLabel}</div>
      </div>
      ${hiddenPotentialBox}
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

function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function createRenderer(handlers) {
  let lastSceneMarkup = '';
  let lastWorldFeedMarkup = '';
  let lastRosterOrder = [];

  const elements = {
    aliveCount: document.getElementById('alive-count'),
    pauseButton: document.getElementById('btn-pause'),
    roster: document.getElementById('roster'),
    sceneView: document.getElementById('scene-view'),
    speedButtons: Array.from(document.querySelectorAll('.speed-btn')),
    rosterModeButtons: Array.from(document.querySelectorAll('.roster-mode-btn')),
    rightPanelModeButtons: Array.from(document.querySelectorAll('.right-panel-mode-btn')),
    traineeAgeFilter: document.getElementById('trainee-age-filter'),
    speedLabel: document.getElementById('speed-label'),
    spawnButton: document.getElementById('btn-spawn'),
    intakeYear: document.getElementById('intake-year'),
    intakeCount: document.getElementById('intake-count'),
    intakeDied: document.getElementById('intake-died'),
    intakePassed: document.getElementById('intake-passed'),
    worldFeed: document.getElementById('world-feed'),
    worldMap: document.getElementById('world-map'),
    apostlePanel: document.getElementById('apostle-panel'),
    worldTick: document.getElementById('world-tick'),
    debugPasscode: document.getElementById('debug-passcode'),
    debugButton: document.getElementById('btn-debug-unlock'),
    debugRangeBands: document.getElementById('debug-range-bands'),
    debugStatus: document.getElementById('debug-status'),
  };

  elements.debugRangeBands.dataset.tooltip = escapeTooltip(getStartBandTooltipText());

  elements.pauseButton.addEventListener('click', handlers.togglePause);
  elements.spawnButton.addEventListener('click', handlers.spawnAgent);
  elements.debugButton.addEventListener('click', () => {
    handlers.setDebugPasscode(elements.debugPasscode.value.trim());
    elements.debugPasscode.value = '';
  });
  elements.debugPasscode.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    handlers.setDebugPasscode(elements.debugPasscode.value.trim());
    elements.debugPasscode.value = '';
  });

  elements.roster.addEventListener('click', (event) => {
    const favoriteButton = event.target.closest('.favorite-btn');
    if (favoriteButton) {
      event.stopPropagation();
      handlers.toggleFavorite(favoriteButton.dataset.agentId);
      return;
    }

    const card = event.target.closest('.agent-card');
    if (card && card.dataset.agentId) {
      handlers.selectAgent(card.dataset.agentId);
    }
  });

  elements.speedButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.setSpeed(Number(button.dataset.speed));
    });
  });

  elements.rosterModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.setRosterMode(button.dataset.rosterMode);
    });
  });

  elements.rightPanelModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.setRightPanelMode(button.dataset.rightPanelMode);
    });
  });

  elements.traineeAgeFilter.addEventListener('change', () => {
    handlers.setTraineeAgeFilter(elements.traineeAgeFilter.value);
  });

  elements.worldMap.addEventListener('click', (event) => {
    const regionTarget = event.target.closest('[data-map-region]');
    if (!regionTarget) {
      return;
    }

    const region = regionTarget.dataset.mapRegion;
    handlers.setMapRegionFilter(region === '__ALL__' ? null : region);
  });

  function isTraineeInBand(agent, band) {
    const age = agent.profile?.age ?? 0;

    if (band === '8-10') {
      return age >= 8 && age <= 10;
    }

    if (band === '11-13') {
      return age >= 11 && age <= 13;
    }

    if (band === '14-16') {
      return age >= 14 && age <= 16;
    }

    return true;
  }

  function getRosterAgents(state) {
    let filtered = [...state.agents];

    if (state.rosterMode === 'trainees') {
      filtered = filtered.filter((agent) => agent.stage === LIFE_STAGES.TRAINEE);
      filtered = filtered.filter((agent) => isTraineeInBand(agent, state.traineeAgeFilter));
    }

    if (state.rosterMode === 'operatives') {
      filtered = filtered.filter((agent) => agent.stage === LIFE_STAGES.OPERATIVE);
    }

    if (state.rosterMode === 'favorites') {
      filtered = filtered.filter((agent) => state.favoriteIds.includes(agent.id));
    }

    if (state.mapRegionFilter) {
      filtered = filtered.filter((agent) => {
        const region = agent.profile?.originRegion || getRegionForCountryCode(agent.profile?.origin);
        return region === state.mapRegionFilter;
      });
    }

    const sorted = sortAgentsForRoster(filtered);
    return sorted.sort((left, right) => {
      const leftFav = state.favoriteIds.includes(left.id) ? 1 : 0;
      const rightFav = state.favoriteIds.includes(right.id) ? 1 : 0;
      return rightFav - leftFav;
    });
  }

  function renderWorldTick(state) {
    elements.worldTick.textContent = formatDateDDMMYYYY(state.currentDate);
  }

  function renderAliveCount(state) {
    elements.aliveCount.textContent = countActiveAgents(state.agents);
  }

  function renderRoster(state) {
    const rosterAgents = getRosterAgents(state);
    const nextOrder = rosterAgents.map((agent) => agent.id);
    const orderChanged = nextOrder.length !== lastRosterOrder.length
      || nextOrder.some((id, index) => id !== lastRosterOrder[index]);

    if (orderChanged) {
      elements.roster.innerHTML = '';
      rosterAgents.forEach((agent) => {
        const card = document.createElement('div');
        card.dataset.agentId = agent.id;
        elements.roster.appendChild(card);
      });
      lastRosterOrder = nextOrder;
    }

    rosterAgents.forEach((agent, index) => {
      const card = elements.roster.children[index];
      const heatWidth = Math.min(100, agent.heat);
      const stageLabel = getStageLabel(agent.stage);
      const rankThreat = getRankThreatPresentation(agent);
      const enemyBadge = agent.alignment === 'enemy' ? '<span class="enemy-badge">ENEMY</span>' : '';
      const favoriteBadge = getFavoriteBadge(agent, state.favoriteIds);
      const appendageSummary = getAppendageSummary(agent);
      const appendageMeta = appendageSummary.short;
      const className = `agent-card${agent.alignment === 'enemy' ? ' enemy-card' : ''}${agent.id === state.selectedId ? ' selected' : ''}`;
      const statusLabel = getStatusLabel(agent.status);
      const content = `
        <div class="agent-name">
          <span class="status-dot ${getStatusDotClass(agent.status)}"></span>
          ${agent.name}
          ${favoriteBadge}
          ${enemyBadge}
          <span class="rank-badge ${getRankClass(agent)}" style="margin-left:auto">${getRankLabel(agent)}</span>
        </div>
        <div class="agent-meta">${stageLabel} · status: ${statusLabel.toUpperCase()} · appendages: ${appendageMeta.toUpperCase()} · ${(agent.alignment === 'enemy' ? 'ENEMY' : 'GLORIA')} · ${rankThreat.label.toLowerCase()}: ${rankThreat.value} · ${agent.profile.age}Y · ${agent.kills}K / ${agent.failures}F · contracts: ${agent.contracts} · xp: ${(agent.experience ?? 0).toFixed(1)} · tier: ${agent.lastMissionTier ?? '-'}</div>
        <div class="stat-bar">
          <div class="stat-fill" style="width:${heatWidth}%;background:${getHeatColor(agent.heat)}"></div>
        </div>
      `;

      if (card.className !== className) {
        card.className = className;
      }

      if (card.innerHTML !== content) {
        card.innerHTML = content;
      }
    });

    elements.rosterModeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.rosterMode === state.rosterMode);
    });

    elements.traineeAgeFilter.disabled = state.rosterMode !== 'trainees';
    elements.traineeAgeFilter.value = state.traineeAgeFilter;
  }

  function renderScene(state) {
    const agent = state.agents.find((entry) => entry.id === state.selectedId);
    const sceneAgent = agent
      ? {
        ...agent,
        isFavorite: state.favoriteIds.includes(agent.id),
      }
      : null;

    const nextSceneMarkup = sceneAgent ? renderSceneMarkup(sceneAgent, state.debugUnlocked) : renderEmptyScene();
    if (nextSceneMarkup !== lastSceneMarkup) {
      elements.sceneView.innerHTML = nextSceneMarkup;
      lastSceneMarkup = nextSceneMarkup;
    }

    const favoriteButton = elements.sceneView.querySelector('.favorite-btn');
    if (favoriteButton) {
      favoriteButton.addEventListener('click', () => {
        handlers.toggleFavorite(favoriteButton.dataset.agentId);
      });
    }
  }

  function renderWorldFeed(state) {
    const nextWorldFeedMarkup = state.worldEvents.map(renderWorldEvent).join('');
    if (nextWorldFeedMarkup !== lastWorldFeedMarkup) {
      elements.worldFeed.innerHTML = nextWorldFeedMarkup;
      lastWorldFeedMarkup = nextWorldFeedMarkup;
    }
  }

  function renderWorldMap(state) {
    const regions = getRegionLabels();
    const activeAgents = state.agents.filter((agent) => !isInactive(agent.status));
    const total = Math.max(1, activeAgents.length);
    const counts = {};

    regions.forEach((region) => {
      counts[region] = 0;
    });

    activeAgents.forEach((agent) => {
      const region = agent.profile?.originRegion || getRegionForCountryCode(agent.profile?.origin);
      counts[region] = (counts[region] ?? 0) + 1;
    });

    const rows = regions.map((region) => {
      const count = counts[region] ?? 0;
      const percent = Math.round((count / total) * 100);
      return `
        <div class="map-region-row">
          <div class="map-region-head">
            <span>${region}</span>
            <span>${count} (${percent}%)</span>
          </div>
          ${renderBar(percent, 'var(--blue)')}
        </div>
      `;
    }).join('');

    elements.worldMap.innerHTML = `
      <div class="world-map-title">Global Distribution (Active)</div>
      ${rows}
    `;
  }

  function renderApostlePanel(state) {
    const seats = Object.values(state.apostleSeats || {});
    const cards = seats.map((seat) => {
      const historyItems = (seat.history || [])
        .slice(0, 3)
        .map((entry) => `<div class="apostle-history-item">T-${padTick(entry.tick)} · ${entry.text}</div>`)
        .join('') || '<div class="apostle-history-item apostle-history-empty">No succession history.</div>';

      return `
        <div class="apostle-seat-card">
          <div class="apostle-seat-head">
            <span class="apostle-seat-sign">${seat.sign}</span>
            <span class="apostle-seat-holder">${seat.holderName || 'VACANT'}</span>
          </div>
          <div class="apostle-seat-disciple">Disciple: ${seat.discipleName || 'UNASSIGNED'}</div>
          <div class="apostle-seat-history">${historyItems}</div>
        </div>
      `;
    }).join('');

    elements.apostlePanel.innerHTML = `
      <div class="world-map-title">Twelve Zodiac Seats</div>
      <div class="apostle-seat-grid">${cards}</div>
    `;
  }

  function renderRightPanelMode(state) {
    const mode = state.rightPanelMode;
    elements.worldFeed.style.display = mode === 'feed' ? 'block' : 'none';
    elements.worldMap.style.display = mode === 'map' ? 'block' : 'none';
    elements.apostlePanel.style.display = mode === 'apostles' ? 'block' : 'none';

    elements.rightPanelModeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.rightPanelMode === state.rightPanelMode);
    });
  }

  function renderControls(state) {
    elements.pauseButton.textContent = state.paused ? 'RESUME' : 'PAUSE';
    elements.pauseButton.classList.toggle('active', state.paused);
    elements.speedLabel.textContent = `${state.speed}×`;

    elements.speedButtons.forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.speed) === state.speed);
    });

    elements.debugStatus.textContent = state.debugStatusText;
    elements.debugStatus.classList.toggle('unlocked', state.debugUnlocked);
  }

  function renderIntakeStats(state) {
    const stats = state.intakeStats;
    elements.intakeYear.textContent = stats.year;
    elements.intakeCount.textContent = stats.count;
    elements.intakeDied.textContent = stats.diedInTrial;
    elements.intakePassed.textContent = stats.passedToTrainee;
  }

  function renderApp(state) {
    renderWorldTick(state);
    renderAliveCount(state);
    renderRoster(state);
    renderScene(state);
    renderWorldFeed(state);
    renderWorldMap(state);
    renderApostlePanel(state);
    renderRightPanelMode(state);
    renderIntakeStats(state);
    renderControls(state);
  }

  return { renderApp };
}
