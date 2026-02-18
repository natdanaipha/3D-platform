import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2, X, Type } from 'lucide-react'
import type { NoteAnnotation, TextAnnotation, PartListItem } from '../types'

interface RightDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  notes?: NoteAnnotation[]
  isPlacingNote?: boolean
  onTogglePlaceNote?: () => void
  onNoteUpdate?: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete?: (id: string) => void
  textAnnotations?: TextAnnotation[]
  isPlacingText?: boolean
  onTogglePlaceText?: () => void
  onTextUpdate?: (id: string, updates: Partial<TextAnnotation>) => void
  onTextDelete?: (id: string) => void
  /** Part Names: รายการส่วนของโมเดล (เลือก node แล้วตั้งชื่อ) */
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

export default function RightDrawer({ 
  isOpen: externalIsOpen, 
  setIsOpen: externalSetIsOpen,
  notes = [],
  isPlacingNote = false,
  onTogglePlaceNote = () => {},
  onNoteUpdate = () => {},
  onNoteDelete = () => {},
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
}: RightDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<Partial<NoteAnnotation>>({})
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editTextAnnotation, setEditTextAnnotation] = useState<Partial<TextAnnotation>>({})
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  const handleStartEdit = (note: NoteAnnotation) => {
    setEditingNoteId(note.id)
    setEditNote({
      text: note.text,
      offsetY: note.offsetY,
    })
  }

  const handleSaveEdit = (id: string) => {
    onNoteUpdate(id, editNote)
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
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 rounded-r-none rounded-l-lg"
        variant="secondary"
        size="icon"
        data-drawer-toggle="right"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Drawer */}
      <div
        data-drawer="right"
        className={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-lg transition-transform duration-300 z-40 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '370px', maxHeight: '100vh' }}
      >
        <div className="p-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Annotations</h2>
            </div>

            {/* Note Annotations Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Note Annotations</h3>

              {/* Add Note Button */}
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

            {/* Notes List */}
            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs mt-1">Click "Add Note" to create one</p>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onNoteDelete(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNote.text || ''}
                            onChange={(e) => setEditNote({ ...editNote, text: e.target.value })}
                            className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                            placeholder="Enter note text..."
                            autoFocus
                          />
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Height from Ground (offsetY)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={editNote.offsetY !== undefined ? editNote.offsetY : 0.5}
                                onChange={(e) => setEditNote({ ...editNote, offsetY: parseFloat(e.target.value) })}
                                className="flex-1"
                              />
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={editNote.offsetY !== undefined ? editNote.offsetY : 0.5}
                                onChange={(e) => setEditNote({ ...editNote, offsetY: parseFloat(e.target.value) || 0 })}
                                className="w-20 p-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(note.id)}
                              className="flex-1"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {note.text ? (
                            <p 
                              className="text-sm cursor-pointer hover:bg-accent p-2 rounded-md -m-2"
                              onClick={() => handleStartEdit(note)}
                            >
                              {note.text}
                            </p>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(note)}
                              className="text-sm text-muted-foreground hover:text-foreground w-full text-left p-2 rounded-md hover:bg-accent -m-2"
                            >
                              Click to add text...
                            </button>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Position: ({note.positionX.toFixed(2)}, {note.positionY.toFixed(2)}, {note.positionZ.toFixed(2)})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Height: {note.offsetY.toFixed(2)} units
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
              </div>
            </div>

            {/* Text Annotations Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Text Annotations</h3>

              {/* Add Text Button */}
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

              {/* Part Names: เลือก node ก่อน แล้วตั้งชื่อรายการ (เช่น Head, Leg) */}
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

              {/* Text Annotations List */}
              <div className="space-y-2">
                {textAnnotations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No text annotations yet</p>
                    <p className="text-xs mt-1">Click "Add Text" to create one</p>
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
                                color: textAnnotation.color 
                              }}
                            >
                              {textAnnotation.text}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Position: ({textAnnotation.positionX.toFixed(2)}, {textAnnotation.positionY.toFixed(2)}, {textAnnotation.positionZ.toFixed(2)})
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Size: {textAnnotation.fontSize}px | Color: <span className="inline-block w-3 h-3 rounded border border-border" style={{ backgroundColor: textAnnotation.color }}></span> | Height: {textAnnotation.offsetY.toFixed(2)} units
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
    </>
  )
}
