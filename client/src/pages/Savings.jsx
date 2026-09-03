import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Savings() {
  const [entries, setEntries] = useState([])
  const [balance, setBalance] = useState(0)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => loadSavings(), [])

  const loadSavings = async () => {
    try {
      const [entriesRes, balanceRes] = await Promise.all([
        api.get('/savings'),
        api.get('/savings/balance')
      ])
      setEntries(entriesRes.data)
      setBalance(balanceRes.data.balance)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openDeposit = () => {
    setForm({ amount: '', description: 'Deposit' })
    setShowDepositModal(true)
  }

  const openWithdraw = () => {
    setForm({ amount: '', description: 'Withdrawal' })
    setShowWithdrawModal(true)
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/savings/deposit', { amount: form.amount, description: form.description })
      setShowDepositModal(false)
      loadSavings()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    try {
      await api.post('/savings/withdraw', { amount: form.amount, description: form.description })
      setShowWithdrawModal(false)
      loadSavings()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Savings Pot</h1>
          <p className="text-gray-600 mt-1">Track your accumulated savings</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 inline-block">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-blue-600">{fmtNaira(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={openDeposit} className="btn btn-green">Add to Savings</button>
        <button onClick={openWithdraw} className="btn btn-red">Withdraw</button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Savings History</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(e.saved_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 {e.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}">
                  {e.amount_cents >= 0 ? 'Deposit' : 'Withdrawal'}
                </td>
                <td className="px-4 py-3">{e.description || '-'}</td>
                <td className="px-4 py-3 text-right {e.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}">
                  {e.amount_cents >= 0 ? '+' : ''}{fmtNaira(Math.abs(e.amount_cents))}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Delete this entry?')) {
                        api.delete(`/savings/${e.id}`).then(loadSavings).catch(alert)
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No savings entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Add to Savings"
        action={<button type="submit" form="depositForm" className="btn btn-green">Add to Pot</button>}
      >
        <form id="depositForm" onSubmit={e => { e.preventDefault(); api.post('/savings/deposit', { amount: parseFloat(form.amount), description: form.description }).then(() => { setShowDepositModal(false); window.location.reload() }).catch(alert) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw from Savings"
        action={<button type="submit" form="withdrawForm" className="btn btn-red">Withdraw</button>}
      >
        <div className="bg-yellow-50 p-3 rounded-md mb-3">
          <p className="text-sm text-yellow-800">Current Balance: {fmtNaira(balance)}</p>
        </div>
        <form id="withdrawForm" onSubmit={e => { e.preventDefault(); api.post('/savings/withdraw', { amount: parseFloat(form.amount), description: form.description }).then(() => { setShowWithdrawModal(false); window.location.reload() }).catch(alert) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>
    </div>
  )
}