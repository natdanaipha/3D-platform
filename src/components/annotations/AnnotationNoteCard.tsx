import type { ComponentProps } from 'react'
import NoteCard from './NoteCard'

/**
 * การ์ดหมายเหตุเฉพาะเมนู Annotation Tool — ไม่แสดงปุ่มปากกา (แก้ไข) ในหัวการ์ด
 * ใช้กับ NoteOverlay ใน Viewer3D
 * เมนู Intro, Table of Contents ใช้ NoteCard โดยตรง (มีปุ่มปากกา)
 */
export type AnnotationNoteCardProps = Omit<ComponentProps<typeof NoteCard>, 'showEditButton'>

export default function AnnotationNoteCard(props: AnnotationNoteCardProps) {
  return <NoteCard {...props} showEditButton={false} />
}
