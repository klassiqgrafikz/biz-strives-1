import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import StatCard from '../components/StatCard'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function Dashboard() {
  const [data, setData] = useState({ income: 0, expenses: 0, savings: 0, net: 0, savingsBalance: 0 })
  const [recentPayments, setRecentPayments] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [incomeForm, setIncomeForm] = useState({ amount: '', note: '', date: todayStr() })
  const [incomeSaving, setIncomeSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [stats, payments, expenses] = await Promise.all([
        api.get('/dashboard'),
        api.get('/payments?limit=5'),
        api.get('/expenses?limit=5')
      ])
      setData(stats.data)
      setRecentPayments(payments.data)
      setRecentExpenses(expenses.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const recordIncome = async (e) => {
    e.preventDefault()
    const amount = parseFloat(incomeForm.amount)
    if (!amount || amount <= 0) {
      alert('Enter a valid amount')
      return
    }
    setIncomeSaving(true)
    try {
      await api.post('/payments/income', { amount, note: incomeForm.note, received_at: incomeForm.date })
      setIncomeForm({ amount: '', note: '', date: todayStr() })
      setLoading(true)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setIncomeSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-muted">Loading...</div>
  if (error) return <div className="text-pink-500 p-4">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Dashboard</h1>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-3">Record Payday Income</h2>
        <form onSubmit={recordIncome} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Amount (₦)"
              value={incomeForm.amount}
              onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
              className="input w-full"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Note (e.g. Salary 02 Sep)"
              value={incomeForm.note}
              onChange={e => setIncomeForm({ ...incomeForm, note: e.target.value })}
              className="input w-full"
            />
          </div>
          <div className="w-full sm:w-40">
            <input
              type="date"
              required
              value={incomeForm.date}
              onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })}
              className="input w-full"
            />
          </div>
          <button type="submit" disabled={incomeSaving} className="btn btn-cta disabled:opacity-50">
            {incomeSaving ? 'Saving...' : 'Add Income'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Received" value={fmtNaira(data.income)} color="lime" />
        <StatCard label="Total Spent" value={fmtNaira(data.expenses)} color="red" />
        <StatCard label="Saved This Month" value={fmtNaira(data.savings)} color="yellow" />
        <StatCard label="Net Cash Flow" value={fmtNaira(data.net)} color={data.net >= 0 ? 'lime' : 'red'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Payments</h2>
          </div>
          <div className="divide-y divide-brand-border">
            {recentPayments.length === 0 ? (
              <div className="p-4 text-center text-brand-muted">No payments yet</div>
            ) : (
              recentPayments.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.customer_name}</p>
                    <p className="text-sm text-brand-muted">{new Date(p.received_at).toLocaleDateString()} · {p.method}{p.note ? ' · ' + p.note : ''}</p>
                  </div>
                  <span className="text-brand-lime font-semibold">{fmtNaira(p.amount_cents)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Expenses</h2>
          </div>
          <div className="divide-y divide-brand-border">
            {recentExpenses.length === 0 ? (
              <div className="p-4 text-center text-brand-muted">No expenses yet</div>
            ) : (
              recentExpenses.map(e => (
                <div key={e.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.category}</p>
                    <p className="text-sm text-brand-muted">{new Date(e.spent_at).toLocaleDateString()}{e.description ? ' · ' + e.description : ''}</p>
                  </div>
                  <span className="text-pink-500 font-semibold">{fmtNaira(e.amount_cents)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Savings Pot Balance</h2>
        <p className="text-2xl font-bold text-brand-pink">{fmtNaira(data.savingsBalance)}</p>
      </div>
    </div>
  )
}