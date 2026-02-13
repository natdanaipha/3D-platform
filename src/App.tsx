import { useState } from 'react'
import Viewer3D from './components/Viewer3D'
import ControlsSidebar from './components/ControlsSidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Upload } from 'lucide-react'

export interface NodeTransform {
  visible: boolean
  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
  scale: number
}

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
      setSelectedTexture('')
      setTextureScaleX(1)
      setTextureScaleY(1)
      setTextureOffsetX(0)
      setTextureOffsetY(0)
      setTextureRotation(0)
      setNodeNames([])
      setNodeTransforms({})
    }
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
              setEnabled: setAnimationEnabled,
              setSelectedAnimation,
              setSpeed: setAnimationSpeed,
              setLoop: setAnimationLoop,
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
              setMaterialNames,
              setSelectedMaterial,
              setMaterialColor,
              setMaterialMetalness,
              setMaterialRoughness,
              setMaterialOpacity,
              setMaterialEmissive,
              setMaterialEmissiveIntensity,
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
          />
          <div className="flex-1 relative" id="viewer-3d">
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
            />
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
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
