import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

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
const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

// Setup function to initialize schema if necessary
export async function initializeDatabase() {
  if (connectionString === 'postgres://user:password@localhost/dbname') {
    console.warn("WARNING: No valid DATABASE_URL provided in environment variables. Database connections will likely fail.");
  }

  const maxRetries = 5;
  let retryCount = 0;
  let delay = 1000;

  while (retryCount < maxRetries) {
    let client;
    try {
      console.log(`Connecting to database (attempt ${retryCount + 1})...`);
      client = await pool.connect();
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
      
      console.log("Connected successfully and initialized schema.");
      return; // Success, exit retry loop
    } catch (err) {
      retryCount++;
      console.warn(`Database connection attempt ${retryCount} failed:`, err);
      if (retryCount >= maxRetries) throw err;
      
      console.log(`Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    } finally {
      if (client) client.release();
    }
  }
}

// Wrapper for queries to handle transient pool errors
async function queryWithRetry(text: string, params?: unknown[]) {
  const maxRetries = 3;
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      lastErr = err;
      const errorMessage = err instanceof Error ? err.message : String(err);
      // If it's a websocket or connection error, retry
      if (errorMessage.includes('WebSocket') || (err as { code?: string }).code === 'ETIMEDOUT' || errorMessage.includes('pool')) {
        console.warn(`Query retry ${i + 1} due to connection issue...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err; // For syntax errors etc, throw immediately
    }
  }
  throw lastErr;
}

// --- CRUD Operations ---

export async function getAllProfiles(): Promise<BusinessProfile[]> {
  const res = await queryWithRetry('SELECT id, name, industry, "technicalSpecs", tone, avatar_url FROM profiles ORDER BY name ASC');
  return res.rows;
}

export async function getProfile(id: number): Promise<BusinessProfile | undefined> {
  const res = await queryWithRetry('SELECT id, name, industry, "technicalSpecs", tone, avatar_url FROM profiles WHERE id = $1', [id]);
  return res.rows[0];
}

export async function createProfile(profile: Omit<BusinessProfile, 'id'>): Promise<BusinessProfile> {
  const res = await queryWithRetry(`
    INSERT INTO profiles (name, industry, "technicalSpecs", tone, avatar_url)
    VALUES ($1, $2, $3, $4, $5) RETURNING id, name, industry, "technicalSpecs", tone, avatar_url
  `, [profile.name, profile.industry, profile.technicalSpecs, profile.tone, profile.avatar_url || null]);
  return res.rows[0];
}

export async function updateProfile(id: number, profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const current = await getProfile(id);
  if (!current) throw new Error("Profile not found");

  const updated = { ...current, ...profile };

  const res = await queryWithRetry(`
    UPDATE profiles
    SET name = $1, industry = $2, "technicalSpecs" = $3, tone = $4, avatar_url = $5
    WHERE id = $6 RETURNING id, name, industry, "technicalSpecs", tone, avatar_url
  `, [updated.name, updated.industry, updated.technicalSpecs, updated.tone, updated.avatar_url || null, id]);

  return res.rows[0];
}

export async function deleteProfile(id: number): Promise<void> {
  await queryWithRetry('DELETE FROM profiles WHERE id = $1', [id]);
  // If active, clear it or set to next available
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    const all = await getAllProfiles();
    if (all.length > 0) {
       await setActiveProfileId(all[0].id);
    } else {
       await queryWithRetry('DELETE FROM settings WHERE key = $1', ['active_profile_id']);
    }
  }
}

// --- Active Profile Settings ---

export async function getActiveProfileId(): Promise<number | null> {
  const res = await queryWithRetry("SELECT value FROM settings WHERE key = 'active_profile_id'");
  if (res.rows.length > 0) {
    return parseInt(res.rows[0].value, 10);
  }
  return null;
}

export async function setActiveProfileId(id: number): Promise<void> {
  await queryWithRetry(`
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
