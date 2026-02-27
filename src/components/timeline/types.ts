export type TransitionEasing = 'linear' | 'easeInOut' | 'easeIn' | 'easeOut'

export interface ShotTransition {
  type: 'cut' | 'crossfade'
  duration: number // seconds
  easing: TransitionEasing
}

export interface Shot {
  shotId: string
  sectionId: string // ref → TocSection.id
  duration: number  // seconds
  transition: ShotTransition
}

export interface Sequence {
  id: string
  name: string
  shots: Shot[]
}
