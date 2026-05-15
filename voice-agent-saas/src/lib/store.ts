import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface BusinessProfile {
  name: string;
  industry: string;
  technicalSpecs: string;
  tone: string;
}

// Ensure the data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(dbDir, 'profiles.db');
const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row table
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    technicalSpecs TEXT NOT NULL,
    tone TEXT NOT NULL
  )
`);

// Insert default row if empty
const countStmt = db.prepare('SELECT count(*) as count FROM profile');
const result = countStmt.get() as { count: number };
const count = result.count;

if (count === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO profile (id, name, industry, technicalSpecs, tone)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertStmt.run(
    1,
    "SolarTech Solutions",
    "Renewable Energy",
    "Offers N-Type bifacial panels and standard monocrystalline panels. Standard panels are 400W. N-Type bifacial are 450W but capture 20% more in cloudy conditions.",
    "Professional, technical, yet empathetic to user concerns."
  );
}

export function getProfile(): BusinessProfile {
  const stmt = db.prepare('SELECT name, industry, technicalSpecs, tone FROM profile WHERE id = 1');
  return stmt.get() as BusinessProfile;
}

export function updateProfile(profile: Partial<BusinessProfile>): BusinessProfile {
  const current = getProfile();
  const updated = { ...current, ...profile };

  const stmt = db.prepare(`
    UPDATE profile
    SET name = ?, industry = ?, technicalSpecs = ?, tone = ?
    WHERE id = 1
  `);

  stmt.run(updated.name, updated.industry, updated.technicalSpecs, updated.tone);
  return updated;
}
