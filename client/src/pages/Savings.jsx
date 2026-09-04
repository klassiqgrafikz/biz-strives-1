import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Modal from '../components/Modal'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Savings() {
  const [entries, setEntries] = useState([])
  const [balance, setBalance] = useState(0)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '', date: todayStr() })
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
    setForm({ amount: '', description: 'Deposit', date: todayStr() })
    setShowDepositModal(true)
  }

  const openWithdraw = () => {
    setForm({ amount: '', description: 'Withdrawal', date: todayStr() })
    setShowWithdrawModal(true)
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/savings/deposit', { amount: parseFloat(form.amount), description: form.description, date: form.date })
      setShowDepositModal(false)
      loadSavings()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    try {
      await api.post('/savings/withdraw', { amount: parseFloat(form.amount), description: form.description, date: form.date })
      setShowWithdrawModal(false)
      loadSavings()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6 text-brand-text">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Pot</h1>
          <p className="text-brand-muted mt-1">Track your accumulated savings</p>
        </div>
        <div className="card p-4 inline-block">
          <p className="text-sm text-brand-muted">Current Balance</p>
          <p className="text-2xl font-bold text-brand-pink">{fmtNaira(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={openDeposit} className="btn btn-cta">Add to Savings</button>
        <button onClick={openWithdraw} className="btn btn-danger">Withdraw</button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-brand-border">
          <h2 className="text-lg font-semibold">Savings History</h2>
        </div>
        <table className="w-full">
          <thead className="bg-brand-surface2 border-b border-brand-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-brand-muted uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-brand-muted uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-brand-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-brand-surface2">
                <td className="px-4 py-3">{new Date(e.saved_at).toLocaleDateString()}</td>
                <td className={`px-4 py-3 ${e.amount_cents >= 0 ? 'text-brand-lime' : 'text-pink-500'}`}>
                  {e.amount_cents >= 0 ? 'Deposit' : 'Withdrawal'}
                </td>
                <td className="px-4 py-3">{e.description || '-'}</td>
                <td className={`px-4 py-3 text-right ${e.amount_cents >= 0 ? 'text-brand-lime' : 'text-pink-500'}`}>
                  {e.amount_cents >= 0 ? '+' : ''}{fmtNaira(Math.abs(e.amount_cents))}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Delete this entry?')) {
                        api.delete(`/savings/${e.id}`).then(loadSavings).catch(alert)
                      }
                    }}
                    className="text-pink-500 hover:text-pink-400 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-muted">No savings entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Add to Savings"
        action={<button type="submit" form="depositForm" className="btn btn-cta">Add to Pot</button>}
      >
        <form id="depositForm" onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw from Savings"
        action={<button type="submit" form="withdrawForm" className="btn btn-danger">Withdraw</button>}
      >
        <div className="bg-brand-pink bg-opacity-20 p-3 rounded-md mb-3">
          <p className="text-sm text-pink-400">Current Balance: {fmtNaira(balance)}</p>
        </div>
        <form id="withdrawForm" onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
