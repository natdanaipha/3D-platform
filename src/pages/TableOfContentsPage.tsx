import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Viewer3D from '../components/Viewer3D'
import TableOfContentsDrawer, { type SectionPlaybackState } from '../components/TableOfContentsDrawer'
import TCPreview from '../components/TCPreview'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Upload, Trash2, ArrowLeft, StickyNote, Download, FolderOpen } from 'lucide-react'
import type { NodeTransform, NoteAnnotation, NotePage, TextAnnotation, PartListItem, TocSection } from '../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/ui/dialog'
import NoteRichEditor from '../components/annotations/NoteRichEditor'

const defaultNodeTransform = (): NodeTransform => ({
  visible: true,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
})

export default function TableOfContentsPage() {
  const navigate = useNavigate()
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Drawer controls state
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false)

  // Model controls state
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const [scale, setScale] = useState(1)

  // Animation controls state
  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [selectedAnimation, setSelectedAnimation] = useState('')
  const [animationEnabled, setAnimationEnabled] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [animationLoop, setAnimationLoop] = useState(true)
  const [animationMode, setAnimationMode] = useState<'single' | 'sequence'>('single')
  const [animationSequence, setAnimationSequence] = useState<string[]>([])

  // Lighting controls state
  const [ambientIntensity, setAmbientIntensity] = useState(0.5)
  const [directionalIntensity, setDirectionalIntensity] = useState(1)
  const [directionalX, setDirectionalX] = useState(5)
  const [directionalY, setDirectionalY] = useState(5)
  const [directionalZ, setDirectionalZ] = useState(5)

  // Camera controls state
  const [cameraX, setCameraX] = useState(0)
  const [cameraY, setCameraY] = useState(5)
  const [cameraZ, setCameraZ] = useState(10)
  const [fov, setFov] = useState(50)

  // Container size state
  const [containerWidth, setContainerWidth] = useState('100%')
  const [containerHeight, setContainerHeight] = useState('100vh')
  const [containerAlign, setContainerAlign] = useState<'left' | 'center' | 'right'>('left')
  const [containerVerticalAlign, setContainerVerticalAlign] = useState<'top' | 'center' | 'bottom'>('top')

  // Scene controls state
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a')
  const [enableGrid, setEnableGrid] = useState(true)
  const [gridSize, setGridSize] = useState(10)
  const [gridDivisions, setGridDivisions] = useState(10)
  const [gridCellColor, setGridCellColor] = useState('#6f6f6f')
  const [gridSectionColor, setGridSectionColor] = useState('#d6d6d6')
  const [gridPositionY, setGridPositionY] = useState(0)

  // Environment controls state
  const [envPreset, setEnvPreset] = useState<string>('sunset')
  const [envHdrUrl, setEnvHdrUrl] = useState<string | null>(null)
  const [envBackground, setEnvBackground] = useState(false)
  const [envBackgroundBlurriness, setEnvBackgroundBlurriness] = useState(0)
  const [envBackgroundIntensity, setEnvBackgroundIntensity] = useState(1)
  const [envIntensity, setEnvIntensity] = useState(1)

  // Skeletons controls state
  const [skeletonNames, setSkeletonNames] = useState<string[]>([])
  const [selectedSkeleton, setSelectedSkeleton] = useState('')
  const [skeletonVisible, setSkeletonVisible] = useState(true)
  const [showSkeletonHelper, setShowSkeletonHelper] = useState(false)

  // Materials controls state
  const [materialNames, setMaterialNames] = useState<string[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [materialColor, setMaterialColor] = useState('#ffffff')
  const [materialMetalness, setMaterialMetalness] = useState(0.5)
  const [materialRoughness, setMaterialRoughness] = useState(0.5)
  const [materialOpacity, setMaterialOpacity] = useState(1)
  const [materialEmissive, setMaterialEmissive] = useState('#000000')
  const [materialEmissiveIntensity, setMaterialEmissiveIntensity] = useState(0)
  const [materialTextureMap, setMaterialTextureMap] = useState<Record<string, string>>({})

  // Textures controls state
  const [textureNames, setTextureNames] = useState<string[]>([])
  const [selectedTexture, setSelectedTexture] = useState('')
  const [textureScaleX, setTextureScaleX] = useState(1)
  const [textureScaleY, setTextureScaleY] = useState(1)
  const [textureOffsetX, setTextureOffsetX] = useState(0)
  const [textureOffsetY, setTextureOffsetY] = useState(0)
  const [textureRotation, setTextureRotation] = useState(0)

  // Nodes controls state (per-node transforms)
  const [nodeNames, setNodeNames] = useState<string[]>([])
  const [nodeTransforms, setNodeTransforms] = useState<Record<string, NodeTransform>>({})

  // Note annotations state
  const [notes, setNotes] = useState<NoteAnnotation[]>([])
  const [showNoteAnnotations, setShowNoteAnnotations] = useState(true)
  const [isPlacingNote, setIsPlacingNote] = useState(false)
  const [focusNotePosition, setFocusNotePosition] = useState<{ x: number; y: number; z: number } | null>(null)
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteDraft, setEditNoteDraft] = useState<{ title: string; pages: NotePage[]; color?: string } | null>(null)

  // Text annotations state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])
  const [isPlacingText, setIsPlacingText] = useState(false)

  // Part list
  const [partListItems, setPartListItems] = useState<PartListItem[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)

  // Table of Contents sections state
  const [tocSections, setTocSections] = useState<TocSection[]>([])
  const [activeTocSectionId, setActiveTocSectionId] = useState<string | null>(null)
  const [cameraTargetX, setCameraTargetX] = useState<number | null>(null)
  const [cameraTargetY, setCameraTargetY] = useState<number | null>(null)
  const [cameraTargetZ, setCameraTargetZ] = useState<number | null>(null)
  const [cameraTargetFov, setCameraTargetFov] = useState<number | null>(null)

  // Section animation playback state
  const [animationDurations, setAnimationDurations] = useState<Record<string, number>>({})
  const [sectionPlayback, setSectionPlayback] = useState<SectionPlaybackState | null>(null)
  const [animationSeekTime, setAnimationSeekTime] = useState<number | null>(null)
  const sectionPlaybackRef = useRef<SectionPlaybackState | null>(null)
  sectionPlaybackRef.current = sectionPlayback

  // ─── Save / Load JSON ───
  const handleSaveProject = useCallback(() => {
    const data = JSON.stringify({ sections: tocSections }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'toc-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [tocSections])

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          if (data.sections) setTocSections(data.sections)
        } catch {
          // invalid JSON – ignore
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  const handleAddTocSection = () => {
    setTocSections((prev) => [...prev, { id: `sec-${Date.now()}`, title: 'New Section' }])
  }

  const handleRemoveTocSection = (id: string) => {
    setTocSections((prev) => prev.filter((s) => s.id !== id))
    if (activeTocSectionId === id) setActiveTocSectionId(null)
  }

  const handleUpdateTocSection = (id: string, updates: Partial<TocSection>) => {
    setTocSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const handleTocSectionClick = (section: TocSection) => {
    setActiveTocSectionId(section.id)
    // Play section animation stack
    handlePlaySection(section.id)
    // Camera
    const hasCamera =
      section.cameraX !== undefined ||
      section.cameraY !== undefined ||
      section.cameraZ !== undefined ||
      section.cameraFov !== undefined
    if (hasCamera) {
      setCameraTargetX(section.cameraX ?? null)
      setCameraTargetY(section.cameraY ?? null)
      setCameraTargetZ(section.cameraZ ?? null)
      setCameraTargetFov(section.cameraFov ?? null)
    }
    setTocHighlightNodes(section.highlightNodes ?? [])
  }

  /** Start playing a section's animation items sequentially */
  const startAnimationItem = useCallback(
    (section: TocSection, itemIndex: number) => {
      const items = section.animationItems ?? []
      if (itemIndex >= items.length) {
        // Finished all items
        setSectionPlayback(null)
        setAnimationEnabled(false)
        return
      }
      const item = items[itemIndex]
      setSelectedAnimation(item.animationName)
      setAnimationSpeed(item.speed)
      setAnimationLoop(false)
      // Set seek time BEFORE enabling so Viewer3D's pendingSeekRef picks it up
      setAnimationSeekTime(item.trimIn)
      setAnimationEnabled(true)
      setSectionPlayback({
        sectionId: section.id,
        isPlaying: true,
        currentItemIndex: itemIndex,
        currentItemProgress: 0,
        currentItemTime: item.trimIn,
      })
    },
    [],
  )

  const handlePlaySection = useCallback(
    (sectionId: string) => {
      const section = tocSections.find((s) => s.id === sectionId)
      if (!section) return
      const items = section.animationItems ?? []
      // Fallback to legacy single animation
      if (items.length === 0 && section.animationName) {
        setSelectedAnimation(section.animationName)
        setAnimationSpeed(section.animationSpeed ?? 1)
        setAnimationEnabled(true)
        return
      }
      if (items.length === 0) return
      startAnimationItem(section, 0)
    },
    [tocSections, startAnimationItem],
  )

  const handlePauseSection = useCallback(() => {
    setSectionPlayback((prev) =>
      prev ? { ...prev, isPlaying: false } : null,
    )
    setAnimationEnabled(false)
  }, [])

  const handleStopSection = useCallback(() => {
    setSectionPlayback(null)
    setAnimationEnabled(false)
  }, [])

  /** Called every frame from Viewer3D with the current animation time */
  const handleAnimationFrame = useCallback(
    (animName: string, time: number) => {
      const pb = sectionPlaybackRef.current
      if (!pb || !pb.isPlaying) return
      const section = tocSections.find((s) => s.id === pb.sectionId)
      if (!section) return
      const items = section.animationItems ?? []
      const item = items[pb.currentItemIndex]
      if (!item || item.animationName !== animName) return

      const trimmedDuration = item.trimOut - item.trimIn
      const progress = trimmedDuration > 0 ? Math.min((time - item.trimIn) / trimmedDuration, 1) : 1

      if (time >= item.trimOut) {
        // Advance to next item
        startAnimationItem(section, pb.currentItemIndex + 1)
        return
      }

      setSectionPlayback((prev) =>
        prev
          ? { ...prev, currentItemProgress: progress, currentItemTime: time }
          : null,
      )
    },
    [tocSections, startAnimationItem],
  )

  /** Handle trim preview: seek to a specific time in a specific animation */
  const handleAnimationPreviewTime = useCallback(
    (animationName: string, time: number) => {
      // Don't let trim preview override active section playback
      if (sectionPlaybackRef.current?.isPlaying) return
      setSelectedAnimation(animationName)
      setAnimationEnabled(false)
      setAnimationSeekTime(time)
    },
    [],
  )

  const handleCameraTransitionEnd = () => {
    if (cameraTargetX != null) setCameraX(cameraTargetX)
    if (cameraTargetY != null) setCameraY(cameraTargetY)
    if (cameraTargetZ != null) setCameraZ(cameraTargetZ)
    if (cameraTargetFov != null) setFov(cameraTargetFov)
    setCameraTargetX(null)
    setCameraTargetY(null)
    setCameraTargetZ(null)
    setCameraTargetFov(null)
  }

  const handleNodeNamesChange = (names: string[], initialTransforms?: Record<string, NodeTransform>) => {
    setNodeNames(names)
    setNodeTransforms((prev) => {
      const next = { ...prev }
      names.forEach((n) => {
        if (!next[n]) next[n] = initialTransforms?.[n] ?? defaultNodeTransform()
      })
      return next
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setSelectedModel(url)
      setPositionX(0)
      setPositionY(0)
      setPositionZ(0)
      setRotationX(0)
      setRotationY(0)
      setRotationZ(0)
      setScale(1)
      setSelectedAnimation('')
      setAnimationEnabled(false)
      setAnimationSequence([])
      setAnimationMode('single')
      setSelectedSkeleton('')
      setSkeletonVisible(true)
      setShowSkeletonHelper(false)
      setSelectedMaterial('')
      setMaterialColor('#ffffff')
      setMaterialMetalness(0.5)
      setMaterialRoughness(0.5)
      setMaterialOpacity(1)
      setMaterialEmissive('#000000')
      setMaterialEmissiveIntensity(0)
      setMaterialTextureMap({})
      setSelectedTexture('')
      setTextureScaleX(1)
      setTextureScaleY(1)
      setTextureOffsetX(0)
      setTextureOffsetY(0)
      setTextureRotation(0)
      setNodeNames([])
      setNodeTransforms({})
      setNotes([])
      setIsPlacingNote(false)
      setTextAnnotations([])
      setIsPlacingText(false)
      setPartListItems([])
      setSelectedPartId(null)
      setEnvPreset('sunset')
      if (envHdrUrl?.startsWith('blob:')) URL.revokeObjectURL(envHdrUrl)
      setEnvHdrUrl(null)
      setEnvBackground(false)
      setEnvBackgroundBlurriness(0)
      setEnvBackgroundIntensity(1)
      setEnvIntensity(1)
    }
  }

  const handlePartListDelete = (id: string) => {
    setPartListItems((prev) => prev.filter((p) => p.id !== id))
    if (selectedPartId === id) setSelectedPartId(null)
  }

  const [tocHighlightNodes, setTocHighlightNodes] = useState<string[]>([])

  const highlightedNodeNames: string[] = (() => {
    const names: string[] = [...tocHighlightNodes]
    if (selectedPartId != null) {
      const partNode = partListItems.find((p) => p.id === selectedPartId)?.nodeName
      if (partNode && !names.includes(partNode)) names.push(partNode)
    }
    return names
  })()

  const handleNotePlace = (payload: { x: number; y: number; z: number; attachedBoneName?: string; attachedBoneOffset?: { x: number; y: number; z: number } }) => {
    if (!isPlacingNote) return
    const newNote: NoteAnnotation = {
      id: `note-${Date.now()}`,
      positionX: payload.x,
      positionY: payload.y,
      positionZ: payload.z,
      text: '',
      pages: [{ content: '' }],
      offsetY: 0,
      cardWidth: 300,
      cardHeight: 240,
      createdAt: new Date(),
      ...(payload.attachedBoneName && payload.attachedBoneOffset && {
        attachedBoneName: payload.attachedBoneName,
        attachedBoneOffset: payload.attachedBoneOffset,
      }),
    }
    setNotes([...notes, newNote])
    setIsPlacingNote(false)
  }

  const handleNoteUpdate = (id: string, updates: Partial<NoteAnnotation>) => {
    setNotes(notes.map(note => note.id === id ? { ...note, ...updates } : note))
  }

  const handleNoteDelete = (id: string) => {
    setNotes(notes.filter(note => note.id !== id))
  }

  const handleOpenNoteEdit = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      setEditingNoteId(id)
      setEditNoteDraft({
        title: note.title ?? '',
        pages: note.pages?.length ? note.pages : [{ content: note.text ?? '' }],
        color: note.color,
      })
    }
  }

  const handleSaveNoteEdit = () => {
    if (!editingNoteId || !editNoteDraft) return
    handleNoteUpdate(editingNoteId, {
      title: editNoteDraft.title.trim() || undefined,
      pages: editNoteDraft.pages,
      color: editNoteDraft.color,
    })
    setEditingNoteId(null)
    setEditNoteDraft(null)
  }

  const handleCancelNoteEdit = () => {
    setEditingNoteId(null)
    setEditNoteDraft(null)
  }

  const handleTextPlace = (position: { x: number; y: number; z: number }) => {
    if (!isPlacingText) return
    const newTextAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      positionX: position.x,
      positionY: position.y,
      positionZ: position.z,
      text: 'New Text',
      fontSize: 16,
      color: '#ffffff',
      offsetY: 0,
      createdAt: new Date(),
    }
    setTextAnnotations([...textAnnotations, newTextAnnotation])
    setIsPlacingText(false)
  }

  const handleAnimationNamesChange = (names: string[]) => {
    setAnimationNames(names)
    if (names.length > 0 && !selectedAnimation) {
      setSelectedAnimation(names[0])
      setAnimationEnabled(true)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <input
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />

      <TCPreview
        sections={tocSections}
        activeSectionId={activeTocSectionId}
        onSectionClick={handleTocSectionClick}
        playingSectionId={sectionPlayback?.sectionId ?? null}
        onPlaySection={handlePlaySection}
        onStopSection={handleStopSection}
      />
      <TableOfContentsDrawer
        isOpen={tocDrawerOpen}
        setIsOpen={setTocDrawerOpen}
        sections={tocSections}
        animationNames={animationNames}
        nodeNames={nodeNames}
        animationDurations={animationDurations}
        onAddSection={handleAddTocSection}
        onRemoveSection={handleRemoveTocSection}
        onUpdateSection={handleUpdateTocSection}
        onCameraPreview={(cam) => {
          if (cam.x !== undefined) setCameraX(cam.x)
          if (cam.y !== undefined) setCameraY(cam.y)
          if (cam.z !== undefined) setCameraZ(cam.z)
          if (cam.fov !== undefined) setFov(cam.fov)
        }}
        onAnimationPreviewTime={handleAnimationPreviewTime}
        sectionPlayback={sectionPlayback}
        onPlaySection={handlePlaySection}
        onPauseSection={handlePauseSection}
        onStopSection={handleStopSection}
      />
      <div
        className="flex-1 relative"
        id="viewer-3d"
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement
          if (
            !target.closest('[data-drawer]') &&
            !target.closest('[data-drawer-toggle]')
          ) {
            setTocDrawerOpen(false)
          }
        }}
      >
        {partListItems.length > 0 && (
          <div className="absolute top-4 left-4 z-20 w-56">
            <Card className="bg-card/90 backdrop-blur-sm border-border/80 [&>*]:text-foreground">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium">Part Names</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Entire model</p>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <ul className="space-y-0.5">
                  {partListItems.map((part) => (
                    <li key={part.id}>
                      <div
                        className={`flex items-center justify-between gap-2 py-2 px-2 rounded-md cursor-pointer text-sm ${
                          selectedPartId === part.id
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedPartId(selectedPartId === part.id ? null : part.id)}
                      >
                        <span className="truncate">{part.label || part.nodeName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePartListDelete(part.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        <Viewer3D
          modelUrl={selectedModel ?? undefined}
          positionX={positionX}
          positionY={positionY}
          positionZ={positionZ}
          rotationX={rotationX}
          rotationY={rotationY}
          rotationZ={rotationZ}
          scale={scale}
          selectedAnimation={selectedAnimation}
          animationEnabled={animationEnabled}
          animationSpeed={animationSpeed}
          animationLoop={animationLoop}
          animationMode={animationMode}
          animationSequence={animationSequence}
          onAnimationNamesChange={handleAnimationNamesChange}
          onAnimationDurationsChange={setAnimationDurations}
          animationSeekTime={animationSeekTime}
          onAnimationFrame={handleAnimationFrame}
          ambientIntensity={ambientIntensity}
          directionalIntensity={directionalIntensity}
          directionalX={directionalX}
          directionalY={directionalY}
          directionalZ={directionalZ}
          cameraX={cameraX}
          cameraY={cameraY}
          cameraZ={cameraZ}
          fov={fov}
          cameraTargetX={cameraTargetX}
          cameraTargetY={cameraTargetY}
          cameraTargetZ={cameraTargetZ}
          cameraTargetFov={cameraTargetFov}
          onCameraTransitionEnd={handleCameraTransitionEnd}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          containerAlign={containerAlign}
          containerVerticalAlign={containerVerticalAlign}
          backgroundColor={backgroundColor}
          enableGrid={enableGrid}
          gridSize={gridSize}
          gridDivisions={gridDivisions}
          gridCellColor={gridCellColor}
          gridSectionColor={gridSectionColor}
          gridPositionY={gridPositionY}
          envPreset={envPreset}
          envHdrUrl={envHdrUrl}
          envBackground={envBackground}
          envBackgroundBlurriness={envBackgroundBlurriness}
          envBackgroundIntensity={envBackgroundIntensity}
          envIntensity={envIntensity}
          skeletonNames={skeletonNames}
          selectedSkeleton={selectedSkeleton}
          skeletonVisible={skeletonVisible}
          showSkeletonHelper={showSkeletonHelper}
          onSkeletonNamesChange={setSkeletonNames}
          materialNames={materialNames}
          selectedMaterial={selectedMaterial}
          materialColor={materialColor}
          materialMetalness={materialMetalness}
          materialRoughness={materialRoughness}
          materialOpacity={materialOpacity}
          materialEmissive={materialEmissive}
          materialEmissiveIntensity={materialEmissiveIntensity}
          materialTextureMap={materialTextureMap}
          onMaterialNamesChange={setMaterialNames}
          textureNames={textureNames}
          selectedTexture={selectedTexture}
          textureScaleX={textureScaleX}
          textureScaleY={textureScaleY}
          textureOffsetX={textureOffsetX}
          textureOffsetY={textureOffsetY}
          textureRotation={textureRotation}
          onTextureNamesChange={setTextureNames}
          nodeNames={nodeNames}
          nodeTransforms={nodeTransforms}
          onNodeNamesChange={handleNodeNamesChange}
          highlightedNodeNames={highlightedNodeNames}
          notes={notes}
          showNoteAnnotations={showNoteAnnotations}
          isPlacingNote={isPlacingNote}
          onNotePlace={handleNotePlace}
          onNoteUpdate={handleNoteUpdate}
          onNoteDelete={handleNoteDelete}
          onNoteEdit={handleOpenNoteEdit}
          focusNotePosition={focusNotePosition}
          onFocusNoteDone={() => setFocusNotePosition(null)}
          movingNoteId={movingNoteId}
          onEndMoveNote={() => setMovingNoteId(null)}
          textAnnotations={textAnnotations}
          isPlacingText={isPlacingText}
          onTextPlace={handleTextPlace}
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload New Model
          </Button>
          <Button variant="outline" onClick={handleSaveProject} title="Save sections + sequence as JSON">
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={handleLoadProject} title="Load sections + sequence from JSON">
            <FolderOpen className="mr-2 h-4 w-4" />
            Load
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (selectedModel?.startsWith('blob:')) {
                URL.revokeObjectURL(selectedModel!)
              }
              setSelectedModel(null)
            }}
          >
            Clear
          </Button>
        </div>

        <Dialog
          open={editingNoteId !== null}
          onOpenChange={(open) => !open && handleCancelNoteEdit()}
          closeOnOverlayClick={false}
        >
          <DialogContent
            className="max-w-2xl w-full mx-auto"
            onClose={handleCancelNoteEdit}
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>แก้ไขโน้ต</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {editNoteDraft && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      หัวข้อ
                    </label>
                    <input
                      type="text"
                      value={editNoteDraft.title}
                      onChange={(e) =>
                        setEditNoteDraft((prev) => (prev ? { ...prev, title: e.target.value } : null))
                      }
                      placeholder="เช่น หัวข้อโน้ต หรือเว้นว่างได้"
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      สีหัวการ์ด / หมุด
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editNoteDraft.color ?? '#ef4444'}
                        onChange={(e) =>
                          setEditNoteDraft((prev) => (prev ? { ...prev, color: e.target.value } : null))
                        }
                        className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
                        title="เลือกสี"
                      />
                      <input
                        type="text"
                        value={editNoteDraft.color ?? '#ef4444'}
                        onChange={(e) =>
                          setEditNoteDraft((prev) => (prev ? { ...prev, color: e.target.value || undefined } : null))
                        }
                        placeholder="#ef4444"
                        className="flex-1 p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>
                  <NoteRichEditor
                    key={editingNoteId ?? 'edit'}
                    pages={editNoteDraft.pages}
                    onChange={(pages) =>
                      setEditNoteDraft((prev) => (prev ? { ...prev, pages } : null))
                    }
                    height={320}
                  />
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelNoteEdit}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveNoteEdit} disabled={!editNoteDraft}>
                บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
