import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Grid, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { NodeTransform } from '../App'

interface ModelProps {
  url: string
  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
  scale: number
  selectedAnimation: string
  animationEnabled: boolean
  animationSpeed: number
  animationLoop: boolean
  onAnimationNamesChange: (names: string[]) => void
  // Skeletons controls
  skeletonNames: string[]
  selectedSkeleton: string
  skeletonVisible: boolean
  showSkeletonHelper: boolean
  onSkeletonNamesChange: (names: string[]) => void
  // Materials controls
  materialNames: string[]
  selectedMaterial: string
  materialColor: string
  materialMetalness: number
  materialRoughness: number
  materialOpacity: number
  materialEmissive: string
  materialEmissiveIntensity: number
  onMaterialNamesChange: (names: string[]) => void
  // Textures controls
  textureNames: string[]
  selectedTexture: string
  textureScaleX: number
  textureScaleY: number
  textureOffsetX: number
  textureOffsetY: number
  textureRotation: number
  onTextureNamesChange: (names: string[]) => void
  // Nodes controls (per-node transforms)
  nodeNames: string[]
  nodeTransforms: Record<string, NodeTransform>
  onNodeNamesChange: (names: string[], initialTransforms?: Record<string, NodeTransform>) => void
}

// Component to load and display GLB model
const Model = forwardRef<any, ModelProps>(({
  url,
  positionX,
  positionY,
  positionZ,
  rotationX,
  rotationY,
  rotationZ,
  scale,
  selectedAnimation,
  animationEnabled,
  animationSpeed,
  animationLoop,
  onAnimationNamesChange,
  skeletonNames: _skeletonNames,
  selectedSkeleton,
  skeletonVisible,
  showSkeletonHelper,
  onSkeletonNamesChange,
  materialNames: _materialNames,
  selectedMaterial,
  materialColor,
  materialMetalness,
  materialRoughness,
  materialOpacity,
  materialEmissive,
  materialEmissiveIntensity,
  onMaterialNamesChange,
  textureNames: _textureNames,
  selectedTexture,
  textureScaleX,
  textureScaleY,
  textureOffsetX,
  textureOffsetY,
  textureRotation,
  onTextureNamesChange,
  nodeNames: _nodeNames,
  nodeTransforms,
  onNodeNamesChange,
}, ref) => {
  const { scene, animations } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const { actions, mixer } = useAnimations(animations, groupRef)
  const currentActionRef = useRef<THREE.AnimationAction | null>(null)
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null)
  
  // Helper function to traverse scene and collect data
  const traverseScene = (object: THREE.Object3D, callback: (obj: THREE.Object3D) => void) => {
    callback(object)
    object.children.forEach((child) => traverseScene(child, callback))
  }

  // Extract skeletons, materials, textures, and nodes from scene
  useEffect(() => {
    if (!scene) return

    const skeletons: string[] = []
    const materials: string[] = []
    const textures: string[] = []
    const nodes: string[] = []
    const initialNodeTransforms: Record<string, NodeTransform> = {}

    traverseScene(scene, (obj) => {
      // Collect skeletons
      if ((obj as any).skeleton) {
        const skeleton = (obj as any).skeleton
        if (skeleton.bones && skeleton.bones.length > 0) {
          const skeletonName = obj.name || `Skeleton_${skeletons.length}`
          if (!skeletons.includes(skeletonName)) {
            skeletons.push(skeletonName)
          }
        }
      }

      // Collect materials
      if ((obj as any).material) {
        const material = (obj as any).material
        if (Array.isArray(material)) {
          material.forEach((mat: THREE.Material) => {
            if (mat.name && !materials.includes(mat.name)) {
              materials.push(mat.name)
            }
          })
        } else if (material.name && !materials.includes(material.name)) {
          materials.push(material.name)
        }
      }

      // Collect textures from materials
      if ((obj as any).material) {
        const material = (obj as any).material
        const materialsArray = Array.isArray(material) ? material : [material]
        materialsArray.forEach((mat: any) => {
          if (mat.map && mat.map.name && !textures.includes(mat.map.name)) {
            textures.push(mat.map.name)
          }
          if (mat.normalMap && mat.normalMap.name && !textures.includes(mat.normalMap.name)) {
            textures.push(mat.normalMap.name)
          }
          if (mat.roughnessMap && mat.roughnessMap.name && !textures.includes(mat.roughnessMap.name)) {
            textures.push(mat.roughnessMap.name)
          }
          if (mat.metalnessMap && mat.metalnessMap.name && !textures.includes(mat.metalnessMap.name)) {
            textures.push(mat.metalnessMap.name)
          }
        })
      }

      // Collect nodes (meshes, groups, etc.) and read current transform from scene
      if (obj.name && !nodes.includes(obj.name)) {
        nodes.push(obj.name)
      }
      if (obj.name) {
        const s = obj.scale
        const scaleVal = (s.x + s.y + s.z) / 3
        initialNodeTransforms[obj.name] = {
          visible: obj.visible,
          positionX: obj.position.x,
          positionY: obj.position.y,
          positionZ: obj.position.z,
          rotationX: obj.rotation.x,
          rotationY: obj.rotation.y,
          rotationZ: obj.rotation.z,
          scale: scaleVal,
        }
      }
    })

    onSkeletonNamesChange(skeletons)
    onMaterialNamesChange(materials)
    onTextureNamesChange(textures)
    onNodeNamesChange(nodes, initialNodeTransforms)
  }, [scene, onSkeletonNamesChange, onMaterialNamesChange, onTextureNamesChange, onNodeNamesChange])

  // Control skeleton visibility
  useEffect(() => {
    if (!scene) return

    traverseScene(scene, (obj) => {
      if ((obj as any).skeleton && (selectedSkeleton === '' || obj.name === selectedSkeleton)) {
        const skeleton = (obj as any).skeleton
        if (skeleton.bones) {
          skeleton.bones.forEach((bone: THREE.Bone) => {
            bone.visible = skeletonVisible
          })
        }
      }
    })
  }, [scene, selectedSkeleton, skeletonVisible])

  // Control skeleton helper
  useEffect(() => {
    if (!scene || !groupRef.current) return

    if (showSkeletonHelper) {
      traverseScene(scene, (obj) => {
        if ((obj as any).skeleton && (selectedSkeleton === '' || obj.name === selectedSkeleton)) {
          if (!skeletonHelperRef.current) {
            const helper = new THREE.SkeletonHelper(obj)
            skeletonHelperRef.current = helper
            groupRef.current?.add(helper)
          }
        }
      })
    } else {
      if (skeletonHelperRef.current && groupRef.current) {
        groupRef.current.remove(skeletonHelperRef.current)
        skeletonHelperRef.current.dispose()
        skeletonHelperRef.current = null
      }
    }

    return () => {
      if (skeletonHelperRef.current && groupRef.current) {
        groupRef.current.remove(skeletonHelperRef.current)
        skeletonHelperRef.current.dispose()
        skeletonHelperRef.current = null
      }
    }
  }, [scene, selectedSkeleton, showSkeletonHelper])

  // Control materials
  useEffect(() => {
    if (!scene || !selectedMaterial) return

    traverseScene(scene, (obj) => {
      if ((obj as any).material) {
        const material = (obj as any).material
        const materialsArray = Array.isArray(material) ? material : [material]
        
        materialsArray.forEach((mat: any) => {
          if (mat.name === selectedMaterial) {
            if (mat.color) {
              mat.color.setHex(parseInt(materialColor.replace('#', ''), 16))
            }
            if (mat.metalness !== undefined) {
              mat.metalness = materialMetalness
            }
            if (mat.roughness !== undefined) {
              mat.roughness = materialRoughness
            }
            if (mat.opacity !== undefined) {
              mat.opacity = materialOpacity
              mat.transparent = materialOpacity < 1
            }
            if (mat.emissive) {
              mat.emissive.setHex(parseInt(materialEmissive.replace('#', ''), 16))
            }
            if (mat.emissiveIntensity !== undefined) {
              mat.emissiveIntensity = materialEmissiveIntensity
            }
          }
        })
      }
    })
  }, [scene, selectedMaterial, materialColor, materialMetalness, materialRoughness, materialOpacity, materialEmissive, materialEmissiveIntensity])

  // Control textures
  useEffect(() => {
    if (!scene || !selectedTexture) return

    traverseScene(scene, (obj) => {
      if ((obj as any).material) {
        const material = (obj as any).material
        const materialsArray = Array.isArray(material) ? material : [material]
        
        materialsArray.forEach((mat: any) => {
          if (mat.map && mat.map.name === selectedTexture) {
            mat.map.repeat.set(textureScaleX, textureScaleY)
            mat.map.offset.set(textureOffsetX, textureOffsetY)
            mat.map.rotation = textureRotation
            mat.map.needsUpdate = true
          }
        })
      }
    })
  }, [scene, selectedTexture, textureScaleX, textureScaleY, textureOffsetX, textureOffsetY, textureRotation])

  // Control nodes (apply per-node transforms)
  useEffect(() => {
    if (!scene || !nodeTransforms) return

    Object.entries(nodeTransforms).forEach(([nodeName, t]: [string, NodeTransform]) => {
      traverseScene(scene, (obj) => {
        if (obj.name === nodeName) {
          obj.visible = t.visible
          obj.position.set(t.positionX, t.positionY, t.positionZ)
          obj.rotation.set(t.rotationX, t.rotationY, t.rotationZ)
          obj.scale.set(t.scale, t.scale, t.scale)
        }
      })
    })
  }, [scene, nodeTransforms])

  console.log("animations : ", animations);
  // console.log('actions : ', actions);
  // console.log("mixer : ", mixer);
  
  // Get animation names
  const animationNames = animations.map((clip) => clip.name)
  const hasAnimations = animationNames.length > 0

  // Notify parent of animation names
  useEffect(() => {
    onAnimationNamesChange(animationNames)
  }, [animationNames, onAnimationNamesChange])

  // Expose animation control methods
  useImperativeHandle(ref, () => ({
    play: () => {
      if (currentActionRef.current) {
        currentActionRef.current.play()
      }
    },
    pause: () => {
      if (currentActionRef.current) {
        currentActionRef.current.paused = !currentActionRef.current.paused
      }
    },
    stop: () => {
      if (currentActionRef.current) {
        currentActionRef.current.stop()
      }
    },
    reset: () => {
      if (currentActionRef.current) {
        currentActionRef.current.reset()
      }
    },
  }))

  // Update animation when selection changes
  useEffect(() => {
    if (!hasAnimations || !selectedAnimation) {
      currentActionRef.current = null
      return
    }

    // Stop all animations first
    Object.values(actions).forEach((action) => {
      if (action) {
        action.stop()
        action.reset()
      }
    })

    // Get and configure selected animation
    const action = actions[selectedAnimation]
    if (action) {
      currentActionRef.current = action
      action.setLoop(animationLoop ? THREE.LoopRepeat : THREE.LoopOnce, animationLoop ? Infinity : 0)
      action.setEffectiveTimeScale(animationSpeed)
      if (animationEnabled) {
        action.play()
      }
    } else {
      currentActionRef.current = null
    }
  }, [selectedAnimation, animationEnabled, actions, hasAnimations, animationLoop, animationSpeed])

  // Update speed and loop mode
  useEffect(() => {
    const action = currentActionRef.current
    if (action) {
      action.setEffectiveTimeScale(animationSpeed)
      action.setLoop(animationLoop ? THREE.LoopRepeat : THREE.LoopOnce, animationLoop ? Infinity : 0)
    }
  }, [animationSpeed, animationLoop])

  // Update animation mixer each frame
  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        position={[positionX, positionY, positionZ]}
        rotation={[rotationX, rotationY, rotationZ]}
        scale={scale}
      />
    </group>
  )
})

Model.displayName = 'Model'

interface LightingProps {
  ambientIntensity: number
  directionalIntensity: number
  directionalX: number
  directionalY: number
  directionalZ: number
}

function Lighting({
  ambientIntensity,
  directionalIntensity,
  directionalX,
  directionalY,
  directionalZ,
}: LightingProps) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[directionalX, directionalY, directionalZ]}
        intensity={directionalIntensity}
        castShadow
      />
    </>
  )
}

interface CameraControlsProps {
  cameraX: number
  cameraY: number
  cameraZ: number
  fov: number
}

function CameraControls({ cameraX, cameraY, cameraZ, fov }: CameraControlsProps) {
  return (
    <PerspectiveCamera
      makeDefault
      position={[cameraX, cameraY, cameraZ]}
      fov={fov}
    />
  )
}

interface SceneBackgroundProps {
  backgroundColor: string
}

function SceneBackground({ backgroundColor }: SceneBackgroundProps) {
  return <color attach="background" args={[backgroundColor]} />
}

interface Viewer3DProps {
  modelUrl?: string
  // Model controls
  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
  scale: number
  // Animation controls
  selectedAnimation: string
  animationEnabled: boolean
  animationSpeed: number
  animationLoop: boolean
  onAnimationNamesChange: (names: string[]) => void
  // Lighting controls
  ambientIntensity: number
  directionalIntensity: number
  directionalX: number
  directionalY: number
  directionalZ: number
  // Camera controls
  cameraX: number
  cameraY: number
  cameraZ: number
  fov: number
  // Scene controls
  backgroundColor: string
  enableGrid: boolean
  gridSize: number
  gridDivisions: number
  // Skeletons controls
  skeletonNames: string[]
  selectedSkeleton: string
  skeletonVisible: boolean
  showSkeletonHelper: boolean
  onSkeletonNamesChange: (names: string[]) => void
  // Materials controls
  materialNames: string[]
  selectedMaterial: string
  materialColor: string
  materialMetalness: number
  materialRoughness: number
  materialOpacity: number
  materialEmissive: string
  materialEmissiveIntensity: number
  onMaterialNamesChange: (names: string[]) => void
  // Textures controls
  textureNames: string[]
  selectedTexture: string
  textureScaleX: number
  textureScaleY: number
  textureOffsetX: number
  textureOffsetY: number
  textureRotation: number
  onTextureNamesChange: (names: string[]) => void
  // Nodes controls (per-node transforms)
  nodeNames: string[]
  nodeTransforms: Record<string, NodeTransform>
  onNodeNamesChange: (names: string[], initialTransforms?: Record<string, NodeTransform>) => void
}

export default function Viewer3D({
  modelUrl,
  positionX,
  positionY,
  positionZ,
  rotationX,
  rotationY,
  rotationZ,
  scale,
  selectedAnimation,
  animationEnabled,
  animationSpeed,
  animationLoop,
  onAnimationNamesChange,
  ambientIntensity,
  directionalIntensity,
  directionalX,
  directionalY,
  directionalZ,
  cameraX,
  cameraY,
  cameraZ,
  fov,
  backgroundColor,
  enableGrid,
  gridSize,
  gridDivisions,
  skeletonNames,
  selectedSkeleton,
  skeletonVisible,
  showSkeletonHelper,
  onSkeletonNamesChange,
  materialNames,
  selectedMaterial,
  materialColor,
  materialMetalness,
  materialRoughness,
  materialOpacity,
  materialEmissive,
  materialEmissiveIntensity,
  onMaterialNamesChange,
  textureNames,
  selectedTexture,
  textureScaleX,
  textureScaleY,
  textureOffsetX,
  textureOffsetY,
  textureRotation,
  onTextureNamesChange,
  nodeNames,
  nodeTransforms,
  onNodeNamesChange,
}: Viewer3DProps) {
  const controlsRef = useRef<any>(null)
  const modelRef = useRef<any>(null)

  // Expose model ref to parent
  useEffect(() => {
    if (modelRef.current) {
      ;(window as any).__modelRef = modelRef.current
    }
  }, [modelRef.current])

  return (
    <div className="w-full h-screen relative">
      <Canvas shadows>
        <SceneBackground backgroundColor={backgroundColor} />
        <Suspense fallback={null}>
          <CameraControls cameraX={cameraX} cameraY={cameraY} cameraZ={cameraZ} fov={fov} />
          <Lighting
            ambientIntensity={ambientIntensity}
            directionalIntensity={directionalIntensity}
            directionalX={directionalX}
            directionalY={directionalY}
            directionalZ={directionalZ}
          />
          {enableGrid && (
            <Grid
              args={[gridSize, gridDivisions]}
              cellColor="#6f6f6f"
              sectionColor="#9d4b4b"
              fadeDistance={25}
              fadeStrength={1}
            />
          )}
          {modelUrl && (
            <Model
              ref={modelRef}
              url={modelUrl}
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
              onAnimationNamesChange={onAnimationNamesChange}
              skeletonNames={skeletonNames}
              selectedSkeleton={selectedSkeleton}
              skeletonVisible={skeletonVisible}
              showSkeletonHelper={showSkeletonHelper}
              onSkeletonNamesChange={onSkeletonNamesChange}
              materialNames={materialNames}
              selectedMaterial={selectedMaterial}
              materialColor={materialColor}
              materialMetalness={materialMetalness}
              materialRoughness={materialRoughness}
              materialOpacity={materialOpacity}
              materialEmissive={materialEmissive}
              materialEmissiveIntensity={materialEmissiveIntensity}
              onMaterialNamesChange={onMaterialNamesChange}
              textureNames={textureNames}
              selectedTexture={selectedTexture}
              textureScaleX={textureScaleX}
              textureScaleY={textureScaleY}
              textureOffsetX={textureOffsetX}
              textureOffsetY={textureOffsetY}
              textureRotation={textureRotation}
              onTextureNamesChange={onTextureNamesChange}
              nodeNames={nodeNames}
              nodeTransforms={nodeTransforms}
              onNodeNamesChange={onNodeNamesChange}
            />
          )}
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={100}
          />
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  )
}
