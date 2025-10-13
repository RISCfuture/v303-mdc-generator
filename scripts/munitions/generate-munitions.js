#!/usr/bin/env node

/**
 * Generate munitions.json from Quaggles DCS Lua Datamine
 *
 * This script fetches ALL weapon and launcher data using DCS CLSIDs (stable identifiers)
 * from the Quaggles DCS Lua Datamine repository and generates a comprehensive
 * munitions database for all aircraft and weapon systems.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUAGGLES_BASE_URL = 'https://raw.githubusercontent.com/Quaggles/dcs-lua-datamine/master';
const GITHUB_API_URL = 'https://api.github.com/repos/Quaggles/dcs-lua-datamine';
const KG_TO_LBS = 2.20462;

/**
 * Parse Lua table into JavaScript object
 */
function parseLuaTable(luaContent) {
  const result = {};

  // Extract key-value pairs from Lua table
  const lines = luaContent.split('\n');

  for (const line of lines) {
    // Match patterns like: ["key"] = value,
    const stringKeyMatch = line.match(/\["([^"]+)"\]\s*=\s*(.+?),?\s*$/);
    if (stringKeyMatch) {
      const [, key, value] = stringKeyMatch;
      result[key] = parseLuaValue(value);
      continue;
    }

    // Match patterns like: key = value,
    const simpleKeyMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?),?\s*$/);
    if (simpleKeyMatch) {
      const [, key, value] = simpleKeyMatch;
      result[key] = parseLuaValue(value);
    }
  }

  return result;
}

/**
 * Parse a Lua value to JavaScript
 */
function parseLuaValue(value) {
  value = value.trim().replace(/,$/, '');

  // String
  if (value.startsWith('"') || value.startsWith("'")) {
    return value.slice(1, -1);
  }

  // Number
  if (!isNaN(value)) {
    return parseFloat(value);
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Table (simplified - just return raw for now)
  if (value.startsWith('{')) {
    return value;
  }

  return value;
}

/**
 * Fetch a file from Quaggles repository
 */
async function fetchQuagglesFile(path) {
  const url = `${QUAGGLES_BASE_URL}${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (_error) {
    return null;
  }
}

/**
 * Fetch ALL files using Git Trees API (no 1000 file limit)
 */
async function fetchAllLauncherFiles() {
  console.log('📂 Fetching complete launcher file list using Git Trees API...');

  try {
    // First, get the default branch's SHA
    const repoUrl = `${GITHUB_API_URL}`;
    const repoResponse = await fetch(repoUrl);
    if (!repoResponse.ok) {
      console.error(`Failed to fetch repo info: ${repoResponse.status}`);
      return [];
    }
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'master';

    // Get the tree SHA for the default branch
    const branchUrl = `${GITHUB_API_URL}/branches/${defaultBranch}`;
    const branchResponse = await fetch(branchUrl);
    if (!branchResponse.ok) {
      console.error(`Failed to fetch branch info: ${branchResponse.status}`);
      return [];
    }
    const branchData = await branchResponse.json();
    const treeSha = branchData.commit.commit.tree.sha;

    // Fetch the entire tree recursively
    const treeUrl = `${GITHUB_API_URL}/git/trees/${treeSha}?recursive=1`;
    const treeResponse = await fetch(treeUrl);
    if (!treeResponse.ok) {
      console.error(`Failed to fetch git tree: ${treeResponse.status}`);
      return [];
    }
    const treeData = await treeResponse.json();

    // Filter for launcher files
    const launcherFiles = treeData.tree
      .filter(item =>
        item.type === 'blob' &&
        item.path.startsWith('_G/launcher/') &&
        item.path.endsWith('.lua')
      )
      .map(item => ({
        name: item.path.replace('_G/launcher/', ''),
        path: item.path
      }));

    console.log(`📊 Found ${launcherFiles.length} launcher files (including files beyond API's 1000 limit)`);
    return launcherFiles;

  } catch (error) {
    console.error(`Error fetching git tree:`, error.message);
    return [];
  }
}

/**
 * Categorize munition based on name and characteristics
 */
function categorizeMunition(name, displayName) {
  const lowerName = (displayName || name).toLowerCase();

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
    return 'rack'; // Rocket pods are treated as racks
  }

  // Fuel tanks
  if (lowerName.includes('fuel') || lowerName.includes('tank') || lowerName.includes('gal') ||
      lowerName.includes('ptb') || lowerName.includes('dft')) {
    return 'fuel';
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

  // Default to rack if uncertain (many are launchers/racks)
  return 'rack';
}

/**
 * Extract munition data from Lua file
 */
function extractMunitionData(luaContent, fallbackClsid) {
  const data = parseLuaTable(luaContent);

  // Extract the actual CLSID from the file content (more accurate than filename)
  const clsidMatch = luaContent.match(/CLSID\s*=\s*"([^"]+)"/);
  const clsid = clsidMatch ? clsidMatch[1] : fallbackClsid;

  // Extract weight/mass (in kg)
  // Try different weight field names used in DCS
  const massKg = data.Weight || data.mass || data.weight || data.M_empty || 0;
  const weightLbs = Math.round(massKg * KG_TO_LBS);

  // Extract empty weight for fuel tanks (in kg)
  const emptyMassKg = data.Weight_Empty || data.weight_empty || data.emptyWeight || null;
  const emptyWeightLbs = emptyMassKg !== null ? Math.round(emptyMassKg * KG_TO_LBS) : null;

  // Check if this is a real fuel tank: attribute starts with { 1, ... AND no explicit category 5/6
  // Smoke/oil tanks have either attribute starting with { 4, ... OR explicit category 5/6
  // Note: attribute is not parsed as an array, it's a string like "{ 1, 3, 43, ... }"
  const attributeStr = data.attribute || '';
  const hasAttribute1 = typeof attributeStr === 'string' && attributeStr.trim().startsWith('{ 1,');
  const dcsCategory = data.category;
  const isRealFuelTank = hasAttribute1 && dcsCategory !== 5 && dcsCategory !== 6;

  // Extract name
  const name = data.display_name || data.displayName || data.name || clsid;

  // Categorize the munition
  const category = categorizeMunition(clsid, name);

  // Create short name (remove prefixes, simplify)
  let shortName = name
    .replace(/^(AGM|AIM|GBU|Mk\.?|BDU|CBU|LAU|BRU|TER|ALQ|AN\/|FAB|BETAB|KAB)/i, '')
    .replace(/ - .*$/, '') // Remove everything after " - "
    .trim();
  if (!shortName) shortName = name;

  const result = {
    id: clsid,
    name,
    shortName,
    weight: weightLbs,
    category
  };

  // Only add additionalFuel if attribute[0] = 1 (actual fuel tanks) and we have empty weight
  // This excludes smoke tanks (attribute[0] = 4) and other non-fuel items
  if (isRealFuelTank && emptyWeightLbs !== null && weightLbs > emptyWeightLbs) {
    result.additionalFuel = weightLbs - emptyWeightLbs;
  }

  return result;
}

/**
 * Fetch all munitions from the launcher directory
 */
async function fetchAllMunitions() {
  console.log('\n🚀 Fetching all munitions from Quaggles DCS Lua Datamine...\n');

  const launcherFiles = await fetchAllLauncherFiles();

  const munitions = {};
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;

  for (const file of launcherFiles) {
    const fileName = file.name;
    const clsid = fileName.replace('.lua', '');

    processedCount++;

    // Show progress every 100 files
    if (processedCount % 100 === 0) {
      console.log(`📈 Progress: ${processedCount}/${launcherFiles.length} files processed...`);
    }

    const content = await fetchQuagglesFile(`/_G/launcher/${fileName}`);

    if (content) {
      const data = extractMunitionData(content, clsid);
      munitions[data.id] = data;
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    if (processedCount % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n📊 Fetched ${successCount} munitions successfully, ${failCount} failed`);
  console.log(`💾 Total munitions with weight data: ${Object.values(munitions).filter(m => m.weight > 0).length}`);

  return munitions;
}

/**
 * Create special entries
 */
function createSpecialEntries() {
  return {
    'EMPTY': {
      id: 'EMPTY',
      name: '(empty)',
      shortName: 'Empty',
      weight: 0,
      category: 'empty'
    }
  };
}

/**
 * Report on fuel tanks that were processed
 */
function reportFuelTanks(munitions) {
  console.log('\n🔧 Fuel tank summary...');

  const fuelTanks = Object.entries(munitions).filter(([_, data]) => data.category === 'fuel');
  const tanksWithFuel = fuelTanks.filter(([_, data]) => data.additionalFuel !== undefined);
  const tanksWithoutFuel = fuelTanks.filter(([_, data]) => data.additionalFuel === undefined);

  console.log(`📊 Total fuel tanks: ${fuelTanks.length}`);
  console.log(`   ✓ With fuel data: ${tanksWithFuel.length}`);
  console.log(`   ⚠️  Without fuel data: ${tanksWithoutFuel.length}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Generating comprehensive munitions.json from Quaggles DCS Lua Datamine');
  console.log('=' .repeat(70));
  console.log('⚠️  This will fetch ALL munitions from the DCS data mine');
  console.log('⚠️  This may take several minutes...\n');

  const munitions = {
    ...createSpecialEntries(),
    ...(await fetchAllMunitions()),
  };

  // Report on fuel tanks
  reportFuelTanks(munitions);

  // Write to file
  const outputPath = join(__dirname, '../../src/data/json/munitions.json');
  writeFileSync(outputPath, JSON.stringify(munitions, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Generated ${Object.keys(munitions).length} munitions`);
  console.log(`📝 Written to: ${outputPath}`);

  // Summary by category
  const categories = {};
  Object.values(munitions).forEach(m => {
    categories[m.category] = (categories[m.category] || 0) + 1;
  });

  console.log('\n📊 Munitions by category:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });

  console.log('\n💡 Tip: Review munitions with weight: 0 - these may need manual updates');
}

main().catch(console.error);
