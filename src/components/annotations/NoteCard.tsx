import { useState, useRef, useEffect } from 'react'
import { X, GripVertical, Edit2 } from 'lucide-react'

interface NoteCardProps {
  id: string
  content: string
  position3D: [number, number, number]
  position2D: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
  onDelete: () => void
  onEdit: () => void
}

export default function NoteCard(props: NoteCardProps) {
  const { id, content, position2D, onPositionChange, onDelete, onEdit } = props
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault()
        const cardWidth = 300
        const cardHeight = 200
        let newX = e.clientX - dragOffset.x
        let newY = e.clientY - dragOffset.y
        newX = Math.max(0, Math.min(newX, window.innerWidth - cardWidth))
        newY = Math.max(0, Math.min(newY, window.innerHeight - cardHeight))
        onPositionChange({ x: newX, y: newY })
      }
    }
    const handleMouseUp = () => setIsDragging(false)
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, onPositionChange])

  return (
    <div
      ref={cardRef}
      data-annotation-id={id}
      className={`fixed bg-white rounded-lg shadow-2xl border-2 border-gray-200 min-w-[250px] max-w-[350px] z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position2D.x}px`,
        top: `${position2D.y}px`,
        transition: isDragging ? 'none' : 'all 0.15s ease-out',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 opacity-70" />
          <span className="text-lg">Note</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1 hover:bg-white/20 rounded" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-white/20 rounded" title="Delete">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-800 text-sm leading-relaxed">{content || '(ไม่มีข้อความ)'}</p>
      </div>
    </div>
  )
}
