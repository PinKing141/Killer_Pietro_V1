import { deriveTraits } from './traits.js';

function averageStatScore(stats, keys) {
  const total = keys.reduce((sum, key) => sum + stats[key], 0);
  return total / keys.length / 100;
}

function clampScore(score) {
  return Math.max(0, Math.min(0.99, score));
}

function hasTag(event, tag) {
  return Array.isArray(event.tags) && event.tags.includes(tag);
}

function getOutcomeKey(score) {
  if (score >= 0.75) {
    return 'clean';
  }

  if (score >= 0.58) {
    return 'success';
  }

  if (score >= 0.42) {
    return 'compromised';
  }

  return 'failure';
}

function getProfileNotes(agent, event, signals) {
  const notes = [];

  if (signals.disciplineSlip && (signals.outcomeKey === 'compromised' || signals.outcomeKey === 'failure')) {
    notes.push('moving too fast to close every seam');
  }

  if (signals.precisionUpgrade || (agent.stats.dexterity > 70 && signals.outcomeKey === 'clean' && (hasTag(event, 'stealth') || hasTag(event, 'combat')))) {
    notes.push('precise enough that the scene stayed almost witness-free');
  }

  if (signals.overthinking) {
    notes.push('after spending one beat too long on the read');
  }

  if (signals.volatileSwing > 0.01) {
    notes.push('on an instinctive call that landed harder than it should have');
  }

  if (signals.volatileSwing < -0.01) {
    notes.push('after trusting a reckless read over the safer line');
  }

  return notes;
}

function decorateOutcomeText(baseText, notes) {
  if (!notes.length) {
    return baseText;
  }

  return `${baseText}, ${notes.join(', ')}`;
}

export function evaluateContractEvent(agent, event, rng = Math.random) {
  const traits = deriveTraits(agent.stats);
  const primaryTrait = traits[event.primaryTrait];
  const secondaryTrait = traits[event.secondaryTrait];
  const statAverage = averageStatScore(agent.stats, event.primaryStats);

  let score = (primaryTrait * 0.45) + (secondaryTrait * 0.25) + (statAverage * 0.20) + (rng() * 0.10);
  let bonusHeat = 0;
  let precisionUpgrade = false;
  let disciplineSlip = false;
  let overthinking = false;
  let volatileSwing = 0;

  const isDeceptionStyle = event.category === 'surveillance'
    || event.category === 'extraction'
    || hasTag(event, 'deception');

  if (agent.stats.discipline < 40 && isDeceptionStyle) {
    score -= 0.08;
    bonusHeat += 4;
    disciplineSlip = true;
  }

  if (agent.stats.intelligence > 70 && agent.stats.instinct < 45 && hasTag(event, 'highPressure')) {
    score -= 0.06;
    overthinking = true;
  }

  if (agent.stats.instinct > 70 && agent.stats.discipline < 45 && hasTag(event, 'risky')) {
    volatileSwing = (rng() - 0.5) * 0.24;
    score += volatileSwing;
  }

  score = clampScore(score);

  let outcomeKey = getOutcomeKey(score);

  if (
    outcomeKey === 'success'
    && agent.stats.dexterity > 70
    && (hasTag(event, 'stealth') || hasTag(event, 'combat'))
  ) {
    outcomeKey = 'clean';
    precisionUpgrade = true;
  }

  const outcome = event.outcomes[outcomeKey];

  if (agent.stats.strength > 70 && hasTag(event, 'violent') && (outcomeKey === 'clean' || outcomeKey === 'success')) {
    bonusHeat += 3;
  }

  const notes = getProfileNotes(agent, event, {
    disciplineSlip,
    outcomeKey,
    overthinking,
    precisionUpgrade,
    volatileSwing,
  });

  return {
    eventId: event.id,
    eventCategory: event.category,
    outcomeKey,
    score,
    traits,
    heatDelta: Math.max(0, event.baseHeat + outcome.heatDelta + bonusHeat),
    outcome: {
      ...outcome,
      text: decorateOutcomeText(outcome.text, notes),
    },
  };
}
