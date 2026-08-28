// sampleData — demo layers so the map works out of the box.
// Delete this file (and its use in LayersPanel) for real projects.

export const SAMPLE_CITIES = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Seattle',  state: 'WA', population: 749256 },  geometry: { type: 'Point', coordinates: [-122.3321, 47.6062] } },
    { type: 'Feature', properties: { name: 'Denver',   state: 'CO', population: 715522 },  geometry: { type: 'Point', coordinates: [-104.9903, 39.7392] } },
    { type: 'Feature', properties: { name: 'Austin',   state: 'TX', population: 961855 },  geometry: { type: 'Point', coordinates: [-97.7431, 30.2672] } },
    { type: 'Feature', properties: { name: 'Chicago',  state: 'IL', population: 2746388 }, geometry: { type: 'Point', coordinates: [-87.6298, 41.8781] } },
    { type: 'Feature', properties: { name: 'Atlanta',  state: 'GA', population: 498715 },  geometry: { type: 'Point', coordinates: [-84.3880, 33.7490] } },
    { type: 'Feature', properties: { name: 'Boston',   state: 'MA', population: 675647 },  geometry: { type: 'Point', coordinates: [-71.0589, 42.3601] } },
    { type: 'Feature', properties: { name: 'Phoenix',  state: 'AZ', population: 1608139 }, geometry: { type: 'Point', coordinates: [-112.0740, 33.4484] } },
  ],
}

export const SAMPLE_ROUTE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sample Route', mode: 'road' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.3321, 47.6062], [-116.2023, 43.6150], [-111.8910, 40.7608],
          [-104.9903, 39.7392], [-97.7431, 30.2672],
        ],
      },
    },
  ],
}

export const SAMPLE_REGION = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Four Corners Region', acres: '~17M' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-111.0, 39.0], [-107.0, 39.0], [-107.0, 35.0], [-111.0, 35.0], [-111.0, 39.0],
        ]],
      },
    },
  ],
}
