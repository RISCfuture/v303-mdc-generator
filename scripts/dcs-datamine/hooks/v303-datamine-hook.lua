--[[
v303 DCS Datamine Hook

This hook runs at DCS launch and exports launcher/munition and aircraft data
to JSON files for use by the v303 MDC Generator project.

Installation:
  1. Copy this file to: DCS World\Scripts\Hooks\
  2. Launch DCS World
  3. Find exported files in: Saved Games\DCS\v303-datamine\

The hook automatically detects DCS version changes and only re-exports when needed.

Author: v303rd Fighter Group
--]]

local hook = {}

-- Configuration
local EXPORT_DIR_NAME = "v303-datamine"
local VERSION_FILE = "version.txt"
local LAUNCHERS_FILE = "launchers.json"
local AIRCRAFT_FILE = "aircraft.json"

-- Logging helpers
local function logInfo(msg)
    log.write("V303_DATAMINE", log.INFO, msg)
end

local function logError(msg)
    log.write("V303_DATAMINE", log.ERROR, msg)
end

-- Get export directory path
local function getExportDir()
    local writePath = lfs.writedir()
    return writePath .. EXPORT_DIR_NAME .. "\\"
end

-- Check if export is needed (version changed)
local function needsExport()
    local exportDir = getExportDir()
    local versionPath = exportDir .. VERSION_FILE
    local currentVersion = _APP_VERSION or "unknown"

    -- Check if version file exists
    local f = io.open(versionPath, "r")
    if not f then
        return true
    end

    local savedVersion = f:read("*all")
    f:close()

    return savedVersion ~= currentVersion
end

-- Save version file
local function saveVersion()
    local exportDir = getExportDir()
    local versionPath = exportDir .. VERSION_FILE
    local currentVersion = _APP_VERSION or "unknown"

    local f = io.open(versionPath, "w")
    if f then
        f:write(currentVersion)
        f:close()
    end
end

-- Create directory if it doesn't exist
local function ensureDir(path)
    lfs.mkdir(path)
end

--------------------------------------------------------------------------------
-- JSON Encoder
--------------------------------------------------------------------------------

local json = {}

-- Escape special characters in strings
local function escapeString(s)
    s = string.gsub(s, "\\", "\\\\")
    s = string.gsub(s, '"', '\\"')
    s = string.gsub(s, "\n", "\\n")
    s = string.gsub(s, "\r", "\\r")
    s = string.gsub(s, "\t", "\\t")
    return s
end

-- Check if a table is an array (consecutive integer keys starting from 1)
local function isArray(t)
    if type(t) ~= "table" then return false end
    local count = 0
    for _ in pairs(t) do
        count = count + 1
    end
    for i = 1, count do
        if t[i] == nil then
            return false
        end
    end
    return count > 0
end

-- Encode a value to JSON
local function encodeValue(val, indent, seen)
    indent = indent or 0
    seen = seen or {}

    local valType = type(val)

    if valType == "nil" then
        return "null"
    elseif valType == "boolean" then
        return tostring(val)
    elseif valType == "number" then
        -- Handle special float values
        if val ~= val then return "null" end -- NaN
        if val == math.huge then return "null" end
        if val == -math.huge then return "null" end
        return tostring(val)
    elseif valType == "string" then
        return '"' .. escapeString(val) .. '"'
    elseif valType == "table" then
        -- Prevent infinite recursion
        if seen[val] then
            return "null"
        end
        seen[val] = true

        local padding = string.rep("  ", indent)
        local paddingInner = string.rep("  ", indent + 1)

        if isArray(val) then
            -- Array
            local items = {}
            for i, v in ipairs(val) do
                local encoded = encodeValue(v, indent + 1, seen)
                if encoded then
                    table.insert(items, paddingInner .. encoded)
                end
            end
            if #items == 0 then
                return "[]"
            end
            return "[\n" .. table.concat(items, ",\n") .. "\n" .. padding .. "]"
        else
            -- Object
            local items = {}
            for k, v in pairs(val) do
                if type(k) == "string" then
                    local encoded = encodeValue(v, indent + 1, seen)
                    if encoded then
                        table.insert(items, paddingInner .. '"' .. escapeString(k) .. '": ' .. encoded)
                    end
                end
            end
            if #items == 0 then
                return "{}"
            end
            -- Sort keys for consistent output
            table.sort(items)
            return "{\n" .. table.concat(items, ",\n") .. "\n" .. padding .. "}"
        end
    else
        return "null"
    end
end

function json.encode(obj)
    return encodeValue(obj, 0, {})
end

--------------------------------------------------------------------------------
-- Launcher/Munition Export
--------------------------------------------------------------------------------

local function exportLaunchers()
    logInfo("Exporting launchers...")

    local launchers = {}
    local count = 0

    -- Access the global launcher table
    if _G.launcher then
        for clsid, data in pairs(_G.launcher) do
            if type(data) == "table" and type(clsid) == "string" then
                local entry = {
                    displayName = data.display_name or data.displayName or data.name or clsid,
                    weight = data.Weight or data.mass or data.weight or 0,
                    weightEmpty = data.Weight_Empty or data.weight_empty or data.emptyWeight,
                    -- Include attribute for fuel tank detection
                    attribute = data.attribute,
                    category = data.category
                }

                launchers[clsid] = entry
                count = count + 1
            end
        end
    else
        logError("_G.launcher table not found!")
    end

    local result = {
        version = _APP_VERSION or "unknown",
        exportTime = os.date("%Y-%m-%dT%H:%M:%S"),
        count = count,
        launchers = launchers
    }

    local exportDir = getExportDir()
    local filePath = exportDir .. LAUNCHERS_FILE

    local f = io.open(filePath, "w")
    if f then
        f:write(json.encode(result))
        f:close()
        logInfo("Exported " .. count .. " launchers to " .. filePath)
    else
        logError("Failed to write launchers file: " .. filePath)
    end

    return count
end

--------------------------------------------------------------------------------
-- Aircraft Export
--------------------------------------------------------------------------------

local function extractPylons(pylonsData)
    if not pylonsData or type(pylonsData) ~= "table" then
        return {}
    end

    local stations = {}

    for _, pylon in pairs(pylonsData) do
        if type(pylon) == "table" then
            local station = {
                number = pylon.Number or 0,
                name = pylon.DisplayName or ("Station " .. (pylon.Number or 0)),
                munitions = {}
            }

            -- Extract CLSIDs from Launchers
            if pylon.Launchers and type(pylon.Launchers) == "table" then
                for _, launcher in pairs(pylon.Launchers) do
                    if type(launcher) == "table" and launcher.CLSID then
                        local clsid = launcher.CLSID
                        if clsid ~= "<CLEAN>" then
                            table.insert(station.munitions, clsid)
                        end
                    end
                end
            end

            if #station.munitions > 0 then
                table.insert(stations, station)
            end
        end
    end

    -- Sort by station number
    table.sort(stations, function(a, b) return a.number < b.number end)

    return stations
end

local function extractRadios(panelRadioData)
    if not panelRadioData or type(panelRadioData) ~= "table" then
        return {}
    end

    local radios = {}
    local radioIndex = 1

    for _, radio in ipairs(panelRadioData) do
        if type(radio) == "table" then
            local presetCount = 0
            local minFreq = nil
            local maxFreq = nil
            local description = radio.name or "Radio"

            -- Count channels/presets
            if radio.channels and type(radio.channels) == "table" then
                presetCount = #radio.channels
            end

            -- Extract frequency range
            -- Range can be either {min=X, max=Y} or {[1]={min=X, max=Y}, ...}
            if radio.range and type(radio.range) == "table" then
                -- Check if min/max are directly on range table
                if radio.range.min then
                    minFreq = radio.range.min
                end
                if radio.range.max then
                    maxFreq = radio.range.max
                end
                -- Also check for nested range tables (some aircraft use this format)
                for _, r in pairs(radio.range) do
                    if type(r) == "table" then
                        if r.min then
                            if not minFreq or r.min < minFreq then
                                minFreq = r.min
                            end
                        end
                        if r.max then
                            if not maxFreq or r.max > maxFreq then
                                maxFreq = r.max
                            end
                        end
                    end
                end
            end

            if presetCount > 0 or minFreq or maxFreq then
                table.insert(radios, {
                    name = "COM " .. radioIndex,
                    description = description,
                    presetCount = presetCount,
                    min = minFreq,
                    max = maxFreq
                })
                radioIndex = radioIndex + 1
            end
        end
    end

    return radios
end

local function extractGuns(gunsData)
    if not gunsData or type(gunsData) ~= "table" then
        return {}
    end

    local guns = {}

    for _, gun in pairs(gunsData) do
        if type(gun) == "table" then
            local gunEntry = {
                name = gun.display_name or "Gun",
                capacity = 0,
                shells = {}
            }

            -- Extract from supply table
            if gun.supply and type(gun.supply) == "table" then
                gunEntry.capacity = gun.supply.count or 0

                -- Extract shells
                if gun.supply.shells and type(gun.supply.shells) == "table" then
                    for _, shell in pairs(gun.supply.shells) do
                        if type(shell) == "table" and shell.name and shell.display_name then
                            -- Skip invisible variants
                            if not string.find(shell.name, "_INVIS") then
                                table.insert(gunEntry.shells, {
                                    name = shell.name,
                                    displayName = shell.display_name
                                })
                            end
                        end
                    end
                end

                -- Extract mixes
                if gun.supply.mixes and type(gun.supply.mixes) == "table" and #gunEntry.shells > 0 then
                    gunEntry.mixes = {}
                    for _, mix in pairs(gun.supply.mixes) do
                        if type(mix) == "table" then
                            local sequence = {}
                            for _, shellIndex in ipairs(mix) do
                                local shell = gunEntry.shells[shellIndex]
                                if shell then
                                    table.insert(sequence, shell.name)
                                end
                            end
                            if #sequence > 0 then
                                table.insert(gunEntry.mixes, { sequence = sequence })
                            end
                        end
                    end
                end
            end

            if #gunEntry.shells > 0 then
                table.insert(guns, gunEntry)
            end
        end
    end

    return guns
end

local function extractAmmoTypes(ammoTypeData)
    if not ammoTypeData or type(ammoTypeData) ~= "table" then
        return {}
    end

    local ammoTypes = {}
    for _, ammo in ipairs(ammoTypeData) do
        if type(ammo) == "string" then
            table.insert(ammoTypes, ammo)
        end
    end

    return ammoTypes
end

local function exportAircraftFromDb(sourceDb, aircraft, countSoFar, isHelicopter)
    local count = countSoFar or 0

    if not sourceDb then
        return count
    end

    for aircraftId, data in pairs(sourceDb) do
        if type(data) == "table" then
            -- Check if flyable
            local isFlyable = data._file_flyable ~= nil
            -- Get the aircraft type name (e.g., "A-10C_2", "FA-18C_hornet")
            local typeName = data.type or data.Name or tostring(aircraftId)

            if isFlyable then
                local entry = {
                    aircraft = typeName,
                    displayName = data.DisplayName or typeName,
                    isHelicopter = isHelicopter or false,

                    -- Weights (in kg, will be converted to lbs by integration script)
                    M_empty = data.M_empty or 0,
                    M_max = data.M_max or 0,
                    M_fuel_max = data.M_fuel_max or 0,

                    -- Countermeasures
                    passivCounterm = nil,

                    -- Radios
                    radios = extractRadios(data.panelRadio),

                    -- Guns
                    guns = extractGuns(data.Guns),

                    -- Ammo types
                    ammoTypes = extractAmmoTypes(data.ammo_type),

                    -- Pylons/Stations
                    stations = extractPylons(data.Pylons)
                }

                -- Extract countermeasures if present
                if data.passivCounterm then
                    local cm = data.passivCounterm
                    entry.passivCounterm = {
                        SingleChargeTotal = cm.SingleChargeTotal,
                        chaff = cm.chaff,
                        flare = cm.flare
                    }
                end

                -- Only include if it has minimum required data
                if entry.M_empty > 0 and #entry.stations > 0 then
                    aircraft[typeName] = entry
                    count = count + 1
                end
            end
        end
    end

    return count
end

local function exportAircraft()
    logInfo("Exporting aircraft...")

    local aircraft = {}
    local count = 0

    -- Export planes (isHelicopter = false)
    local planesDb = nil
    if _G.db and _G.db.Units and _G.db.Units.Planes and _G.db.Units.Planes.Plane then
        planesDb = _G.db.Units.Planes.Plane
    end
    count = exportAircraftFromDb(planesDb, aircraft, count, false)

    -- Export helicopters (isHelicopter = true)
    local helicoptersDb = nil
    if _G.db and _G.db.Units and _G.db.Units.Helicopters and _G.db.Units.Helicopters.Helicopter then
        helicoptersDb = _G.db.Units.Helicopters.Helicopter
    end
    count = exportAircraftFromDb(helicoptersDb, aircraft, count, true)

    local result = {
        version = _APP_VERSION or "unknown",
        exportTime = os.date("%Y-%m-%dT%H:%M:%S"),
        count = count,
        aircraft = aircraft
    }

    local exportDir = getExportDir()
    local filePath = exportDir .. AIRCRAFT_FILE

    local f = io.open(filePath, "w")
    if f then
        f:write(json.encode(result))
        f:close()
        logInfo("Exported " .. count .. " aircraft to " .. filePath)
    else
        logError("Failed to write aircraft file: " .. filePath)
    end

    return count
end

--------------------------------------------------------------------------------
-- Hook Entry Point
--------------------------------------------------------------------------------

function hook.onSimulationStart()
    -- Check if export is needed
    if not needsExport() then
        logInfo("DCS version unchanged, skipping export")
        return
    end

    logInfo("DCS version changed or first run, starting export...")

    -- Ensure export directory exists
    local exportDir = getExportDir()
    ensureDir(exportDir)

    -- Export data
    local launcherCount = exportLaunchers()
    local aircraftCount = exportAircraft()

    -- Save version marker
    saveVersion()

    logInfo(string.format("Export complete: %d launchers, %d aircraft", launcherCount, aircraftCount))
end

DCS.setUserCallbacks(hook)

logInfo("v303 Datamine Hook loaded")
