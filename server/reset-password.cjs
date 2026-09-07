const pg = require('pg');
const bcrypt = require('bcrypt');
const pool = new pg.Pool({ 
  connectionString: 'postgresql://postgres.lvycmlgnzspygfpwsskr:Klassiqgrafikz2026@aws-0-eu-central-1.pooler.supabase.com:5432/postgres', 
  ssl: { rejectUnauthorized: false } 
});

bcrypt.hash('password123', 10).then(hash => {
  return pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'ndubuisi1son@gmail.com']);
}).then(r => { 
  console.log('Updated:', r.rowCount); 
  pool.end(); 
}).catch(e => { 
  console.error(e); 
  pool.end(); 
});