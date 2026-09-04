import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [gmailAppPassword, setGmailAppPassword] = useState('')
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings')
      setSettings(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put('/settings', { ...settings, gmail_app_password: gmailAppPassword })
      setGmailAppPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleTestEmail = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post('/settings/test-email', { to: settings.statement_email })
      setTestResult({ ok: true, message: res.message })
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6 text-brand-text">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Business Info</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Business Name</label>
              <input name="business_name" value={settings.business_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Brand Name (for messages)</label>
              <input name="brand_name" value={settings.brand_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Tagline</label>
              <input name="tagline" value={settings.tagline || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Statement Email</label>
              <input name="statement_email" type="email" value={settings.statement_email || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-brand-muted">Email for monthly statements</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Email (Gmail SMTP)</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Gmail Address</label>
              <input name="gmail_user" type="email" value={settings.gmail_user || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-brand-muted">Used for sending birthday and monthly messages</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Gmail App Password</label>
              <div className="relative">
                <input
                  name="gmail_app_password"
                  type={showAppPassword ? 'text' : 'password'}
                  value={gmailAppPassword}
                  onChange={e => setGmailAppPassword(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="Enter your app password to update"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowAppPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-muted hover:text-brand-text"
                  aria-label={showAppPassword ? 'Hide app password' : 'Show app password'}
                >
                  {showAppPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-brand-muted">Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-brand-pink hover:underline">myaccount.google.com/apppasswords</a> — leave blank to keep your current password.</p>
            </div>
            <div>
              <button type="button" onClick={handleTestEmail} disabled={testing} className="btn btn-cta disabled:opacity-50">
                {testing ? 'Sending test...' : 'Send Test Email'}
              </button>
              {testResult && (
                <p className={`mt-2 text-sm ${testResult.ok ? 'text-brand-lime' : 'text-pink-500'}`}>
                  {testResult.ok ? '✓ ' + testResult.message : '✗ ' + testResult.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Automation Schedule</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Timezone</label>
                <select name="timezone" value={settings.timezone || 'Africa/Lagos'} onChange={handleChange} className="input">
                  <option value="Africa/Lagos">Africa/Lagos (Nigeria)</option>
                  <option value="America/New_York">America/New_York (US)</option>
                  <option value="Europe/London">Europe/London (UK)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (Japan)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Statement Day of Month</label>
                <input name="statement_day" type="number" min="1" max="28" value={settings.statement_day || 1} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Statement Time</label>
                <input name="statement_time" type="time" value={settings.statement_time || '21:00'} onChange={handleChange} className="input" />
                <p className="text-xs text-brand-muted mt-1">Last day of month at this time</p>
              </div>
            </div>
            <div className="bg-brand-pink bg-opacity-20 border border-brand-pink border-opacity-40 rounded-md p-3">
              <p className="text-sm text-pink-400">
                <span className="font-medium">Automated emails:</span> monthly statement (income − expenses) is sent to your Statement Email on the last day of each month, and a savings reminder is sent every Friday if no savings were recorded that week. Set your Gmail details above to enable these.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Current Configuration</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm bg-brand-bg border border-brand-border p-3 rounded overflow-auto text-brand-muted"><code>{JSON.stringify({
              business_name: settings.business_name,
              brand_name: settings.brand_name,
              timezone: settings.timezone,
              statement_time: settings.statement_time,
              gmail_user: settings.gmail_user ? '✓ configured' : 'not configured'
            }, null, 2)}</code></pre>
          </div>
        </div>

        {saved && (
          <div className="bg-brand-lime bg-opacity-20 border border-brand-lime text-brand-lime px-4 py-3 rounded animate-fade-in">
            Settings saved successfully!
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button type="submit" className="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  )
}