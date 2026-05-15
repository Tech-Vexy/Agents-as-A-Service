import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface BusinessProfile {
  id: number;
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

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    industry TEXT NOT NULL,
    technicalSpecs TEXT NOT NULL,
    tone TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migration from old `profile` table to new `profiles` table
try {
  const hasOldTableStmt = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='profile'");
  const hasOldTableResult = hasOldTableStmt.get() as { count: number };
  const hasOldTable = hasOldTableResult.count > 0;

  if (hasOldTable) {
    const oldProfiles = db.prepare('SELECT * FROM profile').all() as BusinessProfile[];
    if (oldProfiles.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO profiles (name, industry, technicalSpecs, tone)
        VALUES (?, ?, ?, ?)
      `);
      let firstId = null;
      for (const p of oldProfiles) {
        const info = insertStmt.run(p.name, p.industry, p.technicalSpecs, p.tone);
        if (firstId === null) firstId = info.lastInsertRowid;
      }
      if (firstId !== null) {
         db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_profile_id', firstId.toString());
      }
    }
    db.exec('DROP TABLE profile');
  }
} catch (e) {
  console.error("Migration error:", e);
}


// Insert default row if empty
const countStmt = db.prepare('SELECT count(*) as count FROM profiles');
const result = countStmt.get() as { count: number };
const count = result.count;

if (count === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO profiles (name, industry, technicalSpecs, tone)
    VALUES (?, ?, ?, ?)
  `);
  const info = insertStmt.run(
    "SolarTech Solutions",
    "Renewable Energy",
    "Offers N-Type bifacial panels and standard monocrystalline panels. Standard panels are 400W. N-Type bifacial are 450W but capture 20% more in cloudy conditions.",
    "Professional, technical, yet empathetic to user concerns."
  );
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_profile_id', info.lastInsertRowid.toString());
}

// --- CRUD Operations ---

export function getAllProfiles(): BusinessProfile[] {
  return db.prepare('SELECT id, name, industry, technicalSpecs, tone FROM profiles ORDER BY name ASC').all() as BusinessProfile[];
}

export function getProfile(id: number): BusinessProfile | undefined {
  return db.prepare('SELECT id, name, industry, technicalSpecs, tone FROM profiles WHERE id = ?').get(id) as BusinessProfile | undefined;
}

export function createProfile(profile: Omit<BusinessProfile, 'id'>): BusinessProfile {
  const stmt = db.prepare(`
    INSERT INTO profiles (name, industry, technicalSpecs, tone)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(profile.name, profile.industry, profile.technicalSpecs, profile.tone);
  return getProfile(info.lastInsertRowid as number) as BusinessProfile;
}

export function updateProfile(id: number, profile: Partial<BusinessProfile>): BusinessProfile {
  const current = getProfile(id);
  if (!current) throw new Error("Profile not found");

  const updated = { ...current, ...profile };

  const stmt = db.prepare(`
    UPDATE profiles
    SET name = ?, industry = ?, technicalSpecs = ?, tone = ?
    WHERE id = ?
  `);

  stmt.run(updated.name, updated.industry, updated.technicalSpecs, updated.tone, id);
  return updated;
}

export function deleteProfile(id: number): void {
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  // If active, clear it or set to next available
  if (getActiveProfileId() === id) {
    const all = getAllProfiles();
    if (all.length > 0) {
       setActiveProfileId(all[0].id);
    } else {
       db.prepare('DELETE FROM settings WHERE key = ?').run('active_profile_id');
    }
  }
}

// --- Active Profile Settings ---

export function getActiveProfileId(): number | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'active_profile_id'").get() as { value: string } | undefined;
  return row ? parseInt(row.value, 10) : null;
}

export function setActiveProfileId(id: number): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_profile_id', id.toString());
}

export function getActiveProfile(): BusinessProfile | undefined {
  const id = getActiveProfileId();
  if (id !== null) {
    return getProfile(id);
  }
  const all = getAllProfiles();
  return all.length > 0 ? all[0] : undefined;
}
