import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

export default function Messages() {
  const [templates, setTemplates] = useState([])
  const [log, setLog] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', subject: '', body: '', type: 'monthly' })
  const [running, setRunning] = useState({ birthday: false, monthly: false })
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

  const runBirthday = async () => {
    setRunning({...running, birthday: true})
    try {
      await api.post('/admin/run-birthday')
      loadLog()
    } catch (err) {
      alert(err.message)
    } finally {
      setRunning({...running, birthday: false})
    }
  }

  const runMonthly = async () => {
    setRunning({...running, monthly: true})
    try {
      await api.post('/admin/run-monthly')
      loadLog()
    } catch (err) {
      alert(err.message)
    } finally {
      setRunning({...running, monthly: false})
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Messaging Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <button onClick={openAdd} className="text-sm text-blue-600 hover:underline">Add Template</button>
          </div>
          <div className="divide-y divide-gray-100">
            {templates.map(t => (
              <div key={t.id} className="p-4">
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{t.subject}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${t.type === 'monthly' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                    {t.type}
                  </span>
                  <button onClick={() => openEdit(t)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <p>No message templates configured.</p>
                <button onClick={openAdd} className="text-blue-600 hover:underline mt-2">Create your first template</button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Actions</h2>
          </div>
          <div className="p-4 space-y-3">
            <button onClick={runBirthday} disabled={running.birthday} className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50">
              {running.birthday ? 'Sending...' : 'Send Birthday Messages Now'}
            </button>
            <button onClick={runMonthly} disabled={running.monthly} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {running.monthly ? 'Running...' : 'Run Month-End Now'}
            </button>
            <a href="#" onClick={e => { e.preventDefault(); downloadPDF() }} className="block text-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
              Download Statement PDF
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Messages</h2>
        </div>
        <div className="divide-y divide-gray-100">
{log.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No messages sent yet</div>
            ) : (
              log.slice(0, 20).map(m => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{m.type.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-gray-500 text-sm ml-2">({m.customer_name || 'System'})</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(m.sent_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
      </div>
    </div>
  )
}