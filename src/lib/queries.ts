import { query } from "./db";
import type {
  Driver, DriverStats, Constructor, ConstructorStats,
  Race, RaceResult, SeasonStanding, ConstructorStanding, SharedSeason,
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

export async function getAllChampionships(): Promise<{ driverId: number; championships: number }[]> {
  return query<{ driverId: number; championships: number }>(`
    WITH season_pts AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${racePts()}) AS pts
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      GROUP BY YEAR(gp.date), r.driver_id
    )
    SELECT sp.driver_id AS driverId, COUNT(*) AS championships
    FROM season_pts sp
    WHERE sp.pts = (SELECT MAX(pts) FROM season_pts sp2 WHERE sp2.year = sp.year)
    GROUP BY sp.driver_id
  `);
}

export async function getDriverChampionships(driverId: number): Promise<number> {
  const rows = await query<{ championships: number }>(`
    WITH season_pts AS (
      SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${racePts()}) AS pts
      FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
      GROUP BY YEAR(gp.date), r.driver_id
    ),
    season_winners AS (
      SELECT sp.year, sp.driver_id
      FROM season_pts sp
      WHERE sp.pts = (SELECT MAX(pts) FROM season_pts sp2 WHERE sp2.year = sp.year)
    )
    SELECT COUNT(*) AS championships
    FROM season_winners
    WHERE driver_id = ?
  `, [driverId]);
  return Number(rows[0]?.championships ?? 0);
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getAllDrivers(): Promise<(Driver & DriverStats)[]> {
  return query<Driver & DriverStats>(`
    SELECT
      d.id, d.firstName, d.surname, d.carNo, d.indyOnly, d.current,
      d.dateOfBirth, d.dateOfDeath,
      n.adjective AS nationality, n.shortcode AS nationalityCode,
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
      d.id, d.firstName, d.surname, d.carNo, d.current,
      d.dateOfBirth, d.dateOfDeath,
      n.adjective AS nationality, n.shortcode AS nationalityCode,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
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
    WHERE d.id = ?
    GROUP BY d.id
  `, [id]);
  return rows[0] ?? null;
}

export async function getDriverSeasons(driverId: number) {
  return query<{
    year: number; constructor: string; constructorId: number;
    races: number; wins: number; podiums: number; points: number;
  }>(`
    SELECT
      YEAR(gp.date) AS year,
      c.name AS constructor,
      c.id AS constructorId,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      SUM(${totalPts()}) AS points
    FROM results r
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN entrants e ON r.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE r.driver_id = ?
    GROUP BY YEAR(gp.date), c.id
    ORDER BY year DESC
  `, [driverId]);
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
      c.id, c.name, c.shortName, c.current,
      n.adjective AS nationality,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
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
    GROUP BY c.id
    ORDER BY wins DESC
  `);
}

export async function getConstructorById(id: number): Promise<(Constructor & ConstructorStats) | null> {
  const rows = await query<Constructor & ConstructorStats>(`
    SELECT
      c.id, COALESCE(NULLIF(c.name,''), c.shortName) AS name, c.shortName, c.current,
      n.adjective AS nationality,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
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
    WHERE c.id = ?
    GROUP BY c.id
  `, [id]);
  return rows[0] ?? null;
}

export async function getConstructorSeasons(constructorId: number) {
  return query<{
    year: number; races: number; wins: number; podiums: number; points: number; drivers: string;
  }>(`
    SELECT
      YEAR(gp.date) AS year,
      COUNT(DISTINCT r.grandprix_id) AS races,
      SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums,
      SUM(${totalPts()}) AS points,
      GROUP_CONCAT(DISTINCT CONCAT(d.firstName, ' ', d.surname) ORDER BY d.surname SEPARATOR ', ') AS drivers
    FROM entrants e
    JOIN constructors c ON e.constructor_id = c.id
    JOIN results r ON r.entrant_id = e.id
    JOIN grandsprix gp ON r.grandprix_id = gp.id
    JOIN drivers d ON r.driver_id = d.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r.driver_id
    WHERE c.id = ?
    GROUP BY YEAR(gp.date)
    ORDER BY year DESC
  `, [constructorId]);
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
      ci.name AS circuit, ci.city AS circuitCity,
      n.adjective AS country
    FROM grandsprix gp
    JOIN circuitlayouts cl ON gp.circuitlayout_id = cl.id
    JOIN circuits ci ON cl.circuit_id = ci.id
    JOIN nationalities n ON ci.nationality_id = n.id
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

export async function getAllSeasons(): Promise<{ year: number; races: number; drivers: number; winner: string | null }[]> {
  const [seasons, winners] = await Promise.all([
    query<{ year: number; races: number; drivers: number }>(`
      SELECT YEAR(gp.date) AS year, COUNT(DISTINCT gp.id) AS races, COUNT(DISTINCT r.driver_id) AS drivers
      FROM grandsprix gp JOIN results r ON r.grandprix_id = gp.id
      GROUP BY YEAR(gp.date) ORDER BY year DESC
    `),
    // Race-only points for champion (sprint/FL never changed a championship result;
    // omitting those joins keeps this from 10s → 0.1s)
    query<{ year: number; winner: string }>(`
      WITH season_pts AS (
        SELECT YEAR(gp.date) AS year, r.driver_id, SUM(${racePts()}) AS pts
        FROM results r JOIN grandsprix gp ON r.grandprix_id = gp.id
        GROUP BY YEAR(gp.date), r.driver_id
      )
      SELECT sp.year, CONCAT(d.firstName, ' ', d.surname) AS winner
      FROM season_pts sp
      JOIN drivers d ON d.id = sp.driver_id
      WHERE sp.pts = (SELECT MAX(pts) FROM season_pts sp2 WHERE sp2.year = sp.year)
      GROUP BY sp.year
      ORDER BY sp.year DESC
    `),
  ]);
  const winnerMap = new Map(winners.map((w) => [w.year, w.winner]));
  return seasons.map((s) => ({ ...s, winner: winnerMap.get(s.year) ?? null }));
}

export async function getSeasonRaces(year: number): Promise<Race[]> {
  return query<Race>(`
    SELECT
      gp.id, gp.date, gp.shortTitle, gp.fullTitle, gp.laps, gp.sprint,
      ci.name AS circuit, ci.city AS circuitCity,
      n.adjective AS country
    FROM grandsprix gp
    JOIN circuitlayouts cl ON gp.circuitlayout_id = cl.id
    JOIN circuits ci ON cl.circuit_id = ci.id
    JOIN nationalities n ON ci.nationality_id = n.id
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
      SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS podiums
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

export async function getRecords() {
  const [wins, podiums, poles, fastestLaps, points, races] = await Promise.all([
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             SUM(CASE WHEN r.place = '1' THEN 1 ELSE 0 END) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC LIMIT 20
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             SUM(CASE WHEN r.place IN ('1','2','3') THEN 1 ELSE 0 END) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC LIMIT 20
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM poletimes pt
      JOIN grandsprix gp ON pt.grandprix_id = gp.id
      JOIN results r ON r.grandprix_id = gp.id AND r.grid = '1'
      JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id ORDER BY value DESC LIMIT 20
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM fastestlaps fl JOIN drivers d ON fl.driver_id = d.id
      GROUP BY d.id ORDER BY value DESC LIMIT 20
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
      GROUP BY d.id HAVING value > 0 ORDER BY value DESC LIMIT 20
    `),
    query<{ driverId: number; name: string; value: number }>(`
      SELECT d.id AS driverId, CONCAT(d.firstName, ' ', d.surname) AS name,
             COUNT(*) AS value
      FROM results r JOIN drivers d ON r.driver_id = d.id
      GROUP BY d.id ORDER BY value DESC LIMIT 20
    `),
  ]);
  return { wins, podiums, poles, fastestLaps, points, races };
}

// ─── Teammate comparisons ──────────────────────────────────────────────────────

export async function getAllTeammatePairs(): Promise<{ driverAId: number; driverBId: number }[]> {
  return query(`
    SELECT DISTINCT
      LEAST(r1.driver_id, r2.driver_id) AS driverAId,
      GREATEST(r1.driver_id, r2.driver_id) AS driverBId
    FROM results r1
    JOIN results r2
      ON r2.entrant_id = r1.entrant_id
      AND r2.grandprix_id = r1.grandprix_id
      AND r2.driver_id > r1.driver_id
    ORDER BY driverAId, driverBId
  `);
}

export async function getTeammateComparison(driverAId: number, driverBId: number): Promise<SharedSeason[]> {
  // r1 is whichever driver (A or B) is in the outer loop; r2 is the teammate
  const rp = racePts("r1", "gp");
  const fl = flBonus("r1", "gp", "fl");
  const sp = sprintPts("s", "gp");
  return query<SharedSeason>(`
    SELECT
      YEAR(gp.date) AS year,
      c.name AS constructor,
      c.id AS constructorId,
      SUM(CASE WHEN r1.driver_id = ? THEN 1 ELSE 0 END) AS aRaces,
      SUM(CASE WHEN r1.driver_id = ? AND r1.place = '1' THEN 1 ELSE 0 END) AS aWins,
      SUM(CASE WHEN r1.driver_id = ? AND r1.place IN ('1','2','3') THEN 1 ELSE 0 END) AS aPodiums,
      SUM(CASE WHEN r1.driver_id = ? THEN (${rp}) + (${fl}) + (${sp}) ELSE 0 END) AS aPoints,
      SUM(CASE WHEN r1.driver_id = ? THEN 1 ELSE 0 END) AS bRaces,
      SUM(CASE WHEN r1.driver_id = ? AND r1.place = '1' THEN 1 ELSE 0 END) AS bWins,
      SUM(CASE WHEN r1.driver_id = ? AND r1.place IN ('1','2','3') THEN 1 ELSE 0 END) AS bPodiums,
      SUM(CASE WHEN r1.driver_id = ? THEN (${rp}) + (${fl}) + (${sp}) ELSE 0 END) AS bPoints
    FROM results r1
    JOIN results r2
      ON r2.entrant_id = r1.entrant_id
      AND r2.grandprix_id = r1.grandprix_id
      AND r2.driver_id != r1.driver_id
    JOIN grandsprix gp ON r1.grandprix_id = gp.id
    JOIN entrants e ON r1.entrant_id = e.id
    JOIN constructors c ON e.constructor_id = c.id
    LEFT JOIN fastestlaps fl ON fl.grandprix_id = gp.id AND fl.driver_id = r1.driver_id
    LEFT JOIN sprints s ON s.grandprix_id = gp.id AND s.driver_id = r1.driver_id
    WHERE r1.driver_id IN (?, ?)
      AND r2.driver_id IN (?, ?)
    GROUP BY YEAR(gp.date), c.id
    ORDER BY year
  `, [
    driverAId, driverAId, driverAId, driverAId,
    driverBId, driverBId, driverBId, driverBId,
    driverAId, driverBId, driverAId, driverBId,
  ]);
}
