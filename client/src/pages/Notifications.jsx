import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import Icon from '../components/Icon'

export default function Notifications() {
  const [customers, setCustomers] = useState([])
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [selectAll, setSelectAll] = useState(true)
  const [selected, setSelected] = useState({})
  const editorRef = useRef(null)

  useEffect(() => {
    loadRecipients()
  }, [])

  const loadRecipients = async () => {
    try {
      const res = await api.get('/notifications/recipients')
      setCustomers(res.data)
      const map = {}
      res.data.forEach(c => { map[c.id] = true })
      setSelected(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected({})
    } else {
      const map = {}
      customers.forEach(c => { map[c.id] = true })
      setSelected(map)
    }
    setSelectAll(!selectAll)
  }

  const toggleCustomer = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const execCmd = (command, value) => {
    document.execCommand(command, false, value || null)
    editorRef.current?.focus()
  }

  const insertLink = () => {
    const url = prompt('Enter link URL:')
    if (url) execCmd('createLink', url)
  }

  const handleSend = async () => {
    const html = editorRef.current?.innerHTML
    if (!subject.trim()) {
      alert('Enter a subject line')
      return
    }
    if (!html || html === '<br>' || html.trim() === '') {
      alert('Enter a message')
      return
    }

    const selectedIds = Object.keys(selected).filter(id => selected[id])
    if (selectedIds.length === 0) {
      alert('Select at least one customer')
      return
    }

    setSending(true)
    setResult(null)
    try {
      const res = await api.post('/notifications/broadcast', {
        subject: subject.trim(),
        html: html,
        recipientIds: selectedIds
      })
      setResult(res.results)
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-muted">Loading...</div>

  return (
    <div className="space-y-6 text-brand-text">
      <h1 className="text-2xl font-bold">Customer Notifications</h1>
      <p className="text-sm text-brand-muted">Send a custom email message directly to your customers. Select recipients, compose your message below, and send it.</p>

      {result && (
        <div className={`border rounded-md p-4 ${result.failed > 0 ? 'bg-yellow-500 bg-opacity-10 border-yellow-500' : 'bg-brand-lime bg-opacity-10 border-brand-lime'}`}>
          <p className={`font-medium ${result.failed > 0 ? 'text-yellow-400' : 'text-brand-lime'}`}>
            {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
          </p>
          {result.failures?.length > 0 && (
            <p className="text-sm text-brand-muted mt-1">
              Failed: {result.failures.map(f => f.email).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="p-4 border-b border-brand-border">
              <h2 className="text-lg font-semibold">Compose Message</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Subject *</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Important Update from Klassiq Grafikz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Message *</label>
                <div className="border border-brand-border rounded-md overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 bg-brand-surface2 px-2 py-1.5 border-b border-brand-border">
                    <button type="button" onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Bold">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
                    </button>
                    <button type="button" onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Italic">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
                    </button>
                    <button type="button" onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Underline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>
                    </button>
                    <button type="button" onClick={() => execCmd('strikeThrough')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Strikethrough">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>
                    </button>
                    <div className="w-px h-5 bg-brand-border mx-1"></div>
                    <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Numbered List">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                    </button>
                    <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Bullet List">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"></circle><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"></circle><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"></circle></svg>
                    </button>
                    <div className="w-px h-5 bg-brand-border mx-1"></div>
                    <button type="button" onClick={insertLink} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Insert Link">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                    <button type="button" onClick={() => execCmd('removeFormat')} className="p-1.5 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-text" title="Clear Formatting">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[220px] p-3 focus:outline-none prose prose-invert max-w-none text-sm"
                    data-placeholder="Write your message here..."
                    suppressContentEditableWarning={true}
                    onFocus={e => {
                      if (e.currentTarget.innerHTML === '<br>') e.currentTarget.innerHTML = ''
                    }}
                    style={{
                      color: 'var(--brand-text, #e5e7eb)'
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="btn btn-cta disabled:opacity-50 flex items-center gap-2"
              >
                <Icon name="notification" />
                {sending ? 'Sending to all customers...' : `Send to ${Object.values(selected).filter(Boolean).length} Customer(s)`}
              </button>
            </div>
          </div>
        </div>

        {/* Recipients panel */}
        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recipients ({customers.length})</h2>
            <button onClick={toggleSelectAll} className="text-sm text-brand-pink hover:underline">
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="divide-y divide-brand-border max-h-[480px] overflow-y-auto">
            {customers.length === 0 ? (
              <div className="p-4 text-center text-brand-muted">No customers found. Add customers first.</div>
            ) : (
              customers.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selected[c.id]}
                    onChange={() => toggleCustomer(c.id)}
                    className="h-4 w-4 text-brand-pink rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-brand-muted truncate">{c.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-brand-lime bg-opacity-20 text-brand-lime' : 'bg-brand-surface2 text-brand-muted'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
