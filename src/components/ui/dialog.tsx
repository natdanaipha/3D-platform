import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** คลิกพื้นหลังแล้วปิด (default: true) */
  closeOnOverlayClick?: boolean
}

export function Dialog({
  open,
  onOpenChange,
  children,
  closeOnOverlayClick = true,
}: DialogProps) {
  if (!open) return null
  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={() => closeOnOverlayClick && onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-h-[90vh] overflow-hidden flex justify-center items-center">
        {children}
      </div>
    </div>
  )
  return createPortal(content, document.body)
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  /** แสดงปุ่มปิดมุมขวาบน */
  showCloseButton?: boolean
}

export function DialogContent({
  className,
  onClose,
  showCloseButton = true,
  children,
  ...props
}: DialogContentProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card text-card-foreground shadow-2xl max-h-[90vh] flex flex-col',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {showCloseButton && onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 z-10 rounded-full h-8 w-8"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {children}
    </div>
  )
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-2 border-b px-6 py-4', className)}
      {...props}
    />
  )
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)} {...props} />
  )
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn('flex shrink-0 gap-2 border-t px-6 py-4', className)}
      {...props}
    />
  )
}
