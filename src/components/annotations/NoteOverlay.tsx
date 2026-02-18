import { useState, useEffect, useRef } from 'react'
import NoteCard from './NoteCard'
import type { NoteAnnotation } from '../../types'

interface NoteOverlayProps {
  notes: NoteAnnotation[]
  onNoteUpdate: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete: (id: string) => void
  onNoteEdit?: (id: string) => void
}

const NOTE_COLOR = '#ef4444'

export default function NoteOverlay({
  notes,
  onNoteUpdate: _onNoteUpdate,
  onNoteDelete,
  onNoteEdit,
}: NoteOverlayProps) {
  const [cardPositions, setCardPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const [screenPositions, setScreenPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const canvasOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleCanvasInfo = (e: CustomEvent<{ left: number; top: number }>) => {
      canvasOffsetRef.current = {
        x: Math.round(e.detail.left),
        y: Math.round(e.detail.top),
      }
    }
    window.addEventListener('canvasInfo' as any, handleCanvasInfo)
    return () => window.removeEventListener('canvasInfo' as any, handleCanvasInfo)
  }, [])

  useEffect(() => {
    const handleScreenPosition = (event: Event) => {
      const customEvent = event as CustomEvent<{
        id: string
        screenPos: { x: number; y: number }
      }>
      const { id, screenPos } = customEvent.detail
      setScreenPositions((prev) => ({ ...prev, [id]: screenPos }))
      if (!cardPositions[id]) {
        setCardPositions((prev) => ({
          ...prev,
          [id]: {
            x: screenPos.x + canvasOffsetRef.current.x + 100,
            y: screenPos.y + canvasOffsetRef.current.y - 50,
          },
        }))
      }
    }
    window.addEventListener('noteScreenPosition', handleScreenPosition)
    return () =>
      window.removeEventListener('noteScreenPosition', handleScreenPosition)
  }, [cardPositions])

  const handleCardPositionChange = (id: string, pos: { x: number; y: number }) => {
    setCardPositions((prev) => ({ ...prev, [id]: pos }))
  }

  return (
    <>
      {notes.map((note) => {
        const cardPos = cardPositions[note.id]
        if (!cardPos) return null
        return (
          <NoteCard
            key={`card-${note.id}`}
            id={note.id}
            content={note.text}
            position3D={[note.positionX, note.positionY, note.positionZ]}
            position2D={cardPos}
            onPositionChange={(pos) => handleCardPositionChange(note.id, pos)}
            onDelete={() => onNoteDelete(note.id)}
            onEdit={() => onNoteEdit?.(note.id)}
          />
        )
      })}

      <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 40 }}
      >
        <svg
          key="svg-note-connectors"
          className="w-full h-full"
          style={{ position: 'absolute', top: 0, left: 0 }}
          preserveAspectRatio="none"
        >
          {notes.map((note) => {
            const screenPos = screenPositions[note.id]
            const cardPos = cardPositions[note.id]
            if (!screenPos || !cardPos) return null

            const lineStartX = screenPos.x + canvasOffsetRef.current.x
            const lineStartY = screenPos.y + canvasOffsetRef.current.y
            const cardElement = document.querySelector(
              `[data-annotation-id="${note.id}"]`
            ) as HTMLElement
            if (!cardElement) return null
            const cardRect = cardElement.getBoundingClientRect()
            const cardTopCenterX = cardRect.left + cardRect.width / 2
            const cardTopCenterY = cardRect.top

            return (
              <g key={`connector-${note.id}`}>
                <path
                  d={`M ${lineStartX} ${lineStartY} Q ${(lineStartX + cardTopCenterX) / 2} ${(lineStartY + cardTopCenterY) / 2 - 30}, ${cardTopCenterX} ${cardTopCenterY}`}
                  stroke={NOTE_COLOR}
                  strokeWidth="2"
                  fill="none"
                  opacity={0.7}
                />
                <circle cx={lineStartX} cy={lineStartY} r="6" fill={NOTE_COLOR} opacity={0.8}>
                  <animate
                    attributeName="r"
                    values="6;8;6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )
          })}
        </svg>
      </div>
    </>
  )
}
