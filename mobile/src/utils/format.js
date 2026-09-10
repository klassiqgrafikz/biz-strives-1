export function fmtNaira(cents) {
  const val = (Number(cents) || 0) / 100
  return 'NGN ' + val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtNairaShort(cents) {
  const val = (Number(cents) || 0) / 100
  if (Math.abs(val) >= 1000000) return 'NGN ' + (val / 1000000).toFixed(1) + 'M'
  if (Math.abs(val) >= 1000) return 'NGN ' + (val / 1000).toFixed(1) + 'K'
  return 'NGN ' + val.toFixed(2)
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`
}

export function fmtDateShort(iso) {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 10)
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  return d.toLocaleTimeString('en-US', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })
}

export function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 10)
}

export function methodLabel(val) {
  const map = { bank_transfer: 'Bank Transfer', cash: 'Cash', card: 'Card', other: 'Other', manual: 'Manual' }
  return map[val] || val
}

export function maskAccount(acc) {
  if (!acc) return '**** **** **** 0000'
  const last4 = acc.replace(/\s/g, '').slice(-4)
  return `**** **** **** ${last4}`
}
