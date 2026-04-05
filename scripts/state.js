import { DEFAULT_SPEED, ZODIAC_SIGNS } from './data.js';

function createApostleSeatsState() {
  return ZODIAC_SIGNS.reduce((accumulator, sign) => {
    accumulator[sign] = {
      sign,
      holderId: null,
      holderName: 'VACANT',
      discipleId: null,
      discipleName: 'UNASSIGNED',
      history: [],
    };
    return accumulator;
  }, {});
}

export function createState() {
  const currentDate = new Date(2000, 0, 1);

  return {
    agents: [],
    worldEvents: [],
    worldTick: 0,
    selectedId: null,
    paused: false,
    speed: DEFAULT_SPEED,
    tickInterval: null,
    rosterMode: 'all',
    rightPanelMode: 'feed',
    mapRegionFilter: null,
    traineeAgeFilter: 'all',
    favoriteIds: [],
    currentDate,
    lastIntakeYear: null,
    intakeStats: {
      year: currentDate.getFullYear(),
      count: 0,
      diedInTrial: 0,
      passedToTrainee: 0,
    },
    debugUnlocked: false,
    debugStatusText: 'LOCKED',
    apostleSeats: createApostleSeatsState(),
  };
}
