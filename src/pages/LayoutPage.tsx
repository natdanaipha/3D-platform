import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { ArrowLeft, Grip } from 'lucide-react'

type DraggableItem = {
  id: string
  label: string
  x: number
  y: number
}

const INITIAL_ITEMS: DraggableItem[] = [
  { id: 'comp-a', label: 'Component A', x: 40, y: 40 },
  { id: 'comp-b', label: 'Component B', x: 260, y: 120 },
  { id: 'comp-c', label: 'Component C', x: 520, y: 220 },
]
const STORAGE_KEY = 'layout-poc-items'

const getInitialItems = (): DraggableItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_ITEMS

    const parsed = JSON.parse(raw) as DraggableItem[]
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (item) =>
          typeof item.id !== 'string' ||
          typeof item.label !== 'string' ||
          typeof item.x !== 'number' ||
          typeof item.y !== 'number'
      )
    ) {
      return INITIAL_ITEMS
    }

    return parsed
  } catch {
    return INITIAL_ITEMS
  }
}

export default function LayoutPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState<DraggableItem[]>(getInitialItems)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('ยังไม่ได้บันทึก')

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  )
  const activeItem = draggingId ? itemMap.get(draggingId) : null

  const handlePointerDown =
    (itemId: string) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const canvas = canvasRef.current
      const item = itemMap.get(itemId)
      if (!canvas || !item) return

      const canvasRect = canvas.getBoundingClientRect()
      const offsetX = event.clientX - canvasRect.left - item.x
      const offsetY = event.clientY - canvasRect.top - item.y

      setDraggingId(itemId)
      event.currentTarget.setPointerCapture(event.pointerId)

      const onPointerMove = (moveEvent: PointerEvent) => {
        const maxX = Math.max(0, canvasRect.width - 180)
        const maxY = Math.max(0, canvasRect.height - 110)
        const nextX = Math.min(
          maxX,
          Math.max(0, moveEvent.clientX - canvasRect.left - offsetX)
        )
        const nextY = Math.min(
          maxY,
          Math.max(0, moveEvent.clientY - canvasRect.top - offsetY)
        )

        setItems((prev) =>
          prev.map((target) =>
            target.id === itemId ? { ...target, x: nextX, y: nextY } : target
          )
        )
      }

      const onPointerUp = () => {
        setDraggingId(null)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    setSaveStatus('บันทึกตำแหน่งล่าสุดแล้ว')
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setItems(INITIAL_ITEMS)
    setSaveStatus('ล้างค่าที่บันทึกแล้ว')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Layout POC</h1>
            <p className="text-muted-foreground">
              ทดลองลากวาง component ได้อิสระภายในพื้นที่ด้านล่าง
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active item:{' '}
              <span className={activeItem ? 'font-semibold text-primary' : ''}>
                {activeItem ? activeItem.label : 'None'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear
            </Button>
            <Button variant="secondary" onClick={() => setItems(INITIAL_ITEMS)}>
              Reset Position
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{saveStatus}</p>

        <div
          ref={canvasRef}
          className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-card"
        >
          {items.map((item) => (
            <div
              key={item.id}
              onPointerDown={handlePointerDown(item.id)}
              className={`absolute w-[180px] cursor-pointer select-none rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow ${
                draggingId === item.id ? 'shadow-lg ring-1 ring-primary/40' : ''
              }`}
              style={{ left: item.x, top: item.y, touchAction: 'none' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                      draggingId === item.id
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {draggingId === item.id ? 'ACTIVE' : 'IDLE'}
                  </span>
                  <Grip className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                x: {Math.round(item.x)} | y: {Math.round(item.y)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
