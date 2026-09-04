import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const DEFAULT_TEMPLATES = {
  monthly: {
    name: 'Monthly Statement',
    subject: 'Your {month} Financial Statement | {brand}',
    body: `Dear {name},

We are pleased to present your financial statement for {month}.

MONTHLY SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Received:     {total_received}
Total Spent:        {total_spent}
Amount Saved:       {total_saved}
Net Cash Flow:      {net_cash}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A detailed breakdown of all transactions for this period is available in your account. Should you have any questions regarding this statement, please do not hesitate to reply to this message.

Thank you for your continued patronage.

Kind regards,
The {brand} Team`
  },
  birthday: {
    name: 'Birthday Greeting',
    subject: 'Happy Birthday, {name}',
    body: `Happy Birthday, {name}! 🎂

On behalf of everyone at {brand}, we wish you a truly wonderful birthday! 🥳✨ Thank you for your continued trust and support. May this new year bring you greater opportunities, good health, abundant joy, and remarkable success in all your endeavours.

Wishing you a beautiful and prosperous year ahead!

With sincere regards,
The {brand} Team`
  },
  savings_reminder: {
    name: 'Savings Reminder',
    subject: 'Weekly Savings Reminder | {brand}',
    body: `Dear Valued Customer,

This is a courteous reminder from {brand} that no savings have been recorded for this week.

Consistent saving remains one of the most effective paths toward achieving your financial goals. We encourage you to make a deposit at your earliest convenience to keep your savings plan on track.

You may log your savings through your dashboard at any time.

Thank you for your attention.

Kind regards,
The {brand} Team`
  }
}

export default function Messages() {
  const [templates, setTemplates] = useState([])
  const [log, setLog] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', subject: '', body: '', type: 'monthly' })
  const [loading, setLoading] = useState(true)

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('bizstrives_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/reports/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${new Date().toISOString().slice(0,7)}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      alert('Failed to download PDF')
    }
  }

  useEffect(() => {
    Promise.all([loadTemplates(), loadLog()]).finally(() => setLoading(false))
  }, [])

  const loadTemplates = async () => {
    try {
      const res = await api.get('/templates')
      setTemplates(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadLog = async () => {
    try {
      const res = await api.get('/messages/log')
      setLog(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', subject: '', body: '', type: 'monthly' })
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ name: t.name, subject: t.subject, body: t.body, type: t.type })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/templates/${editing.id}`, form)
      } else {
        await api.post('/templates', form)
      }
      setShowModal(false)
      loadTemplates()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this template?')) {
      try {
        await api.delete(`/templates/${id}`)
        loadTemplates()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6 text-brand-text">
      <h1 className="text-2xl font-bold">Messaging Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <button onClick={openAdd} className="text-sm text-brand-pink hover:underline">Add Template</button>
          </div>
          <div className="divide-y divide-brand-border">
            {templates.map(t => (
              <div key={t.id} className="p-4">
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-sm text-brand-muted mb-2">{t.subject}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${t.type === 'monthly' ? 'bg-brand-pink bg-opacity-20 text-pink-400' : 'bg-brand-lime bg-opacity-20 text-brand-lime'}`}>
                    {t.type}
                  </span>
                  <button onClick={() => openEdit(t)} className="text-sm text-brand-pink hover:underline">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-sm text-pink-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="p-4 text-center text-brand-muted">
                <p>No message templates configured.</p>
                <button onClick={openAdd} className="text-brand-pink hover:underline mt-2">Create your first template</button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Automation Schedule</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-brand-pink bg-opacity-20 border border-brand-pink border-opacity-40 rounded-md p-3">
              <p className="font-medium text-pink-400">Monthly Statement</p>
              <p className="text-sm text-brand-muted mt-1">
                Emailed to your statement email on the last day of each month at 9pm, along with the monthly template to all active customers.
              </p>
            </div>
            <div className="bg-brand-lime bg-opacity-20 border border-brand-lime border-opacity-40 rounded-md p-3">
              <p className="font-medium text-brand-lime">Birthday Messages</p>
              <p className="text-sm text-brand-muted mt-1">
                Sent daily at 8am to customers whose birthday is today, using the Birthday template.
              </p>
            </div>
            <div className="bg-brand-surface2 border border-brand-border rounded-md p-3">
              <p className="font-medium text-yellow-400">Savings Reminder</p>
              <p className="text-sm text-brand-muted mt-1">
                Emailed every Friday at 6pm if no savings were recorded that week.
              </p>
            </div>
            <a href="#" onClick={e => { e.preventDefault(); downloadPDF() }} className="block text-center bg-brand-lime text-gray-900 font-semibold py-2 px-4 rounded-md hover:bg-lime-300">
              Download Current PDF Statement
            </a>
            <p className="text-xs text-brand-muted">
              Templates are used automatically. Edit them below to customize what is sent.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Messages</h2>
            {log.length > 0 && (
              <button onClick={async () => {
                if (!confirm('Delete all messages?')) return
                await api.delete('/messages/log')
                setLog([])
              }} className="text-sm text-pink-500 hover:text-pink-400">Delete All</button>
            )}
        </div>
        <div className="divide-y divide-brand-border">
{log.length === 0 ? (
              <div className="p-4 text-center text-brand-muted">No messages sent yet</div>
            ) : (
              log.slice(0, 20).map(m => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{m.type.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-brand-muted text-sm ml-2">({m.customer_name || 'System'})</span>
                  </div>
                  <span className="text-xs text-brand-muted">{new Date(m.sent_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Template' : 'Add Template'}
        action={<button type="submit" form="templateForm" className="btn btn-primary">{editing ? 'Update' : 'Save'}</button>}
      >
        <form id="templateForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
              placeholder="e.g. Monthly Statement, Birthday Greeting"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Subject *</label>
            <input
              name="subject"
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
              required
              placeholder="e.g. Your {month} Statement from {brand}"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Type *</label>
            <select
              name="type"
              value={form.type}
              onChange={e => {
                const newType = e.target.value
                const defaults = DEFAULT_TEMPLATES[newType]
                if (defaults && !editing) {
                  setForm({ name: defaults.name, subject: defaults.subject, body: defaults.body, type: newType })
                } else {
                  setForm({...form, type: newType})
                }
              }}
              required
              className="input"
            >
              <option value="monthly">Monthly Statement</option>
              <option value="birthday">Birthday Greeting</option>
              <option value="savings_reminder">Savings Reminder</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Body *</label>
            <textarea
              name="body"
              value={form.body}
              onChange={e => setForm({...form, body: e.target.value})}
              required
              rows={8}
              placeholder="Dear {name},&#10;&#10;Your statement for {month} is ready.&#10;&#10;Total Received: {total_received}&#10;Total Spent: {total_spent}&#10;Saved: {total_saved}&#10;Net Cash: {net_cash}&#10;&#10;Regards,&#10;{brand}"
              className="input resize-y"
            />
          </div>
          <div className="bg-brand-surface2 border border-brand-border rounded-md p-3">
            <p className="text-xs font-medium text-brand-muted mb-2">Available placeholders:</p>
            <div className="flex flex-wrap gap-2">
              {['{name}', '{brand}', '{month}', '{total_received}', '{total_spent}', '{total_saved}', '{net_cash}'].map(v => (
                <code key={v} className="text-xs bg-brand-bg border border-brand-border px-2 py-0.5 rounded text-brand-pink">{v}</code>
              ))}
            </div>
            <p className="text-xs text-brand-muted mt-2">
              {form.type === 'monthly' && 'Monthly uses all placeholders.'}
              {form.type === 'birthday' && <>Birthday uses <code className="text-brand-pink">{'{name}'}</code> and <code className="text-brand-pink">{'{brand}'}</code> only.</>}
              {form.type === 'savings_reminder' && <>Savings reminder uses <code className="text-brand-pink">{'{brand}'}</code> only.</>}
              {' '}Changing the type auto-fills the name, subject and body with that type's default template.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  )
}