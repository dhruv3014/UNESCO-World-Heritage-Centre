const fs = require('fs');
const { Client } = require('pg');

// REPLACE THIS with your Render External Database URL
const client = new Client({
  connectionString: "postgresql://unesco_postgre_user:Lr4SamAnFRi4PFmvGllHYpR8vBeiAHf5@dpg-d97kst58nd3s73dvfakg-a.oregon-postgres.render.com/unesco_postgre",
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    console.log("Connecting to database...");
    await client.connect();
    
    console.log("Reading schema...");
    const sql = fs.readFileSync('./db/schema.sql', 'utf8');
    
    console.log("Creating tables...");
    await client.query(sql);
    
    console.log("✅ Success! Tables created.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.end();
  }
}

initDB();