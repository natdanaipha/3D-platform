import { useRef, useState } from 'react'
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
  onMoveEnd?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

const NOTE_COLOR = '#ef4444'
const NOTE_FOCUS_COLOR = '#3b82f6' 

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

  // คำนวณตำแหน่งจริงแต่ละเฟรม: ถ้าผูก bone ใช้ตำแหน่งจาก bone ไม่ก็ใช้ตำแหน่งคงที่
  const [displayPosition, setDisplayPosition] = useState<[number, number, number]>(staticPosition)

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
        setDisplayPosition((prev) => (prev[0] === posX && prev[1] === posY && prev[2] === posZ ? prev : [posX, posY, posZ]))
      } else {
        setDisplayPosition(staticPosition)
      }
    } else if (!attached) {
      setDisplayPosition(staticPosition)
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
  })

  const position = displayPosition

  const handlePointerDown = (e: { stopPropagation: () => void; pointerId?: number; nativeEvent?: { pointerId?: number } }) => {
    if (!isMoving || !onPositionChange || !onDragStart) return
    e.stopPropagation()
    isDraggingRef.current = true
    dragPosRef.current = { x: position[0], y: position[1], z: position[2] }
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
      onMoveEnd?.()
      onDragEnd?.()
    }
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp, { once: true })
  }

  const sphereRadius = isMoving ? 0.07 : 0.05
  const ringInner = isMoving ? 0.12 : 0.08
  const ringOuter = isMoving ? 0.16 : 0.1

  return (
    <group ref={groupRef} position={displayPosition}>
      <mesh ref={markerRef} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshStandardMaterial
          color={isMoving ? NOTE_FOCUS_COLOR : NOTE_COLOR}
          emissive={isMoving ? NOTE_FOCUS_COLOR : NOTE_COLOR}
          emissiveIntensity={isMoving ? 1 : 0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 32]} />
        <meshBasicMaterial
          color={isMoving ? NOTE_FOCUS_COLOR : NOTE_COLOR}
          transparent
          opacity={isMoving ? 0.6 : 0.3}
        />
      </mesh>
      {/* วงโฟกัสรอบหมุดเมื่ออยู่ในโหมดย้าย */}
      {isMoving && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial
            color={NOTE_FOCUS_COLOR}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
