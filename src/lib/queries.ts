import { query } from "./db";
import type {
  Driver, DriverStats, Constructor, ConstructorStats,
  Race, RaceResult, SeasonStanding, ConstructorStanding,
} from "./types";

// ─── Points helpers ────────────────────────────────────────────────────────────
// Replicates PHP StandingsController::calcPoints era logic

function racePts(r = "r", gp = "gp") {
  return `CASE
    WHEN ${r}.fullPointsDriver = 0 THEN ${r}.actualPointsDriver
    WHEN YEAR(${gp}.date) >= 2010 THEN
      CASE ${r}.position WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
        WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2 WHEN 10 THEN 1 ELSE 0 END
    WHEN YEAR(${gp}.date) >= 2003 THEN
      CASE ${r}.position WHEN 1 THEN 10 WHEN 2 THEN 8 WHEN 3 THEN 6 WHEN 4 THEN 5
        WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1 ELSE 0 END
    WHEN YEAR(${gp}.date) >= 1991 THEN
      CASE ${r}.position WHEN 1 THEN 10 WHEN 2 THEN 6 WHEN 3 THEN 4
        WHEN 4 THEN 3 WHEN 5 THEN 2 WHEN 6 THEN 1 ELSE 0 END
    WHEN YEAR(${gp}.date) >= 1961 THEN
      CASE ${r}.position WHEN 1 THEN 9 WHEN 2 THEN 6 WHEN 3 THEN 4
        WHEN 4 THEN 3 WHEN 5 THEN 2 WHEN 6 THEN 1 ELSE 0 END
    WHEN YEAR(${gp}.date) = 1960 THEN
      CASE ${r}.position WHEN 1 THEN 8 WHEN 2 THEN 6 WHEN 3 THEN 4
        WHEN 4 THEN 3 WHEN 5 THEN 2 WHEN 6 THEN 1 ELSE 0 END
    ELSE
      CASE ${r}.position WHEN 1 THEN 8 WHEN 2 THEN 6 WHEN 3 THEN 4
        WHEN 4 THEN 3 WHEN 5 THEN 2 ELSE 0 END
  END`;
}

// +1 fastest lap bonus, only 2019-2024, top-10 finishers
function flBonus(r = "r", gp = "gp", fl = "fl") {
  return `CASE WHEN ${fl}.driver_id IS NOT NULL AND YEAR(${gp}.date) BETWEEN 2019 AND 2024
    AND ${r}.position BETWEEN 1 AND 10 THEN 1 ELSE 0 END`;
}

// Sprint points from LEFT JOIN sprints s; returns 0 when no sprint (s.position IS NULL)
function sprintPts(s = "s", gp = "gp") {
  return `CASE
    WHEN ${s}.actualPointsDriver > 0 THEN ${s}.actualPointsDriver
    WHEN YEAR(${gp}.date) >= 2022 THEN
      CASE ${s}.position WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
        WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1 ELSE 0 END
    WHEN YEAR(${gp}.date) = 2021 THEN
      CASE ${s}.position WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END
    ELSE 0
  END`;
}

function totalPts(r = "r", gp = "gp", fl = "fl", s = "s") {
  return `((${racePts(r, gp)}) + (${flBonus(r, gp, fl)}) + (${sprintPts(s, gp)}))`;
}

// 2026 points system applied uniformly to all historical results (no FL bonus, 2026-era sprint scale)
function racePts2026(r = "r") {
  return `CASE
    WHEN ${r}.fullPointsDriver = 0 THEN ${r}.actualPointsDriver
    ELSE CASE ${r}.position
      WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15 WHEN 4 THEN 12
      WHEN 5 THEN 10 WHEN 6 THEN 8 WHEN 7 THEN 6 WHEN 8 THEN 4
      WHEN 9 THEN 2 WHEN 10 THEN 1 ELSE 0
    END
  END`;
}

function sprintPts2026(s = "s") {
  return `CASE
    WHEN ${s}.actualPointsDriver > 0 THEN ${s}.actualPointsDriver
    WHEN ${s}.position IS NULL THEN 0
    ELSE CASE ${s}.position
      WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6 WHEN 4 THEN 5
      WHEN 5 THEN 4 WHEN 6 THEN 3 WHEN 7 THEN 2 WHEN 8 THEN 1 ELSE 0
    END
  END`;
}

// ─── Championships ────────────────────────────────────────────────────────────

// CTE that computes season totals applying the "best N results" drop rule (1950–1990).
// Without this, e.g. Prost outscores Senna in 1988 on raw points (105 vs 94) but
// Senna wins on best-11-of-16 (90 vs 87).
function seasonPtsCTE() {
  const rp = racePts();
  const fl = flBonus();
  const sp = sprintPts();
  return `
    race_pts AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, r.grandprix_id,
        ((${rp}) + (${fl}) + (${sp})) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    ),
    race_ranked AS (
      SELECT year, driver_id, pts,
        ROW_NUMBER() OVER (PARTITION BY year, driver_id ORDER BY pts DESC, grandprix_id ASC) AS rn
      FROM race_pts
    ),
    season_pts AS (
      SELECT year, driver_id,
        SUM(CASE WHEN rn <= CASE year
          WHEN 1950 THEN 4 WHEN 1951 THEN 4 WHEN 1952 THEN 4 WHEN 1953 THEN 4
          WHEN 1954 THEN 5 WHEN 1955 THEN 5 WHEN 1956 THEN 5 WHEN 1957 THEN 5
          WHEN 1958 THEN 6 WHEN 1959 THEN 5 WHEN 1960 THEN 6
          WHEN 1961 THEN 5 WHEN 1962 THEN 5 WHEN 1963 THEN 6 WHEN 1964 THEN 6
          WHEN 1965 THEN 6 WHEN 1966 THEN 5 WHEN 1967 THEN 9 WHEN 1968 THEN 9
          WHEN 1969 THEN 6 WHEN 1970 THEN 6 WHEN 1971 THEN 5 WHEN 1972 THEN 5
          WHEN 1973 THEN 7 WHEN 1974 THEN 7 WHEN 1975 THEN 7 WHEN 1976 THEN 7
          WHEN 1977 THEN 8 WHEN 1978 THEN 7 WHEN 1979 THEN 8 WHEN 1980 THEN 10
          WHEN 1981 THEN 11 WHEN 1982 THEN 11 WHEN 1983 THEN 11 WHEN 1984 THEN 11
          WHEN 1985 THEN 11 WHEN 1986 THEN 11 WHEN 1987 THEN 11 WHEN 1988 THEN 11
          WHEN 1989 THEN 11 WHEN 1990 THEN 11
          ELSE 999
        END THEN pts ELSE 0 END) AS pts
      FROM race_ranked
      GROUP BY year, driver_id
    )`;
}

export async function getAllChampionships(): Promise<{ driverId: number; championships: number }[]> {
  return query<{ driverId: number; championships: number }>(`
    WITH ${seasonPtsCTE()}
    SELECT sp.driver_id AS driverId, COUNT(*) AS championships
    FROM season_pts sp
    WHERE sp.pts = (SELECT MAX(pts) FROM season_pts sp2 WHERE sp2.year = sp.year)
      AND sp.year IN (
        SELECT YEAR(g.date) FROM grandsprix g GROUP BY YEAR(g.date) HAVING MAX(g.date) < CURDATE()
      )
    GROUP BY sp.driver_id
  `);
}

export async function getDriverChampionships(driverId: number): Promise<number> {
  const rp = racePts();
  const fl = flBonus();
  const sp = sprintPts();
  const rows = await query<{ championships: number }>(`
    WITH driver_years AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE r.driver_id = ?
    ),
    race_pts AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, r.grandprix_id,
        ((${rp}) + (${fl}) + (${sp})) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN driver_years dy ON YEAR(gp.date) = dy.year
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    ),
    race_ranked AS (
      SELECT year, driver_id, pts,
        ROW_NUMBER() OVER (PARTITION BY year, driver_id ORDER BY pts DESC, grandprix_id ASC) AS rn
      FROM race_pts
    ),
    season_pts AS (
      SELECT year, driver_id,
        SUM(CASE WHEN rn <= CASE year
          WHEN 1950 THEN 4 WHEN 1951 THEN 4 WHEN 1952 THEN 4 WHEN 1953 THEN 4
          WHEN 1954 THEN 5 WHEN 1955 THEN 5 WHEN 1956 THEN 5 WHEN 1957 THEN 5
          WHEN 1958 THEN 6 WHEN 1959 THEN 5 WHEN 1960 THEN 6
          WHEN 1961 THEN 5 WHEN 1962 THEN 5 WHEN 1963 THEN 6 WHEN 1964 THEN 6
          WHEN 1965 THEN 6 WHEN 1966 THEN 5 WHEN 1967 THEN 9 WHEN 1968 THEN 9
          WHEN 1969 THEN 6 WHEN 1970 THEN 6 WHEN 1971 THEN 5 WHEN 1972 THEN 5
          WHEN 1973 THEN 7 WHEN 1974 THEN 7 WHEN 1975 THEN 7 WHEN 1976 THEN 7
          WHEN 1977 THEN 8 WHEN 1978 THEN 7 WHEN 1979 THEN 8 WHEN 1980 THEN 10
          WHEN 1981 THEN 11 WHEN 1982 THEN 11 WHEN 1983 THEN 11 WHEN 1984 THEN 11
          WHEN 1985 THEN 11 WHEN 1986 THEN 11 WHEN 1987 THEN 11 WHEN 1988 THEN 11
          WHEN 1989 THEN 11 WHEN 1990 THEN 11
          ELSE 999
        END THEN pts ELSE 0 END) AS pts
      FROM race_ranked
      GROUP BY year, driver_id
    ),
    season_winners AS (
      SELECT sp.year, sp.driver_id
      FROM season_pts sp
      WHERE sp.pts = (SELECT MAX(pts) FROM season_pts sp2 WHERE sp2.year = sp.year)
        AND sp.year IN (
          SELECT YEAR(gp2.date) FROM grandsprix gp2 GROUP BY YEAR(gp2.date) HAVING MAX(gp2.date) < CURDATE()
        )
    )
    SELECT COUNT(*) AS championships
    FROM season_winners
    WHERE driver_id = ?
  `, [driverId, driverId]);
  return Number(rows[0]?.championships ?? 0);
}

export async function getDriverSeasonPositions(driverId: number): Promise<{ year: number; champPos: number }[]> {
  return query<{ year: number; champPos: number }>(`
    WITH driver_years AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE r.driver_id = ?
    ),
    season_pts AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${totalPts()}) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN driver_years dy ON YEAR(gp.date) = dy.year
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      GROUP BY YEAR(gp.date), r.driver_id
    ),
    ranked AS (
      SELECT year, driver_id,
        RANK() OVER (PARTITION BY year ORDER BY pts DESC) AS champPos
      FROM season_pts
    )
    SELECT year, CAST(champPos AS UNSIGNED) AS champPos
    FROM ranked
    WHERE driver_id = ?
    ORDER BY year DESC
  `, [driverId, driverId]);
}

// ─── Driver ranks & race results ──────────────────────────────────────────────

type DriverRanks = { racesRank: number; winsRank: number; podiumsRank: number; pointsRank: number; polesRank: number; fastestLapsRank: number };
let _ranksCache: Map<number, DriverRanks> | null = null;

async function _getAllDriverRanks(): Promise<Map<number, DriverRanks>> {
  if (_ranksCache) return _ranksCache;
  const rows = await query<{ driver_id: number } & DriverRanks>(`
    WITH driver_totals AS (
      SELECT
        r.driver_id,
        COUNT(DISTINCT r.grandprix_id) AS races,
        SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
        SUM(${totalPts()}) AS points,
        COUNT(fl.grandprix_id) AS fastestLaps,
        COUNT(CASE WHEN r.grid = '1' THEN pt.grandprix_id END) AS poles
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
      GROUP BY r.driver_id
    )
    SELECT
      driver_id,
      CAST(RANK() OVER (ORDER BY races DESC) AS UNSIGNED) AS racesRank,
      CAST(RANK() OVER (ORDER BY wins DESC) AS UNSIGNED) AS winsRank,
      CAST(RANK() OVER (ORDER BY podiums DESC) AS UNSIGNED) AS podiumsRank,
      CAST(RANK() OVER (ORDER BY points DESC) AS UNSIGNED) AS pointsRank,
      CAST(RANK() OVER (ORDER BY fastestLaps DESC) AS UNSIGNED) AS fastestLapsRank,
      CAST(RANK() OVER (ORDER BY poles DESC) AS UNSIGNED) AS polesRank
    FROM driver_totals
  `);
  _ranksCache = new Map(rows.map((r) => [r.driver_id, { racesRank: r.racesRank, winsRank: r.winsRank, podiumsRank: r.podiumsRank, pointsRank: r.pointsRank, polesRank: r.polesRank, fastestLapsRank: r.fastestLapsRank }]));
  return _ranksCache;
}

export async function getDriverRanks(driverId: number): Promise<DriverRanks> {
  const cache = await _getAllDriverRanks();
  return cache.get(driverId) ?? { racesRank: 0, winsRank: 0, podiumsRank: 0, pointsRank: 0, polesRank: 0, fastestLapsRank: 0 };
}

export async function getDriverRaceResults(driverId: number): Promise<{
  year: number; grandprixId: number; raceTitle: string; grid: string; place: string; points: number; hasFastestLap: boolean; constructorId: number; constructorName: string;
}[]> {
  const rp = racePts();
  const fl = flBonus();
  const sp = sprintPts();
  return query<{ year: number; grandprixId: number; raceTitle: string; grid: string; place: string; points: number; hasFastestLap: boolean; constructorId: number; constructorName: string }>(`
    SELECT
      YEAR(gp.date) AS year,
      gp.id AS grandprixId,
      CASE
        WHEN gp.shortTitle = 'Indianapolis 500' THEN 'Indianapolis 500'
        WHEN n.adjective = 'American' THEN 'United States Grand Prix'
        WHEN n.adjective IS NOT NULL THEN CONCAT(n.adjective, ' Grand Prix')
        WHEN gp.shortTitle IS NOT NULL AND gp.shortTitle != '' THEN CONCAT(gp.shortTitle, ' Grand Prix')
        ELSE 'Grand Prix'
      END AS raceTitle,
      r.grid,
      r.place,
      ((${rp}) + (${fl}) + (${sp})) AS points,
      CASE WHEN fl.driver_id IS NOT NULL THEN 1 ELSE 0 END AS hasFastestLap,
      e.constructor_id AS constructorId,
      COALESCE(NULLIF(c.name, ''), c.shortName) AS constructorName
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN circuitlayouts cl ON gp.circuitlayout_id = cl.id AND gp.circuitlayout_id != 0
    LEFT JOIN circuits ci ON cl.circuit_id = ci.id
    LEFT JOIN nationalities n ON ci.nationality_id = n.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE r.driver_id = ?
    ORDER BY gp.date
  `, [driverId]);
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getAllDrivers(): Promise<(Driver & DriverStats)[]> {
  return query<Driver & DriverStats>(`
    SELECT
      d.id, d.firstName, d.surname, d.carNo, d.indyOnly, d.current,
      d.dateOfBirth, CASE WHEN d.dateOfDeath IN ('0000-00-00', '1970-01-01') THEN NULL ELSE d.dateOfDeath END AS dateOfDeath,
      n.adjective AS nationality, n.iso2 AS nationalityCode,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(fl.grandprix_id) AS fastestLaps,
      COUNT(CASE WHEN r.grid = '1' THEN pt.grandprix_id END) AS poles,
      SUM(${totalPts()}) AS points,
      COUNT(DISTINCT YEAR(gp.date)) AS seasons,
      MIN(YEAR(gp.date)) AS firstRace,
      MAX(YEAR(gp.date)) AS lastRace
    FROM drivers d
    JOIN nationalities n ON d.nationality_id = n.id
    JOIN results r ON r.driver_id = d.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
    GROUP BY d.id
    ORDER BY wins DESC, podiums DESC
  `);
}

export async function getDriverById(id: number): Promise<(Driver & DriverStats) | null> {
  const rows = await query<Driver & DriverStats>(`
    SELECT
      d.id, d.firstName, d.surname, d.carNo, d.indyOnly, d.current,
      d.dateOfBirth, CASE WHEN d.dateOfDeath IN ('0000-00-00', '1970-01-01') THEN NULL ELSE d.dateOfDeath END AS dateOfDeath,
      n.adjective AS nationality, n.iso2 AS nationalityCode,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(fl.grandprix_id) AS fastestLaps,
      COUNT(CASE WHEN r.grid = '1' THEN pt.grandprix_id END) AS poles,
      SUM(${totalPts()}) AS points,
      COUNT(DISTINCT YEAR(gp.date)) AS seasons,
      MIN(YEAR(gp.date)) AS firstRace,
      MAX(YEAR(gp.date)) AS lastRace,
      (SELECT CASE WHEN gp2.shortTitle = 'Indianapolis 500' THEN CONCAT(YEAR(gp2.date), ' Indianapolis 500') WHEN n2.adjective = 'American' THEN CONCAT(YEAR(gp2.date), ' United States Grand Prix') WHEN n2.adjective IS NOT NULL THEN CONCAT(YEAR(gp2.date), ' ', n2.adjective, ' Grand Prix') WHEN gp2.shortTitle IS NOT NULL AND gp2.shortTitle != '' THEN CONCAT(YEAR(gp2.date), ' ', gp2.shortTitle, ' Grand Prix') ELSE CONCAT(YEAR(gp2.date), ' Grand Prix') END FROM grandsprix gp2 JOIN results r2 ON r2.grandprix_id = gp2.id LEFT JOIN circuitlayouts cl2 ON gp2.circuitlayout_id = cl2.id AND gp2.circuitlayout_id != 0 LEFT JOIN circuits ci2 ON cl2.circuit_id = ci2.id LEFT JOIN nationalities n2 ON ci2.nationality_id = n2.id WHERE r2.driver_id = d.id ORDER BY gp2.date ASC LIMIT 1) AS firstRaceTitle,
      (SELECT CASE WHEN gp2.shortTitle = 'Indianapolis 500' THEN CONCAT(YEAR(gp2.date), ' Indianapolis 500') WHEN n2.adjective = 'American' THEN CONCAT(YEAR(gp2.date), ' United States Grand Prix') WHEN n2.adjective IS NOT NULL THEN CONCAT(YEAR(gp2.date), ' ', n2.adjective, ' Grand Prix') WHEN gp2.shortTitle IS NOT NULL AND gp2.shortTitle != '' THEN CONCAT(YEAR(gp2.date), ' ', gp2.shortTitle, ' Grand Prix') ELSE CONCAT(YEAR(gp2.date), ' Grand Prix') END FROM grandsprix gp2 JOIN results r2 ON r2.grandprix_id = gp2.id LEFT JOIN circuitlayouts cl2 ON gp2.circuitlayout_id = cl2.id AND gp2.circuitlayout_id != 0 LEFT JOIN circuits ci2 ON cl2.circuit_id = ci2.id LEFT JOIN nationalities n2 ON ci2.nationality_id = n2.id WHERE r2.driver_id = d.id ORDER BY gp2.date DESC LIMIT 1) AS lastRaceTitle
    FROM drivers d
    JOIN nationalities n ON d.nationality_id = n.id
    JOIN results r ON r.driver_id = d.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
    WHERE d.id = ?
    GROUP BY d.id
  `, [id]);
  return rows[0] ?? null;
}

export async function getDriverSeasons(driverId: number) {
  return query<{
    year: number; constructor: string; constructorId: number;
    races: number; wins: number; podiums: number; poles: number; fastestLaps: number; points: number;
    isComplete: number; teammateData: string | null;
  }>(`
    SELECT s.year, s.constructor, s.constructorId, s.races, s.wins, s.podiums, s.poles, s.fastestLaps, s.points, s.isComplete, tm.teammateData
    FROM (
      SELECT
        YEAR(gp.date) AS year,
        COALESCE(NULLIF(c.name,''), c.shortName) AS constructor,
        c.id AS constructorId,
        COUNT(DISTINCT r.grandprix_id) AS races,
        SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
        COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
        COUNT(fl.grandprix_id) AS fastestLaps,
        SUM(${totalPts()}) AS points,
        YEAR(MAX(gp.date)) < YEAR(CURDATE()) AS isComplete
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN entrants e ON r.entrant_id = e.id
      JOIN constructors c ON e.constructor_id = c.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      WHERE r.driver_id = ?
      GROUP BY YEAR(gp.date), c.id
    ) s
    LEFT JOIN (
      SELECT YEAR(gp2.date) AS year, e1t.constructor_id,
        GROUP_CONCAT(DISTINCT CONCAT(d2.id, '::', d2.firstName, ' ', d2.surname) ORDER BY d2.surname SEPARATOR '|') AS teammateData
      FROM results r1t
      JOIN grandsprix gp2 ON r1t.grandprix_id = gp2.id
      JOIN entrants e1t ON r1t.entrant_id = e1t.id
      JOIN results r2t ON r2t.grandprix_id = r1t.grandprix_id
        AND r2t.entrant_id = r1t.entrant_id
        AND r2t.driver_id != r1t.driver_id
      JOIN drivers d2 ON d2.id = r2t.driver_id
      WHERE r1t.driver_id = ?
      GROUP BY YEAR(gp2.date), e1t.constructor_id
    ) tm ON tm.year = s.year AND tm.constructor_id = s.constructorId
    ORDER BY s.year DESC
  `, [driverId, driverId]);
}

export async function getDriverTeammates(driverId: number) {
  return query<{ id: number; firstName: string; surname: string }>(`
    SELECT DISTINCT d.id, d.firstName, d.surname
    FROM results r1
    JOIN results r2 ON r2.entrant_id = r1.entrant_id
      AND r2.grandprix_id = r1.grandprix_id
      AND r2.driver_id != r1.driver_id
    JOIN drivers d ON d.id = r2.driver_id
    WHERE r1.driver_id = ?
    ORDER BY d.surname
  `, [driverId]);
}

// ─── Constructors ──────────────────────────────────────────────────────────────

export async function getAllConstructors(): Promise<(Constructor & ConstructorStats)[]> {
  return query<Constructor & ConstructorStats>(`
    SELECT
      c.id, COALESCE(NULLIF(c.name,''), c.shortName) AS name, c.shortName, c.indyOnly, c.current,
      n.adjective AS nationality,
      n.iso2 AS nationalityCode,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(DISTINCT CASE WHEN r.grid = '1' THEN pt.grandprix_id END) AS poles,
      SUM(${totalPts()}) AS points,
      MIN(YEAR(gp.date)) AS firstSeason,
      MAX(YEAR(gp.date)) AS lastSeason,
      COUNT(DISTINCT r.driver_id) AS drivers
    FROM constructors c
    LEFT JOIN nationalities n ON c.nationality_id = n.id
    JOIN entrants e ON e.constructor_id = c.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
    GROUP BY c.id
    ORDER BY wins DESC
  `);
}

export async function getAllConstructorChampionships(): Promise<{ constructorId: number; championships: number }[]> {
  return query<{ constructorId: number; championships: number }>(`
    WITH season_totals AS (
      SELECT YEAR(gp.date) AS year, e.constructor_id,
        SUM(${totalPts()}) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN entrants e ON r.entrant_id = e.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      WHERE YEAR(gp.date) >= 1958
      GROUP BY YEAR(gp.date), e.constructor_id
    ),
    season_winners AS (
      SELECT year, constructor_id FROM season_totals st1
      WHERE pts = (SELECT MAX(pts) FROM season_totals st2 WHERE st2.year = st1.year)
        AND year IN (
          SELECT YEAR(gp2.date) FROM grandsprix gp2 GROUP BY YEAR(gp2.date) HAVING MAX(gp2.date) < CURDATE()
        )
    )
    SELECT constructor_id AS constructorId, CAST(COUNT(*) AS UNSIGNED) AS championships
    FROM season_winners
    GROUP BY constructor_id
  `);
}

export async function getConstructorById(id: number): Promise<(Constructor & ConstructorStats) | null> {
  const rows = await query<Constructor & ConstructorStats>(`
    SELECT
      c.id, COALESCE(NULLIF(c.name,''), c.shortName) AS name, c.shortName, c.indyOnly, c.current,
      n.adjective AS nationality,
      n.iso2 AS nationalityCode,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
      COUNT(fl.grandprix_id) AS fastestLaps,
      SUM(${totalPts()}) AS points,
      MIN(YEAR(gp.date)) AS firstSeason,
      MAX(YEAR(gp.date)) AS lastSeason,
      (SELECT CASE WHEN gp2.shortTitle = 'Indianapolis 500' THEN CONCAT(YEAR(gp2.date), ' Indianapolis 500') WHEN n2.adjective = 'American' THEN CONCAT(YEAR(gp2.date), ' United States Grand Prix') WHEN n2.adjective IS NOT NULL THEN CONCAT(YEAR(gp2.date), ' ', n2.adjective, ' Grand Prix') WHEN gp2.shortTitle IS NOT NULL AND gp2.shortTitle != '' THEN CONCAT(YEAR(gp2.date), ' ', gp2.shortTitle, ' Grand Prix') ELSE CONCAT(YEAR(gp2.date), ' Grand Prix') END FROM grandsprix gp2 JOIN results r2 ON r2.grandprix_id = gp2.id JOIN entrants e2 ON r2.entrant_id = e2.id LEFT JOIN circuitlayouts cl2 ON gp2.circuitlayout_id = cl2.id AND gp2.circuitlayout_id != 0 LEFT JOIN circuits ci2 ON cl2.circuit_id = ci2.id LEFT JOIN nationalities n2 ON ci2.nationality_id = n2.id WHERE e2.constructor_id = c.id ORDER BY gp2.date ASC LIMIT 1) AS firstRaceTitle,
      (SELECT CASE WHEN gp2.shortTitle = 'Indianapolis 500' THEN CONCAT(YEAR(gp2.date), ' Indianapolis 500') WHEN n2.adjective = 'American' THEN CONCAT(YEAR(gp2.date), ' United States Grand Prix') WHEN n2.adjective IS NOT NULL THEN CONCAT(YEAR(gp2.date), ' ', n2.adjective, ' Grand Prix') WHEN gp2.shortTitle IS NOT NULL AND gp2.shortTitle != '' THEN CONCAT(YEAR(gp2.date), ' ', gp2.shortTitle, ' Grand Prix') ELSE CONCAT(YEAR(gp2.date), ' Grand Prix') END FROM grandsprix gp2 JOIN results r2 ON r2.grandprix_id = gp2.id JOIN entrants e2 ON r2.entrant_id = e2.id LEFT JOIN circuitlayouts cl2 ON gp2.circuitlayout_id = cl2.id AND gp2.circuitlayout_id != 0 LEFT JOIN circuits ci2 ON cl2.circuit_id = ci2.id LEFT JOIN nationalities n2 ON ci2.nationality_id = n2.id WHERE e2.constructor_id = c.id ORDER BY gp2.date DESC LIMIT 1) AS lastRaceTitle,
      COUNT(DISTINCT r.driver_id) AS drivers
    FROM constructors c
    LEFT JOIN nationalities n ON c.nationality_id = n.id
    JOIN entrants e ON e.constructor_id = c.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);
  return rows[0] ?? null;
}

export async function getConstructorSeasons(constructorId: number) {
  return query<{
    year: number; races: number; wins: number; podiums: number; poles: number; fastestLaps: number; points: number; isComplete: number;
  }>(`
    SELECT
      YEAR(gp.date) AS year,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
      COUNT(fl.grandprix_id) AS fastestLaps,
      SUM(${totalPts()}) AS points,
      YEAR(MAX(gp.date)) < YEAR(CURDATE()) AS isComplete
    FROM entrants e
    JOIN constructors c ON e.constructor_id = c.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE c.id = ?
    GROUP BY YEAR(gp.date)
    ORDER BY year DESC
  `, [constructorId]);
}

export async function getConstructorSeasonDrivers(constructorId: number) {
  return query<{
    year: number; driverId: number; driver: string;
    races: number; wins: number; podiums: number; poles: number; fastestLaps: number; points: number;
  }>(`
    SELECT
      YEAR(gp.date) AS year,
      d.id AS driverId,
      CONCAT(d.firstName, ' ', d.surname) AS driver,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
      COUNT(fl.grandprix_id) AS fastestLaps,
      SUM(${totalPts()}) AS points
    FROM entrants e
    JOIN constructors c ON e.constructor_id = c.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN drivers d ON r.driver_id = d.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE c.id = ?
    GROUP BY YEAR(gp.date), d.id
    ORDER BY YEAR(gp.date) DESC, points DESC
  `, [constructorId]);
}

type ConstructorRanks = { racesRank: number; winsRank: number; podiumsRank: number; pointsRank: number; polesRank: number; fastestLapsRank: number };
let _constructorRanksCache: Map<number, ConstructorRanks> | null = null;

async function _getAllConstructorRanks(): Promise<Map<number, ConstructorRanks>> {
  if (_constructorRanksCache) return _constructorRanksCache;
  const rows = await query<{ constructor_id: number } & ConstructorRanks>(`
    WITH totals AS (
      SELECT e.constructor_id,
        COUNT(DISTINCT r.grandprix_id) AS races,
        SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
        SUM(${totalPts()}) AS points,
        COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
        COUNT(fl.grandprix_id) AS fastestLaps
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN entrants e ON r.entrant_id = e.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      GROUP BY e.constructor_id
    )
    SELECT constructor_id,
      CAST(RANK() OVER (ORDER BY races DESC) AS UNSIGNED) AS racesRank,
      CAST(RANK() OVER (ORDER BY wins DESC) AS UNSIGNED) AS winsRank,
      CAST(RANK() OVER (ORDER BY podiums DESC) AS UNSIGNED) AS podiumsRank,
      CAST(RANK() OVER (ORDER BY points DESC) AS UNSIGNED) AS pointsRank,
      CAST(RANK() OVER (ORDER BY poles DESC) AS UNSIGNED) AS polesRank,
      CAST(RANK() OVER (ORDER BY fastestLaps DESC) AS UNSIGNED) AS fastestLapsRank
    FROM totals
  `);
  _constructorRanksCache = new Map(rows.map((r) => [r.constructor_id, {
    racesRank: r.racesRank, winsRank: r.winsRank, podiumsRank: r.podiumsRank, pointsRank: r.pointsRank,
    polesRank: r.polesRank, fastestLapsRank: r.fastestLapsRank,
  }]));
  return _constructorRanksCache;
}

export async function getConstructorRanks(constructorId: number): Promise<ConstructorRanks | null> {
  const map = await _getAllConstructorRanks();
  return map.get(constructorId) ?? null;
}

export async function getConstructorChain(id: number) {
  return query<{ id: number; displayName: string; current: boolean; pos: number; firstYear: number; lastYear: number }>(`
    WITH RECURSIVE
    ancestors AS (
      SELECT id, formedFrom, became, current FROM constructors WHERE id = ?
      UNION ALL
      SELECT c.id, c.formedFrom, c.became, c.current
      FROM constructors c JOIN ancestors a ON c.id = a.formedFrom AND a.formedFrom > 0
    ),
    chain AS (
      SELECT c.id, COALESCE(NULLIF(c.name,''), c.shortName) AS displayName,
             c.formedFrom, c.became, c.current, 0 AS pos
      FROM constructors c JOIN ancestors a ON c.id = a.id AND a.formedFrom = 0
      UNION ALL
      SELECT c.id, COALESCE(NULLIF(c.name,''), c.shortName),
             c.formedFrom, c.became, c.current, ch.pos + 1
      FROM constructors c JOIN chain ch ON c.id = ch.became AND ch.became > 0
    )
    SELECT ch.id, ch.displayName, ch.current, ch.pos,
           MIN(YEAR(gp.date)) AS firstYear, MAX(YEAR(gp.date)) AS lastYear
    FROM chain ch
    JOIN entrants e ON e.constructor_id = ch.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    GROUP BY ch.id, ch.displayName, ch.current, ch.pos
    ORDER BY ch.pos
  `, [id]);
}

// ─── Races ─────────────────────────────────────────────────────────────────────

export async function getRaceById(id: number): Promise<Race | null> {
  const rows = await query<Race>(`
    SELECT
      gp.id, gp.date, gp.shortTitle, gp.fullTitle, gp.laps, gp.sprint,
      COALESCE(ci.name, '') AS circuit, COALESCE(ci.city, '') AS circuitCity,
      COALESCE(n.adjective, '') AS country
    FROM grandsprix gp
    LEFT JOIN circuitlayouts cl ON cl.id = gp.circuitlayout_id AND gp.circuitlayout_id != 0
    LEFT JOIN circuits ci ON cl.circuit_id = ci.id
    LEFT JOIN nationalities n ON ci.nationality_id = n.id
    WHERE gp.id = ?
  `, [id]);
  return rows[0] ?? null;
}

export async function getRaceResults(raceId: number): Promise<RaceResult[]> {
  return query<RaceResult>(`
    SELECT
      r.position, r.place, r.grid,
      d.id AS driverId,
      CONCAT(d.firstName, ' ', d.surname) AS driverName,
      c.name AS constructor,
      c.id AS constructorId,
      r.time,
      ((${racePts()}) + (${flBonus()})) AS points
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN drivers d ON r.driver_id = d.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    WHERE r.grandprix_id = ?
    ORDER BY r.position, r.place
  `, [raceId]);
}

export async function getRacePole(raceId: number): Promise<{ time: string } | null> {
  const rows = await query<{ time: string }>(`
    SELECT time FROM poletimes WHERE grandprix_id = ?
  `, [raceId]);
  return rows[0] ?? null;
}

export async function getRaceFastestLap(raceId: number) {
  const rows = await query<{ driverName: string; time: string; lap: number }>(`
    SELECT CONCAT(d.firstName, ' ', d.surname) AS driverName, fl.time, fl.lap
    FROM fastestlaps fl
    JOIN drivers d ON fl.driver_id = d.id
    WHERE fl.grandprix_id = ?
  `, [raceId]);
  return rows[0] ?? null;
}

export async function getRaceSprintResults(raceId: number) {
  return query<{ place: string; driverName: string; constructor: string; time: string | null; points: number }>(`
    SELECT
      s.place,
      CONCAT(d.firstName, ' ', d.surname) AS driverName,
      c.name AS constructor,
      s.time,
      ${sprintPts("s", "gp")} AS points
    FROM sprints s
    JOIN grandsprix gp ON s.grandprix_id = gp.id
    JOIN drivers d ON s.driver_id = d.id
    JOIN results r ON r.driver_id = s.driver_id AND r.grandprix_id = s.grandprix_id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    WHERE s.grandprix_id = ?
    ORDER BY s.place
  `, [raceId]);
}

// ─── Seasons ───────────────────────────────────────────────────────────────────

export function pointsSystem(year: number): string {
  if (year >= 2010) return "25-18-15-12-10-8-6-4-2-1";
  if (year >= 2003) return "10-8-6-5-4-3-2-1";
  if (year >= 1991) return "10-6-4-3-2-1";
  if (year >= 1961) return "9-6-4-3-2-1";
  if (year === 1960) return "8-6-4-3-2-1";
  return "8-6-4-3-2";
}

export async function getAllSeasons(): Promise<{ year: number; races: number; drivers: number; isComplete: boolean; winner: string | null; runnerUp: string | null; constructorChampion: string | null; winnerWins: number | null; winnerPoints: number | null }[]> {
  // Race-only points for all season queries (sprint/FL never changed a championship result;
  // omitting those joins keeps this from 10s → 0.1s)
  const rp = racePts();
  const [seasons, driverResults, constructorResults] = await Promise.all([
    query<{ year: number; races: number; drivers: number; isComplete: number }>(`
      SELECT YEAR(gp.date) AS year, COUNT(DISTINCT gp.id) AS races, COUNT(DISTINCT r.driver_id) AS drivers,
        YEAR(MAX(gp.date)) < YEAR(CURDATE()) AS isComplete
      FROM grandsprix gp JOIN results r ON r.grandprix_id = gp.id
      GROUP BY YEAR(gp.date) ORDER BY year DESC
    `),
    query<{ year: number; winner: string | null; runnerUp: string | null; winnerWins: number | null; winnerPoints: number | null }>(`
      WITH season_pts AS (
        SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${rp}) AS pts,
          SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins
        FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
        GROUP BY YEAR(gp.date), r.driver_id
      ),
      ranked AS (
        SELECT year, driver_id, pts, wins, RANK() OVER (PARTITION BY year ORDER BY pts DESC) AS rnk
        FROM season_pts
      )
      SELECT ranked.year,
        MAX(CASE WHEN rnk = 1 THEN CONCAT(d.firstName, ' ', d.surname) END) AS winner,
        MAX(CASE WHEN rnk = 2 THEN CONCAT(d.firstName, ' ', d.surname) END) AS runnerUp,
        MAX(CASE WHEN rnk = 1 THEN ranked.wins END) AS winnerWins,
        MAX(CASE WHEN rnk = 1 THEN ranked.pts END) AS winnerPoints
      FROM ranked
      JOIN drivers d ON d.id = ranked.driver_id
      WHERE rnk <= 2
      GROUP BY ranked.year
      ORDER BY ranked.year DESC
    `),
    query<{ year: number; constructorChampion: string }>(`
      WITH season_totals AS (
        SELECT YEAR(gp.date) AS year, e.constructor_id, SUM(${rp}) AS pts
        FROM results r
        JOIN grandsprix gp ON r.grandprix_id = gp.id
        JOIN entrants e ON r.entrant_id = e.id
        WHERE YEAR(gp.date) >= 1958
          AND YEAR(gp.date) IN (
            SELECT YEAR(gp2.date) FROM grandsprix gp2 GROUP BY YEAR(gp2.date) HAVING MAX(gp2.date) < CURDATE()
          )
        GROUP BY YEAR(gp.date), e.constructor_id
      )
      SELECT st.year, COALESCE(NULLIF(c.name, ''), c.shortName) AS constructorChampion
      FROM season_totals st
      JOIN constructors c ON c.id = st.constructor_id
      WHERE st.pts = (SELECT MAX(pts) FROM season_totals st2 WHERE st2.year = st.year)
      ORDER BY st.year DESC
    `),
  ]);
  const driverMap = new Map(driverResults.map((w) => [w.year, w]));
  const constructorMap = new Map(constructorResults.map((c) => [c.year, c.constructorChampion]));
  return seasons.map((s) => ({
    ...s,
    isComplete: !!s.isComplete,
    winner: driverMap.get(s.year)?.winner ?? null,
    runnerUp: driverMap.get(s.year)?.runnerUp ?? null,
    constructorChampion: constructorMap.get(s.year) ?? null,
    winnerWins: driverMap.get(s.year)?.winnerWins ?? null,
    winnerPoints: driverMap.get(s.year)?.winnerPoints ?? null,
  }));
}

export async function getSeasonRaces(year: number): Promise<Race[]> {
  return query<Race>(`
    SELECT
      gp.id, gp.date, gp.shortTitle, gp.fullTitle, gp.laps, gp.sprint,
      COALESCE(ci.name, '') AS circuit, COALESCE(ci.city, '') AS circuitCity,
      COALESCE(n.adjective, '') AS country
    FROM grandsprix gp
    LEFT JOIN circuitlayouts cl ON cl.id = gp.circuitlayout_id AND gp.circuitlayout_id != 0
    LEFT JOIN circuits ci ON cl.circuit_id = ci.id
    LEFT JOIN nationalities n ON ci.nationality_id = n.id
    WHERE YEAR(gp.date) = ?
    ORDER BY gp.date
  `, [year]);
}

export async function getSeasonRaceWinners(year: number) {
  return query<{ raceId: number; driverId: number; driverName: string; constructorId: number; constructor: string }>(`
    SELECT
      gp.id AS raceId,
      d.id AS driverId,
      CONCAT(d.firstName, ' ', d.surname) AS driverName,
      c.id AS constructorId,
      c.name AS constructor
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN drivers d ON r.driver_id = d.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    WHERE YEAR(gp.date) = ? AND r.place = '1'
    ORDER BY gp.date
  `, [year]);
}

export async function getSeasonDriverStandings(year: number): Promise<SeasonStanding[]> {
  const rows = await query<Omit<SeasonStanding, "pos">>(`
    SELECT
      d.id AS driverId,
      CONCAT(d.firstName, ' ', d.surname) AS name,
      c.name AS constructor,
      c.id AS constructorId,
      SUM(${totalPts()}) AS points,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      COUNT(DISTINCT CASE WHEN r.grid = '1' THEN r.grandprix_id END) AS poles,
      COUNT(fl.grandprix_id) AS fastestLaps
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN drivers d ON r.driver_id = d.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE YEAR(gp.date) = ?
    GROUP BY d.id, c.id
    ORDER BY points DESC, wins DESC
  `, [year]);
  return rows.map((r, i) => ({ pos: i + 1, ...r }));
}

export async function getSeasonConstructorStandings(year: number): Promise<ConstructorStanding[]> {
  const rows = await query<Omit<ConstructorStanding, "pos">>(`
    SELECT
      c.id AS constructorId,
      c.name AS name,
      SUM(${totalPts()}) AS points,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE YEAR(gp.date) = ?
    GROUP BY c.id
    ORDER BY points DESC, wins DESC
  `, [year]);
  return rows.map((r, i) => ({ pos: i + 1, ...r }));
}

// ─── Records ──────────────────────────────────────────────────────────────────

export type AgeRow = { driverId: number; name: string; ageDays: number; achievedDate: string; current: boolean };
export type AgeRecordSet = { top10: AgeRow[]; currentEntry: { rank: number; row: AgeRow } | null };

function processAgeRows(rows: (Omit<AgeRow, 'current'> & { current: number })[]): AgeRecordSet {
  const mapped = rows.map(r => ({ ...r, current: r.current === 1 }));
  const top10 = mapped.slice(0, 10);
  if (top10.some(r => r.current)) return { top10, currentEntry: null };
  const idx = mapped.findIndex((r, i) => i >= 10 && r.current);
  return { top10, currentEntry: idx === -1 ? null : { rank: idx + 1, row: mapped[idx] } };
}

const DOB_FILTER = `d.dateOfBirth IS NOT NULL AND d.dateOfBirth NOT IN ('0000-00-00','1970-01-01')`;

const POINTS_FILTER = `(
  (r.fullPointsDriver = 0 AND r.actualPointsDriver > 0)
  OR (r.fullPointsDriver = 1 AND r.position BETWEEN 1 AND
    CASE WHEN YEAR(gp.date) >= 2010 THEN 10
         WHEN YEAR(gp.date) >= 2003 THEN 8
         WHEN YEAR(gp.date) >= 1961 THEN 6
         ELSE 5 END)
)`;

function winsAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM results r JOIN grandsprix gp ON r.grandprix_id=gp.id JOIN drivers d ON r.driver_id=d.id
    WHERE r.place='1' AND ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}
function podiumsAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM results r JOIN grandsprix gp ON r.grandprix_id=gp.id JOIN drivers d ON r.driver_id=d.id
    WHERE r.place IN ('1','2','3') AND ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}
function polesAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM poletimes pt JOIN grandsprix gp ON pt.grandprix_id=gp.id
    JOIN results r ON r.grandprix_id=gp.id AND r.grid='1'
    JOIN drivers d ON r.driver_id=d.id
    WHERE ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}
function flAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM fastestlaps fl JOIN grandsprix gp ON fl.grandprix_id=gp.id JOIN drivers d ON fl.driver_id=d.id
    WHERE ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}
function ptsAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM results r JOIN grandsprix gp ON r.grandprix_id=gp.id JOIN drivers d ON r.driver_id=d.id
    WHERE ${POINTS_FILTER} AND ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}
function startsAgeQ(agg: 'MIN' | 'MAX', ord: 'ASC' | 'DESC') {
  return `SELECT d.id AS driverId, CONCAT(d.firstName,' ',d.surname) AS name,
    ${agg}(TIMESTAMPDIFF(DAY,d.dateOfBirth,gp.date)) AS ageDays,
    DATE_FORMAT(${agg}(gp.date),'%d %b %Y') AS achievedDate, MAX(d.current) AS current
    FROM results r JOIN grandsprix gp ON r.grandprix_id=gp.id JOIN drivers d ON r.driver_id=d.id
    WHERE ${DOB_FILTER}
    GROUP BY d.id,d.firstName,d.surname,d.dateOfBirth ORDER BY ageDays ${ord} LIMIT 200`;
}

export async function getAgeRecords() {
  type R = Omit<AgeRow, 'current'> & { current: number };
  const [yw, ow, yp, op, ypo, opo, yfl, ofl, ypts, opts, yst, ost] = await Promise.all([
    query<R>(winsAgeQ('MIN','ASC')),
    query<R>(winsAgeQ('MAX','DESC')),
    query<R>(podiumsAgeQ('MIN','ASC')),
    query<R>(podiumsAgeQ('MAX','DESC')),
    query<R>(polesAgeQ('MIN','ASC')),
    query<R>(polesAgeQ('MAX','DESC')),
    query<R>(flAgeQ('MIN','ASC')),
    query<R>(flAgeQ('MAX','DESC')),
    query<R>(ptsAgeQ('MIN','ASC')),
    query<R>(ptsAgeQ('MAX','DESC')),
    query<R>(startsAgeQ('MIN','ASC')),
    query<R>(startsAgeQ('MAX','DESC')),
  ]);
  return {
    youngest: {
      wins: processAgeRows(yw), podiums: processAgeRows(yp), poles: processAgeRows(ypo),
      fastestLaps: processAgeRows(yfl), points: processAgeRows(ypts), races: processAgeRows(yst),
    },
    oldest: {
      wins: processAgeRows(ow), podiums: processAgeRows(op), poles: processAgeRows(opo),
      fastestLaps: processAgeRows(ofl), points: processAgeRows(opts), races: processAgeRows(ost),
    },
  };
}

export async function getRecords() {
  const [wins, podiums, poles, fastestLaps, points, races] = await Promise.all([
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM poletimes pt
      JOIN grandsprix gp ON pt.grandprix_id = gp.id
      JOIN results r ON r.grandprix_id = gp.id AND r.grid = '1'
      JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id ORDER BY value DESC
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM fastestlaps fl JOIN drivers d ON fl.driver_id = d.id
      GROUP BY d.id ORDER BY value DESC
    `),
    query<{ driverId: number; name: string; value: number; pts2026: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             SUM(${totalPts()}) AS value,
             SUM((${racePts2026()}) + (${sprintPts2026()})) AS pts2026
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id HAVING value >= 5 ORDER BY value DESC
    `),
  ]);
  return { wins, podiums, poles, fastestLaps, points, races };
}

// ─── Teammate comparisons ──────────────────────────────────────────────────────

export async function getDriverComparisons(driverId: number): Promise<{
  teammateId: number;
  teammateName: string;
  year: number;
  constructorId: number;
  constructorName: string;
  sharedRaces: number;
  qualiRaces: number;
  aQualiAhead: number;
  finishRaces: number;
  aFinishAhead: number;
  aPoints: number;
  bPoints: number;
}[]> {
  const pts1 = totalPts("r1", "gp", "fl1", "sp1");
  const pts2 = totalPts("r2", "gp", "fl2", "sp2");
  return query(`
    SELECT
      d2.id AS teammateId,
      CONCAT(d2.firstName, ' ', d2.surname) AS teammateName,
      YEAR(gp.date) AS year,
      COALESCE(NULLIF(c.name, ''), c.shortName) AS constructorName,
      c.id AS constructorId,
      COUNT(*) AS sharedRaces,
      SUM(CASE WHEN CAST(r1.grid AS UNSIGNED) > 0 AND CAST(r2.grid AS UNSIGNED) > 0 THEN 1 ELSE 0 END) AS qualiRaces,
      SUM(CASE WHEN CAST(r1.grid AS UNSIGNED) > 0 AND CAST(r2.grid AS UNSIGNED) > 0 AND CAST(r1.grid AS UNSIGNED) < CAST(r2.grid AS UNSIGNED) THEN 1 ELSE 0 END) AS aQualiAhead,
      SUM(CASE WHEN CAST(r1.place AS UNSIGNED) > 0 AND CAST(r2.place AS UNSIGNED) > 0 THEN 1 ELSE 0 END) AS finishRaces,
      SUM(CASE WHEN CAST(r1.place AS UNSIGNED) > 0 AND CAST(r2.place AS UNSIGNED) > 0 AND CAST(r1.place AS UNSIGNED) < CAST(r2.place AS UNSIGNED) THEN 1 ELSE 0 END) AS aFinishAhead,
      SUM(${pts1}) AS aPoints,
      SUM(${pts2}) AS bPoints
    FROM results r1
    JOIN results r2 ON r2.entrant_id = r1.entrant_id AND r2.grandprix_id = r1.grandprix_id AND r2.driver_id != r1.driver_id
    JOIN grandsprix gp ON r1.grandprix_id = gp.id
    JOIN entrants e ON r1.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    JOIN drivers d2 ON d2.id = r2.driver_id
    LEFT JOIN fastestlaps fl1 ON fl1.grandprix_id = gp.id AND fl1.driver_id = r1.driver_id
    LEFT JOIN sprints sp1 ON sp1.grandprix_id = gp.id AND sp1.driver_id = r1.driver_id
    LEFT JOIN fastestlaps fl2 ON fl2.grandprix_id = gp.id AND fl2.driver_id = r2.driver_id
    LEFT JOIN sprints sp2 ON sp2.grandprix_id = gp.id AND sp2.driver_id = r2.driver_id
    WHERE r1.driver_id = ?
    GROUP BY d2.id, YEAR(gp.date), c.id
    ORDER BY YEAR(gp.date) DESC, d2.surname ASC
  `, [driverId]);
}

// ─── Driver cumulative race points + championship position ─────────────────────

export async function getDriverSeasonCumulative(driverId: number): Promise<{
  grandprixId: number; cumPts: number; champPos: number;
}[]> {
  const rp = racePts();
  const fl = flBonus();
  const sp = sprintPts();
  return query<{ grandprixId: number; cumPts: number; champPos: number }>(`
    WITH driver_seasons AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE r.driver_id = ?
    ),
    all_race_pts AS (
      SELECT YEAR(gp.date) AS year, gp.id AS grandprixId, r.driver_id,
        ((${rp}) + (${fl}) + (${sp})) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN driver_seasons ds ON YEAR(gp.date) = ds.year
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    ),
    cum_pts AS (
      SELECT year, grandprixId, driver_id,
        SUM(pts) OVER (
          PARTITION BY year, driver_id
          ORDER BY grandprixId
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumPts
      FROM all_race_pts
    ),
    ranked AS (
      SELECT year, grandprixId, driver_id, cumPts,
        RANK() OVER (PARTITION BY year, grandprixId ORDER BY cumPts DESC) AS champPos
      FROM cum_pts
    )
    SELECT grandprixId, cumPts, CAST(champPos AS UNSIGNED) AS champPos
    FROM ranked
    WHERE driver_id = ?
    ORDER BY year, grandprixId
  `, [driverId, driverId]);
}

// ─── Constructor season WCC/WDC info ──────────────────────────────────────────

export async function getConstructorSeasonChampInfo(constructorId: number): Promise<{
  year: number; wccPos: number | null; bestDriverWdcPos: number | null;
}[]> {
  const tp = totalPts();
  return query<{ year: number; wccPos: number | null; bestDriverWdcPos: number | null }>(`
    WITH completed_years AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM grandsprix gp
      GROUP BY YEAR(gp.date)
      HAVING MAX(gp.date) < CURDATE()
    ),
    constructor_years AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM entrants e
      JOIN results r ON r.entrant_id = e.id
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE e.constructor_id = ?
    ),
    wcc_totals AS (
      SELECT YEAR(gp.date) AS year, e.constructor_id, SUM(${tp}) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN entrants e ON r.entrant_id = e.id
      JOIN completed_years cy ON YEAR(gp.date) = cy.year
      JOIN constructor_years cty ON YEAR(gp.date) = cty.year
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      WHERE YEAR(gp.date) >= 1958
      GROUP BY YEAR(gp.date), e.constructor_id
    ),
    wcc_ranked AS (
      SELECT year, constructor_id,
        CAST(RANK() OVER (PARTITION BY year ORDER BY pts DESC) AS UNSIGNED) AS wccPos
      FROM wcc_totals
    ),
    wdc_totals AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${tp}) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN completed_years cy ON YEAR(gp.date) = cy.year
      JOIN constructor_years cty ON YEAR(gp.date) = cty.year
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      GROUP BY YEAR(gp.date), r.driver_id
    ),
    wdc_ranked AS (
      SELECT year, driver_id,
        RANK() OVER (PARTITION BY year ORDER BY pts DESC) AS wdcPos
      FROM wdc_totals
    ),
    constructor_drivers AS (
      SELECT DISTINCT YEAR(gp.date) AS year, r.driver_id
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN entrants e ON r.entrant_id = e.id
      JOIN constructor_years cy ON YEAR(gp.date) = cy.year
      WHERE e.constructor_id = ?
    ),
    best_driver_wdc AS (
      SELECT cd.year, CAST(MIN(wr.wdcPos) AS UNSIGNED) AS bestPos
      FROM constructor_drivers cd
      JOIN wdc_ranked wr ON wr.year = cd.year AND wr.driver_id = cd.driver_id
      GROUP BY cd.year
    )
    SELECT
      cy.year,
      wcc.wccPos,
      bdw.bestPos AS bestDriverWdcPos
    FROM constructor_years cy
    LEFT JOIN wcc_ranked wcc ON wcc.year = cy.year AND wcc.constructor_id = ?
    LEFT JOIN best_driver_wdc bdw ON bdw.year = cy.year
    ORDER BY cy.year DESC
  `, [constructorId, constructorId, constructorId]);
}

// ─── Season navigation ────────────────────────────────────────────────────────

export async function getAdjacentSeasons(year: number): Promise<{ prevYear: number | null; nextYear: number | null }> {
  const rows = await query<{ prevYear: number | null; nextYear: number | null }>(`
    SELECT
      (SELECT MAX(YEAR(gp.date)) FROM grandsprix gp WHERE YEAR(gp.date) < ?) AS prevYear,
      (SELECT MIN(YEAR(gp.date)) FROM grandsprix gp WHERE YEAR(gp.date) > ?) AS nextYear
  `, [year, year]);
  return rows[0] ?? { prevYear: null, nextYear: null };
}

// ─── Race navigation ──────────────────────────────────────────────────────────

export async function getAdjacentRaces(raceId: number): Promise<{
  prevId: number | null; prevTitle: string | null; prevYear: number | null;
  nextId: number | null; nextTitle: string | null; nextYear: number | null;
}> {
  const rows = await query<{
    prevId: number | null; prevTitle: string | null; prevYear: number | null;
    nextId: number | null; nextTitle: string | null; nextYear: number | null;
  }>(`
    SELECT
      p.id AS prevId, p.shortTitle AS prevTitle, YEAR(p.date) AS prevYear,
      n.id AS nextId, n.shortTitle AS nextTitle, YEAR(n.date) AS nextYear
    FROM (SELECT 1) AS dummy
    LEFT JOIN grandsprix p ON p.id = (
      SELECT id FROM grandsprix
      WHERE date < (SELECT date FROM grandsprix WHERE id = ?)
      ORDER BY date DESC, id DESC LIMIT 1
    )
    LEFT JOIN grandsprix n ON n.id = (
      SELECT id FROM grandsprix
      WHERE date > (SELECT date FROM grandsprix WHERE id = ?)
      ORDER BY date ASC, id ASC LIMIT 1
    )
  `, [raceId, raceId]);
  return rows[0] ?? { prevId: null, prevTitle: null, prevYear: null, nextId: null, nextTitle: null, nextYear: null };
}

// ─── Constructor per-driver WDC positions ─────────────────────────────────────

export async function getConstructorDriverWdcPositions(constructorId: number): Promise<{
  year: number; driverId: number; wdcPos: number;
}[]> {
  return query<{ year: number; driverId: number; wdcPos: number }>(`
    WITH completed_years AS (
      SELECT DISTINCT YEAR(gp.date) AS year
      FROM grandsprix gp
      GROUP BY YEAR(gp.date)
      HAVING MAX(gp.date) < CURDATE()
    ),
    constructor_drivers AS (
      SELECT DISTINCT YEAR(gp.date) AS year, r.driver_id
      FROM entrants e
      JOIN results r ON r.entrant_id = e.id
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      JOIN completed_years cy ON YEAR(gp.date) = cy.year
      WHERE e.constructor_id = ?
    ),
    wdc_totals AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${racePts()}) AS pts
      FROM results r
      JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE YEAR(gp.date) IN (SELECT DISTINCT year FROM constructor_drivers)
      GROUP BY YEAR(gp.date), r.driver_id
    ),
    wdc_ranked AS (
      SELECT year, driver_id,
        CAST(RANK() OVER (PARTITION BY year ORDER BY pts DESC) AS UNSIGNED) AS wdcPos
      FROM wdc_totals
    )
    SELECT cd.year, cd.driver_id AS driverId, wr.wdcPos
    FROM constructor_drivers cd
    JOIN wdc_ranked wr ON wr.year = cd.year AND wr.driver_id = cd.driver_id
    ORDER BY cd.year DESC, wr.wdcPos ASC
  `, [constructorId]);
}

// ─── Consecutive streak records ───────────────────────────────────────────────

export async function getConsecutiveRecords() {
  const POINTS_FILTER = `(
    (r.fullPointsDriver = 0 AND r.actualPointsDriver > 0)
    OR (r.fullPointsDriver = 1 AND r.position BETWEEN 1 AND
      CASE WHEN YEAR(gp.date) >= 2010 THEN 10
           WHEN YEAR(gp.date) >= 2003 THEN 8
           WHEN YEAR(gp.date) >= 1961 THEN 6
           ELSE 5 END)
  )`;

  function streakQ(driverSubQ: string, minStreak: number) {
    return `
      WITH numbered_races AS (
        SELECT id AS gp_id, ROW_NUMBER() OVER (ORDER BY date, id) AS global_rn
        FROM grandsprix WHERE date <= CURDATE()
      ),
      driver_Xs AS (${driverSubQ}),
      X_numbered AS (
        SELECT dx.driver_id, nr.global_rn,
          ROW_NUMBER() OVER (PARTITION BY dx.driver_id ORDER BY nr.global_rn) AS rn
        FROM driver_Xs dx
        JOIN numbered_races nr ON nr.gp_id = dx.gp_id
      ),
      streaks AS (
        SELECT driver_id, global_rn - rn AS island, COUNT(*) AS streak
        FROM X_numbered
        GROUP BY driver_id, island
        HAVING streak >= ${minStreak}
      ),
      best AS (
        SELECT driver_id, MAX(streak) AS value
        FROM streaks
        GROUP BY driver_id
      )
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name, CAST(b.value AS UNSIGNED) AS value
      FROM best b
      JOIN drivers d ON d.id = b.driver_id
      ORDER BY value DESC, d.surname
    `;
  }

  const [wins, podiums, poles, fastestLaps, points, finishes, starts] = await Promise.all([
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT DISTINCT r.driver_id, r.grandprix_id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE r.place = '1' AND gp.date <= CURDATE()
    `, 3)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT DISTINCT r.driver_id, r.grandprix_id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE r.place IN ('1','2','3') AND gp.date <= CURDATE()
    `, 3)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT r.driver_id, gp.id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
      WHERE r.grid = '1' AND pt.id IS NOT NULL AND gp.date <= CURDATE()
    `, 3)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT fl.driver_id, fl.grandprix_id AS gp_id
      FROM fastestlaps fl JOIN grandsprix gp ON fl.grandprix_id = gp.id
      WHERE gp.date <= CURDATE()
    `, 3)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT DISTINCT r.driver_id, r.grandprix_id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE gp.date <= CURDATE() AND ${POINTS_FILTER}
    `, 3)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT DISTINCT r.driver_id, r.grandprix_id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE gp.date <= CURDATE() AND CAST(r.place AS UNSIGNED) > 0
    `, 10)),
    query<{ driverId: number; name: string; value: number }>(streakQ(`
      SELECT DISTINCT r.driver_id, r.grandprix_id AS gp_id
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      WHERE gp.date <= CURDATE()
    `, 25)),
  ]);
  return { wins, podiums, poles, fastestLaps, points, finishes, starts };
}

// ─── Race milestones ──────────────────────────────────────────────────────────

export type MilestoneEntry = {
  driverId: number;
  driverName: string;
  type: 'start' | 'win' | 'podium' | 'pole' | 'fastestLap' | 'points';
  n: number; // 0 = first career points; otherwise the cumulative total or count
};

const MILESTONE_COUNTS = new Set([1, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450]);
const POINTS_THRESHOLDS = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000];

export async function getRaceMilestones(raceId: number): Promise<MilestoneEntry[]> {
  const tp = totalPts();
  type Row = {
    driverId: number; driverName: string;
    cumStarts: number; cumWins: number; cumPodiums: number; cumPoles: number; cumFL: number;
    cumPts: string; thisPlace: string | null; thisPole: number; thisFL: number; thisPts: string;
  };
  const rows = await query<Row>(`
    WITH
    race_info AS (SELECT id, date FROM grandsprix WHERE id = ?),
    race_drivers AS (
      SELECT DISTINCT r.driver_id FROM results r WHERE r.grandprix_id = ?
    ),
    driver_history AS (
      SELECT
        r.driver_id,
        r.place,
        (${tp}) AS pts,
        CASE WHEN gp.id = ri.id THEN 1 ELSE 0 END AS isThisRace,
        CASE WHEN r.grid = '1' AND pt.id IS NOT NULL THEN 1 ELSE 0 END AS hadPole,
        CASE WHEN fl.id IS NOT NULL THEN 1 ELSE 0 END AS hadFL
      FROM race_drivers rd
      JOIN results r ON r.driver_id = rd.driver_id
      JOIN grandsprix gp ON gp.id = r.grandprix_id
      CROSS JOIN race_info ri
      LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
      LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
      LEFT JOIN poletimes pt ON pt.grandprix_id = gp.id
      WHERE gp.date <= ri.date
    ),
    driver_stats AS (
      SELECT
        driver_id,
        COUNT(*) AS cumStarts,
        SUM(CASE WHEN place = '1' THEN 1 ELSE 0 END) AS cumWins,
        SUM(CASE WHEN place IN ('1','2','3') THEN 1 ELSE 0 END) AS cumPodiums,
        SUM(hadPole) AS cumPoles,
        SUM(hadFL) AS cumFL,
        SUM(pts) AS cumPts,
        MAX(CASE WHEN isThisRace = 1 THEN place ELSE NULL END) AS thisPlace,
        MAX(CASE WHEN isThisRace = 1 THEN hadPole ELSE 0 END) AS thisPole,
        MAX(CASE WHEN isThisRace = 1 THEN hadFL ELSE 0 END) AS thisFL,
        SUM(CASE WHEN isThisRace = 1 THEN pts ELSE 0 END) AS thisPts
      FROM driver_history
      GROUP BY driver_id
    )
    SELECT
      ds.driver_id AS driverId,
      CONCAT(d.firstName, ' ', d.surname) AS driverName,
      ds.cumStarts, ds.cumWins, ds.cumPodiums, ds.cumPoles, ds.cumFL,
      CAST(ds.cumPts AS CHAR) AS cumPts,
      ds.thisPlace, ds.thisPole, ds.thisFL,
      CAST(ds.thisPts AS CHAR) AS thisPts
    FROM driver_stats ds
    JOIN drivers d ON d.id = ds.driver_id
    ORDER BY d.surname, d.firstName
  `, [raceId, raceId]);

  const out: MilestoneEntry[] = [];
  for (const d of rows) {
    const cumPts = Number(d.cumPts);
    const thisPts = Number(d.thisPts);
    const ptsBefore = cumPts - thisPts;

    if (MILESTONE_COUNTS.has(Number(d.cumStarts)))
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'start', n: Number(d.cumStarts) });
    if (d.thisPlace === '1' && MILESTONE_COUNTS.has(Number(d.cumWins)))
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'win', n: Number(d.cumWins) });
    if (['1','2','3'].includes(d.thisPlace ?? '') && MILESTONE_COUNTS.has(Number(d.cumPodiums)))
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'podium', n: Number(d.cumPodiums) });
    if (Number(d.thisPole) > 0 && MILESTONE_COUNTS.has(Number(d.cumPoles)))
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'pole', n: Number(d.cumPoles) });
    if (Number(d.thisFL) > 0 && MILESTONE_COUNTS.has(Number(d.cumFL)))
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'fastestLap', n: Number(d.cumFL) });
    if (ptsBefore === 0 && thisPts > 0)
      out.push({ driverId: d.driverId, driverName: d.driverName, type: 'points', n: 0 });
    for (const t of POINTS_THRESHOLDS)
      if (ptsBefore < t && cumPts >= t)
        out.push({ driverId: d.driverId, driverName: d.driverName, type: 'points', n: t });
  }
  return out;
}
