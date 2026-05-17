// Express router. Mount with: app.use('/ifta', require('./noble-ifta/routes/ifta')(pool))
// where `pool` is your existing pg Pool.

const express = require('express');
const { computeQuarter } = require('../services/ifta');
const { renderReport } = require('../services/pdf');
const { getTruck } = require('../db/queries');

function parseQuarterParams(req) {
  const truckId = Number(req.params.truckId);
  const year    = Number(req.params.year);
  const quarter = Number(req.params.quarter);
  if (!Number.isInteger(truckId) || truckId <= 0) throw new Error('invalid truckId');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('invalid year');
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) throw new Error('invalid quarter');
  return { truckId, year, quarter };
}

module.exports = function iftaRouter(pool) {
  const router = express.Router();

  // JSON quarterly totals
  router.get('/trucks/:truckId/quarters/:year/:quarter', async (req, res, next) => {
    try {
      const params = parseQuarterParams(req);
      const report = await computeQuarter(pool, params);
      res.json(report);
    } catch (err) {
      if (err.message.startsWith('invalid ')) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  // PDF download for the same quarter
  router.get('/trucks/:truckId/quarters/:year/:quarter/pdf', async (req, res, next) => {
    try {
      const params = parseQuarterParams(req);
      const truck = await getTruck(pool, params.truckId);
      if (!truck) return res.status(404).json({ error: 'truck not found' });

      const report = await computeQuarter(pool, params);
      const filename = `ifta-truck${params.truckId}-${params.year}Q${params.quarter}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      renderReport(report, truck, res);
    } catch (err) {
      if (err.message.startsWith('invalid ')) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  // Record a fuel purchase
  router.post('/fuel-purchases', express.json(), async (req, res, next) => {
    try {
      const { truckId, jurisdiction, purchaseDate, gallons, totalCost, vendor, receiptRef } = req.body;
      if (!truckId || !jurisdiction || !purchaseDate || !gallons || totalCost == null) {
        return res.status(400).json({ error: 'truckId, jurisdiction, purchaseDate, gallons, totalCost required' });
      }
      const { rows } = await pool.query(
        `INSERT INTO ifta_fuel_purchases
           (truck_id, jurisdiction, purchase_date, gallons, total_cost, vendor, receipt_ref)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [truckId, jurisdiction.toUpperCase(), purchaseDate, gallons, totalCost, vendor || null, receiptRef || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  // Record per-state mileage breakdown for a load (typically one POST per load
  // with an array of {jurisdiction, miles}). Replaces any existing rows for the load.
  router.post('/loads/:loadId/state-miles', express.json(), async (req, res, next) => {
    const client = await pool.connect();
    try {
      const loadId = Number(req.params.loadId);
      if (!Number.isInteger(loadId)) return res.status(400).json({ error: 'invalid loadId' });
      const segments = req.body.segments;
      if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ error: 'segments array required' });
      }

      await client.query('BEGIN');
      await client.query(`DELETE FROM ifta_load_state_miles WHERE load_id = $1`, [loadId]);
      for (const seg of segments) {
        await client.query(
          `INSERT INTO ifta_load_state_miles (load_id, jurisdiction, miles) VALUES ($1, $2, $3)`,
          [loadId, String(seg.jurisdiction).toUpperCase(), seg.miles]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ loadId, segments: segments.length });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  });

  return router;
};
