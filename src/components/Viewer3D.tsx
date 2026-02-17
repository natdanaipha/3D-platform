import { Suspense, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Grid, useGLTF, useAnimations, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { NodeTransform, NoteAnnotation, TextAnnotation } from '../App'
import NoteMarker3D from './NoteMarker3D'
import NoteOverlay from './NoteOverlay'

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
  animationMode: 'single' | 'sequence'
  animationSequence: string[]
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
  materialTextureMap: Record<string, string>
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
  animationMode,
  animationSequence,
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
  materialTextureMap,
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
  const sequenceIndexRef = useRef<number>(0)
  const isPlayingSequenceRef = useRef<boolean>(false)
  const materialTexturesRef = useRef<Record<string, THREE.Texture>>({})
  
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

    const textureUrl = materialTextureMap[selectedMaterial]
    const textureLoader = new THREE.TextureLoader()

    // Helper function to apply material properties
    const applyMaterialProperties = (mat: any, texture: THREE.Texture | null = null) => {
      if (texture) {
        // Dispose old texture if exists
        if (mat.map && mat.map !== texture && materialTexturesRef.current[selectedMaterial] !== mat.map) {
          mat.map.dispose()
        }
        mat.map = texture
        mat.needsUpdate = true
      } else {
        // Remove texture map if exists
        if (mat.map && materialTexturesRef.current[selectedMaterial] === mat.map) {
          mat.map.dispose()
          materialTexturesRef.current[selectedMaterial] = null as any
        }
        mat.map = null
        mat.needsUpdate = true
        
        // Use color
        if (mat.color) {
          mat.color.setHex(parseInt(materialColor.replace('#', ''), 16))
        }
      }
      
      // Apply other properties
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

    // Load texture if URL exists
    if (textureUrl) {
      // Dispose old texture for this material if exists
      if (materialTexturesRef.current[selectedMaterial]) {
        materialTexturesRef.current[selectedMaterial].dispose()
      }

      textureLoader.load(
        textureUrl,
        (texture) => {
          texture.flipY = false // GLTF textures are typically flipped
          texture.needsUpdate = true
          materialTexturesRef.current[selectedMaterial] = texture

          traverseScene(scene, (obj) => {
            if ((obj as any).material) {
              const material = (obj as any).material
              const materialsArray = Array.isArray(material) ? material : [material]
              
              materialsArray.forEach((mat: any) => {
                if (mat.name === selectedMaterial) {
                  applyMaterialProperties(mat, texture)
                }
              })
            }
          })
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error)
          // On error, apply properties without texture
          traverseScene(scene, (obj) => {
            if ((obj as any).material) {
              const material = (obj as any).material
              const materialsArray = Array.isArray(material) ? material : [material]
              
              materialsArray.forEach((mat: any) => {
                if (mat.name === selectedMaterial) {
                  applyMaterialProperties(mat, null)
                }
              })
            }
          })
        }
      )
    } else {
      // No texture, use color instead
      traverseScene(scene, (obj) => {
        if ((obj as any).material) {
          const material = (obj as any).material
          const materialsArray = Array.isArray(material) ? material : [material]
          
          materialsArray.forEach((mat: any) => {
            if (mat.name === selectedMaterial) {
              applyMaterialProperties(mat, null)
            }
          })
        }
      })
    }

    // Cleanup function
    return () => {
      // Don't dispose here as texture might still be in use
      // Cleanup will happen when material changes or component unmounts
    }
  }, [scene, selectedMaterial, materialColor, materialMetalness, materialRoughness, materialOpacity, materialEmissive, materialEmissiveIntensity, materialTextureMap])

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      Object.values(materialTexturesRef.current).forEach((texture) => {
        if (texture) {
          texture.dispose()
        }
      })
      materialTexturesRef.current = {}
    }
  }, [])

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

  // Function to play next animation in sequence
  const playNextInSequence = () => {
    if (animationMode !== 'sequence' || animationSequence.length === 0) return
    
    const nextIndex = sequenceIndexRef.current + 1
    if (nextIndex >= animationSequence.length) {
      if (animationLoop) {
        sequenceIndexRef.current = 0
      } else {
        isPlayingSequenceRef.current = false
        return
      }
    } else {
      sequenceIndexRef.current = nextIndex
    }

    const nextAnimName = animationSequence[sequenceIndexRef.current]
    const nextAction = actions[nextAnimName]
    
    if (nextAction) {
      // Stop current animation
      if (currentActionRef.current) {
        currentActionRef.current.stop()
        currentActionRef.current.reset()
      }
      
      // Setup and play next animation
      currentActionRef.current = nextAction
      nextAction.setLoop(THREE.LoopOnce, 0)
      nextAction.setEffectiveTimeScale(animationSpeed)
      nextAction.reset()
      nextAction.play()
    }
  }

  // Expose animation control methods and groupRef
  useImperativeHandle(ref, () => ({
    play: () => {
      if (animationMode === 'sequence' && animationSequence.length > 0) {
        isPlayingSequenceRef.current = true
        sequenceIndexRef.current = 0
        playNextInSequence()
      } else if (currentActionRef.current) {
        currentActionRef.current.play()
      }
    },
    pause: () => {
      if (animationMode === 'sequence') {
        isPlayingSequenceRef.current = false
      }
      if (currentActionRef.current) {
        currentActionRef.current.paused = !currentActionRef.current.paused
      }
    },
    stop: () => {
      isPlayingSequenceRef.current = false
      sequenceIndexRef.current = 0
      if (currentActionRef.current) {
        currentActionRef.current.stop()
      }
    },
    reset: () => {
      isPlayingSequenceRef.current = false
      sequenceIndexRef.current = 0
      if (currentActionRef.current) {
        currentActionRef.current.reset()
      }
    },
    get groupRef() {
      return groupRef.current
    },
  }))

  // Update animation when selection changes
  useEffect(() => {
    if (!hasAnimations) {
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

    isPlayingSequenceRef.current = false
    sequenceIndexRef.current = 0

    if (animationMode === 'sequence') {
      // Sequence mode
      if (animationSequence.length === 0) {
        currentActionRef.current = null
        return
      }
      
      // Setup first animation in sequence
      const firstAnimName = animationSequence[0]
      const action = actions[firstAnimName]
      if (action) {
        currentActionRef.current = action
        action.setLoop(THREE.LoopOnce, 0)
        action.setEffectiveTimeScale(animationSpeed)
        if (animationEnabled) {
          isPlayingSequenceRef.current = true
          action.reset()
          action.play()
        }
      } else {
        currentActionRef.current = null
      }
    } else {
      // Single mode
      if (!selectedAnimation) {
        currentActionRef.current = null
        return
      }

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
    }
  }, [selectedAnimation, animationEnabled, actions, hasAnimations, animationLoop, animationSpeed, animationMode, animationSequence])

  // Update speed and loop mode
  useEffect(() => {
    const action = currentActionRef.current
    if (action) {
      action.setEffectiveTimeScale(animationSpeed)
      action.setLoop(animationLoop ? THREE.LoopRepeat : THREE.LoopOnce, animationLoop ? Infinity : 0)
    }
  }, [animationSpeed, animationLoop])

  // Update animation mixer each frame and check for sequence completion
  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta)
      
      // Check if current animation in sequence has finished
      if (animationMode === 'sequence' && isPlayingSequenceRef.current && currentActionRef.current && animationSequence.length > 0) {
        const action = currentActionRef.current
        const clip = action.getClip()
        const duration = clip.duration
        const time = action.time
        
        // Check if animation has finished (with small threshold for precision)
        if (time >= duration - 0.01) {
          playNextInSequence()
        }
      }
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
  animationMode: 'single' | 'sequence'
  animationSequence: string[]
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
  materialTextureMap: Record<string, string>
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
  // Note annotations
  notes: NoteAnnotation[]
  isPlacingNote: boolean
  onNotePlace: (position: { x: number; y: number; z: number }) => void
  onNoteUpdate: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete: (id: string) => void
  onNoteEdit?: (id: string) => void
  // Text annotations
  textAnnotations: TextAnnotation[]
  isPlacingText: boolean
  onTextPlace: (position: { x: number; y: number; z: number }) => void
}

// Emit canvas bounds for overlay (screen position calculation)
function CanvasInfoEmitter() {
  const { gl } = useThree()
  useFrame(() => {
    if (gl?.domElement) {
      const rect = gl.domElement.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent('canvasInfo', { detail: { left: rect.left, top: rect.top } })
      )
    }
  })
  return null
}

// Component to render text annotations in 3D space
function TextAnnotations({ textAnnotations }: { textAnnotations: TextAnnotation[] }) {
  return (
    <>
      {textAnnotations.map((textAnnotation) => (
        <group 
          key={textAnnotation.id} 
          position={[
            textAnnotation.positionX, 
            textAnnotation.positionY + (textAnnotation.offsetY || 0), 
            textAnnotation.positionZ
          ]}
        >
          <Html
            center
            distanceFactor={10}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              style={{
                fontSize: `${textAnnotation.fontSize}px`,
                color: textAnnotation.color,
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              {textAnnotation.text}
            </div>
          </Html>
        </group>
      ))}
    </>
  )
}

// Component to handle click events for placing notes and text annotations
function ClickHandler({ 
  isPlacingNote, 
  onNotePlace,
  isPlacingText,
  onTextPlace,
  modelRef 
}: { 
  isPlacingNote: boolean
  onNotePlace: (position: { x: number; y: number; z: number }) => void
  isPlacingText: boolean
  onTextPlace: (position: { x: number; y: number; z: number }) => void
  modelRef: React.RefObject<any>
}) {
  const { camera, gl, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  useEffect(() => {
    const isPlacing = isPlacingNote || isPlacingText
    if (!isPlacing) {
      gl.domElement.style.cursor = 'default'
      return
    }

    const handleClick = (event: MouseEvent) => {
      if (!isPlacing) return

      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)

      // Try to intersect with the model first
      const modelGroup = modelRef.current?.groupRef
      if (modelGroup) {
        const intersects = raycaster.current.intersectObject(modelGroup, true)
        if (intersects.length > 0) {
          const point = intersects[0].point
          if (isPlacingNote) {
            onNotePlace({ x: point.x, y: point.y, z: point.z })
          } else if (isPlacingText) {
            onTextPlace({ x: point.x, y: point.y, z: point.z })
          }
          return
        }
      }

      // If no model intersection, try to find model in scene
      const allObjects: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj.type === 'Mesh' || obj.type === 'Group') {
          allObjects.push(obj)
        }
      })
      
      if (allObjects.length > 0) {
        const intersects = raycaster.current.intersectObjects(allObjects, true)
        if (intersects.length > 0) {
          const point = intersects[0].point
          if (isPlacingNote) {
            onNotePlace({ x: point.x, y: point.y, z: point.z })
          } else if (isPlacingText) {
            onTextPlace({ x: point.x, y: point.y, z: point.z })
          }
          return
        }
      }

      // If no model intersection, intersect with a plane at y=0 (ground)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersectPoint = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(plane, intersectPoint)
      
      if (intersectPoint) {
        if (isPlacingNote) {
          onNotePlace({ x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z })
        } else if (isPlacingText) {
          onTextPlace({ x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z })
        }
      }
    }

    gl.domElement.addEventListener('click', handleClick)
    gl.domElement.style.cursor = 'crosshair'

    return () => {
      gl.domElement.removeEventListener('click', handleClick)
      gl.domElement.style.cursor = 'default'
    }
  }, [isPlacingNote, isPlacingText, camera, gl, scene, onNotePlace, onTextPlace, modelRef])

  return null
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
  animationMode,
  animationSequence,
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
  materialTextureMap,
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
  notes,
  isPlacingNote,
  onNotePlace,
  onNoteUpdate,
  onNoteDelete,
  onNoteEdit,
  textAnnotations,
  isPlacingText,
  onTextPlace,
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
      <NoteOverlay
        notes={notes}
        onNoteUpdate={onNoteUpdate}
        onNoteDelete={onNoteDelete}
        onNoteEdit={onNoteEdit}
      />
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
              animationMode={animationMode}
              animationSequence={animationSequence}
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
  materialTextureMap={materialTextureMap}
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
          <CanvasInfoEmitter />
          {notes.map((note) => (
            <NoteMarker3D key={note.id} note={note} />
          ))}
          <TextAnnotations textAnnotations={textAnnotations} />
          <ClickHandler 
            isPlacingNote={isPlacingNote} 
            onNotePlace={onNotePlace}
            isPlacingText={isPlacingText}
            onTextPlace={onTextPlace}
            modelRef={modelRef}
          />
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

