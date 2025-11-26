// VinAudit adapter with MOCK/LIVE auto-switch

const MOCK_REPORT = {
  vin: 'MOCKVIN1234567890',
  attributes: { 
    year: 2018, 
    make: 'Honda', 
    model: 'Civic', 
    engine: '2.0L', 
    type: 'Sedan', 
    trim: 'EX' 
  },
  sections: {
    title_brands: [{ brand:'None', state:'CA', date:'2020-05-12' }],
    odometer_records: [{ miles:31250, date:'2022-06-18', source:'DMV' }],
    accidents: [],
    sales_history: [{ date:'2023-09-10', price:16800, channel:'Auction' }],
    recalls: [{ nhtsa:'23V-123', component:'Airbags', status:'Open' }]
  },
  source: 'VinAudit (mock)'
};

const VA_KEY = process.env.VINAUDIT_API_KEY?.trim();

async function vaQuery(vin) {
  const r = await fetch(`https://api.vinaudit.com/v2/query?vin=${vin}&key=${VA_KEY}&format=json`);
  if (!r.ok) throw new Error('VinAudit query failed');
  const j = await r.json();
  if (!j?.success) throw new Error(j?.error || 'No records');
  return j;
}

async function vaReport(vin) {
  const r = await fetch(`https://api.vinaudit.com/v2/report?vin=${vin}&key=${VA_KEY}&format=json`);
  if (!r.ok) throw new Error('VinAudit report failed');
  return r.json();
}

async function autoDevPlateToVin(plate, state) {
  const key = process.env.AUTODEV_PLATE_API_KEY?.trim();
  if (!key) return null;
  const r = await fetch(`https://auto.dev/api/v1/plate-to-vin/${state}/${encodeURIComponent(plate)}?apikey=${key}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j?.vin || null;
}

async function mockPlateToVin(_p, _s) {
  return 'MOCKVIN1234567890';
}

async function createOrGetReport(input) {
  const live = !!VA_KEY;
  let vin = (input.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (!vin && input.plate && input.state) {
    vin = live 
      ? (await autoDevPlateToVin(input.plate, input.state)) || '' 
      : (await mockPlateToVin(input.plate, input.state)) || '';
  }
  
  if (!vin) throw new Error('VIN not provided / not resolved');
  
  if (!live) return { ...MOCK_REPORT, vin };

  const q = await vaQuery(vin);
  const raw = await vaReport(vin);
  
  return { 
    vin, 
    attributes: q?.attributes || {}, 
    sections: raw?.sections || raw, 
    source: 'VinAudit (live)' 
  };
}

module.exports = { createOrGetReport };

