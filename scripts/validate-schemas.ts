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
    pattern: /^munitions-shortnames\.json$/,
    schemaPath: join(schemasDir, 'munitions-shortnames.schema.json'),
    description: 'munitions shortnames configuration',
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

  // Print summary
  console.log('─'.repeat(60))
  console.log('\n📊 Validation Summary:')
  console.log(`  ✓ Valid: ${validatedCount} files`)
  console.log(`  ✗ Invalid: ${validationErrors.length} files`)
  console.log(`  ⚠️  Skipped: ${skippedCount} files\n`)

  // Print detailed errors
  if (validationErrors.length > 0) {
    console.log('❌ Validation Errors:\n')

    for (const { file, errors } of validationErrors) {
      console.log(`  ${file}:`)
      for (const error of errors) {
        console.log(`    • ${error.path}: ${error.message}`)
      }
      console.log()
    }

    process.exit(1)
  }

  console.log('✅ All JSON files validated successfully!')
  return true
}

// Run validation
validateAllSchemas()
