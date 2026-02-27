import { useState, useRef, useCallback, useEffect } from 'react'
import { GripHorizontal, List, Play, X } from 'lucide-react'
import type { TocSection } from '../types'

interface TCPreviewProps {
  sections: TocSection[]
  activeSectionId?: string | null
  onSectionClick?: (section: TocSection) => void
}

export default function TCPreview({ sections, activeSectionId, onSectionClick }: TCPreviewProps) {
  const [isOpen, setIsOpen] = useState(true)

  const [position, setPosition] = useState({ x: window.innerWidth - 260 - 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 260)
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 100)
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    },
    [isDragging],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const clamp = () => {
      setPosition((prev) => {
        const w = containerRef.current?.offsetWidth || 260
        const h = containerRef.current?.offsetHeight || 100
        return {
          x: Math.max(0, Math.min(prev.x, window.innerWidth - w)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - h)),
        }
      })
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed z-[60]"
      style={{ left: position.x, top: position.y }}
      data-drawer="toc-card"
    >
      {/* Collapsed toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-lg text-sm font-medium text-neutral-700 hover:bg-white/90 transition-colors"
        >
          <List className="h-4 w-4" />
          <span>Contents</span>
        </button>
      )}

      {/* Expanded card */}
      <div
        className={`transition-all duration-300 origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ width: '260px' }}
      >
        <div className="rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Drag Handle + Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`px-4 py-3 border-b border-white/30 flex items-center justify-between select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-3.5 w-3.5 text-neutral-400" />
              <h2 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                Table of Contents
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-black/5 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sections (flat list) */}
          <div className="max-h-[50vh] overflow-y-auto py-1.5">
            {sections.map((item) => {
              const isActive = activeSectionId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionClick?.(item)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 text-blue-700'
                      : 'text-neutral-700 hover:bg-white/50'
                  }`}
                >
                  {(item.animations?.length ?? 0) > 0 || item.animationName ? (
                    <Play className={`h-3 w-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                  )}
                  <span className="truncate">{item.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
