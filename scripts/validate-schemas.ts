#!/usr/bin/env node
/**
 * Validates all JSON data files against their corresponding schemas
 * Usage: node --loader tsx scripts/validate-schemas.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const dataDir = join(projectRoot, 'src', 'data', 'json')
const schemasDir = join(dataDir, 'schemas')

interface ValidationError {
  file: string
  errors: Array<{ path: string; message: string }>
}

interface ClsidError {
  file: string
  station: string | number
  clsid: string
}

interface AirframeIdError {
  file: string
  location: string
  airframeId: string
}

interface TheaterError {
  file: string
  location: string
  value: string
  expected: string
}

interface SchemaMapping {
  pattern: RegExp
  schemaPath: string
  description: string
}

// Define which JSON files should be validated against which schemas
const schemaMappings: SchemaMapping[] = [
  {
    pattern: /^navaids\/.*\.json$/,
    schemaPath: join(schemasDir, 'navaids.schema.json'),
    description: 'navaid data files',
  },
  {
    pattern: /^airfields\/.*\.json$/,
    schemaPath: join(schemasDir, 'airfields.schema.json'),
    description: 'airfield data files',
  },
  {
    pattern: /^channelization\/.*\.json$/,
    schemaPath: join(schemasDir, 'channelization.schema.json'),
    description: 'channelization data files',
  },
  {
    pattern: /^airframes\/.*\.json$/,
    schemaPath: join(schemasDir, 'airframes.schema.json'),
    description: 'airframe data files',
  },
  {
    pattern: /^airframe-overrides\/.*\.json$/,
    schemaPath: join(schemasDir, 'overrides.schema.json'),
    description: 'airframe override files',
  },
  {
    pattern: /^theaters\.json$/,
    schemaPath: join(schemasDir, 'theaters.schema.json'),
    description: 'theaters configuration',
  },
  {
    pattern: /^loadouts\.json$/,
    schemaPath: join(schemasDir, 'loadouts.schema.json'),
    description: 'loadouts configuration',
  },
  {
    pattern: /^munitions\.json$/,
    schemaPath: join(schemasDir, 'munitions.schema.json'),
    description: 'munitions configuration',
  },
  {
    pattern: /^munitions-overrides\.json$/,
    schemaPath: join(schemasDir, 'overrides.schema.json'),
    description: 'munitions overrides configuration',
  },
  {
    pattern: /^squadrons\.json$/,
    schemaPath: join(schemasDir, 'squadrons.schema.json'),
    description: 'squadrons configuration',
  },
  {
    pattern: /^crew\.json$/,
    schemaPath: join(schemasDir, 'crew.schema.json'),
    description: 'crew configuration',
  },
  {
    pattern: /^missionTypes\.json$/,
    schemaPath: join(schemasDir, 'missionTypes.schema.json'),
    description: 'mission types configuration',
  },
]

// Recursively find all JSON files in a directory
function findJsonFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory() && entry !== 'schemas') {
      files.push(...findJsonFiles(fullPath, baseDir))
    } else if (stat.isFile() && entry.endsWith('.json')) {
      // Get relative path from baseDir
      const relativePath = fullPath.substring(baseDir.length + 1)
      files.push(relativePath)
    }
  }

  return files
}

// Create validator for a schema
function createValidator(schemaPath: string): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
  return ajv.compile(schema)
}

// Validate a JSON file against a schema
function validateFile(
  filePath: string,
  validator: ValidateFunction,
): { path: string; message: string }[] | null {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    const valid = validator(data)

    if (valid) {
      return null
    }

    return (validator.errors || []).map((error) => ({
      path: error.instancePath || 'root',
      message: `${error.message} ${error.params ? JSON.stringify(error.params) : ''}`.trim(),
    }))
  } catch (error) {
    return [
      {
        path: 'root',
        message: error instanceof Error ? error.message : 'Failed to parse JSON',
      },
    ]
  }
}

// Main validation function
function validateAllSchemas(): boolean {
  console.log('🔍 Validating JSON data files against schemas...\n')

  const allFiles = findJsonFiles(dataDir)
  const validationErrors: ValidationError[] = []
  let validatedCount = 0
  let skippedCount = 0

  // Track files for CLSID and airframe ID validation
  const airframeOverrideFiles: string[] = []
  const channelizationFiles: string[] = []

  // Group files by schema
  const filesBySchema = new Map<string, string[]>()

  for (const file of allFiles) {
    let matched = false

    for (const mapping of schemaMappings) {
      if (mapping.pattern.test(file)) {
        if (!filesBySchema.has(mapping.schemaPath)) {
          filesBySchema.set(mapping.schemaPath, [])
        }
        filesBySchema.get(mapping.schemaPath)!.push(file)
        matched = true

        // Track files for CLSID and airframe ID validation
        if (/^airframe-overrides\/.*\.json$/.test(file)) {
          airframeOverrideFiles.push(file)
        } else if (/^channelization\/.*\.json$/.test(file)) {
          channelizationFiles.push(file)
        }

        break
      }
    }

    if (!matched) {
      console.log(`⚠️  Skipping ${file} (no schema mapping defined)`)
      skippedCount++
    }
  }

  // Validate files by schema
  for (const [schemaPath, files] of filesBySchema) {
    const schemaName = basename(schemaPath)
    const mapping = schemaMappings.find((m) => m.schemaPath === schemaPath)!

    console.log(`📋 Validating ${files.length} ${mapping.description} against ${schemaName}`)

    const validator = createValidator(schemaPath)

    for (const file of files) {
      const fullPath = join(dataDir, file)
      const errors = validateFile(fullPath, validator)

      if (errors) {
        validationErrors.push({ file, errors })
        console.log(`  ✗ ${file}`)
      } else {
        console.log(`  ✓ ${file}`)
        validatedCount++
      }
    }

    console.log()
  }

  // CLSID validation for hand-authored files
  console.log('📋 Validating CLSIDs in hand-authored files...\n')

  const knownClsids = loadKnownClsids()
  const clsidErrors: ClsidError[] = []

  // Validate loadouts.json (SCLs)
  const loadoutErrors = validateLoadoutsClsids(knownClsids)
  if (loadoutErrors.length > 0) {
    console.log(`  ✗ loadouts.json (${loadoutErrors.length} unknown CLSIDs)`)
    clsidErrors.push(...loadoutErrors)
  } else {
    console.log('  ✓ loadouts.json')
  }

  // Validate airframe-overrides/*.json
  const overrideErrors = validateAirframeOverrideClsids(airframeOverrideFiles, knownClsids)
  if (overrideErrors.length > 0) {
    console.log(`  ✗ airframe-overrides/*.json (${overrideErrors.length} unknown CLSIDs)`)
    clsidErrors.push(...overrideErrors)
  } else {
    console.log(`  ✓ airframe-overrides/*.json (${airframeOverrideFiles.length} files)`)
  }

  // Validate munitions-overrides.json
  const munitionsOverrideErrors = validateMunitionsOverrideClsids(knownClsids)
  if (munitionsOverrideErrors.length > 0) {
    console.log(`  ✗ munitions-overrides.json (${munitionsOverrideErrors.length} unknown CLSIDs)`)
    clsidErrors.push(...munitionsOverrideErrors)
  } else {
    console.log('  ✓ munitions-overrides.json')
  }

  console.log()

  // Airframe ID validation for hand-authored files
  console.log('📋 Validating airframe IDs in hand-authored files...\n')

  const knownAirframeIds = loadKnownAirframeIds()
  const airframeIdErrors: AirframeIdError[] = []

  // Validate loadouts.json
  const loadoutAirframeErrors = validateLoadoutsAirframeIds(knownAirframeIds)
  if (loadoutAirframeErrors.length > 0) {
    console.log(`  ✗ loadouts.json (${loadoutAirframeErrors.length} unknown airframe IDs)`)
    airframeIdErrors.push(...loadoutAirframeErrors)
  } else {
    console.log('  ✓ loadouts.json')
  }

  // Validate squadrons.json - airframe IDs
  const squadronAirframeErrors = validateSquadronsAirframeIds(knownAirframeIds)
  if (squadronAirframeErrors.length > 0) {
    console.log(`  ✗ squadrons.json airframe IDs (${squadronAirframeErrors.length} unknown)`)
    airframeIdErrors.push(...squadronAirframeErrors)
  } else {
    console.log('  ✓ squadrons.json (airframe IDs)')
  }

  // Validate channelization filenames
  const channelizationAirframeErrors = validateChannelizationAirframeIds(channelizationFiles, knownAirframeIds)
  if (channelizationAirframeErrors.length > 0) {
    console.log(`  ✗ channelization/*.json (${channelizationAirframeErrors.length} unknown airframe IDs)`)
    airframeIdErrors.push(...channelizationAirframeErrors)
  } else {
    console.log(`  ✓ channelization/*.json (${channelizationFiles.length} files)`)
  }

  // Validate airframe-overrides filenames
  const overrideAirframeErrors = validateAirframeOverrideAirframeIds(airframeOverrideFiles, knownAirframeIds)
  if (overrideAirframeErrors.length > 0) {
    console.log(`  ✗ airframe-overrides/*.json (${overrideAirframeErrors.length} unknown airframe IDs)`)
    airframeIdErrors.push(...overrideAirframeErrors)
  } else {
    console.log(`  ✓ airframe-overrides/*.json (${airframeOverrideFiles.length} files)`)
  }

  console.log()

  // Theater and airfield validation
  console.log('📋 Validating theater names and airfields...\n')

  const knownTheaters = loadKnownTheaters()
  const theaterErrors: TheaterError[] = []

  // Validate theaters.json
  const theatersConfigErrors = validateTheatersConfig(knownTheaters)
  if (theatersConfigErrors.length > 0) {
    console.log(`  ✗ theaters.json (${theatersConfigErrors.length} errors)`)
    theaterErrors.push(...theatersConfigErrors)
  } else {
    console.log('  ✓ theaters.json')
  }

  // Validate channelization directory names
  const channelizationTheaterErrors = validateChannelizationTheaters(channelizationFiles, knownTheaters)
  if (channelizationTheaterErrors.length > 0) {
    console.log(`  ✗ channelization/*/ (${channelizationTheaterErrors.length} unknown theaters)`)
    theaterErrors.push(...channelizationTheaterErrors)
  } else {
    const theaterDirs = new Set(channelizationFiles.map(f => f.match(/^channelization\/([^/]+)\//)?.[1]).filter(Boolean))
    console.log(`  ✓ channelization/*/ (${theaterDirs.size} theaters)`)
  }

  // Validate squadrons.json - defaultGunAmmo
  const squadronGunAmmoErrors = validateSquadronsGunAmmo()
  if (squadronGunAmmoErrors.length > 0) {
    console.log(`  ✗ squadrons.json defaultGunAmmo (${squadronGunAmmoErrors.length} invalid)`)
    theaterErrors.push(...squadronGunAmmoErrors)
  } else {
    console.log('  ✓ squadrons.json (defaultGunAmmo)')
  }

  console.log()

  // Print summary
  console.log('─'.repeat(60))
  console.log('\n📊 Validation Summary:')
  console.log(`  ✓ Schema valid: ${validatedCount} files`)
  console.log(`  ✗ Schema invalid: ${validationErrors.length} files`)
  console.log(`  ⚠️  Skipped: ${skippedCount} files`)
  console.log(`  ✗ Unknown CLSIDs: ${clsidErrors.length}`)
  console.log(`  ✗ Unknown airframe IDs: ${airframeIdErrors.length}`)
  console.log(`  ✗ Theater/airfield errors: ${theaterErrors.length}\n`)

  // Print detailed schema errors
  if (validationErrors.length > 0) {
    console.log('❌ Schema Validation Errors:\n')

    for (const { file, errors } of validationErrors) {
      console.log(`  ${file}:`)
      for (const error of errors) {
        console.log(`    • ${error.path}: ${error.message}`)
      }
      console.log()
    }
  }

  // Print detailed CLSID errors
  if (clsidErrors.length > 0) {
    console.log('❌ Unknown CLSID Errors:\n')

    for (const { file, station, clsid } of clsidErrors) {
      console.log(`  ${file}:`)
      console.log(`    • ${station}: unknown CLSID "${clsid}"`)
    }
    console.log()
  }

  // Print detailed airframe ID errors
  if (airframeIdErrors.length > 0) {
    console.log('❌ Unknown Airframe ID Errors:\n')

    for (const { file, location, airframeId } of airframeIdErrors) {
      console.log(`  ${file}:`)
      console.log(`    • ${location}: unknown airframe ID "${airframeId}"`)
    }
    console.log()
  }

  // Print detailed theater errors
  if (theaterErrors.length > 0) {
    console.log('❌ Theater/Airfield Errors:\n')

    for (const { file, location, value, expected } of theaterErrors) {
      console.log(`  ${file}:`)
      console.log(`    • ${location}: "${value}" - expected ${expected}`)
    }
    console.log()
  }

  if (validationErrors.length > 0 || clsidErrors.length > 0 || airframeIdErrors.length > 0 || theaterErrors.length > 0) {
    process.exit(1)
  }

  console.log('✅ All validations passed!')
  return true
}

// Load known CLSIDs from munitions.json and munitions-overrides.json
function loadKnownClsids(): Set<string> {
  const munitionsPath = join(dataDir, 'munitions.json')
  const munitions = JSON.parse(readFileSync(munitionsPath, 'utf-8'))
  const clsids = new Set(Object.keys(munitions))

  // Also include CLSIDs added by munitions-overrides.json
  const overridesPath = join(dataDir, 'munitions-overrides.json')
  try {
    const overrides = JSON.parse(readFileSync(overridesPath, 'utf-8'))
    for (const [key, value] of Object.entries(overrides)) {
      if (key === '$schema') continue
      // Full munition definitions (objects with 'id' property) add new CLSIDs
      if (value && typeof value === 'object' && 'id' in (value as object)) {
        clsids.add(key)
      }
    }
  } catch {
    // Ignore if overrides file doesn't exist
  }

  return clsids
}

// Validate CLSIDs in loadouts.json (SCLs)
function validateLoadoutsClsids(knownClsids: Set<string>): ClsidError[] {
  const errors: ClsidError[] = []
  const file = 'loadouts.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const [aircraft, loadouts] of Object.entries(data)) {
      if (!Array.isArray(loadouts)) continue

      for (const loadout of loadouts as Array<{ name: string; stations: Array<{ station: number; item: string }> }>) {
        for (const stationConfig of loadout.stations || []) {
          if (!knownClsids.has(stationConfig.item)) {
            errors.push({
              file,
              station: `${aircraft}/${loadout.name}/station ${stationConfig.station}`,
              clsid: stationConfig.item,
            })
          }
        }
      }
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Validate CLSIDs in airframe-overrides/*.json
function validateAirframeOverrideClsids(
  overrideFiles: string[],
  knownClsids: Set<string>,
): ClsidError[] {
  const errors: ClsidError[] = []

  for (const file of overrideFiles) {
    const fullPath = join(dataDir, file)
    try {
      const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

      // Check for any key that ends with .munitions (e.g., "stations[0].munitions")
      for (const [key, value] of Object.entries(data)) {
        if (!key.endsWith('.munitions')) continue

        if (value && typeof value === 'object') {
          const override = value as { add?: string[]; remove?: string[] }

          // Check 'add' array
          if (override.add && Array.isArray(override.add)) {
            for (const clsid of override.add) {
              if (typeof clsid === 'string' && !knownClsids.has(clsid)) {
                errors.push({
                  file,
                  station: `${key}.add`,
                  clsid,
                })
              }
            }
          }

          // Check 'remove' array
          if (override.remove && Array.isArray(override.remove)) {
            for (const clsid of override.remove) {
              if (typeof clsid === 'string' && !knownClsids.has(clsid)) {
                errors.push({
                  file,
                  station: `${key}.remove`,
                  clsid,
                })
              }
            }
          }
        }

        // Also handle direct array assignment (e.g., "stations[0].munitions": ["CLSID1", "CLSID2"])
        if (Array.isArray(value)) {
          for (const clsid of value) {
            if (typeof clsid === 'string' && !knownClsids.has(clsid)) {
              errors.push({
                file,
                station: key,
                clsid,
              })
            }
          }
        }
      }
    } catch {
      // Skip files that can't be parsed (schema validation will catch these)
    }
  }

  return errors
}

// Validate CLSIDs in munitions-overrides.json
function validateMunitionsOverrideClsids(knownClsids: Set<string>): ClsidError[] {
  const errors: ClsidError[] = []
  const file = 'munitions-overrides.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const key of Object.keys(data)) {
      if (key === '$schema') continue

      // Path-based overrides like "ALQ_184.shortName" - extract CLSID before the dot
      const dotIndex = key.indexOf('.')
      if (dotIndex > 0) {
        const clsid = key.substring(0, dotIndex)
        if (!knownClsids.has(clsid)) {
          errors.push({
            file,
            station: key,
            clsid,
          })
        }
      }
      // Full munition definitions are valid (they define new CLSIDs, already added to knownClsids)
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Load known airframe IDs from airframes/*.json filenames
function loadKnownAirframeIds(): Set<string> {
  const airframesDir = join(dataDir, 'airframes')
  const files = readdirSync(airframesDir)
  const ids = new Set<string>()

  for (const file of files) {
    if (file.endsWith('.json')) {
      // Remove .json extension to get the airframe ID
      ids.add(file.slice(0, -5))
    }
  }

  return ids
}

// Validate airframe IDs in loadouts.json
function validateLoadoutsAirframeIds(knownAirframeIds: Set<string>): AirframeIdError[] {
  const errors: AirframeIdError[] = []
  const file = 'loadouts.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const airframeId of Object.keys(data)) {
      if (!knownAirframeIds.has(airframeId)) {
        errors.push({
          file,
          location: `key "${airframeId}"`,
          airframeId,
        })
      }
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Validate airframe IDs in squadrons.json
function validateSquadronsAirframeIds(knownAirframeIds: Set<string>): AirframeIdError[] {
  const errors: AirframeIdError[] = []
  const file = 'squadrons.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const [squadronId, squadron] of Object.entries(data)) {
      const sqData = squadron as { aircraft?: string }
      if (sqData.aircraft && !knownAirframeIds.has(sqData.aircraft)) {
        errors.push({
          file,
          location: `${squadronId}.aircraft`,
          airframeId: sqData.aircraft,
        })
      }
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Validate airframe IDs in channelization/{theater}/{airframeId}.json filenames
function validateChannelizationAirframeIds(
  channelizationFiles: string[],
  knownAirframeIds: Set<string>,
): AirframeIdError[] {
  const errors: AirframeIdError[] = []

  for (const file of channelizationFiles) {
    // Extract airframe ID from path like "channelization/Afghanistan/F-16C_50.json"
    const match = file.match(/^channelization\/[^/]+\/(.+)\.json$/)
    if (match) {
      const airframeId = match[1]
      if (!knownAirframeIds.has(airframeId)) {
        errors.push({
          file,
          location: 'filename',
          airframeId,
        })
      }
    }
  }

  return errors
}

// Validate airframe IDs in airframe-overrides/{airframeId}.json filenames
function validateAirframeOverrideAirframeIds(
  overrideFiles: string[],
  knownAirframeIds: Set<string>,
): AirframeIdError[] {
  const errors: AirframeIdError[] = []

  for (const file of overrideFiles) {
    // Extract airframe ID from path like "airframe-overrides/A-10C_2.json"
    const match = file.match(/^airframe-overrides\/(.+)\.json$/)
    if (match) {
      const airframeId = match[1]
      if (!knownAirframeIds.has(airframeId)) {
        errors.push({
          file,
          location: 'filename',
          airframeId,
        })
      }
    }
  }

  return errors
}

// Load ammo types for a specific airframe
function loadAirframeAmmoTypes(airframeId: string): Set<string> {
  const airframePath = join(dataDir, 'airframes', `${airframeId}.json`)
  const ammoTypes = new Set<string>()

  try {
    const airframe = JSON.parse(readFileSync(airframePath, 'utf-8'))
    if (airframe.ammoTypes && Array.isArray(airframe.ammoTypes)) {
      for (const ammo of airframe.ammoTypes) {
        ammoTypes.add(ammo)
      }
    }
  } catch {
    // File doesn't exist or can't be parsed
  }

  return ammoTypes
}

// Validate defaultGunAmmo in squadrons.json against airframe ammoTypes
function validateSquadronsGunAmmo(): TheaterError[] {
  const errors: TheaterError[] = []
  const file = 'squadrons.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const [squadronId, squadron] of Object.entries(data)) {
      const sqData = squadron as {
        aircraft?: string
        defaultGunAmmo?: Record<string, string>
      }

      if (!sqData.aircraft || !sqData.defaultGunAmmo) continue

      const ammoTypes = loadAirframeAmmoTypes(sqData.aircraft)
      if (ammoTypes.size === 0) continue // Skip if airframe has no ammoTypes

      // Validate all keys in defaultGunAmmo (training, combat, or any future keys)
      for (const [ammoKey, ammoValue] of Object.entries(sqData.defaultGunAmmo)) {
        if (typeof ammoValue === 'string' && !ammoTypes.has(ammoValue)) {
          errors.push({
            file,
            location: `${squadronId}.defaultGunAmmo.${ammoKey}`,
            value: ammoValue,
            expected: `valid ammoType from ${sqData.aircraft}`,
          })
        }
      }
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Load known theater names from navaids/*.json filenames
function loadKnownTheaters(): Set<string> {
  const navaidsDir = join(dataDir, 'navaids')
  const files = readdirSync(navaidsDir)
  const theaters = new Set<string>()

  for (const file of files) {
    if (file.endsWith('.json')) {
      theaters.add(file.slice(0, -5))
    }
  }

  return theaters
}

// Load airfield names for a specific theater
function loadAirfieldNames(theater: string): Set<string> {
  const airfieldsPath = join(dataDir, 'airfields', `${theater}.json`)
  const names = new Set<string>()

  try {
    const airfields = JSON.parse(readFileSync(airfieldsPath, 'utf-8'))
    for (const airfield of airfields) {
      if (airfield.name) {
        names.add(airfield.name)
      }
    }
  } catch {
    // File doesn't exist or can't be parsed
  }

  return names
}

// Validate theaters.json - theater names and defaultAirfield values
function validateTheatersConfig(knownTheaters: Set<string>): TheaterError[] {
  const errors: TheaterError[] = []
  const file = 'theaters.json'
  const fullPath = join(dataDir, file)

  try {
    const data = JSON.parse(readFileSync(fullPath, 'utf-8'))

    for (const [theaterName, theater] of Object.entries(data)) {
      // Validate theater name exists in navaids/airfields
      if (!knownTheaters.has(theaterName)) {
        errors.push({
          file,
          location: `key "${theaterName}"`,
          value: theaterName,
          expected: 'valid theater (matching navaids/*.json filename)',
        })
      }

      // Validate defaultAirfield if specified
      const theaterData = theater as { defaultAirfield?: string | null }
      if (theaterData.defaultAirfield) {
        const airfieldNames = loadAirfieldNames(theaterName)
        if (!airfieldNames.has(theaterData.defaultAirfield)) {
          errors.push({
            file,
            location: `${theaterName}.defaultAirfield`,
            value: theaterData.defaultAirfield,
            expected: `valid airfield in ${theaterName}`,
          })
        }
      }
    }
  } catch {
    // Skip if file can't be parsed
  }

  return errors
}

// Validate channelization directory names match valid theaters
function validateChannelizationTheaters(
  channelizationFiles: string[],
  knownTheaters: Set<string>,
): TheaterError[] {
  const errors: TheaterError[] = []
  const checkedTheaters = new Set<string>()

  for (const file of channelizationFiles) {
    // Extract theater name from path like "channelization/Afghanistan/F-16C_50.json"
    const match = file.match(/^channelization\/([^/]+)\//)
    if (match) {
      const theaterName = match[1]
      if (!checkedTheaters.has(theaterName)) {
        checkedTheaters.add(theaterName)
        if (!knownTheaters.has(theaterName)) {
          errors.push({
            file: `channelization/${theaterName}/`,
            location: 'directory name',
            value: theaterName,
            expected: 'valid theater (matching navaids/*.json filename)',
          })
        }
      }
    }
  }

  return errors
}

// Run validation
validateAllSchemas()
