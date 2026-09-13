export default function StatCard({ label, value, color = 'pink', icon }) {
  const colors = {
    pink: 'border-brand-pink text-brand-pink',
    blue: 'border-brand-pink text-brand-pink',
    lime: 'border-brand-lime text-brand-lime',
    green: 'border-brand-lime text-brand-lime',
    red: 'border-red-500 text-red-600',
    yellow: 'border-amber-400 text-amber-500'
  }

  return (
    <div className={`card p-6 border-l-4 ${colors[color] || colors.pink}`}>
      <p className="text-sm font-medium text-brand-muted">{label}</p>
      <p className="text-3xl font-bold text-brand-text mt-1">{value}</p>
    </div>
  )
}