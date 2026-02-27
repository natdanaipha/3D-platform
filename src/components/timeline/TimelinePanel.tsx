import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Pause,
  Square,
  Plus,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Trash2,
  Film,
} from 'lucide-react'
import { Button } from '../ui/button'
import type { Shot, Sequence, ShotTransition, TransitionEasing } from './types'
import type { TocSection } from '../../types'
import { getTotalDuration, getShotStartTime } from './hooks/usePlaybackEngine'

/* ─── Constants ─── */
const PX_PER_SEC = 120 // pixels per second on the timeline
const MIN_DURATION = 0.25 // minimum shot duration in seconds
const SNAP_GRID = 0.25 // snap to 0.25s

function snap(val: number): number {
  return Math.round(val / SNAP_GRID) * SNAP_GRID
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

/* ─── Color palette for shot blocks ─── */
const COLORS = [
  'bg-blue-500/80',
  'bg-emerald-500/80',
  'bg-violet-500/80',
  'bg-amber-500/80',
  'bg-rose-500/80',
  'bg-cyan-500/80',
  'bg-pink-500/80',
  'bg-teal-500/80',
]

/* ─── Transition edit popup (auto-positioned around badge, clamped to viewport) ─── */

import React from 'react'

const POPUP_GAP = 6 // gap between badge and popup
const VIEWPORT_MARGIN = 8 // minimum margin from viewport edges

const TransitionPopup = React.forwardRef<
  HTMLDivElement,
  {
    shot: Shot
    badgeRect: { x: number; y: number; w: number; h: number }
    onUpdate: (patch: Partial<ShotTransition>) => void
  }
>(function TransitionPopup({ shot, badgeRect, onUpdate }, ref) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Merge forwarded ref with inner ref
  React.useImperativeHandle(ref, () => innerRef.current!)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const popupW = el.offsetWidth
    const popupH = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight

    const badgeCenterX = badgeRect.x + badgeRect.w / 2

    // Horizontal: center on badge, clamp to viewport
    let left = badgeCenterX - popupW / 2
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - popupW - VIEWPORT_MARGIN))

    // Vertical: prefer above badge; if not enough space, go below
    let top: number
    const spaceAbove = badgeRect.y - POPUP_GAP
    const spaceBelow = vh - (badgeRect.y + badgeRect.h + POPUP_GAP)

    if (spaceAbove >= popupH) {
      top = badgeRect.y - popupH - POPUP_GAP
    } else if (spaceBelow >= popupH) {
      top = badgeRect.y + badgeRect.h + POPUP_GAP
    } else {
      // Not enough space above or below — clamp to viewport
      top = Math.max(VIEWPORT_MARGIN, Math.min(badgeRect.y - popupH - POPUP_GAP, vh - popupH - VIEWPORT_MARGIN))
    }

    setPos({ left, top })
  }, [badgeRect, shot.transition.type])

  return (
    <div
      ref={innerRef}
      className="fixed bg-white border border-neutral-200 rounded-lg shadow-2xl p-2.5 space-y-1.5"
      style={{
        zIndex: 91,
        width: 190,
        // render off-screen first for measurement, then move
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="text-[10px] text-neutral-500 font-medium">Transition</label>
      <select
        value={shot.transition.type}
        onChange={(e) => onUpdate({ type: e.target.value as 'cut' | 'crossfade' })}
        className="w-full text-xs border rounded px-1.5 py-0.5"
      >
        <option value="cut">Cut</option>
        <option value="crossfade">Crossfade</option>
      </select>
      {shot.transition.type !== 'cut' && (
        <>
          <label className="text-[10px] text-neutral-500 font-medium">Duration (s)</label>
          <input
            type="number"
            min={0.1}
            max={shot.duration}
            step={0.1}
            value={shot.transition.duration}
            onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) || 0.5 })}
            className="w-full text-xs border rounded px-1.5 py-0.5"
          />
          <label className="text-[10px] text-neutral-500 font-medium">Easing</label>
          <select
            value={shot.transition.easing}
            onChange={(e) => onUpdate({ easing: e.target.value as TransitionEasing })}
            className="w-full text-xs border rounded px-1.5 py-0.5"
          >
            <option value="linear">Linear</option>
            <option value="easeInOut">Ease In Out</option>
            <option value="easeIn">Ease In</option>
            <option value="easeOut">Ease Out</option>
          </select>
        </>
      )}
    </div>
  )
})

/* ─── Props ─── */

interface TimelinePanelProps {
  sequence: Sequence
  sections: TocSection[]
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onSetPlaybackRate: (rate: number) => void
  onUpdateShots: (shots: Shot[]) => void
  onAddShot: (sectionId: string) => void
  onRemoveShot: (shotId: string) => void
  onCreateFromToc: () => void
  defaultDuration: number
  onSetDefaultDuration: (d: number) => void
  activeShotIndex: number
}

export default function TimelinePanel({
  sequence,
  sections,
  currentTime,
  isPlaying,
  playbackRate,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSetPlaybackRate,
  onUpdateShots,
  onAddShot: _onAddShot,
  onRemoveShot,
  onCreateFromToc,
  defaultDuration,
  onSetDefaultDuration,
  activeShotIndex,
}: TimelinePanelProps) {
  const { shots } = sequence
  const totalDuration = getTotalDuration(shots)
  const trackRef = useRef<HTMLDivElement>(null)

  const [collapsed, setCollapsed] = useState(false)
  const [resizing, setResizing] = useState<{
    shotIndex: number
    edge: 'left' | 'right'
    startX: number
    startDuration: number
  } | null>(null)
  const [dragging, setDragging] = useState<{
    shotIndex: number
    startX: number
    originalOrder: Shot[]
  } | null>(null)
  const [editingTransition, setEditingTransition] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  /* ─── Scrub (click on track ruler) ─── */
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + trackRef.current.scrollLeft
    const time = Math.max(0, Math.min(x / PX_PER_SEC, totalDuration))
    onSeek(snap(time))
  }

  /* ─── Resize shot duration ─── */
  const handleResizeStart = (
    e: React.MouseEvent,
    shotIndex: number,
    edge: 'left' | 'right',
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setResizing({
      shotIndex,
      edge,
      startX: e.clientX,
      startDuration: shots[shotIndex].duration,
    })
  }

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX
      const deltaSec = dx / PX_PER_SEC
      let newDur: number
      if (resizing.edge === 'right') {
        newDur = snap(Math.max(MIN_DURATION, resizing.startDuration + deltaSec))
      } else {
        newDur = snap(Math.max(MIN_DURATION, resizing.startDuration - deltaSec))
      }
      const updated = shots.map((s, i) =>
        i === resizing.shotIndex ? { ...s, duration: newDur } : s,
      )
      onUpdateShots(updated)
    }
    const onUp = () => setResizing(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, shots, onUpdateShots])

  /* ─── Drag reorder ─── */
  const handleDragStart = (e: React.MouseEvent, shotIndex: number) => {
    e.preventDefault()
    setDragging({ shotIndex, startX: e.clientX, originalOrder: [...shots] })
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragging.startX
      const slotShift = Math.round(dx / (PX_PER_SEC * (shots[dragging.shotIndex]?.duration ?? 1)))
      if (slotShift === 0) return
      const newOrder = [...dragging.originalOrder]
      const [moved] = newOrder.splice(dragging.shotIndex, 1)
      const newIndex = Math.max(0, Math.min(newOrder.length, dragging.shotIndex + slotShift))
      newOrder.splice(newIndex, 0, moved)
      onUpdateShots(newOrder)
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, shots, onUpdateShots])

  /* ─── Update a single shot's transition ─── */
  const updateShotTransition = (shotId: string, patch: Partial<ShotTransition>) => {
    onUpdateShots(
      shots.map((s) =>
        s.shotId === shotId ? { ...s, transition: { ...s.transition, ...patch } } : s,
      ),
    )
  }

  /* ─── Playhead position ─── */
  const playheadLeft = currentTime * PX_PER_SEC

  /* ─── Section lookup helper ─── */
  const sectionMap = new Map(sections.map((s) => [s.id, s]))

  const DRAWER_HEIGHT = 200 // px - height of the track area + toolbar

  return (
    <>
      {/* ─── Toggle Tab (always visible at bottom) ─── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-1.5 px-4 py-1 rounded-t-lg bg-neutral-800 text-white text-xs font-medium shadow-lg hover:bg-neutral-700 transition-all"
        style={{ bottom: collapsed ? 0 : DRAWER_HEIGHT }}
      >
        {collapsed ? (
          <>
            <Film className="h-3 w-3" />
            <span>Timeline</span>
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Hide Timeline</span>
          </>
        )}
      </button>

      {/* ─── Drawer ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] select-none transition-transform duration-300 ease-in-out"
        style={{
          zIndex: 70,
          height: DRAWER_HEIGHT,
          transform: collapsed ? 'translateY(100%)' : 'translateY(0)',
        }}
      >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-100 bg-neutral-50/50">
        <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
          Timeline
        </span>
        <span className="text-xs text-neutral-400 ml-1">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        <div className="flex items-center gap-1 ml-3">
          {isPlaying ? (
            <Button size="icon" variant="ghost" onClick={onPause} className="h-7 w-7" title="Pause">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={onPlay} className="h-7 w-7" title="Play">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onStop} className="h-7 w-7" title="Stop">
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Playback rate */}
        <select
          value={playbackRate}
          onChange={(e) => onSetPlaybackRate(parseFloat(e.target.value))}
          className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 bg-white"
        >
          {[0.25, 0.5, 1, 1.5, 2, 3].map((r) => (
            <option key={r} value={r}>
              {r}x
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Default duration control */}
        <label className="text-xs text-neutral-500">Default dur:</label>
        <input
          type="number"
          min={0.5}
          max={30}
          step={0.5}
          value={defaultDuration}
          onChange={(e) => onSetDefaultDuration(parseFloat(e.target.value) || 3)}
          className="w-14 text-xs border border-neutral-200 rounded px-1.5 py-0.5 bg-white text-center"
        />
        <span className="text-xs text-neutral-400">s</span>

        {/* Quick actions */}
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={onCreateFromToc}>
          <Plus className="h-3 w-3" />
          From TOC
        </Button>
      </div>

      {/* ─── Track Area ─── */}
        <div className="relative" style={{ height: 'calc(100% - 38px)' }}>
          <div
            ref={trackRef}
            className="absolute inset-0 overflow-x-auto overflow-y-hidden"
          >
            {/* Ruler */}
            <div
              className="relative h-5 bg-neutral-100 border-b border-neutral-200 cursor-pointer"
              style={{ width: Math.max(totalDuration * PX_PER_SEC + 120, 600) }}
              onClick={handleRulerClick}
            >
              {Array.from({ length: Math.ceil(totalDuration) + 2 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-neutral-300"
                  style={{ left: i * PX_PER_SEC }}
                >
                  <span className="text-[9px] text-neutral-400 ml-1 select-none">
                    {i}s
                  </span>
                </div>
              ))}
            </div>

            {/* Shot blocks */}
            <div
              className="relative"
              style={{
                width: Math.max(totalDuration * PX_PER_SEC + 120, 600),
                height: '90px',
              }}
            >
              {shots.map((shot, i) => {
                const left = getShotStartTime(shots, i) * PX_PER_SEC
                const width = shot.duration * PX_PER_SEC
                const section = sectionMap.get(shot.sectionId)
                const color = COLORS[i % COLORS.length]
                const isActive = i === activeShotIndex

                return (
                  <div
                    key={shot.shotId}
                    className={`absolute top-2 rounded-md border-2 transition-shadow ${color} ${
                      isActive
                        ? 'border-white ring-2 ring-blue-400 shadow-lg'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    style={{ left, width, height: '76px', minWidth: 24 }}
                    onClick={() => onSeek(getShotStartTime(shots, i))}
                  >
                    {/* Resize handle left */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, i, 'left')}
                    />

                    {/* Drag handle */}
                    <div
                      className="absolute top-0 left-2 right-2 h-5 cursor-grab active:cursor-grabbing flex items-center gap-1 px-1"
                      onMouseDown={(e) => handleDragStart(e, i)}
                    >
                      <GripVertical className="h-3 w-3 text-white/60 rotate-90" />
                      <span className="text-[10px] text-white font-medium truncate">
                        {section?.title ?? 'Unknown'}
                      </span>
                    </div>

                    {/* Shot info */}
                    <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
                      <span className="text-[9px] text-white/70">
                        {shot.duration.toFixed(1)}s
                      </span>
                      <div className="flex items-center gap-0.5">
                        {/* Transition badge */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (editingTransition === shot.shotId) {
                              setEditingTransition(null)
                              setPopupPos(null)
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setPopupPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height })
                              setEditingTransition(shot.shotId)
                            }
                          }}
                          className="text-[8px] bg-black/20 text-white/80 px-1 rounded hover:bg-black/40"
                          title="Edit transition"
                        >
                          {shot.transition.type === 'cut' ? 'CUT' : `${shot.transition.duration.toFixed(1)}s`}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveShot(shot.shotId)
                          }}
                          className="p-0.5 text-white/50 hover:text-red-300"
                          title="Remove shot"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>



                    {/* Resize handle right */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, i, 'right')}
                    />
                  </div>
                )
              })}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadLeft }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-red-500" />
              </div>
            </div>

            {/* Empty state */}
            {shots.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm pointer-events-none">
                No shots — add sections to timeline or click "From TOC"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Transition edit popup (portal, never clipped) ─── */}
      {editingTransition && popupPos && (() => {
        const shot = shots.find((s) => s.shotId === editingTransition)
        if (!shot) return null
        return createPortal(
          <>
            {/* Backdrop to close */}
            <div className="fixed inset-0" style={{ zIndex: 90 }} onClick={() => { setEditingTransition(null); setPopupPos(null) }} />
            <TransitionPopup
              ref={popupRef}
              shot={shot}
              badgeRect={popupPos}
              onUpdate={(patch) => updateShotTransition(shot.shotId, patch)}
            />
          </>,
          document.body,
        )
      })()}
    </>
  )
}
