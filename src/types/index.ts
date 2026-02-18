/**
 * Types แยกไว้ในโฟลเดอร์ types เพื่อให้อ่านและนำกลับมาใช้ได้ง่าย
 */

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

export interface NoteAnnotation {
  id: string
  positionX: number
  positionY: number
  positionZ: number
  text: string
  offsetY: number
  createdAt: Date
}

export interface TextAnnotation {
  id: string
  positionX: number
  positionY: number
  positionZ: number
  text: string
  fontSize: number
  color: string
  offsetY: number
  createdAt: Date
}

/** รายการ Part Names: เลือก node จากโมเดล แล้วตั้งชื่อ (เช่น Head, Leg) */
export interface PartListItem {
  id: string
  nodeName: string
  label: string
}
