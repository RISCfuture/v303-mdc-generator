#!/usr/bin/env node

/**
 * Integrate DCS Datamine Export
 *
 * This script processes JSON files exported by the v303-datamine-hook.lua
 * and generates munitions.json and airframe files compatible with the
 * v303 MDC Generator project.
 *
 * Usage:
 *   node integrate-dcs-export.js <export-dir>
 *
 * Arguments:
 *   export-dir    Path to directory containing launchers.json and aircraft.json
 *                 exported from DCS (typically Saved Games\DCS\v303-datamine\)
 *
 * Example:
 *   node integrate-dcs-export.js ~/Dropbox/DCS/v303-datamine
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KG_TO_LBS = 2.20462;

// Default fuel levels by aircraft type (in lbs)
const DEFAULT_FUEL_LEVELS = {
  fighter: { joker: 3000, bingo: 2000 },
  attacker: { joker: 4000, bingo: 2500 },
  heavy: { joker: 10000, bingo: 7000 },
  default: { joker: 3000, bingo: 2000 }
};

/**
 * Print usage information and exit
 */
function printUsage() {
  console.log(`
Usage: node integrate-dcs-export.js <export-dir>

Arguments:
  export-dir    Path to directory containing launchers.json and aircraft.json
                exported from DCS (typically Saved Games\\DCS\\v303-datamine\\)

Example:
  node integrate-dcs-export.js ~/Dropbox/DCS/v303-datamine
  node integrate-dcs-export.js /path/to/exported/data
`);
  process.exit(1);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  // Filter out any flags (starting with -)
  const positionalArgs = args.filter(arg => !arg.startsWith('-'));

  if (positionalArgs.length === 0) {
    console.error('❌ Error: Missing required argument <export-dir>\n');
    printUsage();
  }

  return {
    exportDir: resolve(positionalArgs[0])
  };
}

/**
 * Categorize munition based on name and characteristics
 */
function categorizeMunition(clsid, displayName, attribute, dcsCategory) {
  const lowerName = (displayName || clsid).toLowerCase();

  // Check if this is a real fuel tank based on attribute
  // attribute is an array like [1, 3, 43, ...] where first element indicates type
  // 1 = fuel tank, 4 = smoke/oil tank
  let attributeFirst = null;
  if (attribute && Array.isArray(attribute) && attribute.length > 0) {
    attributeFirst = attribute[0];
  } else if (typeof attribute === 'string') {
    // Handle string format "{ 1, 3, 43, ... }"
    const match = attribute.match(/\{\s*(\d+)/);
    if (match) {
      attributeFirst = parseInt(match[1]);
    }
  }

  const isRealFuelTank = attributeFirst === 1 && dcsCategory !== 5 && dcsCategory !== 6;

  // Air-to-Air missiles
  if (lowerName.includes('aim-') || lowerName.includes('amraam') || lowerName.includes('sidewinder') ||
      lowerName.includes('r-27') || lowerName.includes('r-73') || lowerName.includes('r-77') ||
      lowerName.includes('pl-') || lowerName.includes('magic') || lowerName.includes('mica')) {
    return 'air-to-air';
  }

  // Air-to-Ground missiles
  if (lowerName.includes('agm-') || lowerName.includes('maverick') || lowerName.includes('harm') ||
      lowerName.includes('kh-') || lowerName.includes('vikhr') || lowerName.includes('atgm') ||
      lowerName.includes('hellfire') || lowerName.includes('brimstone')) {
    return 'air-to-ground';
  }

  // Bombs
  if (lowerName.includes('gbu-') || lowerName.includes('mk-8') || lowerName.includes('mk 8') ||
      lowerName.includes('fab-') || lowerName.includes('betab') || lowerName.includes('kmgu') ||
      lowerName.includes('cbu-') || lowerName.includes('bdu-') || lowerName.includes('jdam') ||
      lowerName.includes('bomb') || lowerName.includes('ofab')) {
    return 'air-to-ground';
  }

  // Rockets and rocket pods
  if (lowerName.includes('hydra') || lowerName.includes('s-8') || lowerName.includes('s-13') ||
      lowerName.includes('s-24') || lowerName.includes('s-25') || lowerName.includes('rocket') ||
      lowerName.includes('lau-') || lowerName.includes('b-8') || lowerName.includes('b-13') ||
      lowerName.includes('zuni')) {
    return 'rack';
  }

  // Fuel tanks (only if attribute confirms it's a fuel tank)
  if (isRealFuelTank || lowerName.includes('fuel') || lowerName.includes('tank') ||
      lowerName.includes('gal') || lowerName.includes('ptb') || lowerName.includes('dft')) {
    if (isRealFuelTank || (!lowerName.includes('smoke') && !lowerName.includes('oil'))) {
      return 'fuel';
    }
  }

  // Pods
  if (lowerName.includes('pod') || lowerName.includes('litening') || lowerName.includes('sniper') ||
      lowerName.includes('targeting') || lowerName.includes('tgp') || lowerName.includes('ecm') ||
      lowerName.includes('alq-') || lowerName.includes('hts') || lowerName.includes('acmi')) {
    return 'pod';
  }

  // Racks and launchers
  if (lowerName.includes('bru-') || lowerName.includes('ter-') || lowerName.includes('mer-') ||
      lowerName.includes('apu-') || lowerName.includes('rack') || lowerName.includes('ejector') ||
      lowerName.includes('pylon')) {
    return 'rack';
  }

  // Default to rack if uncertain
  return 'rack';
}

/**
 * Process launchers export into munitions.json format
 */
function processLaunchers(launchersData) {
  console.log('\n📦 Processing launchers...');

  const munitions = {
    'EMPTY': {
      id: 'EMPTY',
      name: '(empty)',
      shortName: 'Empty',
      weight: 0,
      category: 'empty'
    }
  };

  const launchers = launchersData.launchers || {};
  let count = 0;
  let fuelTanksWithData = 0;
  let fuelTanksWithoutData = 0;

  for (const [clsid, data] of Object.entries(launchers)) {
    const weightKg = data.weight || 0;
    const weightLbs = Math.round(weightKg * KG_TO_LBS);

    const emptyWeightKg = data.weightEmpty;
    const emptyWeightLbs = emptyWeightKg !== null && emptyWeightKg !== undefined
      ? Math.round(emptyWeightKg * KG_TO_LBS)
      : null;

    const category = categorizeMunition(clsid, data.displayName, data.attribute, data.category);

    const munition = {
      id: clsid,
      name: data.displayName || clsid,
      weight: weightLbs,
      category
    };

    // Calculate additional fuel for fuel tanks
    if (category === 'fuel') {
      // Check attribute for real fuel tank
      let isRealFuelTank = false;
      const attr = data.attribute;
      if (attr && Array.isArray(attr) && attr.length > 0) {
        isRealFuelTank = attr[0] === 1 && data.category !== 5 && data.category !== 6;
      } else if (typeof attr === 'string') {
        const match = attr.match(/\{\s*(\d+)/);
        if (match) {
          isRealFuelTank = parseInt(match[1]) === 1 && data.category !== 5 && data.category !== 6;
        }
      }

      if (isRealFuelTank && emptyWeightLbs !== null && weightLbs > emptyWeightLbs) {
        munition.additionalFuel = weightLbs - emptyWeightLbs;
        fuelTanksWithData++;
      } else {
        fuelTanksWithoutData++;
      }
    }

    munitions[clsid] = munition;
    count++;
  }

  console.log(`  ✓ Processed ${count} launchers`);
  console.log(`  📊 Fuel tanks with fuel data: ${fuelTanksWithData}`);
  console.log(`  ⚠️  Fuel tanks without fuel data: ${fuelTanksWithoutData}`);

  return munitions;
}

/**
 * Calculate step value based on frequency range
 */
function calculateStep(min, max) {
  if (min === null || max === null) {
    return 1;
  }

  const vhfFmMin = 30;
  const vhfFmMax = 88;
  const airbandMin = 108;
  const airbandMax = 400;

  const overlapsVhfFm = max >= vhfFmMin && min <= vhfFmMax;
  const overlapsAirband = max >= airbandMin && min <= airbandMax;

  if (overlapsVhfFm && overlapsAirband) {
    return 0.025;
  }
  if (overlapsAirband) {
    return 0.025;
  }
  if (overlapsVhfFm) {
    return 0.1;
  }

  return 1;
}

/**
 * Determine aircraft category for default fuel levels
 */
function categorizeAircraft(displayName) {
  const name = (displayName || '').toString().toLowerCase();

  if (name.includes('fighter') || name.includes('f-15') || name.includes('f-14') ||
      name.includes('mirage') || name.includes('mig')) {
    return 'fighter';
  }

  if (name.includes('attacker') || name.includes('a-10') || name.includes('av-8') ||
      name.includes('su-25') || name.includes('harrier')) {
    return 'attacker';
  }

  if (name.includes('bomber') || name.includes('b-') || name.includes('tu-') ||
      name.includes('c-130') || name.includes('kc-')) {
    return 'heavy';
  }

  return 'default';
}

/**
 * Process aircraft export into airframe files
 */
function processAircraft(aircraftData, munitionsDb) {
  console.log('\n✈️  Processing aircraft...');

  const aircraft = aircraftData.aircraft || {};
  const airframes = {};
  let count = 0;
  let skipped = 0;
  let totalInvalidCLSIDs = 0;
  const allInvalidCLSIDs = new Set();

  for (const [aircraftId, data] of Object.entries(aircraft)) {
    // Convert weights from kg to lbs
    const emptyWeight = Math.round((data.M_empty || 0) * KG_TO_LBS);
    const maxTakeoffWeight = Math.round((data.M_max || 0) * KG_TO_LBS);
    const internalFuel = Math.round((data.M_fuel_max || 0) * KG_TO_LBS);

    // Countermeasures
    let cmdsCapacity = 0;
    let chaffIncrement = 1;
    let flareIncrement = 1;
    let defaultChaff = 0;
    let defaultFlare = 0;

    if (data.passivCounterm) {
      const cm = data.passivCounterm;
      cmdsCapacity = cm.SingleChargeTotal || 0;

      if (cm.chaff) {
        chaffIncrement = cm.chaff.increment || 1;
        defaultChaff = cm.chaff.default || 0;
      }
      if (cm.flare) {
        flareIncrement = cm.flare.increment || 1;
        defaultFlare = cm.flare.default || 0;
      }
    }

    // Radios - add step calculation
    // Handle case where empty radios is {} instead of [] (Lua JSON encoding quirk)
    const radiosArray = Array.isArray(data.radios) ? data.radios : [];
    const radios = radiosArray.map(radio => ({
      ...radio,
      step: calculateStep(radio.min, radio.max)
    }));

    // Guns - handle Lua JSON encoding quirk where empty table is {} instead of []
    const guns = Array.isArray(data.guns) ? data.guns : [];

    // Stations - filter invalid CLSIDs and convert format
    const stations = [];
    let invalidCount = 0;
    const invalidCLSIDs = new Set();
    const stationsArray = Array.isArray(data.stations) ? data.stations : [];

    for (const station of stationsArray) {
      const validMunitions = station.munitions.filter(clsid => {
        if (munitionsDb[clsid]) {
          return true;
        } else {
          invalidCount++;
          invalidCLSIDs.add(clsid);
          return false;
        }
      });

      if (validMunitions.length > 0) {
        stations.push({
          station: station.number,
          name: station.name,
          munitions: validMunitions
        });
      }
    }

    if (invalidCount > 0) {
      console.log(`  ⚠️  ${aircraftId}: Filtered ${invalidCount} invalid CLSID(s)`);
      totalInvalidCLSIDs += invalidCount;
      invalidCLSIDs.forEach(clsid => allInvalidCLSIDs.add(clsid));
    }

    // Skip if insufficient data
    if (emptyWeight === 0 || stations.length === 0) {
      skipped++;
      continue;
    }

    // Default fuel levels
    const category = categorizeAircraft(data.displayName);
    const fuelDefaults = DEFAULT_FUEL_LEVELS[category];

    const airframeData = {
      aircraft: aircraftId,
      displayName: data.displayName || aircraftId,
      isHelicopter: data.isHelicopter || false,
      emptyWeight,
      maxTakeoffWeight,
      internalFuel,
      cmdsCapacity,
      chaffIncrement,
      flareIncrement,
      defaultChaff,
      defaultFlare,
      defaultJoker: fuelDefaults.joker,
      defaultBingo: fuelDefaults.bingo,
      radios,
      guns,
      stations
    };

    // Add ammoTypes if present
    if (data.ammoTypes && data.ammoTypes.length > 0) {
      airframeData.ammoTypes = data.ammoTypes;
    }

    airframes[aircraftId] = airframeData;
    count++;

    console.log(`  ✓ ${aircraftId} (${data.displayName}) - ${stations.length} stations`);
  }

  console.log(`\n  📊 Processed ${count} aircraft, skipped ${skipped}`);
  if (totalInvalidCLSIDs > 0) {
    console.log(`  ⚠️  Total invalid CLSIDs filtered: ${totalInvalidCLSIDs}`);
  }

  return airframes;
}

/**
 * Load and apply overrides from override files
 */
function applyMunitionsOverrides(munitions, overridesPath) {
  if (!existsSync(overridesPath)) {
    return munitions;
  }

  try {
    const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
    let appliedCount = 0;

    for (const [key, value] of Object.entries(overrides)) {
      // Skip JSON schema reference
      if (key === '$schema') continue;

      // Parse "CLSID.property" format (e.g., "ALQ_184.shortName")
      const lastDotIndex = key.lastIndexOf('.');
      if (lastDotIndex > 0) {
        const clsid = key.substring(0, lastDotIndex);
        const property = key.substring(lastDotIndex + 1);
        if (munitions[clsid]) {
          munitions[clsid][property] = value;
          appliedCount++;
        }
      } else {
        // Direct CLSID override (full object)
        if (munitions[key]) {
          Object.assign(munitions[key], value);
          appliedCount++;
        } else {
          // Add new entries from overrides
          munitions[key] = { id: key, ...value };
          appliedCount++;
        }
      }
    }

    console.log(`  ✓ Applied ${appliedCount} munitions overrides`);
  } catch (error) {
    console.error(`  ⚠️  Failed to apply munitions overrides: ${error.message}`);
  }

  return munitions;
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  console.log('🚀 v303 DCS Datamine Integration');
  console.log('='.repeat(70));

  // Check for export files
  const launchersPath = join(args.exportDir, 'launchers.json');
  const aircraftPath = join(args.exportDir, 'aircraft.json');

  if (!existsSync(launchersPath)) {
    console.error(`\n❌ Launchers export not found: ${launchersPath}`);
    console.error('   Copy launchers.json from your Windows DCS export directory.');
    process.exit(1);
  }

  if (!existsSync(aircraftPath)) {
    console.error(`\n❌ Aircraft export not found: ${aircraftPath}`);
    console.error('   Copy aircraft.json from your Windows DCS export directory.');
    process.exit(1);
  }

  // Load exports
  console.log('\n📂 Loading export files...');
  const launchersExport = JSON.parse(readFileSync(launchersPath, 'utf8'));
  const aircraftExport = JSON.parse(readFileSync(aircraftPath, 'utf8'));

  console.log(`  ✓ Launchers: ${launchersExport.count} entries (DCS ${launchersExport.version})`);
  console.log(`  ✓ Aircraft: ${aircraftExport.count} entries (DCS ${aircraftExport.version})`);

  // Process launchers
  let munitions = processLaunchers(launchersExport);

  // Apply munitions overrides
  const munitionsOverridesPath = join(__dirname, '../../src/data/json/munitions-overrides.json');
  if (existsSync(munitionsOverridesPath)) {
    console.log('\n🔧 Applying munitions overrides...');
    munitions = applyMunitionsOverrides(munitions, munitionsOverridesPath);
  }

  // Write munitions.json
  const munitionsOutputPath = join(__dirname, '../../src/data/json/munitions.json');
  writeFileSync(munitionsOutputPath, JSON.stringify(munitions, null, 2));
  console.log(`\n📝 Written munitions.json (${Object.keys(munitions).length} entries)`);

  // Process aircraft
  const airframes = processAircraft(aircraftExport, munitions);

  // Write individual airframe files
  const airframesDir = join(__dirname, '../../src/data/json/airframes');
  mkdirSync(airframesDir, { recursive: true });

  console.log('\n📝 Writing airframe files...');
  for (const [aircraftId, airframe] of Object.entries(airframes)) {
    const outputPath = join(airframesDir, `${aircraftId}.json`);
    writeFileSync(outputPath, JSON.stringify(airframe, null, 2));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`✅ Integration complete!`);
  console.log(`   📦 Munitions: ${Object.keys(munitions).length}`);
  console.log(`   ✈️  Aircraft: ${Object.keys(airframes).length}`);

  // Category breakdown
  const categories = {};
  Object.values(munitions).forEach(m => {
    categories[m.category] = (categories[m.category] || 0) + 1;
  });

  console.log('\n📊 Munitions by category:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
}

main().catch(console.error);
