import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

interface ControlsSidebarProps {
  modelControls: {
    positionX: number
    positionY: number
    positionZ: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scale: number
    setPositionX: (v: number) => void
    setPositionY: (v: number) => void
    setPositionZ: (v: number) => void
    setRotationX: (v: number) => void
    setRotationY: (v: number) => void
    setRotationZ: (v: number) => void
    setScale: (v: number) => void
  }
  animationControls: {
    enabled: boolean
    selectedAnimation: string
    animationNames: string[]
    speed: number
    loop: boolean
    setEnabled: (v: boolean) => void
    setSelectedAnimation: (v: string) => void
    setSpeed: (v: number) => void
    setLoop: (v: boolean) => void
    onPlay: () => void
    onPause: () => void
    onStop: () => void
    onReset: () => void
  }
  lightingControls: {
    ambientIntensity: number
    directionalIntensity: number
    directionalX: number
    directionalY: number
    directionalZ: number
    setAmbientIntensity: (v: number) => void
    setDirectionalIntensity: (v: number) => void
    setDirectionalX: (v: number) => void
    setDirectionalY: (v: number) => void
    setDirectionalZ: (v: number) => void
  }
  cameraControls: {
    cameraX: number
    cameraY: number
    cameraZ: number
    fov: number
    setCameraX: (v: number) => void
    setCameraY: (v: number) => void
    setCameraZ: (v: number) => void
    setFov: (v: number) => void
  }
  sceneControls: {
    backgroundColor: string
    enableGrid: boolean
    gridSize: number
    gridDivisions: number
    setBackgroundColor: (v: string) => void
    setEnableGrid: (v: boolean) => void
    setGridSize: (v: number) => void
    setGridDivisions: (v: number) => void
  }
  skeletonControls: {
    skeletonNames: string[]
    selectedSkeleton: string
    skeletonVisible: boolean
    showSkeletonHelper: boolean
    setSkeletonNames: (v: string[]) => void
    setSelectedSkeleton: (v: string) => void
    setSkeletonVisible: (v: boolean) => void
    setShowSkeletonHelper: (v: boolean) => void
  }
  materialControls: {
    materialNames: string[]
    selectedMaterial: string
    materialColor: string
    materialMetalness: number
    materialRoughness: number
    materialOpacity: number
    materialEmissive: string
    materialEmissiveIntensity: number
    setMaterialNames: (v: string[]) => void
    setSelectedMaterial: (v: string) => void
    setMaterialColor: (v: string) => void
    setMaterialMetalness: (v: number) => void
    setMaterialRoughness: (v: number) => void
    setMaterialOpacity: (v: number) => void
    setMaterialEmissive: (v: string) => void
    setMaterialEmissiveIntensity: (v: number) => void
  }
  textureControls: {
    textureNames: string[]
    selectedTexture: string
    textureScaleX: number
    textureScaleY: number
    textureOffsetX: number
    textureOffsetY: number
    textureRotation: number
    setTextureNames: (v: string[]) => void
    setSelectedTexture: (v: string) => void
    setTextureScaleX: (v: number) => void
    setTextureScaleY: (v: number) => void
    setTextureOffsetX: (v: number) => void
    setTextureOffsetY: (v: number) => void
    setTextureRotation: (v: number) => void
  }
  nodeControls: {
    nodeNames: string[]
    selectedNode: string
    nodeVisible: boolean
    nodePositionX: number
    nodePositionY: number
    nodePositionZ: number
    nodeRotationX: number
    nodeRotationY: number
    nodeRotationZ: number
    nodeScale: number
    setNodeNames: (v: string[]) => void
    setSelectedNode: (v: string) => void
    setNodeVisible: (v: boolean) => void
    setNodePositionX: (v: number) => void
    setNodePositionY: (v: number) => void
    setNodePositionZ: (v: number) => void
    setNodeRotationX: (v: number) => void
    setNodeRotationY: (v: number) => void
    setNodeRotationZ: (v: number) => void
    setNodeScale: (v: number) => void
  }
}

export default function ControlsSidebar({
  modelControls,
  animationControls,
  lightingControls,
  cameraControls,
  sceneControls,
  skeletonControls,
  materialControls,
  textureControls,
  nodeControls,
}: ControlsSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<string | null>('model')

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 rounded-l-none rounded-r-lg"
        variant="secondary"
        size="icon"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-card border-r border-border shadow-lg transition-transform duration-300 z-40 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '370px', maxHeight: '100vh' }}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Controls</h2>
          </div>

          {/* Model Controls */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection('model')}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                Model Transform
                <span>{activeSection === 'model' ? '−' : '+'}</span>
              </CardTitle>
            </CardHeader>
            {activeSection === 'model' && (
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Position X</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={modelControls.positionX}
                    onChange={(e) => modelControls.setPositionX(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.positionX.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Position Y</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={modelControls.positionY}
                    onChange={(e) => modelControls.setPositionY(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.positionY.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Position Z</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={modelControls.positionZ}
                    onChange={(e) => modelControls.setPositionZ(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.positionZ.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rotation X</label>
                  <input
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.1"
                    value={modelControls.rotationX}
                    onChange={(e) => modelControls.setRotationX(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.rotationX.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rotation Y</label>
                  <input
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.1"
                    value={modelControls.rotationY}
                    onChange={(e) => modelControls.setRotationY(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.rotationY.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rotation Z</label>
                  <input
                    type="range"
                    min="-3.14"
                    max="3.14"
                    step="0.1"
                    value={modelControls.rotationZ}
                    onChange={(e) => modelControls.setRotationZ(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.rotationZ.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Scale</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={modelControls.scale}
                    onChange={(e) => modelControls.setScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{modelControls.scale.toFixed(1)}</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Animation Controls */}
          {animationControls.animationNames.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection('animation')}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  Animation
                  <span>{activeSection === 'animation' ? '−' : '+'}</span>
                </CardTitle>
              </CardHeader>
              {activeSection === 'animation' && (
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Animation</label>
                    <select
                      value={animationControls.selectedAnimation}
                      onChange={(e) => animationControls.setSelectedAnimation(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      {animationControls.animationNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={animationControls.enabled}
                      onChange={(e) => animationControls.setEnabled(e.target.checked)}
                    />
                    <label className="text-xs">Enabled</label>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Speed</label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={animationControls.speed}
                      onChange={(e) => animationControls.setSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs">{animationControls.speed.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={animationControls.loop}
                      onChange={(e) => animationControls.setLoop(e.target.checked)}
                    />
                    <label className="text-xs">Loop</label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={animationControls.onPlay}
                      className="flex-1 text-xs"
                    >
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={animationControls.onPause}
                      className="flex-1 text-xs"
                    >
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={animationControls.onStop}
                      className="flex-1 text-xs"
                    >
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={animationControls.onReset}
                      className="flex-1 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Lighting Controls */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection('lighting')}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                Lighting
                <span>{activeSection === 'lighting' ? '−' : '+'}</span>
              </CardTitle>
            </CardHeader>
            {activeSection === 'lighting' && (
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Ambient Intensity</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={lightingControls.ambientIntensity}
                    onChange={(e) => lightingControls.setAmbientIntensity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{lightingControls.ambientIntensity.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Directional Intensity</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={lightingControls.directionalIntensity}
                    onChange={(e) => lightingControls.setDirectionalIntensity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{lightingControls.directionalIntensity.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Direction X</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={lightingControls.directionalX}
                    onChange={(e) => lightingControls.setDirectionalX(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{lightingControls.directionalX.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Direction Y</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={lightingControls.directionalY}
                    onChange={(e) => lightingControls.setDirectionalY(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{lightingControls.directionalY.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Direction Z</label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={lightingControls.directionalZ}
                    onChange={(e) => lightingControls.setDirectionalZ(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{lightingControls.directionalZ.toFixed(1)}</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Camera Controls */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection('camera')}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                Camera
                <span>{activeSection === 'camera' ? '−' : '+'}</span>
              </CardTitle>
            </CardHeader>
            {activeSection === 'camera' && (
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Position X</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={cameraControls.cameraX}
                    onChange={(e) => cameraControls.setCameraX(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{cameraControls.cameraX.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Position Y</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={cameraControls.cameraY}
                    onChange={(e) => cameraControls.setCameraY(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{cameraControls.cameraY.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Position Z</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={cameraControls.cameraZ}
                    onChange={(e) => cameraControls.setCameraZ(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{cameraControls.cameraZ.toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">FOV</label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="1"
                    value={cameraControls.fov}
                    onChange={(e) => cameraControls.setFov(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{cameraControls.fov}°</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Scene Controls */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection('scene')}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                Scene
                <span>{activeSection === 'scene' ? '−' : '+'}</span>
              </CardTitle>
            </CardHeader>
            {activeSection === 'scene' && (
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Background Color</label>
                  <input
                    type="color"
                    value={sceneControls.backgroundColor}
                    onChange={(e) => sceneControls.setBackgroundColor(e.target.value)}
                    className="w-full h-10 rounded"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sceneControls.enableGrid}
                    onChange={(e) => sceneControls.setEnableGrid(e.target.checked)}
                  />
                  <label className="text-xs">Enable Grid</label>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Grid Size</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={sceneControls.gridSize}
                    onChange={(e) => sceneControls.setGridSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{sceneControls.gridSize}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Grid Divisions</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={sceneControls.gridDivisions}
                    onChange={(e) => sceneControls.setGridDivisions(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs">{sceneControls.gridDivisions}</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Skeletons Controls */}
          {skeletonControls.skeletonNames.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection('skeletons')}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  Skeletons
                  <span>{activeSection === 'skeletons' ? '−' : '+'}</span>
                </CardTitle>
              </CardHeader>
              {activeSection === 'skeletons' && (
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Skeleton</label>
                    <select
                      value={skeletonControls.selectedSkeleton}
                      onChange={(e) => skeletonControls.setSelectedSkeleton(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="">All Skeletons</option>
                      {skeletonControls.skeletonNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={skeletonControls.skeletonVisible}
                      onChange={(e) => skeletonControls.setSkeletonVisible(e.target.checked)}
                    />
                    <label className="text-xs">Visible</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={skeletonControls.showSkeletonHelper}
                      onChange={(e) => skeletonControls.setShowSkeletonHelper(e.target.checked)}
                    />
                    <label className="text-xs">Show Helper</label>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Materials Controls */}
          {materialControls.materialNames.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection('materials')}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  Materials
                  <span>{activeSection === 'materials' ? '−' : '+'}</span>
                </CardTitle>
              </CardHeader>
              {activeSection === 'materials' && (
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Material</label>
                    <select
                      value={materialControls.selectedMaterial}
                      onChange={(e) => materialControls.setSelectedMaterial(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="">Select Material</option>
                      {materialControls.materialNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {materialControls.selectedMaterial && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">Color</label>
                        <input
                          type="color"
                          value={materialControls.materialColor}
                          onChange={(e) => materialControls.setMaterialColor(e.target.value)}
                          className="w-full h-10 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Metalness</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={materialControls.materialMetalness}
                          onChange={(e) => materialControls.setMaterialMetalness(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{materialControls.materialMetalness.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Roughness</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={materialControls.materialRoughness}
                          onChange={(e) => materialControls.setMaterialRoughness(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{materialControls.materialRoughness.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Opacity</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={materialControls.materialOpacity}
                          onChange={(e) => materialControls.setMaterialOpacity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{materialControls.materialOpacity.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Emissive Color</label>
                        <input
                          type="color"
                          value={materialControls.materialEmissive}
                          onChange={(e) => materialControls.setMaterialEmissive(e.target.value)}
                          className="w-full h-10 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Emissive Intensity</label>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={materialControls.materialEmissiveIntensity}
                          onChange={(e) => materialControls.setMaterialEmissiveIntensity(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{materialControls.materialEmissiveIntensity.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Textures Controls */}
          {textureControls.textureNames.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection('textures')}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  Textures
                  <span>{activeSection === 'textures' ? '−' : '+'}</span>
                </CardTitle>
              </CardHeader>
              {activeSection === 'textures' && (
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Texture</label>
                    <select
                      value={textureControls.selectedTexture}
                      onChange={(e) => textureControls.setSelectedTexture(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="">Select Texture</option>
                      {textureControls.textureNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {textureControls.selectedTexture && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">Scale X</label>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={textureControls.textureScaleX}
                          onChange={(e) => textureControls.setTextureScaleX(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{textureControls.textureScaleX.toFixed(1)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Scale Y</label>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={textureControls.textureScaleY}
                          onChange={(e) => textureControls.setTextureScaleY(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{textureControls.textureScaleY.toFixed(1)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Offset X</label>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.01"
                          value={textureControls.textureOffsetX}
                          onChange={(e) => textureControls.setTextureOffsetX(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{textureControls.textureOffsetX.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Offset Y</label>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.01"
                          value={textureControls.textureOffsetY}
                          onChange={(e) => textureControls.setTextureOffsetY(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{textureControls.textureOffsetY.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rotation</label>
                        <input
                          type="range"
                          min="0"
                          max="6.28"
                          step="0.01"
                          value={textureControls.textureRotation}
                          onChange={(e) => textureControls.setTextureRotation(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{(textureControls.textureRotation * 180 / Math.PI).toFixed(1)}°</span>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Nodes Controls */}
          {nodeControls.nodeNames.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleSection('nodes')}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  Nodes
                  <span>{activeSection === 'nodes' ? '−' : '+'}</span>
                </CardTitle>
              </CardHeader>
              {activeSection === 'nodes' && (
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Node</label>
                    <select
                      value={nodeControls.selectedNode}
                      onChange={(e) => nodeControls.setSelectedNode(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="">Select Node</option>
                      {nodeControls.nodeNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {nodeControls.selectedNode && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={nodeControls.nodeVisible}
                          onChange={(e) => nodeControls.setNodeVisible(e.target.checked)}
                        />
                        <label className="text-xs">Visible</label>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Position X</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.1"
                          value={nodeControls.nodePositionX}
                          onChange={(e) => nodeControls.setNodePositionX(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodePositionX.toFixed(1)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Position Y</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.1"
                          value={nodeControls.nodePositionY}
                          onChange={(e) => nodeControls.setNodePositionY(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodePositionY.toFixed(1)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Position Z</label>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="0.1"
                          value={nodeControls.nodePositionZ}
                          onChange={(e) => nodeControls.setNodePositionZ(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodePositionZ.toFixed(1)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rotation X</label>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.1"
                          value={nodeControls.nodeRotationX}
                          onChange={(e) => nodeControls.setNodeRotationX(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodeRotationX.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rotation Y</label>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.1"
                          value={nodeControls.nodeRotationY}
                          onChange={(e) => nodeControls.setNodeRotationY(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodeRotationY.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Rotation Z</label>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.1"
                          value={nodeControls.nodeRotationZ}
                          onChange={(e) => nodeControls.setNodeRotationZ(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodeRotationZ.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Scale</label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={nodeControls.nodeScale}
                          onChange={(e) => nodeControls.setNodeScale(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs">{nodeControls.nodeScale.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
