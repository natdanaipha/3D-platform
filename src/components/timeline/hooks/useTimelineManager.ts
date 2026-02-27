import { useState, useCallback, useEffect } from 'react'
import { usePlaybackEngine, type InterpolatedState } from './usePlaybackEngine'
import type { Sequence, Shot } from '../types'
import type { TocSection } from '../../../types'

export function useTimelineManager(
  tocSections: TocSection[],
  onPlaybackStateChange?: (state: InterpolatedState | null) => void
) {
  const [sequence, setSequence] = useState<Sequence>({
    id: 'seq-default',
    name: 'Sequence 1',
    shots: [],
  })
  const [defaultShotDuration, setDefaultShotDuration] = useState(3)

  const playback = usePlaybackEngine(sequence.shots, tocSections)

  const pbState = playback.state
  useEffect(() => {
    if (onPlaybackStateChange) {
      onPlaybackStateChange(pbState)
    }
  }, [pbState, onPlaybackStateChange])

  const handleAddShot = useCallback((sectionId: string) => {
    const newShot: Shot = {
      shotId: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sectionId,
      duration: defaultShotDuration,
      transition: { type: 'crossfade', duration: 0.5, easing: 'easeInOut' },
    }
    setSequence((prev) => ({ ...prev, shots: [...prev.shots, newShot] }))
  }, [defaultShotDuration])

  const handleRemoveShot = useCallback((shotId: string) => {
    setSequence((prev) => ({ ...prev, shots: prev.shots.filter((s) => s.shotId !== shotId) }))
  }, [])

  const handleUpdateShots = useCallback((shots: Shot[]) => {
    setSequence((prev) => ({ ...prev, shots }))
  }, [])

  const handleCreateFromToc = useCallback(() => {
    const shots: Shot[] = tocSections.map((sec, i) => ({
      shotId: `shot-${Date.now()}-${i}`,
      sectionId: sec.id,
      duration: defaultShotDuration,
      transition: { type: i === 0 ? 'cut' as const : 'crossfade' as const, duration: 0.5, easing: 'easeInOut' as const },
    }))
    setSequence((prev) => ({ ...prev, shots }))
  }, [tocSections, defaultShotDuration])

  // Keyboard shortcuts for playback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.code === 'Space') {
        e.preventDefault()
        playback.isPlaying ? playback.pause() : playback.play()
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        playback.seek(Math.max(0, playback.currentTime - 0.5))
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault()
        playback.seek(playback.currentTime + 0.5)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playback])

  return {
    sequence,
    setSequence,
    defaultShotDuration,
    setDefaultShotDuration,
    playback,
    handleAddShot,
    handleRemoveShot,
    handleUpdateShots,
    handleCreateFromToc,
  }
}
