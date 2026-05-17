// Pure IFTA math. No DB, no HTTP — easy to unit test.
//
// IFTA formula recap:
//   fleet_mpg            = total_miles_all_jurisdictions / total_gallons_purchased_all_jurisdictions
//   taxable_gallons[j]   = miles[j] / fleet_mpg
//   tax_owed[j]          = taxable_gallons[j] * (rate[j] + surcharge[j])
//   tax_paid[j]          = gallons_purchased[j] * rate[j]   (surcharge is never paid at the pump)
//   net[j]               = tax_owed[j] - tax_paid[j]        (positive = owe, negative = credit)

const { getMilesByJurisdiction, getFuelByJurisdiction, getTaxRates } = require('../db/queries');

function round(n, places = 2) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

async function computeQuarter(db, { truckId, year, quarter }) {
  const [miles, fuel] = await Promise.all([
    getMilesByJurisdiction(db, { truckId, year, quarter }),
    getFuelByJurisdiction(db, { truckId, year, quarter }),
  ]);

  const jurisdictions = new Set([
    ...miles.map(m => m.jurisdiction),
    ...fuel.map(f => f.jurisdiction),
  ]);
  const rates = await getTaxRates(db, {
    year,
    quarter,
    jurisdictions: [...jurisdictions],
  });

  const milesByJ = new Map(miles.map(m => [m.jurisdiction, m.miles]));
  const fuelByJ  = new Map(fuel.map(f => [f.jurisdiction, f]));

  const totalMiles   = miles.reduce((s, m) => s + m.miles, 0);
  const totalGallons = fuel.reduce((s, f) => s + f.gallons, 0);
  const fleetMpg     = totalGallons > 0 ? totalMiles / totalGallons : 0;

  const lines = [...jurisdictions].sort().map(j => {
    const m = milesByJ.get(j) || 0;
    const f = fuelByJ.get(j) || { gallons: 0, totalCost: 0 };
    const rate = rates.get(j) || { rate: 0, surcharge: 0 };

    const taxableGallons = fleetMpg > 0 ? m / fleetMpg : 0;
    const taxOwed        = taxableGallons * (rate.rate + rate.surcharge);
    const taxPaid        = f.gallons * rate.rate;
    const net            = taxOwed - taxPaid;

    return {
      jurisdiction:    j,
      miles:           round(m),
      gallonsPurchased: round(f.gallons, 3),
      fuelCost:        round(f.totalCost),
      rate:            rate.rate,
      surcharge:       rate.surcharge,
      taxableGallons:  round(taxableGallons, 3),
      taxOwed:         round(taxOwed),
      taxPaid:         round(taxPaid),
      net:             round(net),
      missingRate:     !rates.has(j),
    };
  });

  const totals = lines.reduce(
    (acc, l) => ({
      miles:           acc.miles + l.miles,
      gallonsPurchased: acc.gallonsPurchased + l.gallonsPurchased,
      fuelCost:        acc.fuelCost + l.fuelCost,
      taxableGallons:  acc.taxableGallons + l.taxableGallons,
      taxOwed:         acc.taxOwed + l.taxOwed,
      taxPaid:         acc.taxPaid + l.taxPaid,
      net:             acc.net + l.net,
    }),
    { miles: 0, gallonsPurchased: 0, fuelCost: 0, taxableGallons: 0, taxOwed: 0, taxPaid: 0, net: 0 }
  );

  for (const k of Object.keys(totals)) totals[k] = round(totals[k], k === 'gallonsPurchased' || k === 'taxableGallons' ? 3 : 2);

  return {
    truckId,
    year,
    quarter,
    fleetMpg: round(fleetMpg, 3),
    lines,
    totals,
  };
}

module.exports = { computeQuarter };
