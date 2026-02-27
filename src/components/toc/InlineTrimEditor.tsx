import { useRef, useState, useCallback } from 'react'
import { Play, Pause, Square, RotateCcw, Camera, Eye, X, Highlighter, Search, Eraser } from 'lucide-react'
import type { TrimRange, CameraOverride, HighlightOverride, NonSelectedStyle } from '../../types'

const MIN_TRIM_LEN = 0.1

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const fixed = s.toFixed(1)
  return `${String(m).padStart(2, '0')}:${fixed.padStart(4, '0')}`
}

interface InlineTrimEditorProps {
  trim: TrimRange
  clipDuration: number
  /** current playhead position (seconds) – driven from parent */
  playheadSec: number
  isPlaying: boolean
  readonly?: boolean
  onTrimChange: (trimIn: number, trimOut: number) => void
  onResetTrim: () => void
  onSeek: (timeSec: number) => void
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  // Camera override
  cameraOverride?: CameraOverride
  onToggleCameraOverride?: (enabled: boolean) => void
  onSetCameraFromView?: () => void
  onPreviewCamera?: () => void
  onClearCamera?: () => void
  // Highlight override
  highlight?: HighlightOverride
  availableNodeNames?: string[]
  availableMaterialNames?: string[]
  onToggleHighlight?: (enabled: boolean) => void
  onSetHighlightMode?: (mode: 'node' | 'material' | 'both') => void
  onAddSelectedNodes?: (nodeIds: string[]) => void
  onRemoveSelectedNode?: (nodeId: string) => void
  onAddSelectedMaterials?: (materialIds: string[]) => void
  onRemoveSelectedMaterial?: (materialId: string) => void
  onClearHighlightSelection?: () => void
  onSetNonSelectedStyle?: (patch: Partial<NonSelectedStyle>) => void
}

export default function InlineTrimEditor({
  trim,
  clipDuration,
  playheadSec,
  isPlaying,
  readonly = false,
  onTrimChange,
  onResetTrim,
  onSeek,
  onPlay,
  onPause,
  onStop,
  cameraOverride,
  onToggleCameraOverride,
  onSetCameraFromView,
  onPreviewCamera,
  onClearCamera,
  highlight,
  availableNodeNames = [],
  availableMaterialNames = [],
  onToggleHighlight,
  onSetHighlightMode,
  onAddSelectedNodes,
  onRemoveSelectedNode,
  onAddSelectedMaterials,
  onRemoveSelectedMaterial,
  onClearHighlightSelection,
  onSetNonSelectedStyle,
}: InlineTrimEditorProps) {
  const [nodeSearch, setNodeSearch] = useState('')
  const [matSearch, setMatSearch] = useState('')
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'in' | 'out' | 'playhead' | null>(null)

  const dur = clipDuration || 1

  // fraction helpers
  const toFrac = (sec: number) => Math.max(0, Math.min(1, sec / dur))
  const toSec = (frac: number) => Math.max(0, Math.min(dur, frac * dur))

  const fracIn = toFrac(trim.trimInSec)
  const fracOut = toFrac(trim.trimOutSec)
  const fracPlayhead = toFrac(playheadSec)

  const getPointerFrac = (clientX: number) => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  // --- drag handlers (pointer capture) ---
  const handlePointerDown = useCallback(
    (kind: 'in' | 'out' | 'playhead', e: React.PointerEvent) => {
      if (readonly) return
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setDragging(kind)
    },
    [readonly],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || readonly) return
      const frac = getPointerFrac(e.clientX)
      const sec = toSec(frac)
      if (dragging === 'in') {
        const clamped = Math.min(sec, trim.trimOutSec - MIN_TRIM_LEN)
        onTrimChange(Math.max(0, clamped), trim.trimOutSec)
      } else if (dragging === 'out') {
        const clamped = Math.max(sec, trim.trimInSec + MIN_TRIM_LEN)
        onTrimChange(trim.trimInSec, Math.min(dur, clamped))
      } else if (dragging === 'playhead') {
        const clamped = Math.max(trim.trimInSec, Math.min(trim.trimOutSec, sec))
        onSeek(clamped)
      }
    },
    [dragging, readonly, trim, dur, onTrimChange, onSeek],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  // click on track → move playhead
  const handleTrackClick = (e: React.MouseEvent) => {
    if (readonly) return
    const frac = getPointerFrac(e.clientX)
    const sec = toSec(frac)
    const clamped = Math.max(trim.trimInSec, Math.min(trim.trimOutSec, sec))
    onSeek(clamped)
  }

  // tick marks
  const ticks: { frac: number; major: boolean; label: string }[] = []
  const step = dur <= 5 ? 0.5 : dur <= 30 ? 1 : dur <= 120 ? 5 : 10
  for (let t = 0; t <= dur; t += step) {
    const isMajor = dur <= 5 ? t % 1 === 0 : t % (step * 2 === 0 ? step * 2 : step) === 0
    ticks.push({ frac: toFrac(t), major: isMajor, label: formatTime(t) })
  }

  const resultLen = trim.trimOutSec - trim.trimInSec

  return (
    <div className="space-y-2 select-none">
      {/* Controls bar */}
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button
            onClick={onPause}
            disabled={readonly}
            className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
            title="Pause"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={readonly}
            className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
            title="Play trimmed range"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onStop}
          disabled={readonly}
          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
          title="Stop"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onResetTrim}
          disabled={readonly}
          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40"
          title="Reset trim"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto text-[10px] text-neutral-500 tabular-nums">
          {formatTime(playheadSec)}
        </span>
      </div>

      {/* Timeline strip */}
      <div
        ref={trackRef}
        className="relative h-8 bg-neutral-100 rounded cursor-pointer"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{ left: `${t.frac * 100}%` }}
          >
            <div
              className={`w-px ${t.major ? 'h-3 bg-neutral-400' : 'h-2 bg-neutral-300'}`}
            />
            {t.major && (
              <span className="absolute top-3 -translate-x-1/2 text-[8px] text-neutral-400 whitespace-nowrap pointer-events-none">
                {t.label}
              </span>
            )}
          </div>
        ))}

        {/* Trim highlight */}
        <div
          className="absolute top-0 h-full bg-blue-200/50 pointer-events-none"
          style={{ left: `${fracIn * 100}%`, width: `${(fracOut - fracIn) * 100}%` }}
        />

        {/* Trim-In handle */}
        <div
          className={`absolute top-0 h-full w-2 -translate-x-1/2 cursor-ew-resize z-10 ${
            readonly ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          style={{ left: `${fracIn * 100}%` }}
          onPointerDown={(e) => handlePointerDown('in', e)}
        />

        {/* Trim-Out handle */}
        <div
          className={`absolute top-0 h-full w-2 -translate-x-1/2 cursor-ew-resize z-10 ${
            readonly ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          style={{ left: `${fracOut * 100}%` }}
          onPointerDown={(e) => handlePointerDown('out', e)}
        />

        {/* Playhead */}
        <div
          className={`absolute top-0 h-full w-1 -translate-x-1/2 z-20 ${
            readonly ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600 cursor-ew-resize'
          }`}
          style={{ left: `${fracPlayhead * 100}%` }}
          onPointerDown={(e) => handlePointerDown('playhead', e)}
        />
      </div>

      {/* Time labels */}
      <div className="grid grid-cols-2 gap-x-4 text-[10px] text-neutral-500 tabular-nums">
        <div>Source: {formatTime(trim.sourceStartSec)} → {formatTime(trim.sourceEndSec)}</div>
        <div>Trim: {formatTime(trim.trimInSec)} → {formatTime(trim.trimOutSec)}</div>
        <div>Result: {formatTime(resultLen)}</div>
        <div>Playhead: {formatTime(playheadSec)}</div>
      </div>

      {/* Camera Override Panel */}
      {onToggleCameraOverride && (
        <div className="border-t border-neutral-200 pt-2 mt-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cameraOverride?.enabled ?? false}
                onChange={(e) => onToggleCameraOverride(e.target.checked)}
                disabled={readonly}
                className="rounded border-neutral-300"
              />
              <Camera className="h-3 w-3" />
              Camera Override
            </label>
          </div>

          {cameraOverride?.enabled && (
            <div className="space-y-1.5 pl-5">
              {/* Display current camera values */}
              <div className="grid grid-cols-4 gap-1 text-[10px] text-neutral-500 tabular-nums">
                <div>X: {cameraOverride.camera.x.toFixed(1)}</div>
                <div>Y: {cameraOverride.camera.y.toFixed(1)}</div>
                <div>Z: {cameraOverride.camera.z.toFixed(1)}</div>
                <div>FOV: {cameraOverride.camera.fov}</div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {onSetCameraFromView && (
                  <button
                    onClick={onSetCameraFromView}
                    disabled={readonly}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                    title="Set camera from current 3D view"
                  >
                    <Camera className="h-2.5 w-2.5" />
                    Set From View
                  </button>
                )}
                {onPreviewCamera && (
                  <button
                    onClick={onPreviewCamera}
                    disabled={readonly}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40"
                    title="Preview this camera position"
                  >
                    <Eye className="h-2.5 w-2.5" />
                    Preview
                  </button>
                )}
                {onClearCamera && (
                  <button
                    onClick={onClearCamera}
                    disabled={readonly}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                    title="Clear camera override"
                  >
                    <X className="h-2.5 w-2.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Highlight Override Panel */}
      {onToggleHighlight && (
        <div className="border-t border-neutral-200 pt-2 mt-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highlight?.enabled ?? false}
                onChange={(e) => onToggleHighlight(e.target.checked)}
                disabled={readonly}
                className="rounded border-neutral-300"
              />
              <Highlighter className="h-3 w-3" />
              Emphasize Selected Parts
            </label>
          </div>

          {highlight?.enabled && (
            <div className="space-y-2 pl-5">
              {/* Mode selector */}
              {onSetHighlightMode && (
                <div className="flex items-center gap-1">
                  {(['node', 'material', 'both'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetHighlightMode(m)}
                      disabled={readonly}
                      className={`px-2 py-0.5 text-[10px] rounded border capitalize ${
                        highlight.mode === m
                          ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'
                      } disabled:opacity-40`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {/* Node selection */}
              {(highlight.mode === 'node' || highlight.mode === 'both') && onAddSelectedNodes && onRemoveSelectedNode && (
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Nodes</label>
                  {/* Search + select */}
                  <div className="relative">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search nodes…"
                      value={nodeSearch}
                      onChange={(e) => setNodeSearch(e.target.value)}
                      disabled={readonly}
                      className="w-full pl-5 pr-2 py-1 text-[10px] border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-40"
                    />
                  </div>
                  {/* Filtered list */}
                  <div className="max-h-24 overflow-y-auto border border-neutral-200 rounded bg-white">
                    {availableNodeNames
                      .filter((n) => !highlight.selectedNodeIds.includes(n))
                      .filter((n) => !nodeSearch || n.toLowerCase().includes(nodeSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((name) => (
                        <button
                          key={name}
                          onClick={() => { onAddSelectedNodes([name]); setNodeSearch('') }}
                          disabled={readonly}
                          className="block w-full text-left px-2 py-0.5 text-[10px] hover:bg-amber-50 truncate disabled:opacity-40"
                        >
                          {name}
                        </button>
                      ))}
                    {availableNodeNames.filter((n) => !highlight.selectedNodeIds.includes(n)).length === 0 && (
                      <div className="px-2 py-1 text-[10px] text-neutral-400">No more nodes</div>
                    )}
                  </div>
                  {/* Selected chips */}
                  {highlight.selectedNodeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {highlight.selectedNodeIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          {id}
                          <button onClick={() => onRemoveSelectedNode(id)} disabled={readonly} className="hover:text-red-600 disabled:opacity-40">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Material selection */}
              {(highlight.mode === 'material' || highlight.mode === 'both') && onAddSelectedMaterials && onRemoveSelectedMaterial && (
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Materials</label>
                  <div className="relative">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search materials…"
                      value={matSearch}
                      onChange={(e) => setMatSearch(e.target.value)}
                      disabled={readonly}
                      className="w-full pl-5 pr-2 py-1 text-[10px] border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-40"
                    />
                  </div>
                  <div className="max-h-24 overflow-y-auto border border-neutral-200 rounded bg-white">
                    {availableMaterialNames
                      .filter((n) => !highlight.selectedMaterialIds.includes(n))
                      .filter((n) => !matSearch || n.toLowerCase().includes(matSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((name) => (
                        <button
                          key={name}
                          onClick={() => { onAddSelectedMaterials([name]); setMatSearch('') }}
                          disabled={readonly}
                          className="block w-full text-left px-2 py-0.5 text-[10px] hover:bg-amber-50 truncate disabled:opacity-40"
                        >
                          {name}
                        </button>
                      ))}
                    {availableMaterialNames.filter((n) => !highlight.selectedMaterialIds.includes(n)).length === 0 && (
                      <div className="px-2 py-1 text-[10px] text-neutral-400">No more materials</div>
                    )}
                  </div>
                  {highlight.selectedMaterialIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {highlight.selectedMaterialIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                          {id}
                          <button onClick={() => onRemoveSelectedMaterial(id)} disabled={readonly} className="hover:text-red-600 disabled:opacity-40">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hint when no selection */}
              {highlight.selectedNodeIds.length === 0 && highlight.selectedMaterialIds.length === 0 && (
                <p className="text-[10px] text-amber-600 italic">Select at least 1 node or material to apply emphasis</p>
              )}

              {/* Non-selected style */}
              {(highlight.selectedNodeIds.length > 0 || highlight.selectedMaterialIds.length > 0) && onSetNonSelectedStyle && (
                <div className="space-y-1 border-t border-neutral-100 pt-1.5">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Non-Selected Style</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={highlight.nonSelectedStyle.type}
                      onChange={(e) => onSetNonSelectedStyle({ type: e.target.value as NonSelectedStyle['type'] })}
                      disabled={readonly}
                      className="w-full text-[10px] border border-neutral-200 rounded px-1.5 py-0.5 bg-white disabled:opacity-40"
                    >
                      <option value="overrideColor">Override Color</option>
                      <option value="desaturate">Desaturate</option>
                      <option value="tint">Tint</option>
                    </select>
                    <input
                      type="color"
                      value={highlight.nonSelectedStyle.color}
                      onChange={(e) => onSetNonSelectedStyle({ color: e.target.value })}
                      disabled={readonly}
                      className="w-6 h-5 basic-6 border border-neutral-200 rounded cursor-pointer disabled:opacity-40"
                      title="Non-selected color"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={highlight.nonSelectedStyle.intensity}
                      onChange={(e) => onSetNonSelectedStyle({ intensity: parseFloat(e.target.value) })}
                      disabled={readonly}
                      className="flex-auto h-1 disabled:opacity-40"
                      title="Intensity"
                    />
                    <span className="flex-none text-[10px] text-neutral-400 w-7 text-right tabular-nums">
                      {(highlight.nonSelectedStyle.intensity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Clear Selection button */}
              {onClearHighlightSelection && (highlight.selectedNodeIds.length > 0 || highlight.selectedMaterialIds.length > 0) && (
                <button
                  onClick={onClearHighlightSelection}
                  disabled={readonly}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                >
                  <Eraser className="h-2.5 w-2.5" />
                  Clear Selection
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
