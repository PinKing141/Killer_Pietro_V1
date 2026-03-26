function clampStat(value) {
  return Math.max(0, Math.min(100, value));
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
