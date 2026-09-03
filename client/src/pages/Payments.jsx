import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ customer_id: '', amount: '', method: 'bank_transfer', note: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadPayments(), loadCustomers()]).finally(() => setLoading(false))
  }, [])

  const loadPayments = async () => {
    try {
      const res = await api.get('/payments')
      setPayments(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers')
      setCustomers(res.data.filter(c => c.active))
    } catch (err) {
      console.error(err)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ customer_id: '', amount: '', method: 'bank_transfer', note: '' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({ customer_id: p.customer_id, amount: (p.amount_cents / 100).toFixed(2), method: p.method, note: p.note || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, amount: form.amount, customer_id: Number(form.customer_id) }
      if (editing) {
        await api.put(`/payments/${editing.id}`, payload)
      } else {
        await api.post('/payments', payload)
      }
      setShowModal(false)
      loadPayments()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this payment?')) {
      try {
        await api.delete(`/payments/${id}`)
        loadPayments()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments Received</h1>
        <button onClick={openAdd} className="btn btn-primary">Record Payment</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(p.received_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{p.customer_name}</td>
                <td className="px-4 py-3 text-green-600 font-semibold">{fmtNaira(p.amount_cents)}</td>
                <td className="px-4 py-3">{p.method}</td>
                <td className="px-4 py-3">{p.note || '-'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Payment' : 'Record Payment'}
        action={
          <button type="submit" form="paymentForm" className="btn btn-primary">{editing ? 'Update' : 'Record'}</button>
        }
      >
        <form id="paymentForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select name="customer_id" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required className="input">
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" name="amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select name="method" value={form.method} onChange={e => setForm({...form, method: e.target.value})} className="input">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input name="note" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>
    </div>
  )
}