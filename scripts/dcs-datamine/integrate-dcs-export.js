#!/usr/bin/env node

/**
 * Integrate DCS Datamine Export
 *
 * Merges data from two sources into munitions.json and airframe files:
 *   - aircraft.json + launchers.json (from DCS hook, runtime _G.db data)
 *   - disk-data.json (from extract-disk-data.py, parsed cockpit Lua files)
 *
 * For radios: disk data is primary (has step values, catches radios panelRadio
 * omits like AH-64D HF). In-game panelRadio fills in the rest.
 *
 * For everything else (weights, guns, stations, countermeasures): in-game is
 * the only source.
 *
 * Usage:
 *   node integrate-dcs-export.js <export-dir>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KG_TO_LBS = 2.20462;

// ─── Args ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('-'));
  if (positionalArgs.length === 0) {
    console.error('Usage: node integrate-dcs-export.js <export-dir>');
    process.exit(1);
  }
  return { exportDir: resolve(positionalArgs[0]) };
}

// ─── Munitions ───────────────────────────────────────────────────────────────

function categorizeMunition(clsid, displayName, attribute, dcsCategory) {
  const n = (displayName || clsid).toLowerCase();

  let attrFirst = null;
  if (Array.isArray(attribute) && attribute.length > 0) {
    attrFirst = attribute[0];
  } else if (typeof attribute === 'string') {
    const m = attribute.match(/\{\s*(\d+)/);
    if (m) attrFirst = parseInt(m[1]);
  }
  const isRealFuelTank = attrFirst === 1 && dcsCategory !== 5 && dcsCategory !== 6;

  if (/aim-|amraam|sidewinder|r-27|r-73|r-77|pl-|magic|mica/.test(n)) return 'air-to-air';
  if (/agm-|maverick|harm|kh-|vikhr|atgm|hellfire|brimstone/.test(n)) return 'air-to-ground';
  if (/gbu-|mk-8|mk 8|fab-|betab|kmgu|cbu-|bdu-|jdam|bomb|ofab/.test(n)) return 'air-to-ground';
  if (/hydra|s-8|s-13|s-24|s-25|rocket|lau-|b-8|b-13|zuni/.test(n)) return 'rack';
  if (isRealFuelTank || /fuel|tank|gal|ptb|dft/.test(n)) {
    if (isRealFuelTank || (!/smoke|oil/.test(n))) return 'fuel';
  }
  if (/pod|litening|sniper|targeting|tgp|ecm|alq-|hts|acmi/.test(n)) return 'pod';
  if (/bru-|ter-|mer-|apu-|rack|ejector|pylon/.test(n)) return 'rack';
  return 'rack';
}

function processLaunchers(launchersData) {
  const munitions = {
    EMPTY: { id: 'EMPTY', name: '(empty)', shortName: 'Empty', weight: 0, category: 'empty' }
  };

  for (const [clsid, data] of Object.entries(launchersData.launchers || {})) {
    const weightLbs = Math.round((data.weight || 0) * KG_TO_LBS);
    const emptyWeightLbs = data.weightEmpty != null ? Math.round(data.weightEmpty * KG_TO_LBS) : null;
    const category = categorizeMunition(clsid, data.displayName, data.attribute, data.category);

    const munition = { id: clsid, name: data.displayName || clsid, weight: weightLbs, category };

    if (category === 'fuel' && emptyWeightLbs !== null && weightLbs > emptyWeightLbs) {
      munition.additionalFuel = weightLbs - emptyWeightLbs;
    }

    munitions[clsid] = munition;
  }

  return munitions;
}

function applyOverrides(munitions, overridesPath) {
  if (!existsSync(overridesPath)) return;

  const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
  let count = 0;

  for (const [key, value] of Object.entries(overrides)) {
    if (key === '$schema') continue;

    const lastDot = key.lastIndexOf('.');
    if (lastDot > 0) {
      const clsid = key.substring(0, lastDot);
      const prop = key.substring(lastDot + 1);
      if (munitions[clsid]) { munitions[clsid][prop] = value; count++; }
    } else if (munitions[key]) {
      Object.assign(munitions[key], value); count++;
    } else {
      munitions[key] = { id: key, ...value }; count++;
    }
  }

  console.log(`  ✓ Applied ${count} munitions overrides`);
}

// ─── Radios merge ────────────────────────────────────────────────────────────

function findDiskRadios(aircraftId, diskData) {
  const diskRadios = diskData?.radios?.aircraft;
  if (!diskRadios) return null;

  // Exact match, then prefix match (e.g. AH-64D_BLK_II → AH-64D)
  if (diskRadios[aircraftId]) return diskRadios[aircraftId];
  for (const mod of Object.keys(diskRadios)) {
    if (aircraftId.startsWith(mod) || mod.startsWith(aircraftId)) return diskRadios[mod];
  }
  return null;
}

function mergeRadios(inGameRadios, diskRadios) {
  // Disk is primary: start with disk radios, then add any in-game radios
  // whose range isn't already covered.
  if (!diskRadios || diskRadios.length === 0) {
    return inGameRadios.map(r => ({ ...r, step: r.step ?? null }));
  }

  const overlap = (a, b) =>
    a.min != null && a.max != null && b.min != null && b.max != null &&
    a.min <= b.max && b.min <= a.max;

  // Build merged list starting from disk
  const merged = diskRadios.map((dr, i) => {
    // Find matching in-game radio to get its description (panelRadio names
    // are often better, e.g. "ARC-186" vs "VHF AM")
    const match = inGameRadios.find(ig => overlap(ig, dr));
    return {
      name: `COM ${i + 1}`,
      description: match?.description || dr.displayName,
      presetCount: match?.presetCount ?? dr.presetCount ?? 0,
      min: dr.min ?? match?.min,
      max: dr.max ?? match?.max,
      step: dr.step ?? match?.step ?? null,
    };
  });

  // Add in-game radios not covered by any disk radio.
  // Track which in-game radios were already matched so that duplicate ranges
  // (e.g. FM1 + FM2 both at 30-87.975) are each matched at most once.
  const matchedInGame = new Set();
  for (const dr of diskRadios) {
    const idx = inGameRadios.findIndex((ig, i) => !matchedInGame.has(i) && overlap(ig, dr));
    if (idx >= 0) matchedInGame.add(idx);
  }

  for (let i = 0; i < inGameRadios.length; i++) {
    if (!matchedInGame.has(i)) {
      const ig = inGameRadios[i];
      merged.push({
        name: `COM ${merged.length + 1}`,
        description: ig.description,
        presetCount: ig.presetCount ?? 0,
        min: ig.min,
        max: ig.max,
        step: ig.step ?? null,
      });
    }
  }

  return merged;
}

// ─── Aircraft ────────────────────────────────────────────────────────────────

function processAircraft(aircraftData, munitionsDb, diskData) {
  const aircraft = aircraftData.aircraft || {};
  const airframes = {};
  let totalInvalid = 0;

  for (const [id, data] of Object.entries(aircraft)) {
    const emptyWeight = Math.round((data.M_empty || 0) * KG_TO_LBS);
    const maxTakeoffWeight = Math.round((data.M_max || 0) * KG_TO_LBS);
    const internalFuel = Math.round((data.M_fuel_max || 0) * KG_TO_LBS);

    // Countermeasures
    const cm = data.passivCounterm || {};
    const cmdsCapacity = cm.SingleChargeTotal || 0;
    const chaffIncrement = cm.chaff?.increment || 1;
    const flareIncrement = cm.flare?.increment || 1;
    const defaultChaff = cm.chaff?.default || 0;
    const defaultFlare = cm.flare?.default || 0;

    // Radios — merge in-game + disk, disk is primary
    const inGameRadios = Array.isArray(data.radios) ? data.radios : [];
    const diskRadios = findDiskRadios(id, diskData);
    const radios = mergeRadios(inGameRadios, diskRadios);

    // Guns
    const guns = Array.isArray(data.guns) ? data.guns : [];

    // Stations — filter invalid CLSIDs
    const stations = [];
    let invalidCount = 0;
    for (const station of (Array.isArray(data.stations) ? data.stations : [])) {
      const valid = station.munitions.filter(c => {
        if (munitionsDb[c]) return true;
        invalidCount++;
        return false;
      });
      if (valid.length > 0) {
        stations.push({ station: station.number, name: station.name, munitions: valid });
      }
    }

    if (invalidCount > 0) {
      console.log(`  ⚠️  ${id}: Filtered ${invalidCount} invalid CLSID(s)`);
      totalInvalid += invalidCount;
    }

    if (emptyWeight === 0 || stations.length === 0) continue;

    const airframe = {
      aircraft: id,
      displayName: data.displayName || id,
      isHelicopter: data.isHelicopter || false,
      emptyWeight, maxTakeoffWeight, internalFuel,
      cmdsCapacity, chaffIncrement, flareIncrement, defaultChaff, defaultFlare,
      defaultJoker: 3000, defaultBingo: 2000,
      radios, guns, stations,
    };

    if (data.ammoTypes?.length > 0) airframe.ammoTypes = data.ammoTypes;

    airframes[id] = airframe;
    console.log(`  ✓ ${id} (${data.displayName}) - ${stations.length} stations, ${radios.length} radios`);
  }

  if (totalInvalid > 0) console.log(`  ⚠️  Total invalid CLSIDs filtered: ${totalInvalid}`);
  return airframes;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  console.log('v303 DCS Datamine Integration');
  console.log('='.repeat(60));

  const launchersPath = join(args.exportDir, 'launchers.json');
  const aircraftPath = join(args.exportDir, 'aircraft.json');
  const diskDataPath = join(args.exportDir, 'disk-data.json');

  for (const [_name, path] of [['launchers.json', launchersPath], ['aircraft.json', aircraftPath]]) {
    if (!existsSync(path)) {
      console.error(`Missing: ${path}`);
      process.exit(1);
    }
  }

  // Load sources
  const launchersExport = JSON.parse(readFileSync(launchersPath, 'utf8'));
  const aircraftExport = JSON.parse(readFileSync(aircraftPath, 'utf8'));
  const diskData = existsSync(diskDataPath) ? JSON.parse(readFileSync(diskDataPath, 'utf8')) : null;

  console.log(`  Launchers: ${launchersExport.count} (DCS ${launchersExport.version})`);
  console.log(`  Aircraft: ${aircraftExport.count}`);
  if (diskData) console.log(`  Disk data: ${diskData.radios?.count || 0} radios from ${Object.keys(diskData.radios?.aircraft || {}).length} modules`);

  // Munitions
  const munitions = processLaunchers(launchersExport);
  const overridesPath = join(__dirname, '../../src/data/json/munitions-overrides.json');
  applyOverrides(munitions, overridesPath);
  writeFileSync(join(__dirname, '../../src/data/json/munitions.json'), JSON.stringify(munitions, null, 2));
  console.log(`\n  Munitions: ${Object.keys(munitions).length}`);

  // Aircraft
  const airframes = processAircraft(aircraftExport, munitions, diskData);
  const airframesDir = join(__dirname, '../../src/data/json/airframes');
  mkdirSync(airframesDir, { recursive: true });
  for (const [id, airframe] of Object.entries(airframes)) {
    writeFileSync(join(airframesDir, `${id}.json`), JSON.stringify(airframe, null, 2));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done: ${Object.keys(munitions).length} munitions, ${Object.keys(airframes).length} aircraft`);
}

main().catch(console.error);
