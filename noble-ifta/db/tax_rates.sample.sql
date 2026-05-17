-- Sample tax rate seed. RATES CHANGE EVERY QUARTER — pull current values from
-- the IFTA tax matrix at https://www.iftach.org/taxmatrix4/charts.php before
-- relying on a filed report. The values below are placeholders for shape only.

INSERT INTO ifta_tax_rates (jurisdiction, year, quarter, rate_per_gallon, surcharge_per_gallon) VALUES
  ('AZ', 2026, 1, 0.2600, 0),
  ('CA', 2026, 1, 0.8895, 0),
  ('NV', 2026, 1, 0.2700, 0),
  ('NM', 2026, 1, 0.2100, 0),
  ('UT', 2026, 1, 0.3645, 0),
  ('TX', 2026, 1, 0.2000, 0),
  ('OK', 2026, 1, 0.2000, 0),
  ('IN', 2026, 1, 0.5700, 0.5500),  -- IN has surcharge
  ('KY', 2026, 1, 0.2870, 0.0440),  -- KY has surcharge
  ('VA', 2026, 1, 0.3020, 0.0350)   -- VA has surcharge
ON CONFLICT (jurisdiction, year, quarter) DO UPDATE
  SET rate_per_gallon = EXCLUDED.rate_per_gallon,
      surcharge_per_gallon = EXCLUDED.surcharge_per_gallon;
