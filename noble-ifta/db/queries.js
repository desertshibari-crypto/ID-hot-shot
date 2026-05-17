// Thin pg query layer. All functions take a pg Pool/Client as first arg so
// callers can run them inside a transaction if needed.

function quarterDateRange(year, quarter) {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1)); // exclusive
  return { start, end };
}

async function getMilesByJurisdiction(db, { truckId, year, quarter }) {
  const { start, end } = quarterDateRange(year, quarter);
  const { rows } = await db.query(
    `SELECT m.jurisdiction, SUM(m.miles)::numeric AS miles
       FROM ifta_load_state_miles m
       JOIN loads l ON l.id = m.load_id
      WHERE l.truck_id = $1
        AND l.load_date >= $2
        AND l.load_date <  $3
      GROUP BY m.jurisdiction`,
    [truckId, start, end]
  );
  return rows.map(r => ({ jurisdiction: r.jurisdiction, miles: Number(r.miles) }));
}

async function getFuelByJurisdiction(db, { truckId, year, quarter }) {
  const { start, end } = quarterDateRange(year, quarter);
  const { rows } = await db.query(
    `SELECT jurisdiction,
            SUM(gallons)::numeric    AS gallons,
            SUM(total_cost)::numeric AS total_cost
       FROM ifta_fuel_purchases
      WHERE truck_id = $1
        AND purchase_date >= $2
        AND purchase_date <  $3
      GROUP BY jurisdiction`,
    [truckId, start, end]
  );
  return rows.map(r => ({
    jurisdiction: r.jurisdiction,
    gallons: Number(r.gallons),
    totalCost: Number(r.total_cost),
  }));
}

async function getTaxRates(db, { year, quarter, jurisdictions }) {
  if (jurisdictions.length === 0) return new Map();
  const { rows } = await db.query(
    `SELECT jurisdiction, rate_per_gallon, surcharge_per_gallon
       FROM ifta_tax_rates
      WHERE year = $1 AND quarter = $2
        AND jurisdiction = ANY($3::char(2)[])`,
    [year, quarter, jurisdictions]
  );
  const map = new Map();
  for (const r of rows) {
    map.set(r.jurisdiction, {
      rate: Number(r.rate_per_gallon),
      surcharge: Number(r.surcharge_per_gallon),
    });
  }
  return map;
}

async function getTruck(db, truckId) {
  const { rows } = await db.query(`SELECT * FROM trucks WHERE id = $1`, [truckId]);
  return rows[0] || null;
}

module.exports = {
  quarterDateRange,
  getMilesByJurisdiction,
  getFuelByJurisdiction,
  getTaxRates,
  getTruck,
};
