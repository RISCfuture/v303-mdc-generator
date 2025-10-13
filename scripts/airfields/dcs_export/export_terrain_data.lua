--[[
DCS Terrain Data Exporter

Exports complete airfield, runway, and terrain data from DCS World.
This script runs at mission start and exports data to JSON format with proper lat/lon coordinates.

Requirements:
  - MissionScripting.lua desanitized (io module enabled)

Output:
  - Saved Games/DCS/Logs/terrain_export_<terrain>.json

Author: Generated for v303 MDC Generator
--]]

-- Script initialization
env.info("=== TERRAIN EXPORT SCRIPT LOADING ===")
trigger.action.outText("Terrain export script loading...", 5)

-- Verify DCS coord functions are available
if not coord or not coord.LOtoLL then
    env.info("ERROR: DCS coord functions not available!")
    trigger.action.outText('ERROR: DCS coord.LOtoLL not available!', 15)
    return
end

-- Define inline JSON encoder
local json = {}
function json.encode(obj)
    local function encode_value(val)
        local t = type(val)
        if t == "string" then
            local s = val
            s = string.gsub(s, "\\", "\\\\")
            s = string.gsub(s, '"', '\\"')
            s = string.gsub(s, "\n", "\\n")
            return '"' .. s .. '"'
        elseif t == "number" then
            -- Handle special float values
            if val ~= val then return '"NaN"' end
            if val == math.huge then return '"Infinity"' end
            if val == -math.huge then return '"-Infinity"' end
            return tostring(val)
        elseif t == "boolean" then
            return tostring(val)
        elseif t == "table" then
            local is_array = #val > 0
            local result = {}
            if is_array then
                for i, v in ipairs(val) do
                    table.insert(result, encode_value(v))
                end
                return "[" .. table.concat(result, ",") .. "]"
            else
                for k, v in pairs(val) do
                    table.insert(result, '"' .. k .. '":' .. encode_value(v))
                end
                return "{" .. table.concat(result, ",") .. "}"
            end
        else
            return "null"
        end
    end
    return encode_value(obj)
end

-- Define conversion helper using DCS coord.LOtoLL
local function vec3_to_latlon(vec3)
    -- Use DCS native coord.LOtoLL to convert Vec3 to lat/lon
    local lat, lon, alt = coord.LOtoLL(vec3)

    -- Convert altitude from meters to feet
    local alt_feet = alt * 3.28084

    return {
        latitude = lat,
        longitude = lon,
        altitude = alt_feet
    }
end

-- Function to load and parse beacons.lua
local function loadBeacons(terrain_name)
    -- Get DCS install directory
    local install_dir = _APP_DIRECTORY or lfs.currentdir()

    -- Map DCS terrain identifiers to folder names
    local terrain_folder_map = {
        ["GermanyCW"] = "GermanyColdWar",
        ["SinaiMap"] = "Sinai",
        ["MarianaIslandsWWII"] = "MarianasWWII",
    }

    -- Get the actual folder name (use mapping if exists, otherwise use terrain name)
    local folder_name = terrain_folder_map[terrain_name] or terrain_name
    local beacons_path = install_dir .. "\\Mods\\terrains\\" .. folder_name .. "\\beacons.lua"

    env.info("Looking for beacons.lua: " .. beacons_path)

    -- Check if file exists
    if not lfs.attributes(beacons_path, "mode") then
        env.info("WARNING: beacons.lua not found for terrain: " .. terrain_name)
        env.info("  Folder name: " .. folder_name)
        env.info("  Install dir: " .. install_dir)
        return nil
    end

    env.info("Found beacons.lua at: " .. beacons_path)

    -- Try to load the beacons file
    local beacons_status, beacons_data = pcall(function()

        -- Create sandboxed environment with stub functions
        local beacons_env = {
            dofile = function() end,  -- Stub - not needed, we define constants below
            require = function() return { translate = function(text) return text end } end,  -- Stub gettext

            -- Define beacon type constants that beacons.lua expects
            BEACON_TYPE_NULL = 0,
            BEACON_TYPE_VOR = 1,
            BEACON_TYPE_DME = 2,
            BEACON_TYPE_VOR_DME = 3,
            BEACON_TYPE_TACAN = 4,
            BEACON_TYPE_VORTAC = 5,
            BEACON_TYPE_RSBN = 128,
            BEACON_TYPE_BROADCAST_STATION = 1024,
            BEACON_TYPE_HOMER = 8,
            BEACON_TYPE_AIRPORT_HOMER = 4104,
            BEACON_TYPE_AIRPORT_HOMER_WITH_MARKER = 4136,
            BEACON_TYPE_ILS_FAR_HOMER = 16408,
            BEACON_TYPE_ILS_NEAR_HOMER = 16424,
            BEACON_TYPE_ILS_LOCALIZER = 16640,
            BEACON_TYPE_ILS_GLIDESLOPE = 16896,
            BEACON_TYPE_PRMG_LOCALIZER = 33024,
            BEACON_TYPE_PRMG_GLIDESLOPE = 33280,
            BEACON_TYPE_ICLS_LOCALIZER = 131328,
            BEACON_TYPE_ICLS_GLIDESLOPE = 131584,
        }

        -- Load and execute the beacons.lua file
        local chunk = loadfile(beacons_path)
        if not chunk then return nil end

        setfenv(chunk, beacons_env)
        pcall(chunk)

        return beacons_env.beacons
    end)

    if beacons_status and beacons_data then
        return beacons_data
    end
    return nil
end

-- Main export function
local function exportTerrainData()
    env.info("Starting terrain data export...")
    trigger.action.outText("Exporting terrain data...", 5)

    local data = {
        terrain = env.mission.theatre,
        export_time = timer.getAbsTime(),  -- Use mission timer instead of os.date
        dcs_version = _APP_VERSION or "unknown",
        airfields = {},
        beacons = {}
    }

    -- Load beacons data for this terrain
    data.beacons = loadBeacons(env.mission.theatre) or {}

    -- Get all airbases using DCS native function
    env.info("Getting airbases list...")

    local airbases_list = nil
    local status, result = pcall(function()
        return world.getAirbases()
    end)

    if not status or not result then
        env.info("ERROR: Failed to get airbases")
        trigger.action.outText('ERROR: Failed to get airbases!', 10)
        return
    end

    env.info("Found " .. #result .. " airbases")

    -- Process each airbase
    for _, airbase in ipairs(result) do
        local category = airbase:getCategory()

        -- Category 0 and 4 are airdromes (vs heliports, ships, etc.)
        if category == 0 or category == 4 then
            local name = airbase:getName()
            local ab_id = airbase:getID()
            local position = airbase:getPoint()
            local latlon = vec3_to_latlon(position)

            local airfield_data = {
                name = name,
                id = ab_id,
                position = latlon,
                category = "AIRDROME",
                category_id = category,  -- Include raw category for filtering
                runways = {}
            }

            -- Get runway data
            local runways = airbase:getRunways()
            if runways then
                for _, runway in ipairs(runways) do
                    -- runway.course is in radians
                    -- Per DCS API docs: "to have the good heading, you must set heading = -course (in rad)"
                    -- https://wiki.hoggitworld.com/view/DCS_func_getRunways
                    local course_rad = runway.course or 0
                    local heading_deg = -math.deg(course_rad)  -- NEGATE the course value

                    -- Normalize to 0-360
                    if heading_deg < 0 then heading_deg = heading_deg + 360 end

                    table.insert(airfield_data.runways, {
                        name = runway.Name,
                        heading = heading_deg,
                        length = runway.length * 3.28084,  -- Convert meters to feet
                        width = runway.width * 3.28084,     -- Convert meters to feet
                        position = vec3_to_latlon(runway.position)
                    })
                end
            end

            table.insert(data.airfields, airfield_data)
        end
    end

    env.info("Processed " .. #data.airfields .. " airfields")

    -- Encode to JSON
    env.info("Encoding to JSON...")
    local json_string = nil
    local json_status, json_result = pcall(function()
        return json.encode(data)
    end)

    if not json_status or not json_result then
        env.info("ERROR: JSON encoding failed")
        trigger.action.outText('ERROR: JSON encoding failed!', 10)
        return
    end

    -- Write to file
    local export_path = lfs.writedir() .. 'Logs/terrain_export_' .. env.mission.theatre .. '.json'
    local file = io.open(export_path, 'w')
    if file then
        file:write(json_result)
        file:close()
        env.info("Export completed: " .. export_path)
        trigger.action.outText('Export completed: ' .. #data.airfields .. ' airfields', 10)
    else
        env.info("ERROR: Failed to write file")
        trigger.action.outText('ERROR: Failed to write export file!', 10)
    end
end

-- Execute export
trigger.action.outText("Starting terrain export...", 5)
local status, err = pcall(exportTerrainData)
if not status then
    env.info("ERROR: " .. tostring(err))
    trigger.action.outText('ERROR during export: ' .. tostring(err), 15)
end