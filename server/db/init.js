import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { queryExec } from './pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDatabase() {
  console.log('Initializing database schema...')

  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')

  // Split by semicolon and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    try {
      await queryExec(stmt)
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('Error executing:', stmt.substring(0, 100), '...')
        throw err
      }
    }
  }

  console.log('Database schema initialized successfully')
}

initDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })