import { useState, useRef, useCallback, useEffect } from 'react'
import type { AnimationItem, CameraState, HighlightOverride, TocSection } from '../types'

export type PlaybackMode = 'idle' | 'section' | 'item'

export interface SectionPlaybackState {
  mode: PlaybackMode
  sectionId: string | null
  itemId: string | null
  /** is currently playing (not paused) */
  playing: boolean
  /** playhead in seconds for the active item */
  playheadSec: number
}

interface UseSectionPlaybackOpts {
  sections: TocSection[]
  clipDurations?: Record<string, number>
  /** imperatively play a clip with trim on the 3D model */
  playClip: (clipName: string, trimIn: number, trimOut: number, speed: number) => void
  seekClip: (clipName: string, timeSec: number) => void
  pauseClip: () => void
  stopClip: () => void
  /** get current time of the running action (seconds) */
  getClipTime: () => number
  /** called before playing an item that has cameraOverride enabled */
  applyCameraOverride?: (camera: CameraState) => void
  /** called before playing an item to set/clear highlight override */
  applyHighlightOverride?: (highlight: HighlightOverride | null) => void
}

export function useSectionPlayback({
  sections,
  playClip,
  seekClip,
  pauseClip,
  stopClip,
  getClipTime,
  applyCameraOverride,
  applyHighlightOverride,
}: UseSectionPlaybackOpts) {
  const [state, setState] = useState<SectionPlaybackState>({
    mode: 'idle',
    sectionId: null,
    itemId: null,
    playing: false,
    playheadSec: 0,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const rafRef = useRef<number | null>(null)
  const sectionQueueRef = useRef<AnimationItem[]>([])
  const sectionQueueIndexRef = useRef(0)

  // --- helpers ---
  const maybeCameraOverride = useCallback(
    (item: AnimationItem) => {
      if (item.cameraOverride?.enabled && applyCameraOverride) {
        applyCameraOverride(item.cameraOverride.camera)
      }
    },
    [applyCameraOverride],
  )

  const maybeHighlightOverride = useCallback(
    (item: AnimationItem) => {
      if (applyHighlightOverride) {
        // If item has an enabled highlight with selection, apply it; otherwise clear
        const hl = item.highlight
        if (hl?.enabled && (hl.selectedNodeIds.length > 0 || hl.selectedMaterialIds.length > 0)) {
          applyHighlightOverride(hl)
        } else {
          applyHighlightOverride(null)
        }
      }
    },
    [applyHighlightOverride],
  )

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    stopClip()
    sectionQueueRef.current = []
    sectionQueueIndexRef.current = 0
    // Clear highlight overlay on stop
    if (applyHighlightOverride) applyHighlightOverride(null)
    setState({ mode: 'idle', sectionId: null, itemId: null, playing: false, playheadSec: 0 })
  }, [stopClip, applyHighlightOverride])

  // tick loop: updates playhead + handles section-sequential advance
  const tick = useCallback(() => {
    const s = stateRef.current
    if (!s.playing) return

    const time = getClipTime()
    setState((prev) => ({ ...prev, playheadSec: time }))

    if (s.mode === 'section') {
      const queue = sectionQueueRef.current
      const idx = sectionQueueIndexRef.current
      const item = queue[idx]
      if (item) {
        const trimOut = item.trim.trimOutSec
        if (time >= trimOut - 0.02) {
          // advance to next item in queue
          const nextIdx = idx + 1
          if (nextIdx < queue.length) {
            sectionQueueIndexRef.current = nextIdx
            const next = queue[nextIdx]
            setState((prev) => ({ ...prev, itemId: next.id, playheadSec: next.trim.trimInSec }))
            maybeCameraOverride(next)
            maybeHighlightOverride(next)
            playClip(next.animationClipName, next.trim.trimInSec, next.trim.trimOutSec, next.speed)
          } else {
            // section finished
            stopAll()
            return
          }
        }
      }
    } else if (s.mode === 'item') {
      const sec = sections.find((sec) => sec.id === s.sectionId)
      const item = sec?.animations?.find((a: AnimationItem) => a.id === s.itemId)
      if (item && time >= item.trim.trimOutSec - 0.02) {
        stopAll()
        return
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [getClipTime, playClip, stopAll, sections, maybeCameraOverride, maybeHighlightOverride])

  const startTickLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  // --- public actions ---

  const playSection = useCallback(
    (sectionId: string) => {
      stopAll()
      const sec = sections.find((s) => s.id === sectionId)
      const anims = sec?.animations ?? []
      if (anims.length === 0) return
      sectionQueueRef.current = anims
      sectionQueueIndexRef.current = 0
      const first = anims[0]
      setState({
        mode: 'section',
        sectionId,
        itemId: first.id,
        playing: true,
        playheadSec: first.trim.trimInSec,
      })
      maybeCameraOverride(first)
      maybeHighlightOverride(first)
      playClip(first.animationClipName, first.trim.trimInSec, first.trim.trimOutSec, first.speed)
      startTickLoop()
    },
    [sections, playClip, stopAll, startTickLoop, maybeCameraOverride, maybeHighlightOverride],
  )

  const playItem = useCallback(
    (sectionId: string, itemId: string) => {
      stopAll()
      const sec = sections.find((s) => s.id === sectionId)
      const item = sec?.animations?.find((a: AnimationItem) => a.id === itemId)
      if (!item) return
      const startAt =
        stateRef.current.itemId === itemId && stateRef.current.playheadSec >= item.trim.trimInSec && stateRef.current.playheadSec < item.trim.trimOutSec
          ? stateRef.current.playheadSec
          : item.trim.trimInSec
      setState({
        mode: 'item',
        sectionId,
        itemId,
        playing: true,
        playheadSec: startAt,
      })
      maybeCameraOverride(item)
      maybeHighlightOverride(item)
      playClip(item.animationClipName, startAt, item.trim.trimOutSec, item.speed)
      startTickLoop()
    },
    [sections, playClip, stopAll, startTickLoop, maybeCameraOverride, maybeHighlightOverride],
  )

  const pauseActive = useCallback(() => {
    pauseClip()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setState((prev) => ({ ...prev, playing: false }))
  }, [pauseClip])

  const stopActive = useCallback(() => {
    stopAll()
  }, [stopAll])

  const seekItem = useCallback(
    (sectionId: string, itemId: string, timeSec: number) => {
      const sec = sections.find((s) => s.id === sectionId)
      const item = sec?.animations?.find((a: AnimationItem) => a.id === itemId)
      if (!item) return
      seekClip(item.animationClipName, timeSec)
      setState((prev) => ({ ...prev, sectionId, itemId, playheadSec: timeSec }))
    },
    [sections, seekClip],
  )

  // cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    state,
    playSection,
    playItem,
    pauseActive,
    stopActive,
    seekItem,
    stopAll,
  }
}
