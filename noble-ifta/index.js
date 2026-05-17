// Entry point. Usage from the main Noble Dispatch app:
//
//   const { Pool } = require('pg');
//   const ifta = require('./noble-ifta');
//   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//   app.use('/ifta', ifta.router(pool));
//
// Then run db/schema.sql once against your database and seed db/tax_rates.sample.sql
// with current quarter rates from https://www.iftach.org/taxmatrix4/charts.php

module.exports = {
  router: require('./routes/ifta'),
  services: {
    ifta: require('./services/ifta'),
    pdf: require('./services/pdf'),
  },
  queries: require('./db/queries'),
};
