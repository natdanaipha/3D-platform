import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { NoteAnnotation } from '../../types'

function findBoneByName(group: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null
  group.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton?.bones && !found) {
      for (const bone of mesh.skeleton.bones as THREE.Bone[]) {
        if (bone.name === name) {
          found = bone
          break
        }
      }
    }
  })
  return found
}

interface NoteMarker3DProps {
  note: NoteAnnotation
  /** เปิดโหมดย้ายหมุด (ลากได้) */
  isMoving?: boolean
  /** Ref ของ Model (ใช้ดึง groupRef เพื่อคำนวณตำแหน่งจาก bone เมื่อมี attachedBoneName) */
  modelRef?: React.RefObject<{ groupRef: THREE.Group | null } | null>
  onPositionChange?: (position: { x: number; y: number; z: number }) => void
  /** เรียกเมื่อปล่อยเมาส์หลังลาก; ส่งตำแหน่งสุดท้ายเพื่อให้ parent ผูกกับ bone ใหม่ได้ */
  onMoveEnd?: (finalPosition?: { x: number; y: number; z: number }) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

const DEFAULT_NOTE_COLOR = '#ef4444'
const NOTE_FOCUS_COLOR = '#ffffff' 

export default function NoteMarker3D({
  note,
  isMoving = false,
  modelRef,
  onPositionChange,
  onMoveEnd,
  onDragStart,
  onDragEnd,
}: NoteMarker3DProps) {
  const markerRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const isDraggingRef = useRef(false)
  const dragPosRef = useRef({ x: 0, y: 0, z: 0 })
  const planeRef = useRef(new THREE.Plane())
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const intersectRef = useRef(new THREE.Vector3())
  const worldPosRef = useRef(new THREE.Vector3())

  // ตำแหน่งคงที่ (เมื่อไม่ผูก bone)
  const staticPosition: [number, number, number] = [
    note.positionX,
    note.positionY + (note.offsetY ?? 0),
    note.positionZ,
  ]

  useFrame(() => {
    const group = modelRef?.current?.groupRef
    const attached = note.attachedBoneName && note.attachedBoneOffset && group
    let posX = staticPosition[0]
    let posY = staticPosition[1]
    let posZ = staticPosition[2]
    if (attached && !isDraggingRef.current) {
      group.updateMatrixWorld(true)
      const bone = findBoneByName(group, note.attachedBoneName!)
      const offset = note.attachedBoneOffset!
      if (bone) {
        worldPosRef.current.set(offset.x, offset.y, offset.z).applyMatrix4(bone.matrixWorld)
        posX = worldPosRef.current.x
        posY = worldPosRef.current.y
        posZ = worldPosRef.current.z
      }
    }
    // อัปเดตตำแหน่ง group แบบ imperative เท่านั้น — ไม่ใช้ position prop ที่ <group> เพราะ R3F จะเขียนทับค่าที่ set ใน useFrame ทุกครั้งที่ re-render (ทำให้สามเหลี่ยม/ดาวขยับ)
    if (groupRef.current) {
      groupRef.current.position.set(posX, posY, posZ)
    }

    if (markerRef.current && !isDraggingRef.current) {
      const vector = new THREE.Vector3(posX, posY, posZ)
      vector.project(camera)
      const x = (vector.x * 0.5 + 0.5) * gl.domElement.clientWidth
      const y = (-(vector.y * 0.5) + 0.5) * gl.domElement.clientHeight
      window.dispatchEvent(
        new CustomEvent('noteScreenPosition', {
          detail: { id: note.id, screenPos: { x, y } },
        })
      )
    }
    if (customMarkerRef.current) {
      customMarkerRef.current.lookAt(camera.position)
    }
  })

  const handlePointerDown = (e: { stopPropagation: () => void; pointerId?: number; nativeEvent?: { pointerId?: number } }) => {
    if (!isMoving || !onPositionChange || !onDragStart) return
    e.stopPropagation()
    isDraggingRef.current = true
    const pos = groupRef.current?.position
    dragPosRef.current = pos
      ? { x: pos.x, y: pos.y, z: pos.z }
      : { x: staticPosition[0], y: staticPosition[1], z: staticPosition[2] }
    onDragStart()
    const el = gl.domElement
    const pid = e.nativeEvent?.pointerId ?? e.pointerId ?? 0
    el.setPointerCapture?.(pid)

    const onPointerMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      planeRef.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()),
        new THREE.Vector3(dragPosRef.current.x, dragPosRef.current.y, dragPosRef.current.z)
      )
      const hit = raycasterRef.current.ray.intersectPlane(planeRef.current, intersectRef.current)
      if (hit) {
        dragPosRef.current = { x: hit.x, y: hit.y, z: hit.z }
        onPositionChange({ x: hit.x, y: hit.y, z: hit.z })
      }
    }
    const onPointerUp = () => {
      isDraggingRef.current = false
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.releasePointerCapture?.(pid)
      const finalPos = { ...dragPosRef.current }
      onMoveEnd?.(finalPos)
      onDragEnd?.()
    }
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp, { once: true })
  }

  const ringInner = isMoving ? 0.16 : 0.08
  const ringOuter = isMoving ? 0.22 : 0.1
  const pinColor = note.strokeColor ?? note.color ?? DEFAULT_NOTE_COLOR
  const lineShape = note.lineShape ?? 'circle'
  const lineSizeNorm = typeof note.lineSize === 'number' ? Math.max(0, Math.min(100, note.lineSize)) / 100 : 0.5
  const pinScale = 0.5 + lineSizeNorm
  const lineUseDefault = note.lineUseDefault !== false
  const lineMarkerFileData = note.lineMarkerFileData ?? ''
  const useCustomMarker = !lineUseDefault && !!lineMarkerFileData

  const customMarkerRef = useRef<THREE.Mesh>(null)
  const [customTexture, setCustomTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!useCustomMarker || !lineMarkerFileData) {
      setCustomTexture((prev) => {
        if (prev) prev.dispose()
        return null
      })
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const tex = new THREE.Texture(img)
      tex.needsUpdate = true
      tex.flipY = true
      setCustomTexture((prev) => {
        if (prev) prev.dispose()
        return tex
      })
    }
    img.onerror = () => setCustomTexture((prev) => {
      if (prev) prev.dispose()
      return null
    })
    img.src = lineMarkerFileData
    return () => {
      img.src = ''
      setCustomTexture((prev) => {
        if (prev) prev.dispose()
        return null
      })
    }
  }, [useCustomMarker, lineMarkerFileData])

  const renderPinGeometry = () => {
    const baseR = isMoving ? 0.12 : 0.05
    const triStarScale = 1.35
    switch (lineShape) {
      case 'square':
        return <boxGeometry args={[baseR * 2, baseR * 2, baseR * 0.4]} />
      case 'triangle':
        return <coneGeometry args={[baseR * triStarScale, baseR * 2 * triStarScale, 3]} />
      case 'star':
        return <cylinderGeometry args={[baseR * 1.2 * triStarScale, baseR * 1.2 * triStarScale, baseR * 1.4 * triStarScale, 5]} />
      default:
        return <sphereGeometry args={[baseR, 16, 16]} />
    }
  }

  /** สามเหลี่ยม (cone): ปลายอยู่ที่ +Y ใน local — เลื่อน mesh ลง -baseR ให้ปลายอยู่ที่ group origin (จุดปัก) */
  /** ดาว (cylinder): ฐานอยู่ที่ -height/2 — เลื่อน mesh ขึ้น +height/2 ให้ฐานอยู่ที่ group origin */
  const baseR = isMoving ? 0.12 : 0.05
  const triStarScale = 2.2
  const starHeight = baseR * 1.4 * triStarScale
  const triangleOffsetY = lineShape === 'triangle' ? -baseR * triStarScale : 0
  const starOffsetY = lineShape === 'star' ? starHeight / 2 : 0
  const pinMeshOffsetY = useCustomMarker ? 0 : (triangleOffsetY + starOffsetY)
  const size = baseR * 2

  const setMarkerRefs = (el: THREE.Mesh | null) => {
    ;(markerRef as React.MutableRefObject<THREE.Mesh | null>).current = el
    ;(customMarkerRef as React.MutableRefObject<THREE.Mesh | null>).current = el
  }

  return (
    <group ref={groupRef} scale={[pinScale, pinScale, pinScale]}>
      {useCustomMarker && customTexture ? (
        <mesh
          ref={setMarkerRefs}
          onPointerDown={handlePointerDown}
          position={[0, 0, 0]}
        >
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            map={customTexture}
            transparent
            depthWrite={!isMoving}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh
          ref={markerRef}
          onPointerDown={handlePointerDown}
          position={[0, pinMeshOffsetY, 0]}
        >
          {renderPinGeometry()}
          <meshStandardMaterial
            color={isMoving ? NOTE_FOCUS_COLOR : pinColor}
            emissive={isMoving ? NOTE_FOCUS_COLOR : pinColor}
            emissiveIntensity={isMoving ? 1.2 : 0.5}
          />
        </mesh>
      )}
      {/* วงราบ (XZ) — ไม่แสดงเมื่อเป็นสามเหลี่ยมหรือดาว เพื่อไม่ให้เห็นจุดตั้งต้น */}
      {(lineShape === 'circle' || lineShape === 'square') && (
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 32]} />
        <meshBasicMaterial
          color={isMoving ? NOTE_FOCUS_COLOR : pinColor}
          transparent
          opacity={isMoving ? 0.8 : 0.3}
          depthWrite={!isMoving}
        />
      </mesh>
      )}
      {/* วงโฟกัสเมื่อโหมดย้าย: วงราบ + วงตั้ง 2 แนว ให้เห็นจากทุกมุม */}
      {isMoving && (
        <>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial
              color={NOTE_FOCUS_COLOR}
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial
              color={NOTE_FOCUS_COLOR}
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial
              color={NOTE_FOCUS_COLOR}
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
