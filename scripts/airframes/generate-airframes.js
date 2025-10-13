#!/usr/bin/env node

/**
 * Generate airframe JSON files from Quaggles DCS Lua Datamine
 *
 * This script fetches aircraft data from the Quaggles DCS Lua Datamine repository
 * and generates complete airframe database files with weights, fuel, countermeasures,
 * radios, and station/pylon configurations with flat CLSID lists.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUAGGLES_BASE_URL = 'https://raw.githubusercontent.com/Quaggles/dcs-lua-datamine/master';
const GITHUB_API_URL = 'https://api.github.com/repos/Quaggles/dcs-lua-datamine';
const KG_TO_LBS = 2.20462;

// Default fuel levels by aircraft type (in lbs)
const DEFAULT_FUEL_LEVELS = {
  fighter: { joker: 3000, bingo: 2000 },
  attacker: { joker: 4000, bingo: 2500 },
  heavy: { joker: 10000, bingo: 7000 },
  default: { joker: 3000, bingo: 2000 }
};

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
 * Fetch directory listing from GitHub API
 */
async function fetchDirectoryListing(path) {
  const url = `${GITHUB_API_URL}/contents${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch directory listing: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.filter(item => item.type === 'file' && item.name.endsWith('.lua'));
  } catch (error) {
    console.error(`Error fetching directory listing:`, error.message);
    return [];
  }
}

/**
 * Extract a Lua table value using regex
 */
function extractLuaValue(content, key) {
  // Try various patterns for Lua key-value pairs
  const patterns = [
    new RegExp(`${key}\\s*=\\s*([\\d.]+)`, 'i'),
    new RegExp(`\\["${key}"\\]\\s*=\\s*([\\d.]+)`, 'i'),
    new RegExp(`${key}\\s*=\\s*"([^"]+)"`, 'i'),
    new RegExp(`${key}\\s*=\\s*'([^']+)'`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return isNaN(match[1]) ? match[1] : parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Extract a nested Lua table value by properly counting braces
 */
function extractNestedLuaValue(content, path) {
  // For paths like "passivCounterm.chaff.default"
  const keys = path.split('.');
  let searchContent = content;

  // Navigate through each level of the path
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Find where this key's table starts
    const keyIndex = searchContent.indexOf(`${key}\s*=\s*{`) !== -1
      ? searchContent.indexOf(`${key}\s*=\s*{`)
      : searchContent.search(new RegExp(`${key}\\s*=\\s*\\{`));

    if (keyIndex === -1) return null;

    // Find the opening brace
    let braceIndex = searchContent.indexOf('{', keyIndex);
    if (braceIndex === -1) return null;

    // Count braces to find the matching closing brace
    let depth = 0;
    let start = braceIndex;
    let end = braceIndex;

    for (let j = braceIndex; j < searchContent.length; j++) {
      if (searchContent[j] === '{') depth++;
      if (searchContent[j] === '}') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }

    // Extract the table content (between the braces)
    searchContent = searchContent.substring(start + 1, end);
  }

  // Extract the final value
  return extractLuaValue(searchContent, keys[keys.length - 1]);
}

/**
 * Extract frequency range from a radio's range table
 */
function extractFrequencyRange(radioContent) {
  // Find the range table
  const rangeIndex = radioContent.search(/range\s*=\s*\{/);
  if (rangeIndex === -1) {
    return { min: null, max: null };
  }

  // Find the range table content
  let braceIdx = radioContent.indexOf('{', rangeIndex);
  let depth = 0;
  let start = braceIdx;
  let end = braceIdx;

  for (let i = braceIdx; i < radioContent.length; i++) {
    if (radioContent[i] === '{') depth++;
    if (radioContent[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const rangeContent = radioContent.substring(start, end + 1);

  // Extract all min and max values from the range array
  const minMatches = rangeContent.matchAll(/min\s*=\s*([\d.]+)/g);
  const maxMatches = rangeContent.matchAll(/max\s*=\s*([\d.]+)/g);

  const mins = Array.from(minMatches, m => parseFloat(m[1]));
  const maxs = Array.from(maxMatches, m => parseFloat(m[1]));

  if (mins.length === 0 || maxs.length === 0) {
    return { min: null, max: null };
  }

  // Take superset: minimum of all mins, maximum of all maxs
  const min = Math.min(...mins);
  const max = Math.max(...maxs);

  return { min, max };
}

/**
 * Calculate step value based on frequency range
 * VHF FM (30-88 MHz) uses 0.1 MHz steps (100 kHz channels)
 * Airband (108-400 MHz) uses 0.025 MHz steps (25 kHz channels)
 * Other frequencies use 1 MHz steps
 *
 * For radios with wide ranges covering multiple bands, use the smallest step size
 */
function calculateStep(min, max) {
  if (min === null || max === null) {
    return 1;
  }

  // VHF FM (30-88 MHz) uses 0.1 MHz steps (100 kHz channels)
  const vhfFmMin = 30;
  const vhfFmMax = 88;

  // Airband (108-400 MHz) uses 0.025 MHz steps (25 kHz channels)
  const airbandMin = 108;
  const airbandMax = 400;

  const overlapsVhfFm = max >= vhfFmMin && min <= vhfFmMax;
  const overlapsAirband = max >= airbandMin && min <= airbandMax;

  // If range overlaps with both bands, use the smallest step (airband's 0.025)
  if (overlapsVhfFm && overlapsAirband) {
    return 0.025;
  }

  // If range overlaps only with airband, use 0.025
  if (overlapsAirband) {
    return 0.025;
  }

  // If range overlaps only with VHF FM, use 0.1
  if (overlapsVhfFm) {
    return 0.1;
  }

  return 1;
}

/**
 * Extract radio configurations from panelRadio
 */
function extractRadios(content) {
  const radios = [];

  // Find the panelRadio table start
  const panelRadioIndex = content.search(/panelRadio\s*=\s*\{/);
  if (panelRadioIndex === -1) return radios;

  // Find the opening brace
  let braceIndex = content.indexOf('{', panelRadioIndex);
  if (braceIndex === -1) return radios;

  // Count braces to find the matching closing brace
  let depth = 0;
  let start = braceIndex;
  let end = braceIndex;

  for (let i = braceIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const panelRadioContent = content.substring(start + 1, end);

  // Now parse individual radio entries by counting braces at depth 1
  let radioIndex = 1;
  depth = 0;
  let radioStart = -1;

  for (let i = 0; i < panelRadioContent.length; i++) {
    if (panelRadioContent[i] === '{') {
      if (depth === 0) {
        radioStart = i;
      }
      depth++;
    }
    if (panelRadioContent[i] === '}') {
      depth--;
      if (depth === 0 && radioStart !== -1) {
        // Extract this radio's content
        const radioContent = panelRadioContent.substring(radioStart + 1, i);

        // Count channels by finding the channels table
        const channelsIndex = radioContent.search(/channels\s*=\s*\{/);
        let presetCount = 0;

        if (channelsIndex !== -1) {
          // Find channels table
          let chanBraceIdx = radioContent.indexOf('{', channelsIndex);
          let chanDepth = 0;
          let chanStart = chanBraceIdx;
          let chanEnd = chanBraceIdx;

          for (let j = chanBraceIdx; j < radioContent.length; j++) {
            if (radioContent[j] === '{') chanDepth++;
            if (radioContent[j] === '}') {
              chanDepth--;
              if (chanDepth === 0) {
                chanEnd = j;
                break;
              }
            }
          }

          const channelsContent = radioContent.substring(chanStart, chanEnd + 1);
          // Count channel entries - each channel is a { ... } block at depth 1
          presetCount = (channelsContent.match(/\{\s*\n/g) || []).length;
        }

        // Extract description from the radio's name field (appears after channels block)
        // We need to find name = "..." that is NOT inside the channels block
        let description = 'Radio';

        // Find the name field that comes after the channels closing brace
        if (channelsIndex !== -1) {
          const afterChannels = radioContent.substring(channelsIndex);
          // Find where channels block ends
          let chanEnd = 0;
          let depth = 0;
          for (let k = 0; k < afterChannels.length; k++) {
            if (afterChannels[k] === '{') depth++;
            if (afterChannels[k] === '}') {
              depth--;
              if (depth === 0) {
                chanEnd = k;
                break;
              }
            }
          }
          // Look for name field after channels
          const afterChannelsBlock = afterChannels.substring(chanEnd);
          const nameMatch = afterChannelsBlock.match(/name\s*=\s*"([^"]+)"/);
          if (nameMatch) {
            description = nameMatch[1];
          }
        }

        // Extract frequency range
        const { min, max } = extractFrequencyRange(radioContent);
        const step = calculateStep(min, max);

        // Generate simple name
        const name = `COM ${radioIndex}`;

        if (presetCount > 0) {
          radios.push({
            name,
            description,
            presetCount,
            min,
            max,
            step
          });
          radioIndex++;
        }

        radioStart = -1;
      }
    }
  }

  return radios;
}

/**
 * Extract gun configurations
 */
function extractGuns(content) {
  const guns = [];

  // Find the Guns table start
  const gunsIndex = content.search(/Guns\s*=\s*\{/);
  if (gunsIndex === -1) return guns;

  // Find the opening brace
  let braceIndex = content.indexOf('{', gunsIndex);
  if (braceIndex === -1) return guns;

  // Count braces to find the matching closing brace
  let depth = 0;
  let start = braceIndex;
  let end = braceIndex;

  for (let i = braceIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const gunsContent = content.substring(start + 1, end);

  // Now parse individual gun entries by counting braces at depth 1
  depth = 0;
  let gunStart = -1;

  for (let i = 0; i < gunsContent.length; i++) {
    if (gunsContent[i] === '{') {
      if (depth === 0) {
        gunStart = i;
      }
      depth++;
    }
    if (gunsContent[i] === '}') {
      depth--;
      if (depth === 0 && gunStart !== -1) {
        // Extract this gun's content
        const gunContent = gunsContent.substring(gunStart + 1, i);

        // Extract gun name
        const nameMatch = gunContent.match(/display_name\s*=\s*"([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : 'Gun';

        // Extract capacity from supply.count
        const supplyIndex = gunContent.search(/supply\s*=\s*\{/);
        let capacity = 0;

        if (supplyIndex !== -1) {
          // Find the supply table
          let supplyBraceIdx = gunContent.indexOf('{', supplyIndex);
          let supplyDepth = 0;
          let supplyStart = supplyBraceIdx;
          let supplyEnd = supplyBraceIdx;

          for (let j = supplyBraceIdx; j < gunContent.length; j++) {
            if (gunContent[j] === '{') supplyDepth++;
            if (gunContent[j] === '}') {
              supplyDepth--;
              if (supplyDepth === 0) {
                supplyEnd = j;
                break;
              }
            }
          }

          const supplyContent = gunContent.substring(supplyStart, supplyEnd + 1);

          // Extract count
          const countMatch = supplyContent.match(/count\s*=\s*(\d+)/);
          if (countMatch) {
            capacity = parseInt(countMatch[1]);
          }

          // Extract shells array
          const shells = [];
          const shellsIndex = supplyContent.search(/shells\s*=\s*\{/);

          if (shellsIndex !== -1) {
            let shellsBraceIdx = supplyContent.indexOf('{', shellsIndex);
            let shellsDepth = 0;
            let shellsStart = shellsBraceIdx;
            let shellsEnd = shellsBraceIdx;

            for (let j = shellsBraceIdx; j < supplyContent.length; j++) {
              if (supplyContent[j] === '{') shellsDepth++;
              if (supplyContent[j] === '}') {
                shellsDepth--;
                if (shellsDepth === 0) {
                  shellsEnd = j;
                  break;
                }
              }
            }

            // Extract just the inner content (skip outer array braces)
            const shellsArrayContent = supplyContent.substring(shellsStart + 1, shellsEnd);

            // Parse individual shell entries
            let shellDepth = 0;
            let shellStart = -1;

            for (let k = 0; k < shellsArrayContent.length; k++) {
              if (shellsArrayContent[k] === '{') {
                if (shellDepth === 0) {
                  shellStart = k;
                }
                shellDepth++;
              }
              if (shellsArrayContent[k] === '}') {
                shellDepth--;
                if (shellDepth === 0 && shellStart !== -1) {
                  const shellContent = shellsArrayContent.substring(shellStart + 1, k);

                  // Extract shell name and display_name
                  // Match 'name = "..."' but not '_unique_resource_name'
                  const shellNameMatch = shellContent.match(/(?:^|\s)name\s*=\s*"([^"]+)"/);
                  const shellDisplayMatch = shellContent.match(/display_name\s*=\s*"([^"]+)"/);

                  if (shellNameMatch && shellDisplayMatch) {
                    const shellName = shellNameMatch[1];
                    // Skip invisible variants
                    if (!shellName.includes('_INVIS')) {
                      shells.push({
                        name: shellName,
                        displayName: shellDisplayMatch[1]
                      });
                    }
                  }

                  shellStart = -1;
                }
              }
            }
          }

          // Extract mixes array
          const mixes = [];
          const mixesIndex = supplyContent.search(/mixes\s*=\s*\{/);

          if (mixesIndex !== -1 && shells.length > 0) {
            let mixesBraceIdx = supplyContent.indexOf('{', mixesIndex);
            let mixesDepth = 0;
            let mixesStart = mixesBraceIdx;
            let mixesEnd = mixesBraceIdx;

            for (let j = mixesBraceIdx; j < supplyContent.length; j++) {
              if (supplyContent[j] === '{') mixesDepth++;
              if (supplyContent[j] === '}') {
                mixesDepth--;
                if (mixesDepth === 0) {
                  mixesEnd = j;
                  break;
                }
              }
            }

            const mixesContent = supplyContent.substring(mixesStart, mixesEnd + 1);

            // Parse individual mix entries
            let mixDepth = 0;
            let mixStart = -1;

            for (let k = 0; k < mixesContent.length; k++) {
              if (mixesContent[k] === '{') {
                if (mixDepth === 0) {
                  mixStart = k;
                }
                mixDepth++;
              }
              if (mixesContent[k] === '}') {
                mixDepth--;
                if (mixDepth === 0 && mixStart !== -1) {
                  const mixContent = mixesContent.substring(mixStart + 1, k);

                  // Extract all numbers from this mix
                  const numbers = mixContent.match(/\d+/g);
                  if (numbers && numbers.length > 0) {
                    // Convert 1-based Lua indices to shell names
                    const sequence = numbers.map(num => {
                      const index = parseInt(num) - 1; // Convert to 0-based
                      return shells[index]?.name || null;
                    }).filter(name => name !== null);

                    if (sequence.length > 0) {
                      mixes.push({ sequence });
                    }
                  }

                  mixStart = -1;
                }
              }
            }
          }

          // Add gun to array if it has shells
          if (shells.length > 0) {
            const gun = {
              name,
              capacity,
              shells
            };

            // Only add mixes if they exist
            if (mixes.length > 0) {
              gun.mixes = mixes;
            }

            guns.push(gun);
          }
        }

        gunStart = -1;
      }
    }
  }

  return guns;
}

/**
 * Extract ammo_type array (aircraft-level ammunition loadout options)
 */
function extractAmmoTypes(content) {
  const ammoTypes = [];

  // Find the ammo_type table start
  const ammoTypeIndex = content.search(/ammo_type\s*=\s*\{/);
  if (ammoTypeIndex === -1) return ammoTypes;

  // Find the opening brace
  let braceIndex = content.indexOf('{', ammoTypeIndex);
  if (braceIndex === -1) return ammoTypes;

  // Count braces to find the matching closing brace
  let depth = 0;
  let start = braceIndex;
  let end = braceIndex;

  for (let i = braceIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const ammoTypeContent = content.substring(start + 1, end);

  // Extract all quoted strings from the array
  const stringMatches = ammoTypeContent.match(/"([^"]+)"/g);
  if (stringMatches) {
    stringMatches.forEach(match => {
      const ammoType = match.replace(/"/g, '');
      if (ammoType.trim()) {
        ammoTypes.push(ammoType);
      }
    });
  }

  return ammoTypes;
}

/**
 * Extract station/pylon configurations
 */
function extractStations(content) {
  const stations = [];

  // Find the Pylons table start
  const pylonsIndex = content.search(/Pylons\s*=\s*\{/);
  if (pylonsIndex === -1) return stations;

  // Find the opening brace
  let braceIndex = content.indexOf('{', pylonsIndex);
  if (braceIndex === -1) return stations;

  // Count braces to find the matching closing brace
  let depth = 0;
  let start = braceIndex;
  let end = braceIndex;

  for (let i = braceIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  let pylonsContent = content.substring(start + 1, end);

  // Resolve table references across ALL pylons first
  // This is important because some pylons reference tables defined in other pylons
  pylonsContent = resolveTableReferences(pylonsContent);

  // Split into individual pylon tables - match each { ... } block at the top level
  depth = 0;
  let currentPylon = '';
  let pylonIndex = 1;

  for (let i = 0; i < pylonsContent.length; i++) {
    const char = pylonsContent[i];

    if (char === '{') {
      if (depth === 0 && currentPylon.trim() !== '') {
        // Start of a new pylon
        currentPylon = '{';
      } else {
        currentPylon += char;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      currentPylon += char;

      if (depth === 0 && currentPylon.trim() !== '') {
        // End of a pylon - process it
        const station = processPylon(currentPylon, pylonIndex);
        if (station) {
          stations.push(station);
        }
        currentPylon = '';
        pylonIndex++;
      }
    } else if (depth > 0) {
      currentPylon += char;
    }
  }

  return stations;
}

/**
 * Resolve Lua table references (<table N>) to their definitions
 * This handles the Lua serialization format where tables are labeled with <N>{ ... }
 * and later referenced as <table N>
 *
 * Also removes inline table labels like <11>{ to just { so they don't interfere with parsing
 */
function resolveTableReferences(luaContent) {
  const tableDefinitions = new Map();

  // Pass 1: Extract all table definitions with labels <N>{ ... }
  // Match patterns like <72>{ ... } where the content may contain nested braces
  const tableDefRegex = /<(\d+)>\{/g;
  let match;

  while ((match = tableDefRegex.exec(luaContent)) !== null) {
    const tableNum = match[1];
    const startPos = match.index + match[0].length - 1; // Position of opening brace

    // Find the matching closing brace by counting depth
    let depth = 0;
    let endPos = startPos;

    for (let i = startPos; i < luaContent.length; i++) {
      if (luaContent[i] === '{') depth++;
      if (luaContent[i] === '}') {
        depth--;
        if (depth === 0) {
          endPos = i;
          break;
        }
      }
    }

    // Extract the table content (including braces)
    const tableContent = luaContent.substring(startPos, endPos + 1);
    tableDefinitions.set(tableNum, tableContent);
  }

  // Pass 2: Replace all <table N> references with their definitions
  let resolvedContent = luaContent.replace(/<table (\d+)>/g, (match, tableNum) => {
    const definition = tableDefinitions.get(tableNum);
    if (definition) {
      return definition;
    }
    // If no definition found, keep the reference (table may be defined later or not needed)
    return match;
  });

  // Pass 3: Replace <table N> references that point to inline definitions
  // Inline definitions are like: Launchers = <11>{ ... }
  // Later references are like: Launchers = <table 11>
  // We already extracted the definitions in Pass 1, now just clean up the labels
  resolvedContent = resolvedContent.replace(/<\d+>\{/g, '{');

  return resolvedContent;
}

/**
 * Process a single pylon block
 */
function processPylon(pylonContent, index) {
  // Table references have already been resolved in extractStations()
  const resolvedContent = pylonContent;

  // Extract DisplayName
  const displayNameMatch = resolvedContent.match(/DisplayName\s*=\s*"([^"]+)"/i);
  const name = displayNameMatch ? displayNameMatch[1] : `Station ${index}`;

  // Extract station number (Number field)
  const numberMatch = resolvedContent.match(/Number\s*=\s*(\d+)/i);
  const station = numberMatch ? parseInt(numberMatch[1]) : index;

  // Extract all CLSIDs from Launchers
  const munitions = [];

  // The Launchers field might be a table reference like <11>{ ... } or just { ... }
  // We need to find the entire Launchers block by counting braces
  const launchersStart = resolvedContent.indexOf('Launchers');
  if (launchersStart !== -1) {
    // Find the opening brace after "Launchers = " (might have <N> before it)
    let pos = launchersStart;
    while (pos < resolvedContent.length && resolvedContent[pos] !== '{') {
      pos++;
    }

    if (pos < resolvedContent.length) {
      // Now extract the entire Launchers table by counting braces
      let depth = 0;
      let start = pos;
      let end = pos;

      for (let i = pos; i < resolvedContent.length; i++) {
        if (resolvedContent[i] === '{') depth++;
        if (resolvedContent[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      const launchersContent = resolvedContent.substring(start, end + 1);

      // Find all CLSID entries - they might be in nested tables
      const clsidMatches = launchersContent.matchAll(/CLSID\s*=\s*"([^"]+)"/g);
      for (const match of clsidMatches) {
        const clsid = match[1];
        // Skip special markers
        if (clsid !== '<CLEAN>' && !munitions.includes(clsid)) {
          munitions.push(clsid);
        }
      }
    }
  }

  return {
    station,
    name,
    munitions
  };
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
 * Extract airframe data from Lua file
 */
function extractAirframeData(luaContent, aircraftId) {
  // Check if aircraft is flyable
  const isFlyable = luaContent.includes('_file_flyable');
  if (!isFlyable) {
    return null;
  }

  // Extract DisplayName (top-level, not from stations)
  // The DisplayName appears early in the file before Pylons section
  const displayNameMatch = luaContent.match(/^\s*DisplayName\s*=\s*"([^"]+)"/m);
  const displayName = displayNameMatch ? displayNameMatch[1] : aircraftId;

  // Basic properties
  const emptyWeight = Math.round((extractLuaValue(luaContent, 'M_empty') || 0) * KG_TO_LBS);
  const maxTakeoffWeight = Math.round((extractLuaValue(luaContent, 'M_max') || 0) * KG_TO_LBS);
  const internalFuel = Math.round((extractLuaValue(luaContent, 'M_fuel_max') || 0) * KG_TO_LBS);

  // Countermeasures
  const cmdsCapacity = extractNestedLuaValue(luaContent, 'passivCounterm.SingleChargeTotal') || 0;
  const chaffIncrement = extractNestedLuaValue(luaContent, 'passivCounterm.chaff.increment') || 1;
  const flareIncrement = extractNestedLuaValue(luaContent, 'passivCounterm.flare.increment') || 1;
  const defaultChaff = extractNestedLuaValue(luaContent, 'passivCounterm.chaff.default') || 0;
  const defaultFlare = extractNestedLuaValue(luaContent, 'passivCounterm.flare.default') || 0;

  // Radios
  const radios = extractRadios(luaContent);

  // Guns
  const guns = extractGuns(luaContent);

  // Ammo types (aircraft-level ammunition options)
  const ammoTypes = extractAmmoTypes(luaContent);

  // Stations (filter out stations with no munitions)
  const allStations = extractStations(luaContent);
  const stations = allStations.filter(station => station.munitions.length > 0);

  // Default fuel levels
  const category = categorizeAircraft(displayName);
  const fuelDefaults = DEFAULT_FUEL_LEVELS[category];

  const airframeData = {
    aircraft: aircraftId,
    displayName,
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

  // Only add ammoTypes if it has values
  if (ammoTypes.length > 0) {
    airframeData.ammoTypes = ammoTypes;
  }

  return airframeData;
}

/**
 * Process a single aircraft
 */
async function processAircraft(fileName) {
  const aircraftId = fileName.replace('.lua', '');

  console.log(`\n📦 Processing ${aircraftId}...`);

  const content = await fetchQuagglesFile(`/_G/db/Units/Planes/Plane/${fileName}`);

  if (!content) {
    console.log(`  ⚠️  Failed to fetch data`);
    return null;
  }

  const data = extractAirframeData(content, aircraftId);

  // Check if aircraft is not flyable
  if (!data) {
    console.log(`  ⏭️  Not flyable (AI only)`);
    return null;
  }

  // Validate minimum requirements
  if (data.emptyWeight === 0 || data.stations.length === 0) {
    console.log(`  ⚠️  Insufficient data (weight: ${data.emptyWeight}, stations: ${data.stations.length})`);
    return null;
  }

  console.log(`  ✓ ${data.displayName} (${data.stations.length} stations)`);

  return data;
}

/**
 * Load custom airframe data from data.json
 */
function loadCustomData() {
  const dataPath = join(__dirname, 'data.json');
  if (!existsSync(dataPath)) {
    return {};
  }

  try {
    const content = readFileSync(dataPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`⚠️  Failed to load custom data: ${error.message}`);
    return {};
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Generating airframe configurations from Quaggles DCS Lua Datamine');
  console.log('=' .repeat(70));

  // Load custom data
  const customData = loadCustomData();
  if (Object.keys(customData).length > 0) {
    console.log(`\n📝 Loaded custom data for ${Object.keys(customData).length} aircraft\n`);
  }

  // Fetch all aircraft files
  console.log('\n📂 Discovering aircraft files from GitHub API...');
  const aircraftFiles = await fetchDirectoryListing('/_G/db/Units/Planes/Plane');
  console.log(`📊 Found ${aircraftFiles.length} aircraft files\n`);

  const airframes = {};
  let successCount = 0;
  let skipCount = 0;

  for (const file of aircraftFiles) {
    const fileName = file.name;
    const aircraftId = fileName.replace('.lua', '');

    let data = await processAircraft(fileName);

    if (data) {
      // Merge custom data if it exists for this aircraft
      if (customData[aircraftId]) {
        data = { ...data, ...customData[aircraftId] };
      }

      airframes[aircraftId] = data;

      // Write individual file
      const outputDir = join(__dirname, '../../src/data/json/airframes');
      mkdirSync(outputDir, { recursive: true });
      const outputPath = join(outputDir, `${aircraftId}.json`);
      writeFileSync(outputPath, JSON.stringify(data, null, 2));

      successCount++;
    } else {
      skipCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Generated ${successCount} airframe files`);
  console.log(`⏭️  Skipped ${skipCount} aircraft (insufficient data)`);
  console.log(`📁 Output directory: src/data/json/airframes/`);
}

main().catch(console.error);
