import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { runBirthdayJob, runMonthlyJob } from '../jobs/cron.js'

const router = Router()

router.use(requireAuth)

// POST /api/admin/run-birthday
router.post('/run-birthday', async (req, res) => {
  try {
    await runBirthdayJob()
    res.json({ message: 'Birthday job executed' })
  } catch (err) {
    console.error('POST /admin/run-birthday error:', err)
    res.status(500).json({ error: 'Failed to run birthday job' })
  }
})

// POST /api/admin/run-monthly
router.post('/run-monthly', async (req, res) => {
  try {
    await runMonthlyJob()
    res.json({ message: 'Monthly job executed' })
  } catch (err) {
    console.error('POST /admin/run-monthly error:', err)
    res.status(500).json({ error: 'Failed to run monthly job' })
  }
})

export default router