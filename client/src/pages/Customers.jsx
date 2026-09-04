import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', birthday: '', active: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => loadCustomers(), [])

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers')
      setCustomers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', email: '', phone: '', birthday: '', active: true })
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, email: c.email, phone: c.phone || '', birthday: c.birthday || '', active: c.active })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form)
      } else {
        await api.post('/customers', form)
      }
      setShowModal(false)
      loadCustomers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this customer?')) {
      try {
        await api.delete(`/customers/${id}`)
        loadCustomers()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="text-brand-text">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={openAdd} className="btn btn-primary">Add Customer</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-brand-surface2 border-b border-brand-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Birthday</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-brand-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-brand-surface2">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c.phone || '-'}</td>
                <td className="px-4 py-3">{c.birthday || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${c.active ? 'bg-brand-lime bg-opacity-20 text-brand-lime' : 'bg-brand-surface2 text-brand-muted'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(c)} className="text-brand-pink hover:text-pink-400 text-sm">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-pink-500 hover:text-pink-400 text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted">No customers yet. Click "Add Customer" to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        action={
          <button type="submit" form="customerForm" className="btn btn-primary">Save</button>
        }
      >
        <form id="customerForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Name *</label>
            <input name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Birthday</label>
            <input name="birthday" type="date" value={form.birthday} onChange={e => setForm({...form, birthday: e.target.value})} className="input" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} id="active" className="h-4 w-4 text-brand-pink rounded" />
            <label htmlFor="active" className="ml-2 text-sm text-brand-muted">Active</label>
          </div>
        </form>
      </Modal>
    </div>
  )
}