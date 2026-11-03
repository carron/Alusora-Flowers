CREATE TABLE IF NOT EXISTS inventory (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 flower TEXT NOT NULL,
 color TEXT NOT NULL,
 unit_price_cents INTEGER NOT NULL DEFAULT 599 CHECK(unit_price_cents>=0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(flower,color)
);
CREATE INDEX IF NOT EXISTS inventory_active_idx ON inventory(active,flower);
CREATE TABLE IF NOT EXISTS requests (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK(type IN ('event','bouquet')),
 package_id TEXT,
 package_name TEXT,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT,
 event_date TEXT NOT NULL,
 guests INTEGER,
 palette TEXT,
 finish TEXT,
 notes TEXT,
 subtotal_cents INTEGER,
 status TEXT NOT NULL DEFAULT 'pending_email',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests(created_at DESC);
CREATE TABLE IF NOT EXISTS request_items (
 request_id TEXT NOT NULL REFERENCES requests(id),
 inventory_id INTEGER NOT NULL REFERENCES inventory(id),
 flower TEXT NOT NULL,
 color TEXT NOT NULL,
 quantity INTEGER NOT NULL,
 unit_price_cents INTEGER NOT NULL,
 PRIMARY KEY (request_id,inventory_id)
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT NOT NULL,
 bucket INTEGER NOT NULL,
 counter INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(key,bucket)
);
-- Product templates, all intentionally start at ZERO STOCK; admin must enter actual inventory.
INSERT OR IGNORE INTO inventory(flower,color,unit_price_cents,stock) VALUES
('Carnation','Blush',450,0),
('Carnation','Ivory',450,0),
('Carnation','Burgundy',450,0),
('Daisy','White',475,0),
('Daisy','Yellow',475,0),
('Chrysanthemum','Lavender',575,0),
('Chrysanthemum','Cream',575,0),
('Rose','Blush',795,0),
('Rose','Red',795,0),
('Rose','Ivory',795,0),
('Tulip','Pink',650,0),
('Tulip','White',650,0),
('Gerbera','Peach',625,0),
('Gerbera','Coral',625,0),
('Seasonal stem','Florist’s choice',595,0);
