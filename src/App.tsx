import { useState } from 'react'
import Viewer3D from './components/Viewer3D'
import ControlsSidebar from './components/ControlsSidebar'
import RightDrawer from './components/RightDrawer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Upload, Trash2 } from 'lucide-react'
import type { NodeTransform, NoteAnnotation, TextAnnotation, PartListItem } from './types'

// Re-export types สำหรับ components ที่ import จาก App
export type { NodeTransform, NoteAnnotation, TextAnnotation, PartListItem }

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

function App() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Drawer controls state
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)

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

  // Scene controls state
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a')
  const [enableGrid, setEnableGrid] = useState(true)
  const [gridSize, setGridSize] = useState(10)
  const [gridDivisions, setGridDivisions] = useState(10)

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
  const [isPlacingNote, setIsPlacingNote] = useState(false)

  // Text annotations state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])
  const [isPlacingText, setIsPlacingText] = useState(false)

  // Part list (Part Names): เลือก node แล้วใส่ label, แสดงรายการด้านซ้าย
  const [partListItems, setPartListItems] = useState<PartListItem[]>([])
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [isAddingPart, setIsAddingPart] = useState(false)
  const [pendingPartNodeName, setPendingPartNodeName] = useState<string | null>(null)
  const [pendingPartLabel, setPendingPartLabel] = useState('')

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

  const updateNodeTransform = (nodeName: string, patch: Partial<NodeTransform>) => {
    setNodeTransforms((prev) => ({
      ...prev,
      [nodeName]: { ...defaultNodeTransform(), ...prev[nodeName], ...patch },
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setSelectedModel(url)
      // Reset controls when new model is loaded
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
      // Reset new controls
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
      setIsAddingPart(false)
      setPendingPartNodeName(null)
      setPendingPartLabel('')
    }
  }

  const handlePartListAdd = () => {
    if (!pendingPartNodeName?.trim() || !pendingPartLabel.trim()) return
    const newPart: PartListItem = {
      id: `part-${Date.now()}`,
      nodeName: pendingPartNodeName.trim(),
      label: pendingPartLabel.trim(),
    }
    setPartListItems((prev) => [...prev, newPart])
    setSelectedPartId(newPart.id)
    setPendingPartNodeName(null)
    setPendingPartLabel('')
    setIsAddingPart(false)
  }

  const handlePartListDelete = (id: string) => {
    setPartListItems((prev) => prev.filter((p) => p.id !== id))
    if (selectedPartId === id) setSelectedPartId(null)
  }

  const highlightedNodeName =
    selectedPartId != null
      ? partListItems.find((p) => p.id === selectedPartId)?.nodeName ?? null
      : null

  const handleNotePlace = (position: { x: number; y: number; z: number }) => {
    
    if (!isPlacingNote) return
    
    const newNote: NoteAnnotation = {
      id: `note-${Date.now()}`,
      positionX: position.x,
      positionY: position.y,
      positionZ: position.z,
      text: '',
      offsetY: 0.5, // default offset 0.5 units จากพื้น
      createdAt: new Date(),
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
      offsetY: 0.5, // default offset 0.5 units จากพื้น
      createdAt: new Date(),
    }
    setTextAnnotations([...textAnnotations, newTextAnnotation])
    setIsPlacingText(false)
  }

  const handleTextUpdate = (id: string, updates: Partial<TextAnnotation>) => {
    setTextAnnotations(textAnnotations.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ))
  }

  const handleTextDelete = (id: string) => {
    setTextAnnotations(textAnnotations.filter(text => text.id !== id))
  }

  const handleAnimationNamesChange = (names: string[]) => {
    setAnimationNames(names)
    if (names.length > 0 && !selectedAnimation) {
      setSelectedAnimation(names[0])
      setAnimationEnabled(true)
    }
  }

  const handleAnimationPlay = () => {
    const modelRef = (window as any).__modelRef
    if (modelRef) {
      modelRef.play()
    }
  }

  const handleAnimationPause = () => {
    const modelRef = (window as any).__modelRef
    if (modelRef) {
      modelRef.pause()
    }
  }

  const handleAnimationStop = () => {
    const modelRef = (window as any).__modelRef
    if (modelRef) {
      modelRef.stop()
    }
  }

  const handleAnimationReset = () => {
    const modelRef = (window as any).__modelRef
    if (modelRef) {
      modelRef.reset()
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Hidden file input */}
      <input
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />

      {/* Upload Screen */}
      {!selectedModel && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Upload 3D Model</CardTitle>
              <CardDescription>
                Upload your GLB or GLTF file to view it in 3D
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3D Viewer */}
      {selectedModel && (
        <>
          <RightDrawer 
            isOpen={rightDrawerOpen} 
            setIsOpen={setRightDrawerOpen}
            notes={notes}
            isPlacingNote={isPlacingNote}
            onTogglePlaceNote={() => setIsPlacingNote(!isPlacingNote)}
            onNoteUpdate={(id, updates) => handleNoteUpdate(id, updates)}
            onNoteDelete={handleNoteDelete}
            textAnnotations={textAnnotations}
            isPlacingText={isPlacingText}
            onTogglePlaceText={() => setIsPlacingText(!isPlacingText)}
            onTextUpdate={handleTextUpdate}
            onTextDelete={handleTextDelete}
            nodeNames={nodeNames}
            partListItems={partListItems}
            isAddingPart={isAddingPart}
            setIsAddingPart={setIsAddingPart}
            pendingPartNodeName={pendingPartNodeName}
            setPendingPartNodeName={setPendingPartNodeName}
            pendingPartLabel={pendingPartLabel}
            setPendingPartLabel={setPendingPartLabel}
            onPartListAdd={handlePartListAdd}
          />
          <ControlsSidebar
            modelControls={{
              positionX,
              positionY,
              positionZ,
              rotationX,
              rotationY,
              rotationZ,
              scale,
              setPositionX,
              setPositionY,
              setPositionZ,
              setRotationX,
              setRotationY,
              setRotationZ,
              setScale,
            }}
            animationControls={{
              enabled: animationEnabled,
              selectedAnimation,
              animationNames,
              speed: animationSpeed,
              loop: animationLoop,
              mode: animationMode,
              sequence: animationSequence,
              setEnabled: setAnimationEnabled,
              setSelectedAnimation,
              setSpeed: setAnimationSpeed,
              setLoop: setAnimationLoop,
              setMode: setAnimationMode,
              setSequence: setAnimationSequence,
              onPlay: handleAnimationPlay,
              onPause: handleAnimationPause,
              onStop: handleAnimationStop,
              onReset: handleAnimationReset,
            }}
            lightingControls={{
              ambientIntensity,
              directionalIntensity,
              directionalX,
              directionalY,
              directionalZ,
              setAmbientIntensity,
              setDirectionalIntensity,
              setDirectionalX,
              setDirectionalY,
              setDirectionalZ,
            }}
            cameraControls={{
              cameraX,
              cameraY,
              cameraZ,
              fov,
              setCameraX,
              setCameraY,
              setCameraZ,
              setFov,
            }}
            sceneControls={{
              backgroundColor,
              enableGrid,
              gridSize,
              gridDivisions,
              setBackgroundColor,
              setEnableGrid,
              setGridSize,
              setGridDivisions,
            }}
            skeletonControls={{
              skeletonNames,
              selectedSkeleton,
              skeletonVisible,
              showSkeletonHelper,
              setSkeletonNames,
              setSelectedSkeleton,
              setSkeletonVisible,
              setShowSkeletonHelper,
            }}
            materialControls={{
              materialNames,
              selectedMaterial,
              materialColor,
              materialMetalness,
              materialRoughness,
              materialOpacity,
              materialEmissive,
              materialEmissiveIntensity,
              materialTextureMap,
              setMaterialNames,
              setSelectedMaterial,
              setMaterialColor,
              setMaterialMetalness,
              setMaterialRoughness,
              setMaterialOpacity,
              setMaterialEmissive,
              setMaterialEmissiveIntensity,
              setMaterialTextureMap,
            }}
            textureControls={{
              textureNames,
              selectedTexture,
              textureScaleX,
              textureScaleY,
              textureOffsetX,
              textureOffsetY,
              textureRotation,
              setTextureNames,
              setSelectedTexture,
              setTextureScaleX,
              setTextureScaleY,
              setTextureOffsetX,
              setTextureOffsetY,
              setTextureRotation,
            }}
            nodeControls={{
              nodeNames,
              nodeTransforms,
              updateNodeTransform,
            }}
            isOpen={leftDrawerOpen}
            setIsOpen={setLeftDrawerOpen}
          />
          <div 
            className="flex-1 relative" 
            id="viewer-3d"
            onDoubleClick={(e) => {
              // ปิด drawer ทั้งสองเมื่อ double click นอก drawer
              const target = e.target as HTMLElement
              // ตรวจสอบว่าไม่ได้ click บน drawer หรือ toggle button โดยใช้ data attribute
              if (
                !target.closest('[data-drawer]') && // ไม่ได้ click บน drawer
                !target.closest('[data-drawer-toggle]') // ไม่ได้ click บน toggle button
              ) {
                setLeftDrawerOpen(false)
                setRightDrawerOpen(false)
              }
            }}
          >
            {/* Part Names — รายการเลือก node ไว้บนขวานอก Controls */}
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
              modelUrl={selectedModel}
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
              ambientIntensity={ambientIntensity}
              directionalIntensity={directionalIntensity}
              directionalX={directionalX}
              directionalY={directionalY}
              directionalZ={directionalZ}
              cameraX={cameraX}
              cameraY={cameraY}
              cameraZ={cameraZ}
              fov={fov}
              backgroundColor={backgroundColor}
              enableGrid={enableGrid}
              gridSize={gridSize}
              gridDivisions={gridDivisions}
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
              highlightedNodeName={highlightedNodeName}
              notes={notes}
              isPlacingNote={isPlacingNote}
              onNotePlace={handleNotePlace}
              onNoteUpdate={handleNoteUpdate}
              onNoteDelete={handleNoteDelete}
              onNoteEdit={() => setRightDrawerOpen(true)}
              textAnnotations={textAnnotations}
              isPlacingText={isPlacingText}
              onTextPlace={handleTextPlace}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New Model
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedModel.startsWith('blob:')) {
                    URL.revokeObjectURL(selectedModel)
                  }
                  setSelectedModel(null)
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App
