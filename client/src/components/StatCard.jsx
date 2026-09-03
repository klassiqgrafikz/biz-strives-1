export default function StatCard({ label, value, color = 'blue', icon }) {
  const colors = {
    blue: 'border-blue-500 bg-blue-50 text-blue-600',
    green: 'border-green-500 bg-green-50 text-green-600',
    red: 'border-red-500 bg-red-50 text-red-600',
    yellow: 'border-yellow-500 bg-yellow-50 text-yellow-600'
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}