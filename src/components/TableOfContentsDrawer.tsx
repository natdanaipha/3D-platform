import { useState } from 'react'
import { Button } from './ui/button'
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Highlighter,
  List,
  Play,
  Square,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import type { TocSection, AnimationItem, NonSelectedStyle } from '../types'
import type { SectionPlaybackState } from '../hooks/useSectionPlayback'
import AnimationStackList from './toc/AnimationStackList'

interface TableOfContentsDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  sections: TocSection[]
  animationNames: string[]
  /** map clipName → duration in seconds */
  clipDurations: Record<string, number>
  nodeNames: string[]
  materialNames: string[]
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onUpdateSection: (id: string, updates: Partial<TocSection>) => void
  onCameraPreview?: (camera: { x?: number; y?: number; z?: number; fov?: number }) => void
  // animation stack actions
  onAddAnimationItem: (sectionId: string, clipName: string) => void
  onRemoveAnimationItem: (sectionId: string, itemId: string) => void
  onReorderAnimationItems: (sectionId: string, fromIndex: number, toIndex: number) => void
  onUpdateAnimationItem: (sectionId: string, itemId: string, patch: Partial<AnimationItem>) => void
  onResetTrim: (sectionId: string, itemId: string) => void
  // Per-item camera override actions
  onToggleItemCameraOverride?: (sectionId: string, itemId: string, enabled: boolean) => void
  onSetItemCameraFromView?: (sectionId: string, itemId: string) => void
  onPreviewItemCamera?: (sectionId: string, itemId: string) => void
  onClearItemCamera?: (sectionId: string, itemId: string) => void
  // Per-item highlight override actions
  onToggleItemHighlight?: (sectionId: string, itemId: string, enabled: boolean) => void
  onSetItemHighlightMode?: (sectionId: string, itemId: string, mode: 'node' | 'material' | 'both') => void
  onAddItemSelectedNodes?: (sectionId: string, itemId: string, nodeIds: string[]) => void
  onRemoveItemSelectedNode?: (sectionId: string, itemId: string, nodeId: string) => void
  onAddItemSelectedMaterials?: (sectionId: string, itemId: string, materialIds: string[]) => void
  onRemoveItemSelectedMaterial?: (sectionId: string, itemId: string, materialId: string) => void
  onClearItemHighlightSelection?: (sectionId: string, itemId: string) => void
  onSetItemNonSelectedStyle?: (sectionId: string, itemId: string, patch: Partial<NonSelectedStyle>) => void
  // playback
  playbackState: SectionPlaybackState
  onPlaySection: (sectionId: string) => void
  onPlayItem: (sectionId: string, itemId: string) => void
  onPauseActive: () => void
  onStopActive: () => void
  onSeekItem: (sectionId: string, itemId: string, timeSec: number) => void
}

export default function TableOfContentsDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  sections,
  animationNames,
  clipDurations,
  nodeNames,
  materialNames,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onCameraPreview,
  onAddAnimationItem,
  onRemoveAnimationItem,
  onReorderAnimationItems,
  onUpdateAnimationItem,
  onResetTrim,
  onToggleItemCameraOverride,
  onSetItemCameraFromView,
  onPreviewItemCamera,
  onClearItemCamera,
  onToggleItemHighlight,
  onSetItemHighlightMode,
  onAddItemSelectedNodes,
  onRemoveItemSelectedNode,
  onAddItemSelectedMaterials,
  onRemoveItemSelectedMaterial,
  onClearItemHighlightSelection,
  onSetItemNonSelectedStyle,
  playbackState,
  onPlaySection,
  onPlayItem,
  onPauseActive,
  onStopActive,
  onSeekItem,
}: TableOfContentsDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // per-section: which animation item has its trim editor open
  const [expandedItemMap, setExpandedItemMap] = useState<Record<string, string | null>>({})

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
        style={{ width: '380px', maxHeight: '100vh' }}
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
              {sections.map((section) => {
                const isSectionExpanded = expandedId === section.id
                const anims = section.animations ?? []
                const isSectionPlaying =
                  playbackState.mode === 'section' && playbackState.sectionId === section.id && playbackState.playing

                return (
                  <div
                    key={section.id}
                    className="rounded-lg border border-neutral-100 overflow-hidden"
                  >
                    {/* Section header row */}
                    <div className="flex items-center gap-1 p-2 group">
                      <button
                        onClick={() =>
                          setExpandedId(isSectionExpanded ? null : section.id)
                        }
                        className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400"
                      >
                        {isSectionExpanded ? (
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
                          {anims.length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                              <Play className="h-2.5 w-2.5" />
                              {anims.length}
                            </span>
                          )}
                          {(section.highlightNodes ?? []).length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              <Highlighter className="h-2.5 w-2.5" />
                              {section.highlightNodes!.length}
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Play / Stop section */}
                            {anims.length > 0 && (
                              isSectionPlaying ? (
                                <button
                                  onClick={() => onStopActive()}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Stop Section"
                                >
                                  <Square className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => onPlaySection(section.id)}
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                  title="Play Section"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </button>
                              )
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
                    {isSectionExpanded && (
                      <div className="border-t border-neutral-100 p-3 bg-neutral-50/50 space-y-3">
                        {/* Animation Stack */}
                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Animations
                        </label>
                        <AnimationStackList
                          items={anims}
                          availableClips={animationNames}
                          clipDurations={clipDurations}
                          expandedItemId={expandedItemMap[section.id] ?? null}
                          isPlayingSection={isSectionPlaying}
                          playingItemId={
                            playbackState.sectionId === section.id ? playbackState.itemId : null
                          }
                          playheadSec={playbackState.playheadSec}
                          isItemPlaying={playbackState.playing}
                          onAddItem={(clipName) => onAddAnimationItem(section.id, clipName)}
                          onRemoveItem={(itemId) => onRemoveAnimationItem(section.id, itemId)}
                          onReorder={(from, to) => onReorderAnimationItems(section.id, from, to)}
                          onUpdateItem={(itemId, patch) =>
                            onUpdateAnimationItem(section.id, itemId, patch)
                          }
                          onSetExpanded={(itemId) =>
                            setExpandedItemMap((prev) => ({ ...prev, [section.id]: itemId }))
                          }
                          onPlayItem={(itemId) => onPlayItem(section.id, itemId)}
                          onPauseItem={onPauseActive}
                          onStopItem={onStopActive}
                          onSeekItem={(itemId, t) => onSeekItem(section.id, itemId, t)}
                          onResetTrim={(itemId) => onResetTrim(section.id, itemId)}
                          onToggleCameraOverride={onToggleItemCameraOverride ? (itemId, enabled) => onToggleItemCameraOverride(section.id, itemId, enabled) : undefined}
                          onSetCameraFromView={onSetItemCameraFromView ? (itemId) => onSetItemCameraFromView(section.id, itemId) : undefined}
                          onPreviewCamera={onPreviewItemCamera ? (itemId) => onPreviewItemCamera(section.id, itemId) : undefined}
                          onClearCamera={onClearItemCamera ? (itemId) => onClearItemCamera(section.id, itemId) : undefined}
                          availableNodeNames={nodeNames}
                          availableMaterialNames={materialNames}
                          onToggleHighlight={onToggleItemHighlight ? (itemId, enabled) => onToggleItemHighlight(section.id, itemId, enabled) : undefined}
                          onSetHighlightMode={onSetItemHighlightMode ? (itemId, mode) => onSetItemHighlightMode(section.id, itemId, mode) : undefined}
                          onAddSelectedNodes={onAddItemSelectedNodes ? (itemId, ids) => onAddItemSelectedNodes(section.id, itemId, ids) : undefined}
                          onRemoveSelectedNode={onRemoveItemSelectedNode ? (itemId, id) => onRemoveItemSelectedNode(section.id, itemId, id) : undefined}
                          onAddSelectedMaterials={onAddItemSelectedMaterials ? (itemId, ids) => onAddItemSelectedMaterials(section.id, itemId, ids) : undefined}
                          onRemoveSelectedMaterial={onRemoveItemSelectedMaterial ? (itemId, id) => onRemoveItemSelectedMaterial(section.id, itemId, id) : undefined}
                          onClearHighlightSelection={onClearItemHighlightSelection ? (itemId) => onClearItemHighlightSelection(section.id, itemId) : undefined}
                          onSetNonSelectedStyle={onSetItemNonSelectedStyle ? (itemId, patch) => onSetItemNonSelectedStyle(section.id, itemId, patch) : undefined}
                        />

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
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
