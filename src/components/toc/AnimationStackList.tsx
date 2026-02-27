import { useState, useCallback } from 'react'
import { GripVertical, ChevronDown, ChevronRight, Trash2, Clock } from 'lucide-react'
import InlineTrimEditor from './InlineTrimEditor'
import type { AnimationItem, NonSelectedStyle } from '../../types'

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

interface AnimationStackListProps {
  items: AnimationItem[]
  availableClips: string[]
  /** map clipName → duration in seconds */
  clipDurations: Record<string, number>
  /** id of the item whose trim editor is currently open */
  expandedItemId: string | null
  /** is a section-level or item-level playback running? */
  isPlayingSection: boolean
  /** id of item currently playing (item-level) */
  playingItemId: string | null
  /** current playhead time for the playing item */
  playheadSec: number
  isItemPlaying: boolean

  onAddItem: (clipName: string) => void
  onRemoveItem: (itemId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onUpdateItem: (itemId: string, patch: Partial<AnimationItem>) => void
  onSetExpanded: (itemId: string | null) => void
  onPlayItem: (itemId: string) => void
  onPauseItem: () => void
  onStopItem: () => void
  onSeekItem: (itemId: string, timeSec: number) => void
  onResetTrim: (itemId: string) => void
  // Camera override callbacks
  onToggleCameraOverride?: (itemId: string, enabled: boolean) => void
  onSetCameraFromView?: (itemId: string) => void
  onPreviewCamera?: (itemId: string) => void
  onClearCamera?: (itemId: string) => void
  // Highlight override callbacks
  availableNodeNames?: string[]
  availableMaterialNames?: string[]
  onToggleHighlight?: (itemId: string, enabled: boolean) => void
  onSetHighlightMode?: (itemId: string, mode: 'node' | 'material' | 'both') => void
  onAddSelectedNodes?: (itemId: string, nodeIds: string[]) => void
  onRemoveSelectedNode?: (itemId: string, nodeId: string) => void
  onAddSelectedMaterials?: (itemId: string, materialIds: string[]) => void
  onRemoveSelectedMaterial?: (itemId: string, materialId: string) => void
  onClearHighlightSelection?: (itemId: string) => void
  onSetNonSelectedStyle?: (itemId: string, patch: Partial<NonSelectedStyle>) => void
}

export default function AnimationStackList({
  items,
  availableClips,
  clipDurations,
  expandedItemId,
  isPlayingSection,
  playingItemId,
  playheadSec,
  isItemPlaying,
  onAddItem,
  onRemoveItem,
  onReorder,
  onUpdateItem,
  onSetExpanded,
  onPlayItem,
  onPauseItem,
  onStopItem,
  onSeekItem,
  onResetTrim,
  onToggleCameraOverride,
  onSetCameraFromView,
  onPreviewCamera,
  onClearCamera,
  availableNodeNames,
  availableMaterialNames,
  onToggleHighlight,
  onSetHighlightMode,
  onAddSelectedNodes,
  onRemoveSelectedNode,
  onAddSelectedMaterials,
  onRemoveSelectedMaterial,
  onClearHighlightSelection,
  onSetNonSelectedStyle,
}: AnimationStackListProps) {
  // drag-reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const handleDragStart = useCallback(
    (idx: number) => {
      if (isPlayingSection) return
      setDragIdx(idx)
    },
    [isPlayingSection],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault()
      setOverIdx(idx)
    },
    [],
  )

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx !== null && dragIdx !== idx) {
        onReorder(dragIdx, idx)
      }
      setDragIdx(null)
      setOverIdx(null)
    },
    [dragIdx, onReorder],
  )

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setOverIdx(null)
  }, [])

  return (
    <div className="space-y-1">
      {items.map((item, idx) => {
        const dur = clipDurations[item.animationClipName] ?? 0
        const resultLen = item.trim.trimOutSec - item.trim.trimInSec
        const isExpanded = expandedItemId === item.id
        const isThisPlaying = playingItemId === item.id
        const isInvalid = dur <= 0

        return (
          <div
            key={item.id}
            className={`rounded border transition-colors ${
              overIdx === idx && dragIdx !== null
                ? 'border-blue-400 bg-blue-50/50'
                : 'border-neutral-200'
            } ${dragIdx === idx ? 'opacity-50' : ''}`}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
          >
            {/* Collapsed row */}
            <div className="flex items-center gap-1 px-2 py-1.5 group">
              {/* Drag handle */}
              <span
                draggable={!isPlayingSection}
                onDragStart={() => handleDragStart(idx)}
                className={`cursor-grab ${isPlayingSection ? 'opacity-30 cursor-not-allowed' : 'text-neutral-400'}`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>

              {/* Clip name */}
              <span className="flex-1 text-xs font-medium text-neutral-700 truncate">
                {item.name || item.animationClipName}
              </span>

              {/* Result duration */}
              {!isInvalid && (
                <span className="flex items-center gap-0.5 text-[10px] text-neutral-500 tabular-nums">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDur(resultLen)}
                </span>
              )}

              {/* Speed badge */}
              <select
                value={item.speed}
                onChange={(e) =>
                  onUpdateItem(item.id, { speed: parseFloat(e.target.value) || 1 })
                }
                disabled={isPlayingSection}
                className="w-14 text-[10px] border border-neutral-200 rounded px-1 py-0.5 bg-white disabled:opacity-40"
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5].map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>

              {/* Expand toggle */}
              <button
                onClick={() => onSetExpanded(isExpanded ? null : item.id)}
                className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400"
                title="Trim"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  if (isThisPlaying) onStopItem()
                  onRemoveItem(item.id)
                }}
                disabled={isPlayingSection}
                className="p-0.5 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Invalid clip warning */}
            {isInvalid && (
              <div className="px-3 pb-2 text-[10px] text-red-500">
                Animation clip not found / invalid duration
              </div>
            )}

            {/* Inline Trim Editor (expanded) */}
            {isExpanded && !isInvalid && (
              <div className="border-t border-neutral-100 px-3 py-2 bg-neutral-50/50">
                <InlineTrimEditor
                  trim={item.trim}
                  clipDuration={dur}
                  playheadSec={isThisPlaying ? playheadSec : item.trim.trimInSec}
                  isPlaying={isThisPlaying && isItemPlaying}
                  readonly={isPlayingSection}
                  onTrimChange={(trimIn, trimOut) =>
                    onUpdateItem(item.id, {
                      trim: { ...item.trim, trimInSec: trimIn, trimOutSec: trimOut },
                    })
                  }
                  onResetTrim={() => onResetTrim(item.id)}
                  onSeek={(t) => onSeekItem(item.id, t)}
                  onPlay={() => onPlayItem(item.id)}
                  onPause={onPauseItem}
                  onStop={onStopItem}
                  cameraOverride={item.cameraOverride}
                  onToggleCameraOverride={onToggleCameraOverride ? (enabled) => onToggleCameraOverride(item.id, enabled) : undefined}
                  onSetCameraFromView={onSetCameraFromView ? () => onSetCameraFromView(item.id) : undefined}
                  onPreviewCamera={onPreviewCamera ? () => onPreviewCamera(item.id) : undefined}
                  onClearCamera={onClearCamera ? () => onClearCamera(item.id) : undefined}
                  highlight={item.highlight}
                  availableNodeNames={availableNodeNames}
                  availableMaterialNames={availableMaterialNames}
                  onToggleHighlight={onToggleHighlight ? (enabled) => onToggleHighlight(item.id, enabled) : undefined}
                  onSetHighlightMode={onSetHighlightMode ? (mode) => onSetHighlightMode(item.id, mode) : undefined}
                  onAddSelectedNodes={onAddSelectedNodes ? (ids) => onAddSelectedNodes(item.id, ids) : undefined}
                  onRemoveSelectedNode={onRemoveSelectedNode ? (id) => onRemoveSelectedNode(item.id, id) : undefined}
                  onAddSelectedMaterials={onAddSelectedMaterials ? (ids) => onAddSelectedMaterials(item.id, ids) : undefined}
                  onRemoveSelectedMaterial={onRemoveSelectedMaterial ? (id) => onRemoveSelectedMaterial(item.id, id) : undefined}
                  onClearHighlightSelection={onClearHighlightSelection ? () => onClearHighlightSelection(item.id) : undefined}
                  onSetNonSelectedStyle={onSetNonSelectedStyle ? (patch) => onSetNonSelectedStyle(item.id, patch) : undefined}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add animation dropdown */}
      {availableClips.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAddItem(e.target.value)
          }}
          disabled={isPlayingSection}
          className="w-full mt-1 px-2 py-1.5 text-xs border border-dashed border-neutral-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
        >
          <option value="">+ Add Animation…</option>
          {availableClips.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
