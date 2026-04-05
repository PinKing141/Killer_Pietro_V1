const REGION_ORIGINS = {
  'North America': ['US', 'CA', 'MX'],
  'South America': ['BR', 'AR', 'CO', 'CL', 'PE'],
  Europe: ['GB', 'FR', 'DE', 'IT', 'ES', 'PL', 'SE'],
  'Africa & Middle East': ['ZA', 'NG', 'EG', 'KE', 'SA', 'AE', 'IL'],
  'South & East Asia': ['CN', 'JP', 'KR', 'IN', 'TH', 'VN', 'ID', 'PH'],
  'North & Central Asia': ['RU', 'KZ', 'MN', 'UZ'],
  Oceania: ['AU', 'NZ', 'PG'],
};

const REGION_FACTIONS = {
  'North America': ['Iron Communion', 'Palisade Circle', 'Bleakwater Syndicate'],
  'South America': ['Cordillera Pact', 'Sable Current', 'Morrow Saints'],
  Europe: ['Ash Concordat', 'Velvet Directorate', 'Hollow Ledger'],
  'Africa & Middle East': ['Obsidian Caravan', 'Red Salt Assembly', 'Cinder Meridian'],
  'South & East Asia': ['Jade Corridor', 'Nine Lantern Compact', 'Black Lotus Bureau'],
  'North & Central Asia': ['Winter Cartel', 'Steppe Tribunal', 'Coal Meridian'],
  Oceania: ['Driftline Accord', 'South Wake Union', 'Reef Authority'],
  Unknown: ['Unattributed Cell'],
};

const REGION_DISTRICTS = {
  'North America': ['Gravesend Dockline', 'Mercer Undergrid', 'Bleak Exchange'],
  'South America': ['San Telmo Maze', 'Cordillera Fringe', 'Floodplain Circle'],
  Europe: ['Glass Market', 'Old Quarter Narrows', 'Grey Spire District'],
  'Africa & Middle East': ['Dust Gate', 'Red Dhow Basin', 'Ember Medina'],
  'South & East Asia': ['Neon Ward', 'Canal Spine', 'Harbor Silk District'],
  'North & Central Asia': ['Rail Crown', 'Steppe Terminal', 'Cold Lantern Quarter'],
  Oceania: ['Breaker Ring', 'South Port Cut', 'Coral Railyard'],
  Unknown: ['Outer Ward'],
};

const REGIONS = Object.keys(REGION_ORIGINS);
const ORIGIN_POOL = Object.entries(REGION_ORIGINS)
  .flatMap(([region, codes]) => codes.map((code) => ({ region, code })));

export function pickRandomOrigin(rng = Math.random) {
  const index = Math.floor(rng() * ORIGIN_POOL.length);
  const selected = ORIGIN_POOL[index];
  return {
    countryCode: selected.code,
    region: selected.region,
  };
}

export function getRegionForCountryCode(countryCode) {
  const normalized = String(countryCode || '').toUpperCase();

  for (const [region, codes] of Object.entries(REGION_ORIGINS)) {
    if (codes.includes(normalized)) {
      return region;
    }
  }

  return 'Unknown';
}

export function getRegionLabels() {
  return [...REGIONS, 'Unknown'];
}

export function pickFactionForRegion(region, rng = Math.random) {
  const pool = REGION_FACTIONS[region] ?? REGION_FACTIONS.Unknown;
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

export function pickDistrictForRegion(region, rng = Math.random) {
  const pool = REGION_DISTRICTS[region] ?? REGION_DISTRICTS.Unknown;
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}
