export interface Driver {
  id: number;
  firstName: string;
  surname: string;
  nationality: string;
  nationalityCode: string;
  dateOfBirth: string;
  dateOfDeath: string | null;
  carNo: string | null;
  indyOnly: boolean;
  current: boolean;
}

export interface DriverStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
  seasons: number;
  firstRace: number;
  lastRace: number;
  firstRaceTitle?: string | null;
  lastRaceTitle?: string | null;
}

export interface Constructor {
  id: number;
  name: string;
  shortName: string;
  nationality: string;
  nationalityCode: string;
  indyOnly: boolean;
  current: boolean;
}

export interface ConstructorStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  firstSeason: number;
  lastSeason: number;
  drivers: number;
}

export interface Race {
  id: number;
  date: string;
  shortTitle: string;
  fullTitle: string | null;
  laps: number;
  sprint: number | null;
  circuit: string;
  circuitCity: string;
  country: string;
}

export interface RaceResult {
  position: number;
  place: string;
  grid: string | null;
  driverId: number;
  driverName: string;
  constructor: string;
  constructorId: number;
  time: string | null;
  points: number;
  lapsLed: number | null;
}

export interface SeasonStanding {
  pos: number;
  driverId: number;
  name: string;
  constructor: string;
  constructorId: number;
  points: number;
  wins: number;
  podiums: number;
}

export interface ConstructorStanding {
  pos: number;
  constructorId: number;
  name: string;
  points: number;
  wins: number;
}

export interface TeammateComparison {
  driverAId: number;
  driverAName: string;
  driverBId: number;
  driverBName: string;
  sharedSeasons: SharedSeason[];
}

export interface SharedSeason {
  year: number;
  constructor: string;
  constructorId: number;
  aRaces: number;
  aWins: number;
  aPodiums: number;
  aPoints: number;
  aQualiAhead: number;
  aBestFinish: number | null;
  bRaces: number;
  bWins: number;
  bPodiums: number;
  bPoints: number;
  bQualiAhead: number;
  bBestFinish: number | null;
}
