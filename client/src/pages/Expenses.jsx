import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ category: '', amount: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => loadExpenses(), [])

  const loadExpenses = async () => {
    try {
      const res = await api.get('/expenses')
      setExpenses(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ category: '', amount: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (e) => {
    setEditing(e)
    setForm({ category: e.category, amount: (e.amount_cents / 100).toFixed(2), description: e.description || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, amount: form.amount }
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload)
      } else {
        await api.post('/expenses', payload)
      }
      setShowModal(false)
      loadExpenses()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`)
        loadExpenses()
      } catch (err) {
        alert(err.message)
      }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Personal Expenses</h1>
        <button onClick={openAdd} className="btn btn-danger">Add Expense</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(e.spent_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3">{e.description || '-'}</td>
                <td className="px-4 py-3 text-right text-red-600 font-semibold">{fmtNaira(e.amount_cents)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(e)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No expenses recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        action={
          <button type="submit" form="expenseForm" className="btn btn-danger">Save</button>
        }
      >
        <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input name="category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" name="amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input name="description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>
    </div>
  )
}