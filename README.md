# v303 MDC Generator

> [!IMPORTANT]
> **This project is deprecated and the repository is archived.** The v303 MDC
> Generator has been superseded by
> [Digital Kneeboard Simulator](https://www.digitalkneeboardsimulator.com).
> The former site at <https://riscfuture.github.io/v303-mdc-generator/> now
> redirects there. The source below remains available for reference only.

[![CI](https://github.com/RISCfuture/v303-mdc-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/RISCfuture/v303-mdc-generator/actions/workflows/ci.yml)
[![Lint](https://github.com/RISCfuture/v303-mdc-generator/actions/workflows/lint.yml/badge.svg)](https://github.com/RISCfuture/v303-mdc-generator/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A web-based mission planning tool for the v303rd Fighter Group, enabling creation, editing, and export of mission data cards (MDCs) for DCS World flight simulation missions.

## Overview

The v303 MDC Generator is a comprehensive mission planning application designed for virtual fighter squadrons flying the A-10C and F-16C in DCS World. The application provides a complete workflow for creating detailed mission briefings and generating kneeboard-ready PDF briefing cards and DCS-compatible JSON MDC files.

**Key Features:**

- Complete mission planning interface with support for F-16C and A-10C airframes
- Flight plan creation with waypoint/steerpoint management
- Crew composition and package coordination
- Loadout planning with station-by-station munition assignment
- Radio frequency management with theater-specific presets
- TOLD (Takeoff and Landing Data) calculations
- Target planning with CCIP reference points
- Markdown-based briefing notes with image support
- Export to PDF briefing cards (kneeboard-sized, 3-page format)
- Export to JSON MDC files compatible with DCS World

**Supported Organizations:**

- v303rd Fighter Squadron (v303 FS) - A-10C Warthog
- V93rd Fighter Squadron (v93 FS) - F-16C Viper

## Architectural Overview

The v303 MDC Generator is built with modern web technologies using Vue 3 and TypeScript, following a component-based architecture with clear separation of concerns.

### Technology Stack

- **Frontend Framework**: Vue 3.5 (Composition API)
- **Build Tool**: Vite 8.0
- **Language**: TypeScript 6.0 (strict mode)
- **State Management**: Pinia 3.0 (composition-style stores)
- **UI Library**: Naive UI 2.44 (with custom theming)
- **Testing**: Vitest 4.1 (unit), Playwright 1.60 (e2e)
- **PDF Generation**: jsPDF 4.2 with jsPDF-autotable 5.0
- **Error Tracking**: Sentry 10.56

### Architecture Pattern

The application follows a **layered architecture**:

```text
┌─────────────────────────────────────────┐
│          Views (Pages)                  │
│  MissionList, MissionEditor             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Components (UI)                 │
│  Mission modules, Common components     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     Composables (Business Logic)        │
│  Mission data, Validation, Calculations │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│        Stores (State)                   │
│  Missions store (Pinia)                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Services & Utilities                 │
│  Export, Storage, Formatters, Math      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  Static JSON data, Type definitions     │
└─────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Components capture user interactions
2. **Component Events** → Composables handle business logic
3. **Composables** → Update Pinia store
4. **Store Updates** → Trigger localStorage persistence
5. **Store Changes** → Components reactively update via computed properties

### Key Architectural Decisions

- **Composition API**: All components use Vue 3's Composition API for better code reuse and type inference
- **Type Safety**: Comprehensive TypeScript types for all mission data structures
- **Schema Validation**: JSON Schema validation ensures data integrity before export
- **Separation of Storage**: Mission metadata in localStorage (2MB limit), images in IndexedDB (2MB per image)
- **Client-Side Only**: No backend required - all processing happens in the browser
- **Modular Components**: Mission editor split into 12 functional modules (basic info, steerpoints, crew, loadout, etc.)

## Major Modules

### Core Application

| Module        | Purpose                                                      | Location                       |
| ------------- | ------------------------------------------------------------ | ------------------------------ |
| **App Entry** | Application bootstrap, Sentry initialization, theme provider | `/src/main.ts`, `/src/App.vue` |
| **Router**    | Page navigation (MissionList, MissionEditor)                 | `/src/router/index.ts`         |

### State Management

| Module             | Purpose                                                                   | Location                  |
| ------------------ | ------------------------------------------------------------------------- | ------------------------- |
| **Missions Store** | Central state for all missions, localStorage persistence, CRUD operations | `/src/stores/missions.ts` |

### Type System

| Module             | Purpose                                                                             | Location                 |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------ |
| **Mission Types**  | TypeScript definitions for missions, waypoints, crew, loadouts, targets, TOLD, etc. | `/src/types/mission.ts`  |
| **Airfield Types** | Airfield, runway, radio, ILS, TACAN definitions                                     | `/src/types/airfield.ts` |
| **Navaid Types**   | Navigation aid type definitions                                                     | `/src/types/navaid.ts`   |

### Data Layer

| Module                 | Purpose                                                                        | Location                                                              |
| ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Airframe Database**  | Aircraft definitions (F-16C, A-10C) with stations, radios, fuel, CMDS capacity | `/src/data/airframes.ts`, `/src/data/json/airframes/*.json`           |
| **Airfield Database**  | Airfield data with runways, frequencies, TACAN, ILS by theater                 | `/src/data/json/airfields/` (16+ theater directories)                 |
| **Navaid Database**    | Navigation aids (VOR/DME, TACAN, NDB) by theater                               | `/src/data/json/navaids/` (16+ theater directories)                   |
| **Squadron Database**  | Squadron definitions and airframe assignments                                  | `/src/data/squadrons.ts`, `/src/data/json/squadrons.json`             |
| **Theater Database**   | Theater definitions with navaid/airfield data URLs                             | `/src/data/theaters.ts`, `/src/data/json/theaters.json`               |
| **Crew Database**      | Pilot roster with squadron assignments                                         | `/src/data/crew.ts`, `/src/data/json/crew.json`                       |
| **Loadouts Database**  | Pre-configured weapon loadouts by airframe                                     | `/src/data/loadouts.ts`, `/src/data/json/loadouts.json`               |
| **Munitions Database** | Complete munitions catalog with CLSID mappings                                 | `/src/data/munitions.ts`, `/src/data/json/munitions.json` (368KB+)    |
| **Channelization**     | Default radio presets by theater, airframe, and radio                          | `/src/data/channelization.ts`, `/src/data/json/channelization/*.json` |
| **Mission Types**      | Mission type enumeration (CAS, DEAD/AI, SEAD, STRIKE, etc.)                    | `/src/data/constants.ts`, `/src/data/json/missionTypes.json`          |

### Composables (Business Logic)

| Module                        | Purpose                                                         | Location                                        |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| **useMissionData**            | Central mission data accessor, field updates                    | `/src/composables/useMissionData.ts`            |
| **useMissionActions**         | High-level mission operations (create, edit, delete, duplicate) | `/src/composables/useMissionActions.ts`         |
| **useMissionValidation**      | JSON Schema validation, export readiness checks                 | `/src/composables/useMissionValidation.ts`      |
| **useCrewManagement**         | Crew member CRUD, STN/Mode3/laser code formatting               | `/src/composables/useCrewManagement.ts`         |
| **useMissionCallsigns**       | Flight callsign generation and overrides                        | `/src/composables/useMissionCallsigns.ts`       |
| **useWaypointManagement**     | Waypoint CRUD, reordering, drag-and-drop                        | `/src/composables/useWaypointManagement.ts`     |
| **useWaypointCalculations**   | Distance/bearing calculations, time on target                   | `/src/composables/useWaypointCalculations.ts`   |
| **useLoadoutManagement**      | Loadout station management, munition assignment                 | `/src/composables/useLoadoutManagement.ts`      |
| **usePackageManagement**      | Mission package member management                               | `/src/composables/usePackageManagement.ts`      |
| **useSupportAssetManagement** | Support asset management (tankers, AWACS, JSTARS)               | `/src/composables/useSupportAssetManagement.ts` |
| **useMissionWeights**         | Weight and balance calculations for TOLD                        | `/src/composables/useMissionWeights.ts`         |
| **useCCIPCalculations**       | CCIP reference point bearing/distance calculations              | `/src/composables/useCCIPCalculations.ts`       |
| **useMissionExport**          | Export handlers for PDF and JSON MDC                            | `/src/composables/useMissionExport.ts`          |
| **useStorageMonitor**         | localStorage usage monitoring and quota warnings                | `/src/composables/useStorageMonitor.ts`         |

### Services

| Module            | Purpose                                                    | Location                                    |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------- |
| **PDF Generator** | Kneeboard-sized briefing card generation (3-page format)   | `/src/services/pdfGenerator/index.ts`       |
| **PDF Page 1**    | Mission info, flight composition, departure/recovery       | `/src/services/pdfGenerator/pages/page1.ts` |
| **PDF Page 2**    | Flight plan with waypoints, TOLD/fuel data                 | `/src/services/pdfGenerator/pages/page2.ts` |
| **PDF Page 3**    | Targets and threats                                        | `/src/services/pdfGenerator/pages/page3.ts` |
| **PDF Sections**  | Reusable sections (flight, loadout, radios, targets, etc.) | `/src/services/pdfGenerator/sections/*.ts`  |
| **PDF Utilities** | Formatting and layout helpers for PDF generation           | `/src/services/pdfGenerator/utils/*.ts`     |
| **MDC Exporter**  | DCS-compatible JSON MDC generation (F-16C, A-10C)          | `/src/services/mdcExporter.ts`              |
| **Image Storage** | IndexedDB service for mission images (2MB per image)       | `/src/services/imageStorage.ts`             |

### Components

| Module                        | Purpose                                                      | Location                                                          |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Mission List View**         | Mission browser with filtering, grid/table views             | `/src/views/MissionList.vue`                                      |
| **Mission Editor View**       | Tab-based mission editing interface                          | `/src/views/MissionEditor.vue`                                    |
| **Mission Table**             | Tabular mission display                                      | `/src/components/mission-list/MissionTable.vue`                   |
| **Mission Card Grid**         | Card-based mission display                                   | `/src/components/mission-list/MissionCardGrid.vue`                |
| **Create Mission Modal**      | New mission creation dialog                                  | `/src/components/mission-list/CreateMissionModal.vue`             |
| **Basic Info Editor**         | Mission name, date, callsign, mission type                   | `/src/components/mission/basic-info/MissionBasicInfo.vue`         |
| **Departure/Recovery Editor** | Departure/recovery procedures, airports, runways             | `/src/components/mission/basic-info/MissionDepartureRecovery.vue` |
| **Steerpoints Editor**        | Flight plan management with drag-and-drop                    | `/src/components/mission/steerpoints/MissionSteerpoints.vue`      |
| **Waypoint Card**             | Individual waypoint editor                                   | `/src/components/mission/steerpoints/WaypointCard.vue`            |
| **Flight Members Editor**     | Crew composition management                                  | `/src/components/mission/flight-members/MissionFlightMembers.vue` |
| **Loadout Editor**            | Aircraft loadout with station-by-station munition assignment | `/src/components/mission/loadout/MissionLoadout.vue`              |
| **Radio Presets Editor**      | Radio frequency management                                   | `/src/components/mission/radios/RadioPresetsEditor.vue`           |
| **TOLD & Fuel Editor**        | Takeoff/landing performance data, calculators                | `/src/components/mission/told-fuel/MissionTOLDFuel.vue`           |
| **Speed Calculator**          | Rotation/refusal speed calculator modal                      | `/src/components/mission/told-fuel/SpeedCalculatorModal.vue`      |
| **Bingo Calculator**          | Bingo fuel calculator modal                                  | `/src/components/mission/told-fuel/BingoCalculatorModal.vue`      |
| **Targets Editor**            | Primary/secondary target management                          | `/src/components/mission/targets/MissionTargets.vue`              |
| **Package Editor**            | Mission package members and support assets                   | `/src/components/mission/package/MissionPackage.vue`              |
| **ECM/CMDS Editor**           | Electronic countermeasure settings                           | `/src/components/mission/ecm-cmds/MissionECMCMDS.vue`             |
| **Briefing Editor**           | Markdown-based mission notes with image support              | `/src/components/mission/briefing/MissionBriefing.vue`            |
| **Coordinate Input**          | DMS coordinate input with decimal conversion                 | `/src/components/common/CoordinateInputField.vue`                 |
| **Markdown Editor**           | Markdown editor with preview                                 | `/src/components/common/MarkdownEditor.vue`                       |

### Utilities

| Module                       | Purpose                                                 | Location                               |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------- |
| **Coordinate Utilities**     | Decimal/DMS conversion, formatting, validation          | `/src/utils/coordinates.ts`            |
| **MGRS Utilities**           | MGRS coordinate support                                 | `/src/utils/mgrs.ts`                   |
| **Date/Time Formatting**     | Date, time, number formatting helpers                   | `/src/utils/formatting.ts`             |
| **Crew Formatting**          | STN, Mode3, laser code formatting                       | `/src/utils/crewFormatting.ts`         |
| **Mission Helpers**          | Get airframe from mission, mission metadata             | `/src/utils/missionHelpers.ts`         |
| **Mission Storage**          | Serialize/deserialize missions (compact storage format) | `/src/utils/missionStorage.ts`         |
| **Storage Validation**       | JSON Schema validation for mission storage              | `/src/utils/validateMissionStorage.ts` |
| **F-16 Rotation Calculator** | F-16C rotation speed calculations                       | `/src/utils/f16RotationCalculator.ts`  |
| **F-16 Bingo Calculator**    | F-16C bingo fuel calculations                           | `/src/utils/f16BingoCalculator.ts`     |
| **A-10 Rotation Calculator** | A-10C rotation speed calculations                       | `/src/utils/a10RotationCalculator.ts`  |
| **Airframe Helpers**         | Get stations, radios, munitions per airframe            | `/src/utils/airframeHelpers.ts`        |
| **Station Labels**           | Station name labels by airframe                         | `/src/utils/stationLabels.ts`          |
| **Drag and Drop**            | Generic drag-and-drop composable for lists              | `/src/utils/useDragAndDrop.ts`         |
| **Storage Analysis**         | localStorage usage analysis and monitoring              | `/src/utils/storageAnalysis.ts`        |

### Schemas & Validation

| Module             | Purpose                                          | Location                               |
| ------------------ | ------------------------------------------------ | -------------------------------------- |
| **Mission Schema** | JSON Schema v7 definition for mission validation | `/src/schemas/mission.schema.json`     |
| **Data Schemas**   | JSON Schema definitions for static data files    | `/src/data/json/schemas/*.schema.json` |

### Testing

| Module               | Purpose                                    | Location                               |
| -------------------- | ------------------------------------------ | -------------------------------------- |
| **Component Tests**  | Unit tests for 19+ Vue components          | `/src/__tests__/components/*.spec.ts`  |
| **Composable Tests** | Unit tests for business logic composables  | `/src/__tests__/composables/*.spec.ts` |
| **Service Tests**    | Unit tests for export and storage services | `/src/__tests__/services/*.spec.ts`    |
| **Store Tests**      | Unit tests for Pinia stores                | `/src/__tests__/stores/*.spec.ts`      |
| **Utility Tests**    | Unit tests for 14+ utility modules         | `/src/__tests__/utils/*.spec.ts`       |
| **Test Helpers**     | Reusable test utilities and mock factories | `/src/__tests__/helpers/*.ts`          |
| **E2E Tests**        | End-to-end tests with Playwright           | `/e2e/*.spec.ts`                       |

### Styling & Theme

| Module                  | Purpose                                                   | Location                       |
| ----------------------- | --------------------------------------------------------- | ------------------------------ |
| **Design Tokens**       | Design system constants (spacing, fonts, form dimensions) | `/src/styles/design-tokens.ts` |
| **Theme Configuration** | Light/dark theme overrides for Naive UI                   | `/src/theme.ts`                |

### Configuration & Scripts

| Module                | Purpose                                            | Location                |
| --------------------- | -------------------------------------------------- | ----------------------- |
| **Package Config**    | Dependencies, scripts, lint-staged configuration   | `/package.json`         |
| **Vite Config**       | Build configuration with Vue plugin                | `/vite.config.ts`       |
| **TypeScript Config** | TypeScript compiler settings (strict mode)         | `/tsconfig.json`        |
| **Vitest Config**     | Unit test framework configuration                  | `/vitest.config.ts`     |
| **Playwright Config** | E2E test configuration (Chromium, Firefox, WebKit) | `/playwright.config.ts` |
| **ESLint Config**     | Code style rules and linting configuration         | `/eslint.config.js`     |
| **Husky Hooks**       | Pre-commit hooks for linting and testing           | `/.husky/`              |

## Scripts

The project includes utility scripts in the `/scripts` directory for data generation and validation. These scripts are used during development to extract, process, and validate data from various sources.

### Data Validation

#### validate-schemas.ts

Validates all JSON data files against their corresponding JSON Schema definitions.

**Purpose**: Ensures data integrity across 1000+ static data files (airframes, airfields, navaids, munitions, etc.)

**Technology**: TypeScript (run via jiti)

**Usage**:

```sh
pnpm validate:schemas
# or
jiti scripts/validate-schemas.ts
```

**What it validates**:

- Navaid data files against `navaids.schema.json`
- Airfield data files against `airfields.schema.json`
- Channelization files against `channelization.schema.json`
- Airframe files against `airframes.schema.json`
- Theater, loadout, munition, squadron, crew, and mission type configuration files

**Output**: Console report showing validation status for each file, with detailed error messages for any schema violations.

---

### Airfield Data Generation

#### airfields/generate_extraction_missions.py

Generates DCS mission (.miz) files with embedded Lua scripts to extract airfield, runway, and terrain data from DCS World.

**Purpose**: Automates creation of data extraction missions for all DCS terrains

**Technology**: Python 3 (requires `pydcs` library)

**Prerequisites**:

```sh
pip install pydcs
```

**Usage**:

```sh
python scripts/airfields/generate_extraction_missions.py
python scripts/airfields/generate_extraction_missions.py --terrain Caucasus
python scripts/airfields/generate_extraction_missions.py --output-dir ./missions
```

**What it does**:

- Creates .miz mission files for each DCS terrain (Caucasus, Nevada, Syria, etc.)
- Embeds MOOSE framework and Lua export scripts
- Uses DoScriptFile pattern for complex missions
- Generates missions for custom terrains not in pydcs (Afghanistan, Iraq, Kola, Germany Cold War, Sinai, Marianas WWII)

**Output**: Mission files ready to be loaded in DCS World for data extraction

#### airfields/process_terrain_exports.py

Processes terrain data exported from DCS missions and merges with beacon/ILS/TACAN data to create complete airfield database files.

**Purpose**: Converts raw DCS export data into application-ready JSON format

**Technology**: Python 3

**Usage**:

```sh
python scripts/airfields/process_terrain_exports.py
python scripts/airfields/process_terrain_exports.py --input-dir "/path/to/exports"
python scripts/airfields/process_terrain_exports.py --terrain Caucasus
```

**What it does**:

- Reads terrain export JSON files from DCS
- Matches beacons to airfields by proximity
- Merges runway, frequency, ILS, and TACAN data
- Generates complete airfield database files per theater

**Output**: JSON files in `/src/data/json/airfields/` directory

#### airfields/custom_terrains.py

Provides custom terrain classes for DCS terrains not included in the pydcs library.

**Purpose**: Enables mission generation for newer/custom DCS terrains

**Technology**: Python 3 module

**Terrains supported**:

- Afghanistan
- Iraq
- Kola
- Germany Cold War
- Sinai
- Marianas WWII

**Usage**: Imported by `generate_extraction_missions.py`

---

### DCS Datamine (Airframe & Munitions Data)

The DCS datamine system extracts weapon and aircraft data directly from a local DCS World installation, providing self-sufficient data updates without external dependencies.

#### dcs-datamine/hooks/v303-datamine-hook.lua

DCS hook script that runs at game launch and exports game memory data to JSON files.

**Purpose**: Extracts launcher/munition and aircraft data directly from DCS runtime

**Technology**: Lua (DCS Hook API)

**Installation**:

1. Copy `v303-datamine-hook.lua` to `DCS World\Scripts\Hooks\`
2. Launch DCS World
3. Find exports in `Saved Games\DCS\v303-datamine\`

**What it exports**:

- `launchers.json` - All weapon/munition definitions (CLSID, weight, display name)
- `aircraft.json` - All flyable aircraft (weights, fuel, CMDS, radios, stations)
- `version.txt` - DCS version marker for change detection

**Features**:

- Automatic version detection (only re-exports when DCS version changes)
- Accesses `_G.launcher` and `_G.db.Units.Planes.Plane` tables
- JSON output for easy processing

#### dcs-datamine/integrate-dcs-export.js

Processes exported JSON files and generates application-ready data files.

**Purpose**: Converts DCS exports into project format (munitions.json, airframe files)

**Technology**: Node.js/JavaScript

**Usage**:

```sh
node scripts/dcs-datamine/integrate-dcs-export.js <path-to-export-dir>
# Example:
node scripts/dcs-datamine/integrate-dcs-export.js ~/Dropbox/DCS/v303-datamine
```

**What it generates**:

- `/src/data/json/munitions.json` - Complete munitions catalog with categories
- `/src/data/json/airframes/*.json` - Individual airframe configuration files

**Features**:

- Weight conversion (kg to lbs)
- Munition categorization (air-to-air, air-to-ground, fuel, pod, rack)
- CLSID validation between munitions and aircraft
- Applies existing override files (`munitions-overrides.json`, `airframe-overrides/*.json`)

**Workflow**:

1. **Windows**: Launch DCS (hook auto-exports on version change)
2. **Transfer**: Copy `launchers.json` and `aircraft.json` to Mac
3. **Mac**: Run integration script
4. **Review**: Check generated files and commit

---

### Navaid Data Generation

#### navaids/scrape_navaids.py

Scrapes navigation aid data from v303rdfightergroup.com and enriches with elevation data from local DEM (Digital Elevation Model) sources.

**Purpose**: Builds navigation database from squadron's published navaid references

**Technology**: Python 3 (requires `requests`, `beautifulsoup4`, and either `srtm.py` or `elevation`)

**Prerequisites**:

```sh
pip install requests beautifulsoup4
pip install srtm.py  # or: pip install elevation
```

**Usage**:

```sh
python scripts/navaids/scrape_navaids.py                    # Process all theaters
python scripts/navaids/scrape_navaids.py --theatre Nevada   # Process specific theater
```

**What it does**:

- Scrapes navaid tables from v303rd FG website
- Parses TACAN, VOR/DME, and NDB data
- Fetches elevation data from SRTM (Shuttle Radar Topography Mission) DEM
- Validates coordinate formats
- Generates theater-specific navaid databases

**Output**: JSON files in `/src/data/json/navaids/` directory

**Theaters supported**:

- Nevada
- Mariana Islands
- Syria
- Afghanistan
- Germany Cold War

#### navaids/merge_beacons_towns.py

Merges extracted DCS beacon/town data with scraped navaid data and adds elevation information.

**Purpose**: Combines multiple navaid data sources into unified database

**Technology**: Python 3 (requires DEM library)

**Prerequisites**:

```sh
pip install srtm.py  # or: pip install elevation
```

**Usage**:

```sh
python scripts/navaids/merge_beacons_towns.py --input-dir ~/Dropbox
python scripts/navaids/merge_beacons_towns.py --input-dir ./extracted_data --output-dir ./output
```

**What it does**:

- Reads DCS-exported beacon and town data
- Merges with scraped navaid data
- Adds elevation data from DEM sources
- Resolves terrain name mappings
- Writes final unified navaid JSON files

**Output**: Merged navaid JSON files ready for application use

---

### Performance Calculator Data Generation

#### a10-rotation-calculator/extract_regression.py

Extracts A-10C rotation speed chart data and fits polynomial regression curves.

**Purpose**: Converts A-10C TOLD charts to mathematical equations for automated calculations

**Technology**: Python 3 (requires `numpy`, `matplotlib`, `pillow`)

**Prerequisites**:

```sh
pip install numpy matplotlib pillow
```

**Usage**:

```sh
python scripts/a10-rotation-calculator/extract_regression.py
```

**What it does**:

- Samples data points from A-10C TOLD charts (Figure A2-2)
- Fits polynomial regression curves (degrees 1-3)
- Calculates R² values to assess fit quality
- Generates rotation and refusal speed equations
- Exports regression coefficients for use in calculator

**Output**: Polynomial coefficients and equations for A-10C rotation/refusal speed calculations

**Use case**: Powers the A-10C speed calculator in `/src/utils/a10RotationCalculator.ts`

#### f16-rotation-calculator/extract_regression.py

Extracts F-16C rotation speed chart data and fits polynomial regression curves.

**Purpose**: Converts F-16C TOLD charts to mathematical equations for automated calculations

**Technology**: Python 3 (requires `numpy`, `matplotlib`, `pillow`)

**Prerequisites**:

```sh
pip install numpy matplotlib pillow
```

**Usage**:

```sh
python scripts/f16-rotation-calculator/extract_regression.py
```

**What it does**:

- Samples data points from F-16C TOLD charts (Figure B2-2)
- Fits polynomial regression to takeoff and refusal speed data
- Tests polynomial degrees (1-3) for optimal fit
- Calculates R² correlation coefficients
- Exports regression equations

**Output**: Polynomial coefficients and equations for F-16C takeoff/refusal speed calculations

**Use case**: Powers the F-16C speed calculator in `/src/utils/f16RotationCalculator.ts`

---

### Script Dependencies Summary

**Python Scripts** (require Python 3.7+):

- `airfields/generate_extraction_missions.py` → `pydcs`
- `airfields/process_terrain_exports.py` → stdlib only
- `airfields/custom_terrains.py` → `pydcs`
- `navaids/scrape_navaids.py` → `requests`, `beautifulsoup4`, `srtm.py`/`elevation`
- `navaids/merge_beacons_towns.py` → `srtm.py`/`elevation`
- `a10-rotation-calculator/extract_regression.py` → `numpy`, `matplotlib`, `pillow`
- `f16-rotation-calculator/extract_regression.py` → `numpy`, `matplotlib`, `pillow`

**Lua Scripts** (require DCS World):

- `dcs-datamine/hooks/v303-datamine-hook.lua` → DCS Hook API

**Node.js Scripts** (require Node.js 20+):

- `dcs-datamine/integrate-dcs-export.js` → stdlib only

**TypeScript Scripts** (run via jiti):

- `validate-schemas.ts` → executed via `pnpm validate:schemas`

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
pnpm build

# Runs the end-to-end tests
pnpm test:e2e
# Runs the tests only on Chromium
pnpm test:e2e --project=chromium
# Runs the tests of a specific file
pnpm test:e2e tests/example.spec.ts
# Runs the tests in debug mode
pnpm test:e2e --debug
```

### Validate Data Schemas

```sh
pnpm validate:schemas
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
