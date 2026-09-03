import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
})

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err)
})

export const query = (text, params) => pool.query(text, params)

export const getClient = () => pool.connect()

export const closePool = () => pool.end()

// Helper: run a query and return first row or null
export async function queryOne(text, params) {
  const res = await pool.query(text, params)
  return res.rows[0] || null
}

// Helper: run a query and return all rows
export async function queryAll(text, params) {
  const res = await pool.query(text, params)
  return res.rows
}

// Helper: run insert and return inserted row
export async function queryInsert(text, params) {
  const hasReturning = /\bRETURNING\b/i.test(text)
  const sql = hasReturning ? text : text + ' RETURNING *'
  const res = await pool.query(sql, params)
  return res.rows[0]
}

// Helper: run update/delete and return affected row count
export async function queryExec(text, params) {
  const res = await pool.query(text, params)
  return res.rowCount
}

export default pool