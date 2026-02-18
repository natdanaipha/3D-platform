import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronRight, GripHorizontal, List, X } from 'lucide-react'

interface Section {
  id: string
  title: string
  children?: Section[]
}

const defaultSections: Section[] = [
  {
    id: 'model',
    title: 'Model Controls',
    children: [
      { id: 'model-position', title: 'Position' },
      { id: 'model-rotation', title: 'Rotation' },
      { id: 'model-scale', title: 'Scale' },
    ],
  },
  {
    id: 'animation',
    title: 'Animation',
    children: [
      { id: 'anim-playback', title: 'Playback' },
      { id: 'anim-sequence', title: 'Sequence' },
    ],
  },
  {
    id: 'lighting',
    title: 'Lighting',
    children: [
      { id: 'light-ambient', title: 'Ambient' },
      { id: 'light-directional', title: 'Directional' },
    ],
  },
  {
    id: 'camera',
    title: 'Camera',
    children: [
      { id: 'cam-position', title: 'Position' },
      { id: 'cam-fov', title: 'Field of View' },
    ],
  },
  {
    id: 'scene',
    title: 'Scene',
    children: [
      { id: 'scene-bg', title: 'Background' },
      { id: 'scene-grid', title: 'Grid' },
    ],
  },
  {
    id: 'materials',
    title: 'Materials',
  },
  {
    id: 'annotations',
    title: 'Annotations',
    children: [
      { id: 'anno-notes', title: 'Notes' },
      { id: 'anno-text', title: 'Text' },
    ],
  },
]

interface TCPreviewProps {
  sections?: Section[]
}

export default function TCPreview({
  sections = defaultSections,
}: TCPreviewProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

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

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-[41]"
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

          {/* Sections */}
          <div className="max-h-[50vh] overflow-y-auto py-1.5">
            {sections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => section.children && toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-white/50 transition-colors"
                >
                  {section.children ? (
                    expandedSections.has(section.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span>{section.title}</span>
                </button>

                {section.children && expandedSections.has(section.id) && (
                  <div className="pb-1">
                    {section.children.map((child) => (
                      <button
                        key={child.id}
                        className="w-full flex items-center gap-2 pl-9 pr-4 py-1.5 text-left text-sm text-neutral-500 hover:text-neutral-800 hover:bg-white/40 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
                        <span>{child.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
