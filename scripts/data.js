export const FIRST_NAMES = [
  'Pietro', 'Mara', 'Jakub', 'Yuen', 'Sable', 'Reva', 'Dax', 'Irina', 'Coen', 'Nadia',
  'Felix', 'Zara', 'Orion', 'Lena', 'Theo', 'Vashti', 'Rook', 'Sana', 'Idris', 'Kael',
];

export const LAST_NAMES = [
  'Moreau', 'Voss', 'Nakamura', 'Delacroix', 'Osei', 'Krenz', 'Reyes', 'Tanaka', 'Ferrara', 'Ibarra',
  'Wolff', 'Laing', 'Bauer', 'Solis', 'Cho', 'Mirza', 'Vasquez', 'Ito', 'Nkosi', 'Larsen',
];

export const RANKS = ['D RANK', 'C RANK', 'B RANK', 'A RANK', 'APOSTLE'];
export const RANK_CLASS = ['rank-recruit', 'rank-operative', 'rank-shadow', 'rank-ghost', 'rank-legend'];
export const STAT_LEVEL_START_BANDS = {
  CHILD: [1, 8],
  TRAINEE: [8, 26],
  D: [16, 38],
  C: [22, 48],
  B: [30, 58],
  A: [42, 72],
  APOSTLE: [62, 90],
};
export const ZODIAC_SIGNS = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
];

export const STATUS = {
  ALIVE: 'alive',
  STRUGGLING: 'struggling',
  CRITICAL: 'critical',
  DEAD: 'dead',
  RETIRED: 'retired',
  WASHED: 'washed',
};

export const LIFE_STAGES = {
  CHILD: 'child',
  TRAINEE: 'trainee',
  OPERATIVE: 'operative',
};

export const MISSION_TIERS = {
  D: {
    key: 'D',
    label: 'D-TIER PROBATION',
    contractChance: 0.44,
    heatMultiplier: 0.85,
    deathMultiplier: 0.78,
    experienceMultiplier: 0.9,
    allowedCategories: ['travel', 'surveillance', 'intrigue'],
  },
  C: {
    key: 'C',
    label: 'C-TIER FIELD',
    contractChance: 0.41,
    heatMultiplier: 1,
    deathMultiplier: 1,
    experienceMultiplier: 1,
    allowedCategories: ['travel', 'surveillance', 'intrigue', 'extraction'],
  },
  B: {
    key: 'B',
    label: 'B-TIER CONFLICT',
    contractChance: 0.39,
    heatMultiplier: 1.15,
    deathMultiplier: 1.2,
    experienceMultiplier: 1.15,
    allowedCategories: ['surveillance', 'intrigue', 'extraction', 'elimination'],
  },
  A: {
    key: 'A',
    label: 'A-TIER NATIONAL',
    contractChance: 0.37,
    heatMultiplier: 1.35,
    deathMultiplier: 1.45,
    experienceMultiplier: 1.3,
    allowedCategories: ['intrigue', 'extraction', 'elimination'],
  },
  S: {
    key: 'S',
    label: 'S-TIER APOSTLE',
    contractChance: 0.33,
    heatMultiplier: 1.2,
    deathMultiplier: 1.12,
    experienceMultiplier: 1.45,
    allowedCategories: ['surveillance', 'intrigue', 'extraction', 'elimination'],
  },
};

export const MISSION_TIER_BY_RANK = {
  0: MISSION_TIERS.D,
  1: MISSION_TIERS.C,
  2: MISSION_TIERS.B,
  3: MISSION_TIERS.A,
  4: MISSION_TIERS.S,
};

export const CONTRACT_EVENTS = [
  {
    id: 'courier_tail',
    category: 'surveillance',
    primaryTrait: 'decisionMaking',
    secondaryTrait: 'awareness',
    primaryStats: ['perception', 'discipline', 'intelligence'],
    baseHeat: 5,
    killOnSuccess: false,
    tags: ['deception', 'highPressure'],
    outcomes: {
      clean: {
        text: 'tailed a courier through the lower wards, lifted the dossier, and vanished before the handoff clocked them',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: -2,
      },
      success: {
        text: 'tracked a courier long enough to map the route and left with usable names',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 0,
      },
      compromised: {
        text: 'stayed on a courier too long and had to break off with eyes turning toward them',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 5,
      },
      failure: {
        text: 'lost a courier in a crowd and left their face with the wrong people',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 9,
      },
    },
  },
  {
    id: 'safehouse_watch',
    category: 'surveillance',
    primaryTrait: 'awareness',
    secondaryTrait: 'decisionMaking',
    primaryStats: ['perception', 'discipline', 'dexterity'],
    baseHeat: 6,
    killOnSuccess: true,
    tags: ['deception', 'stealth'],
    outcomes: {
      clean: {
        text: 'watched a safehouse until the rhythm broke, then removed the outer sentry without a sound',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: -1,
      },
      success: {
        text: 'held a patient watch on a safehouse and dropped the watcher on the late shift',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 1,
      },
      compromised: {
        text: 'got impatient outside a safehouse and left a body in the wrong place',
        type: 'critical',
        killDelta: 1,
        failureDelta: 1,
        heatDelta: 7,
      },
      failure: {
        text: 'lingered near a safehouse until the blinds moved back',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 10,
      },
    },
  },
  {
    id: 'river_extraction',
    category: 'extraction',
    primaryTrait: 'decisionMaking',
    secondaryTrait: 'grit',
    primaryStats: ['dexterity', 'discipline', 'instinct'],
    baseHeat: 7,
    killOnSuccess: true,
    tags: ['stealth', 'highPressure', 'risky'],
    outcomes: {
      clean: {
        text: 'pulled a bound asset out through the river channels and left two blockers floating facedown',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 0,
      },
      success: {
        text: 'forced an extraction through rain and concrete, leaving the pickup zone quiet enough to disappear',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 2,
      },
      compromised: {
        text: 'got the package moving but drew fire all the way to the river',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 8,
      },
      failure: {
        text: 'missed the extraction window and had to flee empty-handed',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 11,
      },
    },
  },
  {
    id: 'blackout_extraction',
    category: 'extraction',
    primaryTrait: 'awareness',
    secondaryTrait: 'decisionMaking',
    primaryStats: ['dexterity', 'perception', 'discipline'],
    baseHeat: 8,
    killOnSuccess: true,
    tags: ['deception', 'highPressure', 'risky'],
    outcomes: {
      clean: {
        text: 'cut the power on a holding site and walked the target out under the blackout',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: -1,
      },
      success: {
        text: 'got an asset loose during a district blackout and cleared the cordon',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 2,
      },
      compromised: {
        text: 'opened the way out, but the escape turned loud before they were clear',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 9,
      },
      failure: {
        text: 'hit the blackout timing wrong and the corridor sealed around them',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 12,
      },
    },
  },
  {
    id: 'mid_tier_enforcer',
    category: 'elimination',
    primaryTrait: 'lethality',
    secondaryTrait: 'awareness',
    primaryStats: ['strength', 'dexterity', 'instinct'],
    baseHeat: 8,
    killOnSuccess: true,
    tags: ['combat', 'violent', 'highPressure'],
    outcomes: {
      clean: {
        text: 'eliminated a mid-tier enforcer in a service hall and left the cameras blind',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 0,
      },
      success: {
        text: 'cut down a mid-tier enforcer and made the exit before the crew converged',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 3,
      },
      compromised: {
        text: 'put an enforcer down but wore half the district on the way out',
        type: 'critical',
        killDelta: 1,
        failureDelta: 1,
        heatDelta: 10,
      },
      failure: {
        text: 'went after a mid-tier enforcer and found more muscle than the brief promised',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 13,
      },
    },
  },
  {
    id: 'high_value_target',
    category: 'elimination',
    primaryTrait: 'lethality',
    secondaryTrait: 'decisionMaking',
    primaryStats: ['dexterity', 'agility', 'intelligence'],
    baseHeat: 10,
    killOnSuccess: true,
    tags: ['stealth', 'combat', 'violent', 'highPressure'],
    outcomes: {
      clean: {
        text: 'neutralised a high-value target silently and left the room looking untouched',
        type: 'milestone',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 1,
      },
      success: {
        text: 'put a high-value target down and cleared the building before the panic settled',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: 4,
      },
      compromised: {
        text: 'got the target, but the corridor filled with alarms before the exit line opened',
        type: 'critical',
        killDelta: 1,
        failureDelta: 1,
        heatDelta: 11,
      },
      failure: {
        text: 'closed on a high-value target and watched the room collapse into a trap',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 14,
      },
    },
  },
  {
    id: 'border_run',
    category: 'travel',
    primaryTrait: 'awareness',
    secondaryTrait: 'grit',
    primaryStats: ['perception', 'instinct', 'endurance'],
    baseHeat: 5,
    killOnSuccess: false,
    tags: ['risky', 'highPressure'],
    outcomes: {
      clean: {
        text: 'crossed a hostile checkpoint line under false papers and never had to draw',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: -2,
      },
      success: {
        text: 'made it across hostile territory before the search tightened',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 1,
      },
      compromised: {
        text: 'cleared the line, but not before a patrol started asking useful questions',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 6,
      },
      failure: {
        text: 'was nearly caught crossing the border and had to burn the route',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 10,
      },
    },
  },
  {
    id: 'rail_crossing',
    category: 'travel',
    primaryTrait: 'decisionMaking',
    secondaryTrait: 'awareness',
    primaryStats: ['instinct', 'discipline', 'endurance'],
    baseHeat: 5,
    killOnSuccess: false,
    tags: ['risky', 'deception'],
    outcomes: {
      clean: {
        text: 'rode a freight corridor between families and slipped past the inspection teams unseen',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: -2,
      },
      success: {
        text: 'crossed a contested rail line with only a few close calls',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 1,
      },
      compromised: {
        text: 'made the crossing, but the manifest now points back to them',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 6,
      },
      failure: {
        text: 'got pinned between inspections and had to abandon half the route',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 9,
      },
    },
  },
  {
    id: 'broker_contact',
    category: 'intrigue',
    primaryTrait: 'decisionMaking',
    secondaryTrait: 'awareness',
    primaryStats: ['intelligence', 'discipline', 'perception'],
    baseHeat: 4,
    killOnSuccess: false,
    tags: ['deception', 'highPressure'],
    outcomes: {
      clean: {
        text: 'made contact with a shadow broker, bought the names, and left the table colder than they found it',
        type: 'milestone',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 0,
      },
      success: {
        text: 'met a shadow broker and came away with a workable line into the next job',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 1,
      },
      compromised: {
        text: 'pressed a broker too hard and left with information that now wants something back',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 6,
      },
      failure: {
        text: 'walked into a broker meeting that smelled wrong too late',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 9,
      },
    },
  },
  {
    id: 'informant_turn',
    category: 'intrigue',
    primaryTrait: 'decisionMaking',
    secondaryTrait: 'grit',
    primaryStats: ['intelligence', 'discipline', 'instinct'],
    baseHeat: 4,
    killOnSuccess: true,
    tags: ['deception', 'stealth'],
    outcomes: {
      clean: {
        text: 'turned a low-level informant and quietly erased the handler watching the meet',
        type: 'success',
        killDelta: 1,
        failureDelta: 0,
        heatDelta: -1,
      },
      success: {
        text: 'recruited a low-level informant and left the exchange with leverage intact',
        type: 'info',
        killDelta: 0,
        failureDelta: 0,
        heatDelta: 1,
      },
      compromised: {
        text: 'leaned on an informant too hard and left the conversation with a tail',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 6,
      },
      failure: {
        text: 'went to turn an informant and found the meet already sold out',
        type: 'critical',
        killDelta: 0,
        failureDelta: 1,
        heatDelta: 9,
      },
    },
  },
];

export const DEATH_EVENTS = [
  'was found three days later - no witnesses, no trace',
  'walked into an ambush with no exit',
  'was betrayed by their own handler',
  'suffered fatal wounds completing a contract that was not worth it',
  'disappeared after crossing the wrong family',
  'was eliminated by a rival with a longer memory',
];

export const RETIRE_EVENTS = [
  'quietly stepped back. A bookshop, somewhere cold.',
  'left the life after one contract too many.',
  'vanished into anonymity. The club lost track.',
  'bought silence with gold and ghosts.',
];

export const PHYSICAL_STATS = [
  ['Strength', 'strength'],
  ['Agility', 'agility'],
  ['Endurance', 'endurance'],
  ['Resilience', 'resilience'],
  ['Dexterity', 'dexterity'],
];

export const MENTAL_STATS = [
  ['Intelligence', 'intelligence'],
  ['Perception', 'perception'],
  ['Discipline', 'discipline'],
  ['Instinct', 'instinct'],
];

export const INITIAL_AGENT_COUNT = 6;
export const MAX_ACTIVE_AGENTS = 24;
export const MIN_ACTIVE_AGENTS = 22;
export const DEFAULT_SPEED = 5;
export const LOG_LIMIT = 40;
export const WORLD_EVENT_LIMIT = 60;
