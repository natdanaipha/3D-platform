import { useState, useRef, useCallback, useEffect } from 'react'
import type { Shot, TocSection, TransitionEasing } from '../types'

/* ─── Easing helpers ─── */

function applyEasing(t: number, easing: TransitionEasing): number {
  switch (easing) {
    case 'linear':
      return t
    case 'easeIn':
      return t * t
    case 'easeOut':
      return t * (2 - t)
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    default:
      return t
  }
}

/* ─── Public helpers ─── */

/** Total duration of all shots (no overlap, single track) */
export function getTotalDuration(shots: Shot[]): number {
  return shots.reduce((sum, s) => sum + s.duration, 0)
}

/** Find the shot index active at a given time. Returns -1 if out of range. */
export function getActiveShotIndex(shots: Shot[], time: number): number {
  let acc = 0
  for (let i = 0; i < shots.length; i++) {
    if (time >= acc && time < acc + shots[i].duration) return i
    acc += shots[i].duration
  }
  // clamp to last shot if exactly at totalDuration
  if (shots.length > 0 && time >= acc) return shots.length - 1
  return -1
}

/** Normalised progress (0..1) within the currently-active shot */
export function getShotLocalT(shots: Shot[], time: number): number {
  let acc = 0
  for (const shot of shots) {
    if (time >= acc && time < acc + shot.duration) {
      return (time - acc) / shot.duration
    }
    acc += shot.duration
  }
  return 1 // at end
}

/** Start time (seconds) of a specific shot index */
export function getShotStartTime(shots: Shot[], index: number): number {
  let acc = 0
  for (let i = 0; i < index && i < shots.length; i++) acc += shots[i].duration
  return acc
}

/* ─── Interpolation result ─── */

export interface InterpolatedState {
  cameraX: number
  cameraY: number
  cameraZ: number
  cameraFov: number
  animationName?: string
  animationSpeed: number
  highlightNodes: string[]
  activeShotIndex: number
}

/** Build interpolated viewer state for a given time */
export function interpolateAtTime(
  shots: Shot[],
  sections: TocSection[],
  time: number,
): InterpolatedState | null {
  if (shots.length === 0) return null

  const idx = getActiveShotIndex(shots, time)
  if (idx < 0) return null

  const shot = shots[idx]
  const section = sections.find((s) => s.id === shot.sectionId)
  if (!section) return null

  const localT = getShotLocalT(shots, time)
  const trans = shot.transition
  const transDurationRatio = shot.duration > 0 ? trans.duration / shot.duration : 0

  // Determine if we are inside the transition zone (beginning of this shot)
  const inTransition = localT < transDurationRatio && idx > 0 && trans.type !== 'cut'

  const curCam = {
    x: section.cameraX ?? 0,
    y: section.cameraY ?? 5,
    z: section.cameraZ ?? 10,
    fov: section.cameraFov ?? 50,
  }

  if (inTransition) {
    const prevSection = sections.find((s) => s.id === shots[idx - 1].sectionId)
    if (prevSection) {
      const prevCam = {
        x: prevSection.cameraX ?? 0,
        y: prevSection.cameraY ?? 5,
        z: prevSection.cameraZ ?? 10,
        fov: prevSection.cameraFov ?? 50,
      }
      const rawT = localT / transDurationRatio // 0..1 within transition
      const t = applyEasing(Math.min(1, Math.max(0, rawT)), trans.easing)
      return {
        cameraX: prevCam.x + (curCam.x - prevCam.x) * t,
        cameraY: prevCam.y + (curCam.y - prevCam.y) * t,
        cameraZ: prevCam.z + (curCam.z - prevCam.z) * t,
        cameraFov: prevCam.fov + (curCam.fov - prevCam.fov) * t,
        animationName: section.animationName,
        animationSpeed: section.animationSpeed ?? 1,
        highlightNodes: section.highlightNodes ?? [],
        activeShotIndex: idx,
      }
    }
  }

  return {
    cameraX: curCam.x,
    cameraY: curCam.y,
    cameraZ: curCam.z,
    cameraFov: curCam.fov,
    animationName: section.animationName,
    animationSpeed: section.animationSpeed ?? 1,
    highlightNodes: section.highlightNodes ?? [],
    activeShotIndex: idx,
  }
}

/* ─── Hook ─── */

export interface PlaybackEngine {
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  /** Current interpolated state – null when no shots */
  state: InterpolatedState | null
}

export function usePlaybackEngine(
  shots: Shot[],
  sections: TocSection[],
): PlaybackEngine {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const timeRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const totalDuration = getTotalDuration(shots)

  const tick = useCallback(
    (ts: number) => {
      if (lastTsRef.current != null) {
        const dt = ((ts - lastTsRef.current) / 1000) * playbackRate
        timeRef.current = Math.min(timeRef.current + dt, totalDuration)
        setCurrentTime(timeRef.current)

        if (timeRef.current >= totalDuration) {
          setIsPlaying(false)
          lastTsRef.current = null
          return
        }
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    },
    [totalDuration, playbackRate],
  )

  useEffect(() => {
    if (isPlaying) {
      lastTsRef.current = null
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, tick])

  const play = useCallback(() => {
    if (timeRef.current >= totalDuration && totalDuration > 0) {
      timeRef.current = 0
      setCurrentTime(0)
    }
    setIsPlaying(true)
  }, [totalDuration])

  const pause = useCallback(() => setIsPlaying(false), [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    timeRef.current = 0
    setCurrentTime(0)
  }, [])

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(t, totalDuration))
      timeRef.current = clamped
      setCurrentTime(clamped)
    },
    [totalDuration],
  )

  const state = interpolateAtTime(shots, sections, currentTime)

  return {
    currentTime,
    isPlaying,
    playbackRate,
    setPlaybackRate,
    play,
    pause,
    stop,
    seek,
    state,
  }
}
