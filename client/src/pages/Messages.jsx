import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

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
        <div className="p-4 border-b border-brand-border">
          <h2 className="text-lg font-semibold">Recent Messages</h2>
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
    </div>
  )
}