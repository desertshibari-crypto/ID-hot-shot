-- IFTA module schema. Assumes an existing `loads` table with at minimum:
--   id (pk), truck_id, origin, destination, miles, load_date
-- and an existing `trucks` table with id (pk).
-- FKs reference those by name; adjust if your existing tables differ.

CREATE TABLE IF NOT EXISTS ifta_load_state_miles (
    id              BIGSERIAL PRIMARY KEY,
    load_id         BIGINT      NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    jurisdiction    CHAR(2)     NOT NULL,        -- 2-letter state/province code (e.g. 'AZ', 'BC')
    miles           NUMERIC(10,2) NOT NULL CHECK (miles >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (load_id, jurisdiction)
);

CREATE INDEX IF NOT EXISTS ifta_load_state_miles_load_idx
    ON ifta_load_state_miles (load_id);

CREATE TABLE IF NOT EXISTS ifta_fuel_purchases (
    id              BIGSERIAL PRIMARY KEY,
    truck_id        BIGINT      NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    jurisdiction    CHAR(2)     NOT NULL,
    purchase_date   DATE        NOT NULL,
    gallons         NUMERIC(10,3) NOT NULL CHECK (gallons > 0),
    total_cost      NUMERIC(10,2) NOT NULL CHECK (total_cost >= 0),
    vendor          TEXT,
    receipt_ref     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ifta_fuel_purchases_truck_date_idx
    ON ifta_fuel_purchases (truck_id, purchase_date);
CREATE INDEX IF NOT EXISTS ifta_fuel_purchases_jurisdiction_idx
    ON ifta_fuel_purchases (jurisdiction);

-- Tax rates change quarterly per jurisdiction. Keep them as data, not code.
-- Rate is $ per gallon (diesel). Surcharge applies in a few states (IN, KY, VA).
CREATE TABLE IF NOT EXISTS ifta_tax_rates (
    jurisdiction    CHAR(2)     NOT NULL,
    year            SMALLINT    NOT NULL,
    quarter         SMALLINT    NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    rate_per_gallon NUMERIC(8,5) NOT NULL,
    surcharge_per_gallon NUMERIC(8,5) NOT NULL DEFAULT 0,
    PRIMARY KEY (jurisdiction, year, quarter)
);
