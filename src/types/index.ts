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

/** หนึ่งหน้าใน Note: เนื้อหาเป็น HTML จาก rich editor (TinyMCE) */
export interface NotePage {
  content: string
}

export interface NoteAnnotation {
  id: string
  /** หัวข้อการ์ด (แก้ไขได้, ไม่ใส่ก็ได้) */
  title?: string
  positionX: number
  positionY: number
  positionZ: number
  /** @deprecated ใช้ pages แทน; เก็บไว้เพื่อ backward compatibility */
  text?: string
  /** เนื้อหาแบบหลายหน้า แต่ละหน้ามี HTML (รูป, ลิงก์, วิดีโอ ได้) */
  pages?: NotePage[]
  offsetY: number
  /** ความกว้างการ์ดบนจอ (px) — ปรับขนาดได้ */
  cardWidth?: number
  /** ความสูงการ์ดบนจอ (px) — ปรับขนาดได้ */
  cardHeight?: number
  /** ตำแหน่งการ์ดบนจอ (px) — ใช้คืนตำแหน่งเมื่อปิด/เปิด Note Annotations */
  cardPositionX?: number
  cardPositionY?: number
  createdAt: Date
  /** ถ้ามีค่า หมุดจะผูกกับกระดูกนี้และเคลื่อนตาม animation */
  attachedBoneName?: string
  /** ออฟเซ็ตจากกระดูก (local space) ใช้เมื่อ attachedBoneName มีค่า */
  attachedBoneOffset?: { x: number; y: number; z: number }
  /** สีหัวการ์ด/หมุด (hex เช่น #ef4444) — เปลี่ยนได้ใน modal แก้ไขโน้ต */
  color?: string
  /** ชื่อหัวข้อภาษาอังกฤษ (สำหรับ Annotation Tool) */
  titleEn?: string
  /** โหมดการโต้ตอบ: On Click ฯลฯ (สำหรับ Annotation Tool) */
  interactionMode?: string
  /** สไตล์การแสดง: Text ฯลฯ (สำหรับ Annotation Tool) */
  displayStyle?: string
  /** จำนวนหน้าของคำอธิบายไทย (สำหรับ Annotation Tool: pages[0..n-1]=ไทย, pages[n..]=อังกฤษ) */
  thaiPageCount?: number
  /** แท็บรูปภาพ/วิดีโอ/เสียง: อัปโหลดไฟล์ (true) หรือไม่อัปโหลด (false) */
  mediaUpload?: boolean
  /** ประเภทไฟล์: รูปภาพ | วิดีโอ | เสียง */
  mediaType?: 'image' | 'video' | 'audio'
  /** วิดีโอ: แหล่งที่มา — 'url' หรือ 'upload' */
  mediaSource?: 'url' | 'upload'
  /** วิดีโอ: URL (เช่น YouTube) */
  mediaUrl?: string
  /** ชื่อไฟล์ที่อัปโหลด (รูป/เสียง) หรือแสดงใน UI */
  mediaFileName?: string
  /** ข้อมูลไฟล์สำหรับ preview (data URL หรือ object URL) */
  mediaFileData?: string
  /** เล่นอัตโนมัติ (true) หรือกดเพื่อเล่น (false) */
  mediaAutoPlay?: boolean
  /** เสียง: วนซ้ำ (true) หรือครั้งเดียว (false) */
  mediaLoop?: boolean
  /** ใช้ภาพหน้าปกแบบอัปโหลด (วิดีโอ/เสียง) */
  mediaCoverEnabled?: boolean
  /** ข้อมูลภาพหน้าปก (data URL) */
  mediaCoverFileData?: string
  /** สถานะ: ใช้งาน (true) */
  mediaActive?: boolean
  /** เส้น Annotation: ใช้ค่าเริ่มต้น (true) หรืออัปโหลดไฟล์ (false) */
  lineUseDefault?: boolean
  /** รูปทรงเริ่มต้นของเส้น: circle | square | triangle | star */
  lineShape?: 'circle' | 'square' | 'triangle' | 'star'
  /** ชื่อไฟล์มาร์กเกอร์ที่อัปโหลด */
  lineMarkerFileName?: string
  /** ข้อมูลไฟล์มาร์กเกอร์ (data URL) */
  lineMarkerFileData?: string
  /** ขนาดมาร์กเกอร์/เส้น (0–100) */
  lineSize?: number
  /** สีเส้น (hex) */
  strokeColor?: string
  /** ความทึบเส้น (0–100) */
  strokeOpacity?: number
  /** ตำแหน่งเส้น: center | inside | outside */
  strokePosition?: 'center' | 'inside' | 'outside'
  /** ความหนาเส้น */
  strokeWeight?: number
  /** จุดเริ่มต้น: none | arrow */
  strokeStartPoint?: 'none' | 'arrow'
  /** จุดสิ้นสุด: none | arrow */
  strokeEndPoint?: 'none' | 'arrow'
  /** สไตล์เส้น: solid | dashed | dotted */
  strokeStyle?: 'solid' | 'dashed' | 'dotted'
  /** การต่อเส้น: miter | round | bevel */
  strokeJoin?: 'miter' | 'round' | 'bevel'
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

/** Trim range for a single animation item */
export interface TrimRange {
  sourceStartSec: number
  sourceEndSec: number
  trimInSec: number
  trimOutSec: number
}

/** Camera position + FOV snapshot */
export interface CameraState {
  x: number
  y: number
  z: number
  fov: number
}

/** Per-item camera override (opt-in) */
export interface CameraOverride {
  enabled: boolean
  camera: CameraState
}

/** Styling rule applied to non-selected nodes/materials */
export interface NonSelectedStyle {
  type: 'desaturate' | 'tint' | 'overrideColor'
  color: string
  intensity: number
}

/** Per-item highlight override (node/material emphasis) */
export interface HighlightOverride {
  enabled: boolean
  mode: 'node' | 'material' | 'both'
  selectedNodeIds: string[]
  selectedMaterialIds: string[]
  nonSelectedStyle: NonSelectedStyle
}

/** One animation entry inside a section's animation stack */
export interface AnimationItem {
  id: string
  animationClipName: string
  name?: string
  speed: number
  trim: TrimRange
  cameraOverride?: CameraOverride
  highlight?: HighlightOverride
}

/** Section สำหรับ Table of Contents */
export interface TocSection {
  id: string
  title: string
  /** @deprecated ใช้ animations[] แทน – kept for migration */
  animationName?: string
  /** @deprecated */
  animationSpeed?: number
  cameraX?: number
  cameraY?: number
  cameraZ?: number
  cameraFov?: number
  /** รายชื่อ node ที่จะ highlight เมื่อเข้า section นี้ */
  highlightNodes?: string[]
  /** Animation stack – เล่น sequential top→bottom */
  animations?: AnimationItem[]
}

/** รายการ Part Names: เลือก node จากโมเดล แล้วตั้งชื่อ (เช่น Head, Leg) */
export interface PartListItem {
  id: string
  nodeName: string
  label: string
}

/* ─── Sequencer / Timeline ─── */

export type TransitionEasing = 'linear' | 'easeInOut' | 'easeIn' | 'easeOut'

export interface ShotTransition {
  type: 'cut' | 'crossfade'
  duration: number // seconds
  easing: TransitionEasing
}

export interface Shot {
  shotId: string
  sectionId: string // ref → TocSection.id
  duration: number  // seconds
  transition: ShotTransition
}

export interface Sequence {
  id: string
  name: string
  shots: Shot[]
}
