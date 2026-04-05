import { deriveTraits } from './traits.js';

function getExperienceModifier(agent) {
  const experience = agent.experience ?? 0;
  return 1 + (Math.log10(experience + 1) * 0.25);
}

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

function applyWorldTone(agent, event, text) {
  const district = agent.profile?.district || 'Outer Ward';
  const faction = agent.profile?.faction || 'Unattributed Cell';

  if (event.category === 'surveillance') {
    return `${text} in ${district}, under ${faction} pressure`;
  }

  if (event.category === 'intrigue') {
    return `${text} while trading leverage against ${faction}`;
  }

  if (event.category === 'extraction') {
    return `${text} through ${district} with ${faction} eyes on every corner`;
  }

  if (event.category === 'elimination') {
    return `${text} inside ${district}, where ${faction} keeps score`;
  }

  if (event.category === 'travel') {
    return `${text} across ${district} lanes claimed by ${faction}`;
  }

  return `${text} near ${district}, on ${faction} turf`;
}

export function evaluateContractEvent(agent, event, rng = Math.random) {
  const traits = deriveTraits(agent.stats);
  const traitLabels = Array.isArray(agent.traits) ? agent.traits : [];
  const expMod = getExperienceModifier(agent);
  const primaryTrait = traits[event.primaryTrait];
  const secondaryTrait = traits[event.secondaryTrait];
  const statAverage = averageStatScore(agent.stats, event.primaryStats);
  const effectiveDiscipline = agent.stats.discipline * expMod;
  const effectiveInstinct = agent.stats.instinct * expMod;

  let score = ((primaryTrait * 0.45) + (secondaryTrait * 0.25) + (statAverage * 0.20) + (rng() * 0.10)) * expMod;
  let bonusHeat = 0;
  let precisionUpgrade = false;
  let disciplineSlip = false;
  let overthinking = false;
  let volatileSwing = 0;

  if (traitLabels.includes('Tactical Genius')) {
    score += 0.08;
  }

  if (traitLabels.includes('Unstable')) {
    score += (rng() - 0.5) * 0.16;
    bonusHeat += 3;
  }

  if (agent.rank === 4) {
    score += 0.07;
    bonusHeat += 6;
  }

  const isDeceptionStyle = event.category === 'surveillance'
    || event.category === 'extraction'
    || hasTag(event, 'deception');

  if (effectiveDiscipline < 40 && isDeceptionStyle) {
    score -= 0.08;
    bonusHeat += 4;
    disciplineSlip = true;
  }

  if (agent.stats.intelligence > 70 && effectiveInstinct < 45 && hasTag(event, 'highPressure')) {
    score -= 0.06;
    overthinking = true;
  }

  if (effectiveInstinct > 70 && effectiveDiscipline < 45 && hasTag(event, 'risky')) {
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
      text: applyWorldTone(agent, event, decorateOutcomeText(outcome.text, notes)),
    },
  };
}
