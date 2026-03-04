export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
}
