import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { NoteAnnotation } from '../../types'

interface NoteMarker3DProps {
  note: NoteAnnotation
}

const NOTE_COLOR = '#ef4444'

export default function NoteMarker3D({ note }: NoteMarker3DProps) {
  const markerRef = useRef<THREE.Mesh>(null)
  const { camera, gl } = useThree()
  const position: [number, number, number] = [
    note.positionX,
    note.positionY + (note.offsetY || 0),
    note.positionZ,
  ]

  useFrame(() => {
    if (markerRef.current) {
      const vector = new THREE.Vector3(...position)
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

  return (
    <group position={position}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={NOTE_COLOR}
          emissive={NOTE_COLOR}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color={NOTE_COLOR} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
