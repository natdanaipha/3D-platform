import { useState, useEffect, useRef } from 'react'
import NoteCard from './NoteCard'
import type { NoteAnnotation } from '../../types'

interface NoteOverlayProps {
  notes: NoteAnnotation[]
  onNoteUpdate: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete: (id: string) => void
  onNoteEdit?: (id: string) => void
  /** true = แสดงปุ่มปากกาในการ์ด (หน้า Intro, Table of Contents) */
  showEditButtonOnNoteCards?: boolean
}

const NOTE_COLOR = '#ef4444'

export default function NoteOverlay({
  notes,
  onNoteUpdate,
  onNoteDelete,
  onNoteEdit,
  showEditButtonOnNoteCards = false,
}: NoteOverlayProps) {
  const [cardPositions, setCardPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const [screenPositions, setScreenPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const canvasOffsetRef = useRef({ x: 0, y: 0 })

  // คืนตำแหน่งการ์ดจาก note ที่เคยบันทึก (หลังปิดแล้วเปิด Note Annotations)
  useEffect(() => {
    setCardPositions((prev) => {
      let next = { ...prev }
      for (const note of notes) {
        if (
          note.cardPositionX != null &&
          note.cardPositionY != null &&
          !(note.id in next)
        ) {
          next[note.id] = { x: note.cardPositionX, y: note.cardPositionY }
        }
      }
      return next
    })
  }, [notes])

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
      const canvas = canvasOffsetRef.current
      const newCardPos = {
        x: screenPos.x + canvas.x + 100,
        y: screenPos.y + canvas.y - 50,
      }
      setScreenPositions((prev) => ({ ...prev, [id]: screenPos }))
      setCardPositions((prev) => {
        if (prev[id]) return prev
        onNoteUpdate(id, { cardPositionX: newCardPos.x, cardPositionY: newCardPos.y })
        return { ...prev, [id]: newCardPos }
      })
    }
    window.addEventListener('noteScreenPosition', handleScreenPosition)
    return () =>
      window.removeEventListener('noteScreenPosition', handleScreenPosition)
  }, [onNoteUpdate])

  const handleCardPositionChange = (id: string, pos: { x: number; y: number }) => {
    setCardPositions((prev) => ({ ...prev, [id]: pos }))
    onNoteUpdate(id, { cardPositionX: pos.x, cardPositionY: pos.y })
  }

  const handleCardSizeChange = (id: string, size: { width: number; height: number }) => {
    onNoteUpdate(id, { cardWidth: size.width, cardHeight: size.height })
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
            title={note.title}
            titleEn={note.titleEn}
            content={note.text}
            pages={note.pages}
            thaiPageCount={note.thaiPageCount}
            color={note.color ?? NOTE_COLOR}
            position3D={[note.positionX, note.positionY, note.positionZ]}
            position2D={cardPos}
            width={note.cardWidth}
            height={note.cardHeight}
            onPositionChange={(pos) => handleCardPositionChange(note.id, pos)}
            onSizeChange={(size) => handleCardSizeChange(note.id, size)}
            onDelete={() => onNoteDelete(note.id)}
            onEdit={() => onNoteEdit?.(note.id)}
            showEditButton={showEditButtonOnNoteCards}
            variant={showEditButtonOnNoteCards ? 'default' : 'bubble'}
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

            const strokeColor = note.strokeColor ?? note.color ?? NOTE_COLOR
            const strokeWeight = typeof note.strokeWeight === 'number' ? Math.max(0.5, note.strokeWeight) : 1
            const strokeWidthPx = Math.max(1, Math.round(strokeWeight * 2))
            const lineShape = note.lineShape ?? 'circle'
            const lineSizeNorm = typeof note.lineSize === 'number' ? Math.max(0, Math.min(100, note.lineSize)) / 100 : 0.5
            const dotSize = 4 + lineSizeNorm * 4
            const strokeOpacity = typeof note.strokeOpacity === 'number' ? note.strokeOpacity / 100 : 1
            const lineUseDefault = note.lineUseDefault !== false
            const lineMarkerFileData = note.lineMarkerFileData ?? ''

            const renderDot = () => {
              if (!lineUseDefault && lineMarkerFileData) {
                return (
                  <image
                    href={lineMarkerFileData}
                    x={lineStartX - dotSize}
                    y={lineStartY - dotSize}
                    width={dotSize * 2}
                    height={dotSize * 2}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
              }
              if (lineShape === 'square') {
                return (
                  <rect
                    x={lineStartX - dotSize}
                    y={lineStartY - dotSize}
                    width={dotSize * 2}
                    height={dotSize * 2}
                    fill={strokeColor}
                    opacity={0.9}
                  >
                    <animate attributeName="width" values={`${dotSize * 2};${dotSize * 2.4};${dotSize * 2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="height" values={`${dotSize * 2};${dotSize * 2.4};${dotSize * 2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="x" values={`${lineStartX - dotSize};${lineStartX - dotSize * 1.2};${lineStartX - dotSize}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="y" values={`${lineStartY - dotSize};${lineStartY - dotSize * 1.2};${lineStartY - dotSize}`} dur="2s" repeatCount="indefinite" />
                  </rect>
                )
              }
              if (lineShape === 'triangle') {
                const r = dotSize
                const points = [
                  [0, -r].join(','),
                  [r, r * 0.6].join(','),
                  [-r, r * 0.6].join(','),
                ].join(' ')
                return (
                  <g transform={`translate(${lineStartX}, ${lineStartY})`}>
                    <polygon points={points} fill={strokeColor} opacity={0.9}>
                      <animateTransform attributeName="transform" type="scale" values="1 1;1.15 1.15;1 1" dur="2s" repeatCount="indefinite" />
                    </polygon>
                  </g>
                )
              }
              if (lineShape === 'star') {
                const r = dotSize
                const points: [number, number][] = []
                for (let i = 0; i < 5; i++) {
                  const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
                  points.push([r * Math.cos(a), r * Math.sin(a)])
                  const b = a + (2 * Math.PI) / 5
                  points.push([(r * 0.5) * Math.cos(b), (r * 0.5) * Math.sin(b)])
                }
                const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ')
                return (
                  <g transform={`translate(${lineStartX}, ${lineStartY})`}>
                    <polygon points={pointsStr} fill={strokeColor} opacity={0.9}>
                      <animateTransform attributeName="transform" type="scale" values="1 1;1.15 1.15;1 1" dur="2s" repeatCount="indefinite" />
                    </polygon>
                  </g>
                )
              }
              return (
                <circle cx={lineStartX} cy={lineStartY} r={dotSize} fill={strokeColor} opacity={0.9}>
                  <animate attributeName="r" values={`${dotSize};${dotSize * 1.2};${dotSize}`} dur="2s" repeatCount="indefinite" />
                </circle>
              )
            }

            return (
              <g key={`connector-${note.id}`}>
                <path
                  d={`M ${lineStartX} ${lineStartY} Q ${(lineStartX + cardTopCenterX) / 2} ${(lineStartY + cardTopCenterY) / 2 - 30}, ${cardTopCenterX} ${cardTopCenterY}`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidthPx}
                  fill="none"
                  opacity={strokeOpacity * 0.9}
                />
                {renderDot()}
              </g>
            )
          })}
        </svg>
      </div>
    </>
  )
}
