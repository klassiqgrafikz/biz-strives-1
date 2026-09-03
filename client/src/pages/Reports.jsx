import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const fmtNaira = (cents) => '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData] = useState({ payments: [], expenses: [], savings: [], incomeTotal: 0, expenseTotal: 0, savingsTotal: 0, net: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReport()
  }, [selectedMonth])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports?month=${selectedMonth}`)
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/reports/pdf?month=${selectedMonth}`, '_blank')
  }

  const monthLabel = `${months[parseInt(selectedMonth.slice(5)) - 1]} ${selectedMonth.slice(0,4)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Monthly Reports</h1>
        <button onClick={downloadPDF} disabled={loading} className="btn btn-primary">
          {loading ? 'Loading...' : 'Download PDF Statement'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <form className="flex items-center space-x-4" onSubmit={e => e.preventDefault()}>
            <label className="text-sm font-medium text-gray-700">Select Month:</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input w-auto">
              {(() => {
                const opts = []
                const currentYear = new Date().getFullYear()
                for (let y = currentYear; y >= 2020; y--) {
                  for (let m = 11; m >= 0; m--) {
                    const date = new Date(y, m, 1)
                    const value = date.toISOString().slice(0, 7)
                    const label = months[m] + ' ' + y
                    opts.push(<option key={value} value={value}>{label}</option>)
                  }
                }
                return opts
              })()}
            </select>
          </form>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Income Received</h2>
              <p className="text-3xl font-bold text-green-600 mb-2">{fmtNaira(data.incomeTotal)}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.slice(0, 10).map(p => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="py-2">{new Date(p.received_at).toLocaleDateString()}</td>
                      <td className="py-2">{p.customer_name}</td>
                      <td className="py-2 text-right text-green-600">{fmtNaira(p.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.payments.length > 10 && <p className="text-xs text-gray-500 mt-2">Showing 10 of {data.payments.length} payments</p>}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Spending & Savings</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-red-600 font-semibold">{fmtNaira(data.expenseTotal)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                  <span className="font-medium">Total Savings</span>
                  <span className="text-yellow-600 font-semibold">{fmtNaira(data.savingsTotal)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                  <span className="font-medium">Net Cash Flow</span>
                  <span className={`font-semibold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtNaira(data.net)}</span>
                </div>
              </div>
            </div>
          </div>

          {data.expenses.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3">Expenses Detail</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map(e => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-2">{new Date(e.spent_at).toLocaleDateString()}</td>
                      <td className="py-2">{e.category}</td>
                      <td className="py-2">{e.description || '-'}</td>
                      <td className="py-2 text-right">{fmtNaira(e.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.savings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3">Savings Detail</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.savings.map(s => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-2">{new Date(s.saved_at).toLocaleDateString()}</td>
                      <td className="py-2">{s.description || '-'}</td>
                      <td className="py-2 text-right {s.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'}">
                        {s.amount_cents >= 0 ? '+' : ''}{fmtNaira(Math.abs(s.amount_cents))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}