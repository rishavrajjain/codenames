import { Toast as ToastType } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: string) => void
}

const typeStyles = {
  success: 'bg-green-600/90 border-green-500/30',
  error: 'bg-red-600/90 border-red-500/30',
  info: 'bg-navy-700/90 border-white/10',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast-enter px-4 py-3 rounded-xl border backdrop-blur-xl text-white text-sm font-medium shadow-xl cursor-pointer max-w-sm ${typeStyles[toast.type]}`}
          onClick={() => onRemove(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
