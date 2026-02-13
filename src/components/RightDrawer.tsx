import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2, X } from 'lucide-react'
import type { NoteAnnotation } from '../App'

interface RightDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  notes?: NoteAnnotation[]
  isPlacingNote?: boolean
  onTogglePlaceNote?: () => void
  onNoteUpdate?: (id: string, text: string) => void
  onNoteDelete?: (id: string) => void
}

export default function RightDrawer({ 
  isOpen: externalIsOpen, 
  setIsOpen: externalSetIsOpen,
  notes = [],
  isPlacingNote = false,
  onTogglePlaceNote = () => {},
  onNoteUpdate = () => {},
  onNoteDelete = () => {},
}: RightDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  const handleStartEdit = (note: NoteAnnotation) => {
    setEditingNoteId(note.id)
    setEditText(note.text)
  }

  const handleSaveEdit = (id: string) => {
    onNoteUpdate(id, editText)
    setEditingNoteId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditText('')
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
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Note Annotations</h2>
            </div>

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
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                            placeholder="Enter note text..."
                            autoFocus
                          />
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
    </>
  )
}
