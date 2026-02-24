import { useState } from 'react'
import { Button } from './ui/button'
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Highlighter,
  List,
  Play,
  Plus,
  Trash2,
  Check,
  X,
  FilmIcon,
} from 'lucide-react'
import type { TocSection } from '../types'

interface TableOfContentsDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  sections: TocSection[]
  animationNames: string[]
  nodeNames: string[]
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onUpdateSection: (id: string, updates: Partial<TocSection>) => void
  onCameraPreview?: (camera: { x?: number; y?: number; z?: number; fov?: number }) => void
  onAddToTimeline?: (sectionId: string) => void
}

export default function TableOfContentsDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  sections,
  animationNames,
  nodeNames,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onCameraPreview,
  onAddToTimeline,
}: TableOfContentsDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditValue(currentTitle)
  }

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdateSection(id, { title: editValue.trim() })
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-[calc(50%-3rem)] -translate-y-1/2 z-[70] rounded-r-none rounded-l-lg"
        variant="secondary"
        size="icon"
        data-drawer-toggle="toc"
        title="Table of Contents"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <List className="h-4 w-4" />}
      </Button>

      {/* Drawer */}
      <div
        data-drawer="toc"
        className={`fixed right-0 top-0 h-full bg-white border-l border-neutral-200 shadow-lg transition-transform duration-300 z-[60] overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '340px', maxHeight: '100vh' }}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">Table of Contents</h2>
            <Button size="sm" onClick={onAddSection} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Section
            </Button>
          </div>

          {/* Sections List */}
          {sections.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <List className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sections yet</p>
              <p className="text-xs mt-1">Click "Add Section" to create one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-neutral-100 overflow-hidden"
                >
                  {/* Section header row */}
                  <div className="flex items-center gap-1 p-2 group">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === section.id ? null : section.id)
                      }
                      className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400"
                    >
                      {expandedId === section.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {editingId === section.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(section.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(section.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-neutral-400 hover:bg-neutral-100 rounded"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-neutral-800 truncate">
                          {section.title}
                        </span>
                        {section.animationName && (
                          <span className="flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            <Play className="h-2.5 w-2.5" />
                            {section.animationName}
                          </span>
                        )}
                        {(section.highlightNodes ?? []).length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <Highlighter className="h-2.5 w-2.5" />
                            {section.highlightNodes!.length}
                          </span>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onAddToTimeline && (
                            <button
                              onClick={() => onAddToTimeline(section.id)}
                              className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Add to Timeline"
                            >
                              <FilmIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(section.id, section.title)}
                            className="p-1 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Rename"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveSection(section.id)}
                            className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Section content (expanded) */}
                  {expandedId === section.id && (
                    <div className="border-t border-neutral-100 p-3 bg-neutral-50/50 space-y-2">
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Animation
                      </label>
                      <select
                        value={section.animationName || ''}
                        onChange={(e) =>
                          onUpdateSection(section.id, {
                            animationName: e.target.value || undefined,
                          })
                        }
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- No Animation --</option>
                        {animationNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      {animationNames.length === 0 && (
                        <p className="text-xs text-neutral-400">
                          No animations available in this model
                        </p>
                      )}

                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Speed
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={section.animationSpeed ?? 1}
                          onChange={(e) =>
                            onUpdateSection(section.id, {
                              animationSpeed: parseFloat(e.target.value),
                            })
                          }
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={section.animationSpeed ?? 1}
                          onChange={(e) =>
                            onUpdateSection(section.id, {
                              animationSpeed: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-neutral-400">x</span>
                      </div>

                      <div className="border-t border-neutral-200 pt-2 mt-2" />

                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Camera Position
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['cameraX', 'cameraY', 'cameraZ'] as const).map((key) => {
                          const axisMap = { cameraX: 'x', cameraY: 'y', cameraZ: 'z' } as const
                          const defaultVal = key === 'cameraY' ? 5 : key === 'cameraZ' ? 10 : 0
                          return (
                            <div key={key}>
                              <label className="text-[10px] text-neutral-400 uppercase">
                                {key.replace('camera', '')}
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={section[key] ?? defaultVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  onUpdateSection(section.id, { [key]: val })
                                  onCameraPreview?.({ [axisMap[key]]: val })
                                }}
                                className="w-full px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          )
                        })}
                      </div>

                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        FOV
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="10"
                          max="120"
                          step="1"
                          value={section.cameraFov ?? 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            onUpdateSection(section.id, { cameraFov: val })
                            onCameraPreview?.({ fov: val })
                          }}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="10"
                          max="120"
                          step="1"
                          value={section.cameraFov ?? 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 50
                            onUpdateSection(section.id, { cameraFov: val })
                            onCameraPreview?.({ fov: val })
                          }}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-xs text-neutral-400">°</span>
                      </div>

                      <div className="border-t border-neutral-200 pt-2 mt-2" />

                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Highlight Nodes
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const node = e.target.value
                          if (!node) return
                          const current = section.highlightNodes ?? []
                          if (!current.includes(node)) {
                            onUpdateSection(section.id, { highlightNodes: [...current, node] })
                          }
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">-- Add Node --</option>
                        {nodeNames
                          .filter((n) => !(section.highlightNodes ?? []).includes(n))
                          .map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>
                      {(section.highlightNodes ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {section.highlightNodes!.map((node) => (
                            <span
                              key={node}
                              className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
                            >
                              {node}
                              <button
                                onClick={() =>
                                  onUpdateSection(section.id, {
                                    highlightNodes: section.highlightNodes!.filter((n) => n !== node),
                                  })
                                }
                                className="hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {nodeNames.length === 0 && (
                        <p className="text-xs text-neutral-400">
                          No nodes available in this model
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
