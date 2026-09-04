export default function Modal({ isOpen, onClose, title, children, action }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-brand-surface rounded-lg border border-brand-border shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col text-brand-text" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-pink text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
        {action && (
          <div className="p-4 border-t border-brand-border flex justify-end">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}