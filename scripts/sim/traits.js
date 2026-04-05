function clampStat(value) {
  return Math.max(0, Math.min(100, value));
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function generateTraitLabels(stats, rng = Math.random) {
  const s = {
    strength: clampStat(stats.strength),
    agility: clampStat(stats.agility),
    endurance: clampStat(stats.endurance),
    resilience: clampStat(stats.resilience),
    dexterity: clampStat(stats.dexterity),
    intelligence: clampStat(stats.intelligence),
    perception: clampStat(stats.perception),
    discipline: clampStat(stats.discipline),
    instinct: clampStat(stats.instinct),
  };
  const traits = [];
  const values = Object.values(s);
  const avg = average(values);
  const peak = Math.max(...values);

  if (peak >= 96 && rng() < 0.08) {
    traits.push('Prodigy');
  }

  if (avg >= 88 && rng() < 0.12) {
    traits.push('Elite Potential');
  }

  if (avg < 34 && rng() < 0.2) {
    traits.push('Fragile');
  }

  if (s.discipline < 32 && s.instinct > 85 && rng() < 0.25) {
    traits.push('Unstable');
  }

  if (s.intelligence > 88 && s.instinct > 82 && rng() < 0.2) {
    traits.push('Tactical Genius');
  }

  if (s.perception > 93 && rng() < 0.18) {
    traits.push('Hyper-Aware');
  }

  if (s.dexterity > 93 && rng() < 0.18) {
    traits.push('Dead Hands');
  }

  if (s.resilience > 93 && rng() < 0.18) {
    traits.push('Iron Body');
  }

  if (peak > 98 && avg > 90 && rng() < 0.04) {
    traits.push('Anomaly');
  }

  return traits;
}

export function refreshAgentTraits(agent, rng = Math.random) {
  const generatedTraits = generateTraitLabels(agent.stats, rng);
  const existingTraits = Array.isArray(agent.traits) ? agent.traits : [];
  const nextTraits = Array.from(new Set([...existingTraits, ...generatedTraits]));

  if (agent.rank === 4 && !nextTraits.includes('Apostle')) {
    nextTraits.push('Apostle');
  }

  agent.traits = nextTraits;
  return nextTraits;
}

export function deriveTraits(stats) {
  const strength = clampStat(stats.strength);
  const agility = clampStat(stats.agility);
  const endurance = clampStat(stats.endurance);
  const resilience = clampStat(stats.resilience);
  const dexterity = clampStat(stats.dexterity);
  const intelligence = clampStat(stats.intelligence);
  const perception = clampStat(stats.perception);
  const discipline = clampStat(stats.discipline);
  const instinct = clampStat(stats.instinct);

  return {
    grit: (resilience + discipline + endurance) / 300,
    lethality: ((strength * 0.35) + (dexterity * 0.35) + (agility * 0.15) + (instinct * 0.15)) / 100,
    awareness: ((perception * 0.55) + (instinct * 0.25) + (intelligence * 0.20)) / 100,
    decisionMaking: ((intelligence * 0.60) + (instinct * 0.40)) / 100,
  };
}
