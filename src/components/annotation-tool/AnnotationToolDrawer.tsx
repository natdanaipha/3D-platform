/**
 * Drawer สำหรับเมนู Annotation Tool
 * แยกโฟลเดอร์จาก RightDrawer (Intro / Table Content) เพื่อให้เปลี่ยน UI การใช้งานได้โดยไม่กระทบส่วนอื่น
 */
import { useState } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../ui/dialog'
import { ChevronLeft, ChevronRight, MapPin, Move, Plus, Trash2, X, Type } from 'lucide-react'
import type { NoteAnnotation, NotePage, TextAnnotation, PartListItem } from './types'
import NoteRichEditor from '../annotations/NoteRichEditor'

export interface AnnotationToolDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  notes?: NoteAnnotation[]
  isPlacingNote?: boolean
  onTogglePlaceNote?: () => void
  onNoteUpdate?: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete?: (id: string) => void
  movingNoteId?: string | null
  onStartMoveNote?: (noteId: string) => void
  textAnnotations?: TextAnnotation[]
  isPlacingText?: boolean
  onTogglePlaceText?: () => void
  onTextUpdate?: (id: string, updates: Partial<TextAnnotation>) => void
  onTextDelete?: (id: string) => void
  nodeNames?: string[]
  partListItems?: PartListItem[]
  isAddingPart?: boolean
  setIsAddingPart?: (v: boolean) => void
  pendingPartNodeName?: string | null
  setPendingPartNodeName?: (v: string | null) => void
  pendingPartLabel?: string
  setPendingPartLabel?: (v: string) => void
  onPartListAdd?: () => void
}

export default function AnnotationToolDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  notes = [],
  isPlacingNote = false,
  onTogglePlaceNote = () => {},
  onNoteUpdate = () => {},
  onNoteDelete = () => {},
  movingNoteId = null,
  onStartMoveNote = () => {},
  textAnnotations = [],
  isPlacingText = false,
  onTogglePlaceText = () => {},
  onTextUpdate = () => {},
  onTextDelete = () => {},
  nodeNames = [],
  partListItems = [],
  isAddingPart = false,
  setIsAddingPart = () => {},
  pendingPartNodeName = null,
  setPendingPartNodeName = () => {},
  pendingPartLabel = '',
  setPendingPartLabel = () => {},
  onPartListAdd = () => {},
}: AnnotationToolDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<Partial<NoteAnnotation>>({})
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editTextAnnotation, setEditTextAnnotation] = useState<Partial<TextAnnotation>>({})
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  const handleStartEdit = (note: NoteAnnotation) => {
    setEditingNoteId(note.id)
    const pages: NotePage[] =
      note.pages?.length ? note.pages : [{ content: note.text ?? '' }]
    setEditNote({
      title: note.title,
      text: note.text,
      pages,
      offsetY: note.offsetY,
      color: note.color,
    })
  }

  const handleSaveEdit = (id: string) => {
    onNoteUpdate(id, {
      ...editNote,
      title: editNote.title?.trim() || undefined,
    })
    setEditingNoteId(null)
    setEditNote({})
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditNote({})
  }

  const handleStartEditText = (textAnnotation: TextAnnotation) => {
    setEditingTextId(textAnnotation.id)
    setEditTextAnnotation({
      text: textAnnotation.text,
      fontSize: textAnnotation.fontSize,
      color: textAnnotation.color,
      offsetY: textAnnotation.offsetY,
    })
  }

  const handleSaveTextEdit = (id: string) => {
    onTextUpdate(id, editTextAnnotation)
    setEditingTextId(null)
    setEditTextAnnotation({})
  }

  const handleCancelTextEdit = () => {
    setEditingTextId(null)
    setEditTextAnnotation({})
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[70] rounded-r-none rounded-l-lg"
        variant="secondary"
        size="icon"
        data-drawer-toggle="right"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div
        data-drawer="right"
        className={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-lg transition-transform duration-300 z-[60] overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '370px', maxHeight: '100vh' }}
      >
        <div className="p-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Annotation Tool</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium text-muted-foreground">Note Annotations</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  Annotation Tool
                </span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">เครื่องมือใส่คำอธิบายประกอบบนโมเดล — แก้ UI ได้ที่โฟลเดอร์ annotation-tool</p>
              <Button
                onClick={onTogglePlaceNote}
                className={`w-full ${isPlacingNote ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                variant={isPlacingNote ? 'destructive' : 'default'}
              >
                {isPlacingNote ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Placing Note
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Note
                  </>
                )}
              </Button>

              {isPlacingNote && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Click on the 3D model to place a note annotation
                  </p>
                </div>
              )}

              <div className="space-y-2 pl-3 border-l-2 border-purple-500/30">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                    <p className="text-xs mt-1">Click &quot;Add Note&quot; to create one</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <Card key={note.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant={movingNoteId === note.id ? 'secondary' : 'ghost'}
                              size="icon"
                              className="h-6 w-6"
                              title={movingNoteId === note.id ? 'โหมดย้ายหมุดเปิด — ลากหมุดในวิว 3D แล้วปล่อยเพื่อย้าย' : 'ย้ายหมุด (เปิดโหมดแล้วลากหมุดไปตำแหน่งที่ต้องการ)'}
                              onClick={() => onStartMoveNote(movingNoteId === note.id ? '' : note.id)}
                            >
                              <Move className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onNoteDelete(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          {(() => {
                            const pages = note.pages?.length ? note.pages : [{ content: note.text ?? '' }]
                            const hasContent = pages.some((p) => p.content.trim().length > 0)
                            const preview = pages[0]?.content?.replace(/<[^>]+>/g, ' ').trim().slice(0, 80)
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(note)}
                                  className="text-sm cursor-pointer hover:bg-accent p-2 rounded-md -m-2 w-full text-left"
                                >
                                  {note.title != null && note.title.trim() !== '' && (
                                    <div className="font-medium text-sm text-foreground">
                                      {note.title}
                                    </div>
                                  )}
                                  {hasContent ? (
                                    <span className="line-clamp-2">{preview || '(ไม่มีข้อความ)'}{preview && preview.length >= 80 ? '…' : ''}</span>
                                  ) : (
                                    <span className="text-muted-foreground">คลิกเพื่อเพิ่มข้อความ รูป ลิงก์ หรือวิดีโอ...</span>
                                  )}
                                  {pages.length > 1 && (
                                    <span className="text-xs text-muted-foreground mt-1 block">
                                      {pages.length} หน้า
                                    </span>
                                  )}
                                </button>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Position: ({note.positionX.toFixed(2)}, {note.positionY.toFixed(2)}, {note.positionZ.toFixed(2)})
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Text Annotations</h3>
              <Button
                onClick={onTogglePlaceText}
                className={`w-full ${isPlacingText ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                variant={isPlacingText ? 'destructive' : 'default'}
              >
                {isPlacingText ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Placing Text
                  </>
                ) : (
                  <>
                    <Type className="mr-2 h-4 w-4" />
                    Add Text
                  </>
                )}
              </Button>

              {isPlacingText && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Click on the 3D model to place a text annotation
                  </p>
                </div>
              )}

              <div className="space-y-3 border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Part Names</h3>
                <p className="text-xs text-muted-foreground">
                  เพิ่มรายการ: เลือก node จากโมเดลก่อน แล้วใส่ชื่อ (เช่น Head, Leg)
                </p>
                {!isAddingPart ? (
                  <Button
                    onClick={() => setIsAddingPart(true)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Part
                  </Button>
                ) : (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">1. เลือก Node</label>
                      <select
                        value={pendingPartNodeName ?? ''}
                        onChange={(e) => setPendingPartNodeName(e.target.value || null)}
                        className="w-full p-2 text-sm border rounded-md"
                      >
                        <option value="">-- เลือก node --</option>
                        {nodeNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">2. ชื่อรายการ (เช่น Head, Leg)</label>
                      <input
                        type="text"
                        value={pendingPartLabel}
                        onChange={(e) => setPendingPartLabel(e.target.value)}
                        placeholder="เช่น Head, Leg"
                        className="w-full p-2 text-sm border rounded-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={onPartListAdd}
                        disabled={!pendingPartNodeName?.trim() || !pendingPartLabel.trim()}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingPart(false)
                          setPendingPartNodeName(null)
                          setPendingPartLabel('')
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {partListItems.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    รายการ {partListItems.length} รายการ — คลิกที่รายการด้านซ้ายเพื่อเน้นส่วนนั้น
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {textAnnotations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No text annotations yet</p>
                    <p className="text-xs mt-1">Click &quot;Add Text&quot; to create one</p>
                  </div>
                ) : (
                  textAnnotations.map((textAnnotation) => (
                    <Card key={textAnnotation.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Type className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(textAnnotation.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onTextDelete(textAnnotation.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {editingTextId === textAnnotation.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editTextAnnotation.text || ''}
                              onChange={(e) => setEditTextAnnotation({ ...editTextAnnotation, text: e.target.value })}
                              className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                              rows={2}
                              placeholder="Enter text..."
                              autoFocus
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Font Size</label>
                                <input
                                  type="number"
                                  min="8"
                                  max="72"
                                  value={editTextAnnotation.fontSize || 16}
                                  onChange={(e) => setEditTextAnnotation({ ...editTextAnnotation, fontSize: parseInt(e.target.value) || 16 })}
                                  className="w-full p-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Color</label>
                                <input
                                  type="color"
                                  value={editTextAnnotation.color || '#ffffff'}
                                  onChange={(e) => setEditTextAnnotation({ ...editTextAnnotation, color: e.target.value })}
                                  className="w-full h-9 border rounded-md cursor-pointer"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Height from Ground (offsetY)</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.1"
                                  value={editTextAnnotation.offsetY !== undefined ? editTextAnnotation.offsetY : 0.5}
                                  onChange={(e) => setEditTextAnnotation({ ...editTextAnnotation, offsetY: parseFloat(e.target.value) })}
                                  className="flex-1"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={editTextAnnotation.offsetY !== undefined ? editTextAnnotation.offsetY : 0.5}
                                  onChange={(e) => setEditTextAnnotation({ ...editTextAnnotation, offsetY: parseFloat(e.target.value) || 0 })}
                                  className="w-20 p-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveTextEdit(textAnnotation.id)}
                                className="flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelTextEdit}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div
                              className="text-sm cursor-pointer hover:bg-accent p-2 rounded-md -m-2"
                              onClick={() => handleStartEditText(textAnnotation)}
                              style={{
                                fontSize: `${textAnnotation.fontSize}px`,
                                color: textAnnotation.color,
                              }}
                            >
                              {textAnnotation.text}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Position: ({textAnnotation.positionX.toFixed(2)}, {textAnnotation.positionY.toFixed(2)}, {textAnnotation.positionZ.toFixed(2)})
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Size: {textAnnotation.fontSize}px | Color: <span className="inline-block w-3 h-3 rounded border border-border" style={{ backgroundColor: textAnnotation.color }} /> | Height: {textAnnotation.offsetY.toFixed(2)} units
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={editingNoteId !== null}
        onOpenChange={(open) => !open && handleCancelEdit()}
        closeOnOverlayClick={false}
      >
        <DialogContent
          className="w-full max-w-2xl"
          onClose={handleCancelEdit}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>แก้ไขโน้ต</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">หัวข้อ</label>
              <input
                type="text"
                value={editNote.title ?? ''}
                onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                placeholder="เช่น หัวข้อโน้ต หรือเว้นว่างได้"
                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">สีหัวการ์ด / หมุด</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editNote.color ?? '#ef4444'}
                  onChange={(e) => setEditNote({ ...editNote, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded border border-input bg-background p-0.5"
                  title="เลือกสี"
                />
                <input
                  type="text"
                  value={editNote.color ?? '#ef4444'}
                  onChange={(e) => setEditNote({ ...editNote, color: e.target.value || undefined })}
                  placeholder="#ef4444"
                  className="flex-1 p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>
            </div>
            <NoteRichEditor
              key={editingNoteId ?? 'modal-editor'}
              pages={editNote.pages ?? [{ content: editNote.text ?? '' }]}
              onChange={(pages) => setEditNote({ ...editNote, pages })}
              height={320}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => editingNoteId && handleSaveEdit(editingNoteId)}
              disabled={!editingNoteId}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
