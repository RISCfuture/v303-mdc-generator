import proj4 from 'proj4'

type TheaterProjection = {
  centralMeridian: number
  falseEasting: number
  falseNorthing: number
  scaleFactor: number
}

const theaterProjections: Record<string, TheaterProjection | undefined> = {
  // From pydcs/dcs (upstream)
  Caucasus: {
    centralMeridian: 33,
    falseEasting: -99516.9999999732,
    falseNorthing: -4998114.999999984,
    scaleFactor: 0.9996,
  },
  Nevada: {
    centralMeridian: -117,
    falseEasting: -193996.80999964548,
    falseNorthing: -4410028.063999966,
    scaleFactor: 0.9996,
  },
  Syria: {
    centralMeridian: 39,
    falseEasting: 282801.00000003993,
    falseNorthing: -3879865.9999999935,
    scaleFactor: 0.9996,
  },
  PersianGulf: {
    centralMeridian: 57,
    falseEasting: 75755.99999999645,
    falseNorthing: -2894933.0000000377,
    scaleFactor: 0.9996,
  },
  Falklands: {
    centralMeridian: -57,
    falseEasting: 147639.99999997593,
    falseNorthing: 5815417.000000032,
    scaleFactor: 0.9996,
  },
  MarianaIslands: {
    centralMeridian: 147,
    falseEasting: 238417.99999989968,
    falseNorthing: -1491840.000000048,
    scaleFactor: 0.9996,
  },
  Normandy: {
    centralMeridian: -3,
    falseEasting: -195526.00000000204,
    falseNorthing: -5484812.999999951,
    scaleFactor: 0.9996,
  },
  TheChannel: {
    centralMeridian: 3,
    falseEasting: 99376.00000000288,
    falseNorthing: -5636889.00000001,
    scaleFactor: 0.9996,
  },
  // From Druss99/pydcs fork (https://github.com/Druss99/pydcs, branch: dcsupdate)
  Afghanistan: {
    centralMeridian: 63,
    falseEasting: -300149.9999999864,
    falseNorthing: -3759657.000000049,
    scaleFactor: 0.9996,
  },
  GermanyCW: {
    centralMeridian: 21,
    falseEasting: 35427.619999985734,
    falseNorthing: -6061633.128000011,
    scaleFactor: 0.9996,
  },
  Iraq: {
    centralMeridian: 45,
    falseEasting: 72290.00000004497,
    falseNorthing: -3680057.0,
    scaleFactor: 0.9996,
  },
  Kola: {
    centralMeridian: 21,
    falseEasting: -62702.00000000087,
    falseNorthing: -7543624.999999979,
    scaleFactor: 0.9996,
  },
  SinaiMap: {
    centralMeridian: 33,
    falseEasting: 169221.9999999585,
    falseNorthing: -3325312.9999999693,
    scaleFactor: 0.9996,
  },
}

function buildProj4String(projection: TheaterProjection): string {
  return (
    `+proj=tmerc +lat_0=0 +lon_0=${projection.centralMeridian} ` +
    `+k_0=${projection.scaleFactor} ` +
    `+x_0=${projection.falseEasting} +y_0=${projection.falseNorthing} ` +
    `+ellps=WGS84 +units=m +no_defs`
  )
}

export function isTheaterProjectionSupported(theater: string): boolean {
  return theater in theaterProjections
}

/**
 * Convert lat/lon to DCS game world coordinates
 * Returns { x, y } where x = northing and y = easting in DCS coordinate system
 */
export function latLonToDCS(
  lat: number,
  lon: number,
  theater: string,
): { x: number; y: number } | null {
  const projection = theaterProjections[theater]
  if (!projection) return null

  const projString = buildProj4String(projection)
  // proj4 forward: [lon, lat] → [easting, northing]
  const [easting, northing] = proj4(projString).forward([lon, lat])
  // DCS: x = northing, y = easting
  return { x: northing, y: easting }
}

/**
 * Convert DCS game world coordinates to lat/lon
 */
export function dcsToLatLon(
  x: number,
  y: number,
  theater: string,
): { lat: number; lon: number } | null {
  const projection = theaterProjections[theater]
  if (!projection) return null

  const projString = buildProj4String(projection)
  // DCS: x = northing, y = easting → proj4 inverse: [easting, northing] → [lon, lat]
  const [lon, lat] = proj4(projString).inverse([y, x])
  return { lat, lon }
}
