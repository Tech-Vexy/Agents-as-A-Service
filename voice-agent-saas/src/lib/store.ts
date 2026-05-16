import { Pool } from '@neondatabase/serverless';

export interface BusinessProfile {
  id: number;
  name: string;
  industry: string;
  technicalSpecs: string;
  tone: string;
  avatar_url?: string;
}

// Fallback to a dummy connection string if not provided, allowing build to pass
const connectionString = process.env.DATABASE_URL || 'postgres://user:password@localhost/dbname';

// Initialize Neon database pool
const pool = new Pool({ connectionString });

// Setup function to initialize schema if necessary
export async function initializeDatabase() {
  if (connectionString === 'postgres://user:password@localhost/dbname') {
    console.warn("WARNING: No valid DATABASE_URL provided in environment variables. Database connections will likely fail.");
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT NOT NULL,
        "technicalSpecs" TEXT NOT NULL,
        tone TEXT NOT NULL,
        avatar_url TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Insert default row if empty
    const countRes = await client.query('SELECT count(*) as count FROM profiles');
    const count = parseInt(countRes.rows[0].count, 10);

    if (count === 0) {
      const insertRes = await client.query(`
        INSERT INTO profiles (name, industry, "technicalSpecs", tone)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [
        "SolarTech Solutions",
        "Renewable Energy",
        "Offers N-Type bifacial panels and standard monocrystalline panels. Standard panels are 400W. N-Type bifacial are 450W but capture 20% more in cloudy conditions.",
        "Professional, technical, yet empathetic to user concerns."
      ]);
      const newId = insertRes.rows[0].id;

      await client.query(`
        INSERT INTO settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, ['active_profile_id', newId.toString()]);
    }
  } finally {
    client.release();
  }
}

// --- CRUD Operations ---

export async function getAllProfiles(): Promise<BusinessProfile[]> {
  const res = await pool.query('SELECT id, name, industry, "technicalSpecs", tone, avatar_url FROM profiles ORDER BY name ASC');
  return res.rows;
}

export async function getProfile(id: number): Promise<BusinessProfile | undefined> {
  const res = await pool.query('SELECT id, name, industry, "technicalSpecs", tone, avatar_url FROM profiles WHERE id = $1', [id]);
  return res.rows[0];
}

export async function createProfile(profile: Omit<BusinessProfile, 'id'>): Promise<BusinessProfile> {
  const res = await pool.query(`
    INSERT INTO profiles (name, industry, "technicalSpecs", tone, avatar_url)
    VALUES ($1, $2, $3, $4, $5) RETURNING id, name, industry, "technicalSpecs", tone, avatar_url
  `, [profile.name, profile.industry, profile.technicalSpecs, profile.tone, profile.avatar_url || null]);
  return res.rows[0];
}

export async function updateProfile(id: number, profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const current = await getProfile(id);
  if (!current) throw new Error("Profile not found");

  const updated = { ...current, ...profile };

  const res = await pool.query(`
    UPDATE profiles
    SET name = $1, industry = $2, "technicalSpecs" = $3, tone = $4, avatar_url = $5
    WHERE id = $6 RETURNING id, name, industry, "technicalSpecs", tone, avatar_url
  `, [updated.name, updated.industry, updated.technicalSpecs, updated.tone, updated.avatar_url || null, id]);

  return res.rows[0];
}

export async function deleteProfile(id: number): Promise<void> {
  await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
  // If active, clear it or set to next available
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    const all = await getAllProfiles();
    if (all.length > 0) {
       await setActiveProfileId(all[0].id);
    } else {
       await pool.query('DELETE FROM settings WHERE key = $1', ['active_profile_id']);
    }
  }
}

// --- Active Profile Settings ---

export async function getActiveProfileId(): Promise<number | null> {
  const res = await pool.query("SELECT value FROM settings WHERE key = 'active_profile_id'");
  if (res.rows.length > 0) {
    return parseInt(res.rows[0].value, 10);
  }
  return null;
}

export async function setActiveProfileId(id: number): Promise<void> {
  await pool.query(`
    INSERT INTO settings (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `, ['active_profile_id', id.toString()]);
}

export async function getActiveProfile(): Promise<BusinessProfile | undefined> {
  const id = await getActiveProfileId();
  if (id !== null) {
    const profile = await getProfile(id);
    if (profile) return profile;
  }
  const all = await getAllProfiles();
  return all.length > 0 ? all[0] : undefined;
}
