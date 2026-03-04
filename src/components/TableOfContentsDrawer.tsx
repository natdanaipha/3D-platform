import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './ui/button'
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Highlighter,
  List,
  Play,
  Pause,
  Plus,
  Trash2,
  Check,
  X,
  FilmIcon,
  GripVertical,
  Scissors,
  Clock,
  RotateCcw,
  Square,
} from 'lucide-react'
import type { TocSection, AnimationItem } from '../types'

/** State of section animation playback (managed by parent) */
export interface SectionPlaybackState {
  sectionId: string
  isPlaying: boolean
  /** Current animation item index in the stack */
  currentItemIndex: number
  /** Progress within current item: 0..1 */
  currentItemProgress: number
  /** Current animation time within the active item (seconds) */
  currentItemTime: number
}

interface TableOfContentsDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  sections: TocSection[]
  animationNames: string[]
  nodeNames: string[]
  /** Animation durations map: animationName -> duration in seconds */
  animationDurations?: Record<string, number>
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onUpdateSection: (id: string, updates: Partial<TocSection>) => void
  onCameraPreview?: (camera: { x?: number; y?: number; z?: number; fov?: number }) => void
  onAddToTimeline?: (sectionId: string) => void
  /** Callback when animation preview time changes (for trim inline preview) */
  onAnimationPreviewTime?: (animationName: string, time: number) => void
  /** Current section playback state (from parent) */
  sectionPlayback?: SectionPlaybackState | null
  /** Request to play a section's animation stack */
  onPlaySection?: (sectionId: string) => void
  /** Request to pause section playback */
  onPauseSection?: () => void
  /** Request to stop section playback */
  onStopSection?: () => void
}

export default function TableOfContentsDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  sections,
  animationNames,
  nodeNames,
  animationDurations = {},
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onCameraPreview,
  onAddToTimeline,
  onAnimationPreviewTime,
  sectionPlayback,
  onPlaySection,
  onPauseSection,
  onStopSection,
}: TableOfContentsDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Which animation item is showing inline trim UI: "sectionId::itemId"
  const [trimExpandedId, setTrimExpandedId] = useState<string | null>(null)

  // Drag state for animation items
  const dragItemRef = useRef<{ sectionId: string; index: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditValue(currentTitle)
  }

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdateSection(id, { title: editValue.trim() })
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  // Animation Items management
  const addAnimationItem = (sectionId: string, animationName: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const duration = animationDurations[animationName] ?? 1
    const newItem: AnimationItem = {
      id: `anim-${Date.now()}`,
      animationName,
      speed: 1,
      trimIn: 0,
      trimOut: duration,
      originalDuration: duration,
    }

    const currentItems = section.animationItems ?? []
    onUpdateSection(sectionId, { animationItems: [...currentItems, newItem] })
  }

  const removeAnimationItem = (sectionId: string, itemId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const currentItems = section.animationItems ?? []
    onUpdateSection(sectionId, {
      animationItems: currentItems.filter((item) => item.id !== itemId),
    })
  }

  const updateAnimationItem = (sectionId: string, itemId: string, updates: Partial<AnimationItem>) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const currentItems = section.animationItems ?? []
    onUpdateSection(sectionId, {
      animationItems: currentItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    })
  }

  // Drag & Drop handlers
  const handleDragStart = (sectionId: string, index: number) => {
    dragItemRef.current = { sectionId, index }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (sectionId: string, dropIndex: number) => {
    if (!dragItemRef.current || dragItemRef.current.sectionId !== sectionId) {
      dragItemRef.current = null
      setDragOverIndex(null)
      return
    }

    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const items = [...(section.animationItems ?? [])]
    const dragIndex = dragItemRef.current.index

    if (dragIndex === dropIndex) {
      dragItemRef.current = null
      setDragOverIndex(null)
      return
    }

    // Reorder items
    const [draggedItem] = items.splice(dragIndex, 1)
    items.splice(dropIndex > dragIndex ? dropIndex - 1 : dropIndex, 0, draggedItem)

    onUpdateSection(sectionId, { animationItems: items })
    dragItemRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragItemRef.current = null
    setDragOverIndex(null)
  }

  // Toggle inline trim panel
  const toggleTrim = (sectionId: string, itemId: string) => {
    const key = `${sectionId}::${itemId}`
    setTrimExpandedId((prev) => (prev === key ? null : key))
  }

  // Format time for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs.toFixed(1)}s`
    }
    return `${secs.toFixed(1)}s`
  }

  // Calculate total section duration
  const getSectionDuration = (section: TocSection): number => {
    const items = section.animationItems ?? []
    return items.reduce((total, item) => {
      const trimmedDuration = (item.trimOut - item.trimIn) / item.speed
      return total + trimmedDuration
    }, 0)
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-[calc(50%-3rem)] -translate-y-1/2 z-[70] rounded-r-none rounded-l-lg"
        variant="secondary"
        size="icon"
        data-drawer-toggle="toc"
        title="Table of Contents"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <List className="h-4 w-4" />}
      </Button>

      {/* Drawer */}
      <div
        data-drawer="toc"
        className={`fixed right-0 top-0 h-full bg-white border-l border-neutral-200 shadow-lg transition-transform duration-300 z-[60] overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '380px', maxHeight: '100vh' }}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Table of Contents</h2>
            <Button size="sm" onClick={onAddSection} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Section
            </Button>
          </div>

          {/* Sections List */}
          {sections.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <List className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sections yet</p>
              <p className="text-xs mt-1">Click "Add Section" to create one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => {
                const animItems = section.animationItems ?? []
                const totalDuration = getSectionDuration(section)

                return (
                  <div
                    key={section.id}
                    className="rounded-lg border border-neutral-100 overflow-hidden"
                  >
                    {/* Section header row */}
                    <div className="flex items-center gap-1 p-2 group bg-white">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === section.id ? null : section.id)
                        }
                        className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400"
                      >
                        {expandedId === section.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {editingId === section.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(section.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(section.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-neutral-400 hover:bg-neutral-100 rounded"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium text-neutral-800 truncate">
                            {section.title}
                          </span>
                          {animItems.length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                              <Play className="h-2.5 w-2.5" />
                              {animItems.length}
                            </span>
                          )}
                          {totalDuration > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDuration(totalDuration)}
                            </span>
                          )}
                          {(section.highlightNodes ?? []).length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              <Highlighter className="h-2.5 w-2.5" />
                              {section.highlightNodes!.length}
                            </span>
                          )}

                          {/* Section Play / Pause / Stop controls */}
                          {animItems.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {sectionPlayback?.sectionId === section.id && sectionPlayback.isPlaying ? (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onPauseSection?.() }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Pause"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onStopSection?.() }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Stop"
                                  >
                                    <Square className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onPlaySection?.(section.id) }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Play section animations"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onAddToTimeline && (
                              <button
                                onClick={() => onAddToTimeline(section.id)}
                                className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Add to Timeline"
                              >
                                <FilmIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(section.id, section.title)}
                              className="p-1 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                              title="Rename"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onRemoveSection(section.id)}
                              className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Section content (expanded) */}
                    {expandedId === section.id && (
                      <div className="border-t border-neutral-100 p-3 bg-neutral-50/50 space-y-3">
                        {/* Animation Items Stack */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Animation Stack
                            </label>
                            <span className="text-[10px] text-neutral-400">
                              Plays top → bottom
                            </span>
                          </div>

                          {/* Add Animation Dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addAnimationItem(section.id, e.target.value)
                              }
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">+ Add Animation...</option>
                            {animationNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>

                          {/* Animation Items List */}
                          {animItems.length === 0 ? (
                            <div className="text-center py-4 text-neutral-400 border border-dashed border-neutral-200 rounded-lg">
                              <Play className="h-6 w-6 mx-auto mb-1 opacity-50" />
                              <p className="text-xs">No animations added</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {animItems.map((item, index) => {
                                const trimmedDuration = item.trimOut - item.trimIn
                                const isTrimmed =
                                  item.trimIn > 0 || item.trimOut < item.originalDuration
                                const trimKey = `${section.id}::${item.id}`
                                const isTrimOpen = trimExpandedId === trimKey
                                const isActiveItem =
                                  sectionPlayback?.sectionId === section.id &&
                                  sectionPlayback.currentItemIndex === index
                                const itemProgress = isActiveItem
                                  ? sectionPlayback!.currentItemProgress
                                  : sectionPlayback?.sectionId === section.id &&
                                      sectionPlayback.currentItemIndex > index
                                    ? 1
                                    : 0

                                return (
                                  <div key={item.id} className="space-y-0">
                                    <div
                                      draggable
                                      onDragStart={() => handleDragStart(section.id, index)}
                                      onDragOver={(e) => handleDragOver(e, index)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={() => handleDrop(section.id, index)}
                                      onDragEnd={handleDragEnd}
                                      className={`group flex flex-col gap-0 bg-white rounded-lg border transition-all ${
                                        isActiveItem && sectionPlayback?.isPlaying
                                          ? 'border-blue-400 ring-1 ring-blue-200'
                                          : dragOverIndex === index
                                            ? 'border-blue-400 border-t-4'
                                            : isTrimOpen
                                              ? 'border-purple-300 rounded-b-none'
                                              : 'border-neutral-200 hover:border-neutral-300'
                                      }`}
                                    >
                                    <div className="group flex items-center gap-2 p-2">
                                      {/* Drag handle */}
                                      <div className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500">
                                        <GripVertical className="h-4 w-4" />
                                      </div>

                                      {/* Index badge */}
                                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-neutral-100 text-neutral-500 rounded">
                                        {index + 1}
                                      </span>

                                      {/* Animation info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          <Play className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                          <span className="text-sm font-medium text-neutral-700 truncate">
                                            {item.animationName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-neutral-400">
                                            {formatDuration(trimmedDuration / item.speed)}
                                          </span>
                                          <span className="text-[10px] text-neutral-400">
                                            {item.speed}x
                                          </span>
                                          {isTrimmed && (
                                            <span className="text-[10px] text-purple-500 flex items-center gap-0.5">
                                              <Scissors className="h-2.5 w-2.5" />
                                              trimmed
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Speed control */}
                                      <input
                                        type="number"
                                        min="0.1"
                                        max="10"
                                        step="0.1"
                                        value={item.speed}
                                        onChange={(e) =>
                                          updateAnimationItem(section.id, item.id, {
                                            speed: parseFloat(e.target.value) || 1,
                                          })
                                        }
                                        className="w-12 px-1 py-0.5 text-xs border border-neutral-200 rounded text-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                        title="Speed"
                                      />

                                      {/* Actions */}
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => toggleTrim(section.id, item.id)}
                                          className={`p-1 rounded ${
                                            isTrimOpen
                                              ? 'text-purple-600 bg-purple-50'
                                              : 'text-neutral-400 hover:text-purple-600 hover:bg-purple-50'
                                          }`}
                                          title="Trim"
                                        >
                                          <Scissors className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => removeAnimationItem(section.id, item.id)}
                                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                                          title="Remove"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                      {/* Progress bar */}
                                      {sectionPlayback?.sectionId === section.id && itemProgress > 0 && (
                                        <div className="w-full h-1 bg-neutral-100 rounded-b-lg overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-100 ${
                                              isActiveItem && sectionPlayback.isPlaying
                                                ? 'bg-blue-500'
                                                : 'bg-blue-300'
                                            }`}
                                            style={{ width: `${Math.min(itemProgress * 100, 100)}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Inline Trim Panel */}
                                    {isTrimOpen && (
                                      <InlineTrimPanel
                                        item={item}
                                        onUpdate={(updates) =>
                                          updateAnimationItem(section.id, item.id, updates)
                                        }
                                        onPreviewTime={(time) =>
                                          onAnimationPreviewTime?.(item.animationName, time)
                                        }
                                      />
                                    )}
                                  </div>
                                )
                              })}

                              {/* Drop zone at end */}
                              <div
                                onDragOver={(e) => handleDragOver(e, animItems.length)}
                                onDragLeave={handleDragLeave}
                                onDrop={() => handleDrop(section.id, animItems.length)}
                                className={`h-2 rounded transition-all ${
                                  dragOverIndex === animItems.length
                                    ? 'bg-blue-200 h-8'
                                    : ''
                                }`}
                              />
                            </div>
                          )}

                          {animationNames.length === 0 && (
                            <p className="text-xs text-neutral-400">
                              No animations available in this model
                            </p>
                          )}
                        </div>

                        <div className="border-t border-neutral-200 pt-2 mt-2" />

                        {/* Camera Position */}
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Camera Position
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['cameraX', 'cameraY', 'cameraZ'] as const).map((key) => {
                            const axisMap = { cameraX: 'x', cameraY: 'y', cameraZ: 'z' } as const
                            const defaultVal = key === 'cameraY' ? 5 : key === 'cameraZ' ? 10 : 0
                            return (
                              <div key={key}>
                                <label className="text-[10px] text-neutral-400 uppercase">
                                  {key.replace('camera', '')}
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={section[key] ?? defaultVal}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    onUpdateSection(section.id, { [key]: val })
                                    onCameraPreview?.({ [axisMap[key]]: val })
                                  }}
                                  className="w-full px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            )
                          })}
                        </div>

                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          FOV
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="10"
                            max="120"
                            step="1"
                            value={section.cameraFov ?? 50}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              onUpdateSection(section.id, { cameraFov: val })
                              onCameraPreview?.({ fov: val })
                            }}
                            className="flex-1"
                          />
                          <input
                            type="number"
                            min="10"
                            max="120"
                            step="1"
                            value={section.cameraFov ?? 50}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 50
                              onUpdateSection(section.id, { cameraFov: val })
                              onCameraPreview?.({ fov: val })
                            }}
                            className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-xs text-neutral-400">°</span>
                        </div>

                        <div className="border-t border-neutral-200 pt-2 mt-2" />

                        {/* Highlight Nodes */}
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Highlight Nodes
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const node = e.target.value
                            if (!node) return
                            const current = section.highlightNodes ?? []
                            if (!current.includes(node)) {
                              onUpdateSection(section.id, { highlightNodes: [...current, node] })
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Add Node --</option>
                          {nodeNames
                            .filter((n) => !(section.highlightNodes ?? []).includes(n))
                            .map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                        </select>
                        {(section.highlightNodes ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {section.highlightNodes!.map((node) => (
                              <span
                                key={node}
                                className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
                              >
                                {node}
                                <button
                                  onClick={() =>
                                    onUpdateSection(section.id, {
                                      highlightNodes: section.highlightNodes!.filter((n) => n !== node),
                                    })
                                  }
                                  className="hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {nodeNames.length === 0 && (
                          <p className="text-xs text-neutral-400">
                            No nodes available in this model
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── Inline Trim Panel Component ─── */

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`
}

function InlineTrimPanel({
  item,
  onUpdate,
  onPreviewTime,
}: {
  item: AnimationItem
  onUpdate: (updates: Partial<AnimationItem>) => void
  onPreviewTime?: (time: number) => void
}) {
  const [trimIn, setTrimIn] = useState(item.trimIn)
  const [trimOut, setTrimOut] = useState(item.trimOut > 0 ? item.trimOut : item.originalDuration)
  const [isDragging, setIsDragging] = useState<'in' | 'out' | 'range' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(item.trimIn)
  const trackRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const dragStartRef = useRef<{ x: number; trimIn: number; trimOut: number } | null>(null)

  const originalDuration = item.originalDuration || 1

  // Sync when item changes externally
  useEffect(() => {
    setTrimIn(item.trimIn)
    setTrimOut(item.trimOut > 0 ? item.trimOut : item.originalDuration)
  }, [item.trimIn, item.trimOut, item.originalDuration])

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      lastTimeRef.current = null
      return
    }
    const tick = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (timestamp - lastTimeRef.current) / 1000
        setCurrentTime((prev) => {
          const next = prev + delta * (item.speed ?? 1)
          if (next >= trimOut) {
            setIsPlaying(false)
            return trimIn
          }
          return next
        })
      }
      lastTimeRef.current = timestamp
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    animationFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying, trimIn, trimOut, item.speed])

  useEffect(() => {
    onPreviewTime?.(currentTime)
  }, [currentTime, onPreviewTime])

  // Commit trim to parent on change
  useEffect(() => {
    if (isDragging) return // only commit after drag ends
    const t = setTimeout(() => {
      if (trimIn !== item.trimIn || trimOut !== item.trimOut) {
        onUpdate({ trimIn, trimOut })
      }
    }, 200)
    return () => clearTimeout(t)
  }, [trimIn, trimOut, isDragging, item.trimIn, item.trimOut, onUpdate])

  const getPositionFromX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * originalDuration
    },
    [originalDuration],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'in' | 'out' | 'range') => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(type)
      dragStartRef.current = { x: e.clientX, trimIn, trimOut }
    },
    [trimIn, trimOut],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return
      const pos = getPositionFromX(e.clientX)
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaTime = (deltaX / (trackRef.current?.offsetWidth ?? 1)) * originalDuration

      if (isDragging === 'in') {
        const newIn = Math.max(0, Math.min(trimOut - 0.05, pos))
        setTrimIn(newIn)
        setCurrentTime(newIn)
      } else if (isDragging === 'out') {
        const newOut = Math.max(trimIn + 0.05, Math.min(originalDuration, pos))
        setTrimOut(newOut)
      } else if (isDragging === 'range') {
        const dur = dragStartRef.current.trimOut - dragStartRef.current.trimIn
        let newIn = dragStartRef.current.trimIn + deltaTime
        let newOut = dragStartRef.current.trimOut + deltaTime
        if (newIn < 0) { newIn = 0; newOut = dur }
        if (newOut > originalDuration) { newOut = originalDuration; newIn = originalDuration - dur }
        setTrimIn(newIn)
        setTrimOut(newOut)
        setCurrentTime(newIn)
      }
    },
    [isDragging, trimIn, trimOut, originalDuration, getPositionFromX],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
    dragStartRef.current = null
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return
      const pos = getPositionFromX(e.clientX)
      if (pos >= trimIn && pos <= trimOut) setCurrentTime(pos)
    },
    [isDragging, getPositionFromX, trimIn, trimOut],
  )

  const handleReset = () => {
    setTrimIn(0)
    setTrimOut(originalDuration)
    setCurrentTime(0)
    onUpdate({ trimIn: 0, trimOut: originalDuration })
  }

  const trimInPct = (trimIn / originalDuration) * 100
  const trimOutPct = (trimOut / originalDuration) * 100
  const currentPct = (currentTime / originalDuration) * 100

  return (
    <div className="bg-purple-50/60 border border-t-0 border-purple-300 rounded-b-lg px-3 py-2.5 space-y-2">
      {/* Time labels */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-neutral-400">Source </span>
          <span className="font-mono text-neutral-600">{formatTime(0)}</span>
          <span className="text-neutral-400"> – </span>
          <span className="font-mono text-neutral-600">{formatTime(originalDuration)}</span>
        </div>
        <div className="text-right">
          <span className="text-purple-500">In </span>
          <span className="font-mono font-semibold text-purple-600">{formatTime(trimIn)}</span>
          <span className="text-purple-400"> – </span>
          <span className="text-purple-500">Out </span>
          <span className="font-mono font-semibold text-purple-600">{formatTime(trimOut)}</span>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="relative">
        {/* Time ticks */}
        <div className="flex justify-between text-[8px] text-neutral-400 mb-0.5 px-0.5">
          <span>0:00</span>
          <span>{formatTime(originalDuration / 2)}</span>
          <span>{formatTime(originalDuration)}</span>
        </div>

        <div
          ref={trackRef}
          className="relative h-10 bg-neutral-200 rounded overflow-hidden cursor-pointer select-none"
          onClick={handleTrackClick}
        >
          {/* Frame markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-neutral-300/50"
                style={{ opacity: i % 4 === 0 ? 0.7 : 0.2 }}
              />
            ))}
          </div>

          {/* Dimmed outside trim */}
          <div
            className="absolute inset-y-0 left-0 bg-black/35 pointer-events-none"
            style={{ width: `${trimInPct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-black/35 pointer-events-none"
            style={{ width: `${100 - trimOutPct}%` }}
          />

          {/* Trim range */}
          <div
            className="absolute inset-y-0 bg-purple-500/20 border-y-2 border-purple-500 cursor-move"
            style={{ left: `${trimInPct}%`, width: `${trimOutPct - trimInPct}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'range')}
          />

          {/* Trim In handle */}
          <div
            className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 group/h"
            style={{ left: `${trimInPct}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'in')}
          >
            <div className="absolute inset-y-0 left-1/2 w-0.5 -ml-px bg-purple-600 group-hover/h:bg-purple-700" />
            <div className="absolute top-0 left-1/2 -ml-1.5 w-3 h-3 bg-purple-600 group-hover/h:bg-purple-700 rounded-t flex items-center justify-center">
              <div className="w-px h-1.5 bg-white mx-px" />
              <div className="w-px h-1.5 bg-white mx-px" />
            </div>
          </div>

          {/* Trim Out handle */}
          <div
            className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 group/h"
            style={{ left: `${trimOutPct}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'out')}
          >
            <div className="absolute inset-y-0 left-1/2 w-0.5 -ml-px bg-purple-600 group-hover/h:bg-purple-700" />
            <div className="absolute top-0 left-1/2 -ml-1.5 w-3 h-3 bg-purple-600 group-hover/h:bg-purple-700 rounded-t flex items-center justify-center">
              <div className="w-px h-1.5 bg-white mx-px" />
              <div className="w-px h-1.5 bg-white mx-px" />
            </div>
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
            style={{ left: `${currentPct}%` }}
          >
            <div className="absolute -top-0.5 left-1/2 -ml-1 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded hover:bg-purple-100 text-purple-600"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded hover:bg-purple-100 text-neutral-400 hover:text-purple-600"
            title="Reset trim"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
        <span className="font-mono text-[10px] text-neutral-500 bg-white px-1.5 py-0.5 rounded">
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] text-green-600 font-medium">
          {formatTime(trimOut - trimIn)}
        </span>
      </div>
    </div>
  )
}
