import { Suspense, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Grid, useGLTF, useAnimations, Html } from '@react-three/drei'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import type { NodeTransform, NoteAnnotation, TextAnnotation, HighlightOverride } from '../types'
import NoteMarker3D from './annotations/NoteMarker3D'
import NoteOverlay from './annotations/NoteOverlay'

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
  /** เมื่อมีค่า โหนดเหล่านี้และลูกจะแสดงสีปกติ ส่วนอื่นเป็นสีเทา */
  highlightedNodeNames: string[]
  /** Per-item highlight override (from playback) — takes precedence over highlightedNodeNames */
  activeItemHighlight?: HighlightOverride | null
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
  highlightedNodeNames,
  activeItemHighlight,
}, ref) => {
  const { scene, animations } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const { actions, mixer } = useAnimations(animations, groupRef)
  const currentActionRef = useRef<THREE.AnimationAction | null>(null)
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null)
  const [skeletonHelperObject, setSkeletonHelperObject] = useState<THREE.SkeletonHelper | null>(null)
  const skeletonNameByRef = useRef<Map<THREE.Skeleton, string>>(new Map())
  const sequenceIndexRef = useRef<number>(0)
  const isPlayingSequenceRef = useRef<boolean>(false)
  const materialTexturesRef = useRef<Record<string, THREE.Texture>>({})
  const grayMaterialRestoreRef = useRef<Map<THREE.Mesh, { material: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry }>>(new Map())
  
  // Helper function to traverse scene and collect data
  const traverseScene = (object: THREE.Object3D, callback: (obj: THREE.Object3D) => void) => {
    callback(object)
    object.children.forEach((child) => traverseScene(child, callback))
  }

  // Extract skeletons, materials, textures, and nodes from scene
  useEffect(() => {
    if (!scene) return

    const skeletonNamesList: string[] = []
    const materials: string[] = []
    const textures: string[] = []
    const nodes: string[] = []
    const initialNodeTransforms: Record<string, NodeTransform> = {}
    const seenSkeletons = new Set<THREE.Skeleton>()
    skeletonNameByRef.current.clear()

    traverseScene(scene, (obj) => {
      // Collect skeletons: หนึ่งชื่อต่อหนึ่ง skeleton (ใช้ root bone name เพื่อให้ดึงออกมาโชว์ได้)
      const mesh = obj as THREE.SkinnedMesh
      if (mesh.isSkinnedMesh && mesh.skeleton?.bones?.length) {
        const sk = mesh.skeleton
        if (seenSkeletons.has(sk)) return
        seenSkeletons.add(sk)
        const rootBone = sk.bones.find((b: THREE.Bone) => !b.parent || !sk.bones.includes(b.parent as THREE.Bone)) ?? sk.bones[0]
        const name = (rootBone?.name || mesh.name || `Skeleton_${skeletonNamesList.length}`).trim() || `Skeleton_${skeletonNamesList.length}`
        skeletonNamesList.push(name)
        skeletonNameByRef.current.set(sk, name)
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
      // Skip root scene object — its transform is controlled by Model Transform sliders via <primitive> props
      if (obj !== scene && obj.name && !nodes.includes(obj.name)) {
        nodes.push(obj.name)
      }
      if (obj !== scene && obj.name) {
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

    onSkeletonNamesChange(skeletonNamesList)
    onMaterialNamesChange(materials)
    onTextureNamesChange(textures)
    onNodeNamesChange(nodes, initialNodeTransforms)
  }, [scene, onSkeletonNamesChange, onMaterialNamesChange, onTextureNamesChange, onNodeNamesChange])

  // Control skeleton visibility (ใช้ชื่อจาก skeletonNameByRef ให้ตรงกับ dropdown)
  useEffect(() => {
    if (!scene) return

    traverseScene(scene, (obj) => {
      const mesh = obj as THREE.SkinnedMesh
      if (!mesh.isSkinnedMesh || !mesh.skeleton) return
      const name = skeletonNameByRef.current.get(mesh.skeleton)
      if (name === undefined) return
      if (selectedSkeleton !== '' && name !== selectedSkeleton) return
      mesh.skeleton.bones.forEach((bone: THREE.Bone) => {
        bone.visible = skeletonVisible
      })
    })
  }, [scene, selectedSkeleton, skeletonVisible])

  // Control skeleton helper: สร้างจาก root bone เพื่อให้ Three.js วาดเส้น skeleton ได้ (SkinnedMesh ไม่มี Bone เป็น children)
  useEffect(() => {
    if (!scene) return

    if (showSkeletonHelper) {
      let created = false
      traverseScene(scene, (obj) => {
        if (created) return
        const mesh = obj as THREE.SkinnedMesh
        if (!mesh.isSkinnedMesh || !mesh.skeleton?.bones?.length) return
        const name = skeletonNameByRef.current.get(mesh.skeleton)
        if (name === undefined) return
        if (selectedSkeleton !== '' && name !== selectedSkeleton) return
        if (skeletonHelperRef.current) {
          skeletonHelperRef.current.dispose()
          skeletonHelperRef.current = null
        }
        const sk = mesh.skeleton
        const rootBone = sk.bones.find((b: THREE.Bone) => !b.parent || !sk.bones.includes(b.parent as THREE.Bone)) ?? sk.bones[0]
        mesh.updateMatrixWorld(true)
        rootBone.updateMatrixWorld(true)
        const helper = new THREE.SkeletonHelper(rootBone as THREE.Object3D)
        ;(helper as any).root = mesh
        const mat = helper.material as THREE.LineBasicMaterial
        if (mat) {
          mat.depthTest = false
          mat.depthWrite = false
          mat.color.set(0x00ff00)
        }
        skeletonHelperRef.current = helper
        setSkeletonHelperObject(helper)
        created = true
      })
      if (!created) setSkeletonHelperObject(null)
    } else {
      if (skeletonHelperRef.current) {
        skeletonHelperRef.current.dispose()
        skeletonHelperRef.current = null
      }
      setSkeletonHelperObject(null)
    }

    return () => {
      if (skeletonHelperRef.current) {
        skeletonHelperRef.current.dispose()
        skeletonHelperRef.current = null
      }
      setSkeletonHelperObject(null)
    }
  }, [scene, selectedSkeleton, showSkeletonHelper])

  // ใช้เช็คข้าม mesh ที่ถูกเทาไว้โดย Part Names highlight (ไม่ให้ material effect เขียนทับ)
  const isGrayedMesh = (obj: THREE.Object3D) =>
    (obj as THREE.Mesh).isMesh && grayMaterialRestoreRef.current.has(obj as THREE.Mesh)

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
            if (isGrayedMesh(obj)) return
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
          traverseScene(scene, (obj) => {
            if (isGrayedMesh(obj)) return
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
      traverseScene(scene, (obj) => {
        if (isGrayedMesh(obj)) return
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
      if (isGrayedMesh(obj)) return
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
  // Skip root scene object — its transform is managed by <primitive> props (Model Transform sliders)
  useEffect(() => {
    if (!scene || !nodeTransforms) return

    Object.entries(nodeTransforms).forEach(([nodeName, t]: [string, NodeTransform]) => {
      traverseScene(scene, (obj) => {
        if (obj !== scene && obj.name === nodeName) {
          obj.visible = t.visible
          obj.position.set(t.positionX, t.positionY, t.positionZ)
          obj.rotation.set(t.rotationX, t.rotationY, t.rotationZ)
          obj.scale.set(t.scale, t.scale, t.scale)
        }
      })
    })
  }, [scene, nodeTransforms])

  // Highlight nodes: โหนดที่เลือกมีสีเดิม ส่วนอื่นเป็นสีเทา (รองรับหลาย node)
  // Also handles per-item highlight override (activeItemHighlight takes precedence)
  useEffect(() => {
    if (!scene) return

    const restoreGrayed = () => {
      grayMaterialRestoreRef.current.forEach((stored, mesh) => {
        if (mesh && stored) {
          mesh.material = stored.material
          if (stored.geometry) {
            if (mesh.geometry?.dispose) mesh.geometry.dispose()
            mesh.geometry = stored.geometry
          }
        }
      })
      grayMaterialRestoreRef.current.clear()
    }

    restoreGrayed()

    // Determine active highlight source
    const itemHL = activeItemHighlight
    const useItemHighlight = itemHL?.enabled &&
      (itemHL.selectedNodeIds.length > 0 || itemHL.selectedMaterialIds.length > 0)

    // If per-item highlight is active, use it; otherwise fall back to section-level
    if (!useItemHighlight && highlightedNodeNames.length === 0) return

    const highlightedMeshes = new Set<THREE.Mesh>()
    const boneIndices: { index: number; skeleton: THREE.Skeleton }[] = []

    // Determine which node names to use for highlight
    const effectiveNodeNames = useItemHighlight
      ? (itemHL!.mode === 'node' || itemHL!.mode === 'both' ? itemHL!.selectedNodeIds : [])
      : highlightedNodeNames

    // Material-based selection (per-item highlight only)
    const selectedMaterialNames = useItemHighlight && (itemHL!.mode === 'material' || itemHL!.mode === 'both')
      ? new Set(itemHL!.selectedMaterialIds)
      : new Set<string>()

    // Non-selected style for per-item highlight
    const nonSelectedColor = useItemHighlight ? itemHL!.nonSelectedStyle.color : '#484848'
    const nonSelectedIntensity = useItemHighlight ? itemHL!.nonSelectedStyle.intensity : 0.72
    const nonSelectedType = useItemHighlight ? itemHL!.nonSelectedStyle.type : 'desaturate'

    for (const nodeName of effectiveNodeNames) {
      let highlightRoot: THREE.Object3D | undefined
      scene.traverse((obj) => {
        if (obj.name === nodeName) highlightRoot = obj
      })
      if (!highlightRoot) {
        highlightRoot = scene.getObjectByName(nodeName) || undefined
      }
      if (highlightRoot) {
        let foundMesh = false
        highlightRoot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            highlightedMeshes.add(obj as THREE.Mesh)
            foundMesh = true
          }
        })
        if (!foundMesh) {
          scene.traverse((obj) => {
            const skinned = obj as THREE.SkinnedMesh
            if (skinned.isSkinnedMesh && skinned.skeleton) {
              const idx = skinned.skeleton.bones.findIndex(
                (b: THREE.Bone) => b === highlightRoot || b.name === nodeName,
              )
              if (idx >= 0) boneIndices.push({ index: idx, skeleton: skinned.skeleton })
            }
          })
        }
      }
    }

    // Material-based mesh selection: meshes whose material name is in selectedMaterialNames
    if (selectedMaterialNames.size > 0) {
      scene.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return
        const mesh = obj as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          if (mat && selectedMaterialNames.has(mat.name)) {
            highlightedMeshes.add(mesh)
            break
          }
        }
      })
    }

    if (highlightedMeshes.size === 0 && boneIndices.length > 0) {
      // Parse non-selected color for use in shader
      const _c = new THREE.Color(nonSelectedColor)
      const _r = _c.r.toFixed(4)
      const _g = _c.g.toFixed(4)
      const _b = _c.b.toFixed(4)
      const _int = nonSelectedIntensity.toFixed(4)

      const boneIndexSet = new Map<THREE.Skeleton, Set<number>>()
      for (const { index, skeleton } of boneIndices) {
        if (!boneIndexSet.has(skeleton)) boneIndexSet.set(skeleton, new Set())
        boneIndexSet.get(skeleton)!.add(index)
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.SkinnedMesh
        if (!mesh.isSkinnedMesh || !boneIndexSet.has(mesh.skeleton)) return
        const indices = boneIndexSet.get(mesh.skeleton)!
        const geom = mesh.geometry
        const skinIndex = geom.getAttribute('skinIndex') as THREE.BufferAttribute
        const skinWeight = geom.getAttribute('skinWeight') as THREE.BufferAttribute
        if (!skinIndex || !skinWeight) return
        const count = geom.getAttribute('position').count
        const highlightWeight = new Float32Array(count)
        for (let i = 0; i < count; i++) {
          let w = 0
          for (let c = 0; c < 4; c++) {
            const idx = skinIndex.getComponent(i, c)
            if (indices.has(idx)) w += skinWeight.getComponent(i, c)
          }
          highlightWeight[i] = w
        }
        const geomClone = geom.clone()
        geomClone.setAttribute('highlightWeight', new THREE.BufferAttribute(highlightWeight, 1))
        const originalMat = mesh.material as THREE.Material
        const originalGeom = mesh.geometry
        mesh.geometry = geomClone
        const mat = (Array.isArray(originalMat) ? originalMat[0] : originalMat).clone() as THREE.MeshStandardMaterial
        mat.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
          shader.vertexShader = 'attribute float highlightWeight;\nvarying float vHighlightWeight;\n' + shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            'vHighlightWeight = highlightWeight;\n#include <beginnormal_vertex>',
          )
          const dimFragment = nonSelectedType === 'overrideColor'
            ? `vec3 _nsColor = vec3(${_r}, ${_g}, ${_b});
vec3 _desat = mix(gl_FragColor.rgb, _nsColor, ${_int});
gl_FragColor.rgb = mix(_desat, gl_FragColor.rgb, vHighlightWeight);`
            : nonSelectedType === 'tint'
            ? `vec3 _tintColor = vec3(${_r}, ${_g}, ${_b});
vec3 _desat = mix(gl_FragColor.rgb, _tintColor, ${_int} * 0.5);
gl_FragColor.rgb = mix(_desat, gl_FragColor.rgb, vHighlightWeight);`
            : `float _luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 _nsColor = vec3(${_r}, ${_g}, ${_b});
vec3 _desat = mix(vec3(_luma), _nsColor, ${_int});
gl_FragColor.rgb = mix(_desat, gl_FragColor.rgb, vHighlightWeight);`
          shader.fragmentShader = 'varying float vHighlightWeight;\n' + shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            dimFragment + '\n#include <dithering_fragment>',
          )
        }
        mesh.material = mat
        grayMaterialRestoreRef.current.set(mesh as unknown as THREE.Mesh, { material: originalMat, geometry: originalGeom })
      })
      return () => restoreGrayed()
    }

    if (highlightedMeshes.size === 0 && selectedMaterialNames.size === 0) return

    // Build non-selected material override function using dynamic color/intensity
    const _c2 = new THREE.Color(nonSelectedColor)
    const _r2 = _c2.r.toFixed(4)
    const _g2 = _c2.g.toFixed(4)
    const _b2 = _c2.b.toFixed(4)
    const _int2 = nonSelectedIntensity.toFixed(4)

    const applyNonSelectedShader = (mat: THREE.Material) => {
      const m = mat as THREE.MeshStandardMaterial
      m.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
        const fragment = nonSelectedType === 'overrideColor'
          ? `gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${_r2}, ${_g2}, ${_b2}), ${_int2});`
          : nonSelectedType === 'tint'
          ? `gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${_r2}, ${_g2}, ${_b2}), ${_int2} * 0.5);`
          : `float _desatLuma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(_desatLuma), vec3(${_r2}, ${_g2}, ${_b2}), 0.5), ${_int2});`
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          fragment + '\n#include <dithering_fragment>',
        )
      }
      return m
    }

    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      if (highlightedMeshes.has(mesh)) return
      const original = mesh.material
      if (!original) return
      const grayMaterial = Array.isArray(original)
        ? (original as THREE.Material[]).map((m: THREE.Material) => applyNonSelectedShader(m.clone()))
        : applyNonSelectedShader((original as THREE.Material).clone())
      mesh.material = grayMaterial as THREE.Material
      grayMaterialRestoreRef.current.set(mesh, { material: original as THREE.Material | THREE.Material[] })
    })

    return () => {
      restoreGrayed()
    }
  }, [scene, highlightedNodeNames, activeItemHighlight])

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

  // Ref tracking the action used by section/item trim playback (separate from legacy play)
  const trimActionRef = useRef<THREE.AnimationAction | null>(null)
  const trimOutRef = useRef<number>(0)

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
    // --- Section / Item trim playback API ---
    /** Play a clip from trimIn→trimOut at given speed */
    playClipTrimmed: (clipName: string, trimIn: number, trimOut: number, speed: number) => {
      // stop any existing trim playback
      if (trimActionRef.current) {
        trimActionRef.current.stop()
        trimActionRef.current = null
      }
      const action = actions[clipName]
      if (!action) return
      trimOutRef.current = trimOut
      action.setLoop(THREE.LoopOnce, 0)
      action.clampWhenFinished = true
      action.setEffectiveTimeScale(speed)
      action.reset()
      action.time = trimIn
      action.play()
      trimActionRef.current = action
    },
    seekClip: (clipName: string, timeSec: number) => {
      const action = actions[clipName]
      if (!action) return
      action.paused = true
      action.time = timeSec
      action.play()
      action.paused = true
      trimActionRef.current = action
    },
    pauseClip: () => {
      if (trimActionRef.current) {
        trimActionRef.current.paused = true
      }
    },
    stopClip: () => {
      if (trimActionRef.current) {
        trimActionRef.current.stop()
        trimActionRef.current = null
      }
    },
    getClipTime: () => {
      return trimActionRef.current?.time ?? 0
    },
    /** Return map of clipName → duration */
    getClipDurations: () => {
      const map: Record<string, number> = {}
      animations.forEach((clip) => {
        map[clip.name] = clip.duration
      })
      return map
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

      // Enforce trimOut for section/item trim playback
      if (trimActionRef.current && !trimActionRef.current.paused) {
        if (trimActionRef.current.time >= trimOutRef.current - 0.02) {
          trimActionRef.current.paused = true
          trimActionRef.current.time = trimOutRef.current
        }
      }
    }
    // อัปเดต SkeletonHelper ให้ตามตำแหน่ง mesh ทุกเฟรม (ขยับตาม animation)
    const helper = skeletonHelperRef.current
    const root = helper && (helper as any).root
    if (root?.isSkinnedMesh && helper) {
      const mesh = root as THREE.SkinnedMesh
      mesh.updateMatrixWorld(true)
      helper.matrix.copy(mesh.matrixWorld)
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
      {skeletonHelperObject != null && (
        <primitive object={skeletonHelperObject} />
      )}
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

interface SmoothCameraAnimatorProps {
  targetX: number | null | undefined
  targetY: number | null | undefined
  targetZ: number | null | undefined
  targetFov: number | null | undefined
  onComplete?: () => void
}

function SmoothCameraAnimator({ targetX, targetY, targetZ, targetFov, onComplete }: SmoothCameraAnimatorProps) {
  const { camera } = useThree()
  const isAnimating = useRef(false)
  const target = useRef({ x: 0, y: 0, z: 0, fov: 50 })
  const completeCalled = useRef(false)

  useEffect(() => {
    if (targetX == null && targetY == null && targetZ == null && targetFov == null) return
    target.current = {
      x: targetX ?? camera.position.x,
      y: targetY ?? camera.position.y,
      z: targetZ ?? camera.position.z,
      fov: targetFov ?? (camera as THREE.PerspectiveCamera).fov,
    }
    isAnimating.current = true
    completeCalled.current = false
  }, [targetX, targetY, targetZ, targetFov, camera])

  useFrame(() => {
    if (!isAnimating.current) return

    const speed = 0.04
    const threshold = 0.01

    camera.position.x += (target.current.x - camera.position.x) * speed
    camera.position.y += (target.current.y - camera.position.y) * speed
    camera.position.z += (target.current.z - camera.position.z) * speed

    const perspCam = camera as THREE.PerspectiveCamera
    perspCam.fov += (target.current.fov - perspCam.fov) * speed
    perspCam.updateProjectionMatrix()

    const dx = Math.abs(target.current.x - camera.position.x)
    const dy = Math.abs(target.current.y - camera.position.y)
    const dz = Math.abs(target.current.z - camera.position.z)
    const df = Math.abs(target.current.fov - perspCam.fov)

    if (dx < threshold && dy < threshold && dz < threshold && df < threshold) {
      camera.position.set(target.current.x, target.current.y, target.current.z)
      perspCam.fov = target.current.fov
      perspCam.updateProjectionMatrix()
      isAnimating.current = false
      if (!completeCalled.current) {
        completeCalled.current = true
        onComplete?.()
      }
    }
  })

  return null
}

interface SceneBackgroundProps {
  backgroundColor: string
}

function SceneBackground({ backgroundColor }: SceneBackgroundProps) {
  return <color attach="background" args={[backgroundColor]} />
}

/**
 * Loads a custom HDR from a blob URL using RGBELoader
 * (drei's <Environment files={...}> can't detect .hdr extension from blob URLs)
 */
function CustomHdrEnvironment({
  hdrUrl,
  background,
  backgroundBlurriness,
  backgroundIntensity,
  environmentIntensity,
}: {
  hdrUrl: string
  background: boolean
  backgroundBlurriness: number
  backgroundIntensity: number
  environmentIntensity: number
}) {
  const { gl, scene } = useThree()
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()
    const loader = new RGBELoader()

    loader.load(hdrUrl, (hdrTexture) => {
      if (cancelled) {
        hdrTexture.dispose()
        pmremGenerator.dispose()
        return
      }
      const processed = pmremGenerator.fromEquirectangular(hdrTexture).texture
      setEnvMap((prev) => {
        prev?.dispose()
        return processed
      })
      hdrTexture.dispose()
      pmremGenerator.dispose()
    })

    return () => {
      cancelled = true
      setEnvMap((prev) => {
        prev?.dispose()
        return null
      })
      scene.environment = null
      scene.background = null
    }
  }, [hdrUrl, gl, scene])

  useEffect(() => {
    if (!envMap) return
    scene.environment = envMap
    scene.environmentIntensity = environmentIntensity
    if (background) {
      scene.background = envMap
      scene.backgroundBlurriness = backgroundBlurriness
      scene.backgroundIntensity = backgroundIntensity
    } else {
      scene.background = null
    }
  }, [envMap, background, backgroundBlurriness, backgroundIntensity, environmentIntensity, scene])

  return null
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
  // Smooth camera transition target (set to trigger animation)
  cameraTargetX?: number | null
  cameraTargetY?: number | null
  cameraTargetZ?: number | null
  cameraTargetFov?: number | null
  onCameraTransitionEnd?: () => void
  // Container size & alignment
  containerWidth?: string
  containerHeight?: string
  containerAlign?: 'left' | 'center' | 'right'
  containerVerticalAlign?: 'top' | 'center' | 'bottom'
  // Scene controls
  backgroundColor: string
  enableGrid: boolean
  gridSize: number
  gridDivisions: number
  gridCellColor: string
  gridSectionColor: string
  gridPositionY: number
  // Environment controls
  envPreset: string
  envHdrUrl: string | null
  envBackground: boolean
  envBackgroundBlurriness: number
  envBackgroundIntensity: number
  envIntensity: number
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
  /** โหนดที่เลือกจะแสดงสี ส่วนอื่นเทา (รองรับหลาย node) */
  highlightedNodeNames: string[]
  /** Per-item highlight override from playback */
  activeItemHighlight?: HighlightOverride | null
  // Note annotations
  notes: NoteAnnotation[]
  /** แสดง/ซ่อน Note Annotations บนวิว (หมุด + การ์ด) */
  showNoteAnnotations?: boolean
  isPlacingNote: boolean
  onNotePlace: (payload: { x: number; y: number; z: number; attachedBoneName?: string; attachedBoneOffset?: { x: number; y: number; z: number } }) => void
  onNoteUpdate: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete: (id: string) => void
  onNoteEdit?: (id: string) => void
  /** true = แสดงปุ่มปากกาในการ์ด (Intro, Table of Contents), false = ไม่แสดง (Annotation Tool) */
  showEditButtonOnNoteCards?: boolean
  /** เมื่อกด "ไปที่หมุด" ใน Annotations ให้เล็งกล้องไปที่ตำแหน่งนี้ */
  focusNotePosition: { x: number; y: number; z: number } | null
  onFocusNoteDone: () => void
  /** โหมดย้ายหมุด: id ของ Note ที่เปิดโหมด (ลากแล้วปล่อย = off) */
  movingNoteId: string | null
  onEndMoveNote: () => void
  // Text annotations
  textAnnotations: TextAnnotation[]
  isPlacingText: boolean
  onTextPlace: (position: { x: number; y: number; z: number }) => void
}

// เมื่อมี focusNotePosition ให้ตั้ง OrbitControls target ไปที่ตำแหน่งนั้น (ใช้หลังกด "ไปที่หมุด")
function FocusNoteEffect({
  focusNotePosition,
  controlsRef,
  onDone,
}: {
  focusNotePosition: { x: number; y: number; z: number } | null
  controlsRef: { current: { target: THREE.Vector3 } | null }
  onDone: () => void
}) {
  useEffect(() => {
    if (!focusNotePosition || !controlsRef.current) return
    controlsRef.current.target.set(focusNotePosition.x, focusNotePosition.y, focusNotePosition.z)
    onDone()
  }, [focusNotePosition, controlsRef, onDone])
  return null
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

// หา bone ที่ใกล้จุด world มากที่สุดจาก model group (สำหรับผูกหมุดให้เคลื่อนตาม animation)
// ถ้าไกลเกิน maxDistance จะไม่ผูก — หมุดจะอยู่ที่จุดนั้นคงที่ (ไม่ติด animation)
/** ตอนคลิกปักบนโมเดล: ใช้ระยะเผื่อให้จุดบนผิวโมเดลยังผูกได้ */
const MAX_ATTACH_DISTANCE_PLACE = 2.0
/** ตอนปล่อยหลังลาก: ใช้ระยะสั้น เพื่อให้ย้ายออกจากโมเดลแล้วไม่ติด animation */
const MAX_ATTACH_DISTANCE_DRAG = 1.0

function findClosestBoneAttachment(
  modelGroup: THREE.Group,
  worldPoint: THREE.Vector3,
  maxDistance: number = MAX_ATTACH_DISTANCE_DRAG
): { boneName: string; offset: { x: number; y: number; z: number } } | null {
  modelGroup.updateMatrixWorld(true)
  let closestBone: THREE.Bone | null = null
  let closestDistSq = Infinity
  const tempPos = new THREE.Vector3()
  const maxDistSq = maxDistance * maxDistance

  const traverse = (obj: THREE.Object3D) => {
    const mesh = obj as THREE.SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton?.bones?.length) {
      for (const bone of mesh.skeleton.bones as THREE.Bone[]) {
        bone.getWorldPosition(tempPos)
        const d = tempPos.distanceToSquared(worldPoint)
        if (d < closestDistSq) {
          closestDistSq = d
          closestBone = bone
        }
      }
    }
    obj.children.forEach(traverse)
  }
  traverse(modelGroup)

  if (!closestBone || closestDistSq > maxDistSq) return null
  const bone = closestBone as THREE.Bone
  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert()
  const localOffset = worldPoint.clone().applyMatrix4(inv)
  return {
    boneName: bone.name,
    offset: { x: localOffset.x, y: localOffset.y, z: localOffset.z },
  }
}

// Component to handle click events for placing notes and text annotations
function ClickHandler({
  isPlacingNote,
  onNotePlace,
  isPlacingText,
  onTextPlace,
  modelRef,
}: {
  isPlacingNote: boolean
  onNotePlace: (payload: { x: number; y: number; z: number; attachedBoneName?: string; attachedBoneOffset?: { x: number; y: number; z: number } }) => void
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
          const point = intersects[0].point.clone()
          if (isPlacingNote) {
            const attachment = findClosestBoneAttachment(modelGroup, point, MAX_ATTACH_DISTANCE_PLACE)
            onNotePlace({
              x: point.x,
              y: point.y,
              z: point.z,
              ...(attachment && {
                attachedBoneName: attachment.boneName,
                attachedBoneOffset: attachment.offset,
              }),
            })
          } else if (isPlacingText) {
            onTextPlace({ x: point.x, y: point.y, z: point.z })
          }
          return
        }
      }

      // If no model intersection, try to find model in scene (fallback)
      const allObjects: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj.type === 'Mesh' || obj.type === 'Group') {
          allObjects.push(obj)
        }
      })

      if (allObjects.length > 0) {
        const intersects = raycaster.current.intersectObjects(allObjects, true)
        if (intersects.length > 0) {
          const point = intersects[0].point.clone()
          if (isPlacingNote) {
            const hitObject = intersects[0].object
            const groupForBone = modelRef.current?.groupRef && modelRef.current.groupRef.contains(hitObject)
              ? modelRef.current.groupRef
              : null
            const attachment = groupForBone ? findClosestBoneAttachment(groupForBone, point, MAX_ATTACH_DISTANCE_PLACE) : null
            onNotePlace({
              x: point.x,
              y: point.y,
              z: point.z,
              ...(attachment && {
                attachedBoneName: attachment.boneName,
                attachedBoneOffset: attachment.offset,
              }),
            })
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
  cameraTargetX,
  cameraTargetY,
  cameraTargetZ,
  cameraTargetFov,
  onCameraTransitionEnd,
  containerWidth = '100%',
  containerHeight = '100vh',
  containerAlign = 'left',
  containerVerticalAlign = 'top',
  backgroundColor,
  enableGrid,
  gridSize,
  gridDivisions,
  gridCellColor,
  gridSectionColor,
  gridPositionY,
  envPreset,
  envHdrUrl,
  envBackground,
  envBackgroundBlurriness,
  envBackgroundIntensity,
  envIntensity,
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
  highlightedNodeNames,
  activeItemHighlight,
  notes,
  showNoteAnnotations = true,
  isPlacingNote,
  onNotePlace,
  onNoteUpdate,
  onNoteDelete,
  onNoteEdit,
  showEditButtonOnNoteCards = false,
  focusNotePosition,
  onFocusNoteDone,
  movingNoteId,
  onEndMoveNote,
  textAnnotations,
  isPlacingText,
  onTextPlace,
}: Viewer3DProps) {
  const controlsRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  const [controlsEnabled, setControlsEnabled] = useState(true)

  // Expose model ref to parent
  useEffect(() => {
    if (modelRef.current) {
      ;(window as any).__modelRef = modelRef.current
    }
  }, [modelRef.current])

  const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

  return (
    <div
      className="w-full h-screen flex"
      style={{
        justifyContent: justifyMap[containerAlign],
        alignItems: alignMap[containerVerticalAlign],
      }}
    >
    <div
      id="3d-container"
      className="relative"
      style={{
        width: containerWidth,
        height: containerHeight,
      }}
    >
      {showNoteAnnotations && (
        <NoteOverlay
          notes={notes}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          onNoteEdit={onNoteEdit}
          showEditButtonOnNoteCards={showEditButtonOnNoteCards}
        />
      )}
      <Canvas shadows>
        <SceneBackground backgroundColor={backgroundColor} />
        <Suspense fallback={null}>
          <CameraControls cameraX={cameraX} cameraY={cameraY} cameraZ={cameraZ} fov={fov} />
          <SmoothCameraAnimator
            targetX={cameraTargetX}
            targetY={cameraTargetY}
            targetZ={cameraTargetZ}
            targetFov={cameraTargetFov}
            onComplete={onCameraTransitionEnd}
          />
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
              position={[0, gridPositionY, 0]}
              cellColor={gridCellColor}
              sectionColor={gridSectionColor}
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
              highlightedNodeNames={highlightedNodeNames}
              activeItemHighlight={activeItemHighlight}
            />
          )}
          <CanvasInfoEmitter />
          {showNoteAnnotations && notes.map((note) => (
            <NoteMarker3D
              key={note.id}
              note={note}
              modelRef={modelRef}
              isMoving={movingNoteId === note.id}
              onPositionChange={(pos) =>
                onNoteUpdate(note.id, {
                  positionX: pos.x,
                  positionY: pos.y,
                  positionZ: pos.z,
                  offsetY: 0,
                  attachedBoneName: undefined,
                  attachedBoneOffset: undefined,
                })
              }
              onMoveEnd={(finalPosition) => {
                if (finalPosition && movingNoteId === note.id && modelRef.current?.groupRef) {
                  const attachment = findClosestBoneAttachment(
                    modelRef.current.groupRef,
                    new THREE.Vector3(finalPosition.x, finalPosition.y, finalPosition.z)
                  )
                  if (attachment) {
                    onNoteUpdate(note.id, {
                      positionX: finalPosition.x,
                      positionY: finalPosition.y,
                      positionZ: finalPosition.z,
                      attachedBoneName: attachment.boneName,
                      attachedBoneOffset: attachment.offset,
                    })
                  }
                }
                onEndMoveNote()
              }}
              onDragStart={() => setControlsEnabled(false)}
              onDragEnd={() => setControlsEnabled(true)}
            />
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
            enabled={controlsEnabled}
            enableDamping
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={100}
          />
          <FocusNoteEffect
            focusNotePosition={focusNotePosition}
            controlsRef={controlsRef}
            onDone={onFocusNoteDone}
          />
          {envHdrUrl ? (
            <CustomHdrEnvironment
              hdrUrl={envHdrUrl}
              background={envBackground}
              backgroundBlurriness={envBackgroundBlurriness}
              backgroundIntensity={envBackgroundIntensity}
              environmentIntensity={envIntensity}
            />
          ) : (
            <Environment
              preset={envPreset as any}
              background={envBackground}
              backgroundBlurriness={envBackgroundBlurriness}
              backgroundIntensity={envBackgroundIntensity}
              environmentIntensity={envIntensity}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
    </div>
  )
}

