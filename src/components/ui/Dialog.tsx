import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  variant = 'center',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  variant?: 'center' | 'sheet'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  const panel =
    variant === 'sheet'
      ? 'left-0 right-0 bottom-0 rounded-t-3xl max-h-[90vh]'
      : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl max-h-[88vh] w-[min(92vw,32rem)]'

  const initial = variant === 'sheet' ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }
  const animate = variant === 'sheet' ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }
  const exit = variant === 'sheet' ? { y: '100%' } : { opacity: 0, scale: 0.96 }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            className={cn(
              'absolute flex flex-col overflow-hidden border border-border bg-surface shadow-2xl',
              panel,
              className,
            )}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  {title && <h2 className="text-base font-bold text-foreground">{title}</h2>}
                  {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3 safe-bottom">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
