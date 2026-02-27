import { forwardRef, useImperativeHandle } from 'react'
import TimelinePanel from './TimelinePanel'
import { useTimelineManager } from './hooks/useTimelineManager'
import type { Sequence } from './types'
import type { TocSection } from '../../types'
import type { InterpolatedState } from './hooks/usePlaybackEngine'

export interface TimelineRef {
  getSequence: () => Sequence
  setSequence: (sequence: Sequence) => void
  handleAddShot: (sectionId: string) => void
}

interface TimelineProps {
  tocSections: TocSection[]
  onPlaybackStateChange: (state: InterpolatedState | null) => void
}

const Timeline = forwardRef<TimelineRef, TimelineProps>(({
  tocSections,
  onPlaybackStateChange,
}, ref) => {
  const {
    sequence,
    setSequence,
    defaultShotDuration,
    setDefaultShotDuration,
    playback,
    handleAddShot,
    handleRemoveShot,
    handleUpdateShots,
    handleCreateFromToc,
  } = useTimelineManager(tocSections, onPlaybackStateChange)

  useImperativeHandle(ref, () => ({
    getSequence: () => sequence,
    setSequence,
    handleAddShot,
  }), [sequence, setSequence, handleAddShot])

  return (
    <TimelinePanel
      sequence={sequence}
      sections={tocSections}
      currentTime={playback.currentTime}
      isPlaying={playback.isPlaying}
      playbackRate={playback.playbackRate}
      onPlay={playback.play}
      onPause={playback.pause}
      onStop={playback.stop}
      onSeek={playback.seek}
      onSetPlaybackRate={playback.setPlaybackRate}
      onUpdateShots={handleUpdateShots}
      onAddShot={handleAddShot}
      onRemoveShot={handleRemoveShot}
      onCreateFromToc={handleCreateFromToc}
      defaultDuration={defaultShotDuration}
      onSetDefaultDuration={setDefaultShotDuration}
      activeShotIndex={playback.state?.activeShotIndex ?? -1}
    />
  )
})

Timeline.displayName = 'Timeline'

export default Timeline
