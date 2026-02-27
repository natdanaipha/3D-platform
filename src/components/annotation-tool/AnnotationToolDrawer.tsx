/**
 * Drawer สำหรับเมนู Annotation Tool
 * UI การจัดการ Note Annotations แบบบล็อก + แท็บ (ข้อมูลและปักตำแหน่ง | รูปภาพ/วิดีโอ/เสียง | เส้น Annotation)
 */
import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Type, Pin, Info, Minus, Upload, X, Circle, Square, Triangle, Star, HelpCircle } from 'lucide-react'
import type { NoteAnnotation, NotePage, TextAnnotation, PartListItem } from './types'
import NoteRichEditor from '../annotations/NoteRichEditor'

type AnnotationTab = 'data' | 'media' | 'line'

export interface AnnotationToolDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  notes?: NoteAnnotation[]
  /** เปิดโหมดปักหมุด: กดเพิ่ม Annotation แล้วคลิกบนโมเดลเพื่อเลือกตำแหน่ง */
  isPlacingNote?: boolean
  onTogglePlaceNote?: () => void
  /** โหมดย้ายหมุด: id ของ note ที่กำลังย้าย (แสดงวงสีฟ้ารอบหมุดบนโมเดล) */
  movingNoteId?: string | null
  onStartMoveNote?: (noteId: string) => void
  onNoteUpdate?: (id: string, updates: Partial<NoteAnnotation>) => void
  onNoteDelete?: (id: string) => void
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

const POSITION_RANGE = { x: { min: -1000, max: 1000 }, y: { min: -200, max: 200 }, z: { min: -1000, max: 1000 } }

function AnnotationBlock({
  note,
  index,
  isExpanded,
  onToggleExpand,
  activeTab,
  onTabChange,
  onUpdate,
  onDelete,
  movingNoteId,
  onStartMoveNote,
}: {
  note: NoteAnnotation
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  activeTab: AnnotationTab
  onTabChange: (tab: AnnotationTab) => void
  onUpdate: (updates: Partial<NoteAnnotation>) => void
  onDelete: () => void
  movingNoteId: string | null
  onStartMoveNote: (noteId: string) => void
}) {
  const pages = note.pages?.length ? note.pages : [{ content: note.text ?? '' }, { content: '' }]
  const thaiPageCount = note.thaiPageCount ?? 1
  const thaiPages = pages.slice(0, thaiPageCount)
  const englishPages = pages.slice(thaiPageCount)
  const titleTh = note.title ?? ''
  const titleEn = note.titleEn ?? ''
  const interactionMode = note.interactionMode ?? 'On Click'
  const displayStyle = note.displayStyle ?? 'Text'
  const mediaUpload = note.mediaUpload ?? true
  const mediaType = note.mediaType ?? 'image'
  const mediaSource = note.mediaSource ?? 'url'
  const mediaUrl = note.mediaUrl ?? ''
  const mediaFileName = note.mediaFileName ?? ''
  const mediaFileData = note.mediaFileData ?? ''
  const mediaAutoPlay = note.mediaAutoPlay ?? true
  const mediaLoop = note.mediaLoop ?? false
  const mediaCoverEnabled = note.mediaCoverEnabled ?? false
  const mediaCoverFileData = note.mediaCoverFileData ?? ''
  const mediaActive = note.mediaActive ?? true

  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const lineMarkerInputRef = useRef<HTMLInputElement>(null)

  const lineUseDefault = note.lineUseDefault ?? true
  const lineShape = note.lineShape ?? 'circle'
  const lineMarkerFileName = note.lineMarkerFileName ?? ''
  const lineMarkerFileData = note.lineMarkerFileData ?? ''
  const lineSize = typeof note.lineSize === 'number' ? note.lineSize : 50
  const strokeColor = note.strokeColor ?? '#000000'
  const strokeOpacity = typeof note.strokeOpacity === 'number' ? note.strokeOpacity : 100
  const strokePosition = note.strokePosition ?? 'center'
  const strokeWeight = typeof note.strokeWeight === 'number' ? note.strokeWeight : 1
  const strokeStartPoint = note.strokeStartPoint ?? 'none'
  const strokeEndPoint = note.strokeEndPoint ?? 'arrow'
  const strokeStyle = note.strokeStyle ?? 'solid'
  const strokeJoin = note.strokeJoin ?? 'round'

  const handlePagesTh = (newPages: NotePage[]) => {
    onUpdate({
      pages: [...newPages, ...englishPages],
      thaiPageCount: newPages.length,
    })
  }
  const handlePagesEn = (newPages: NotePage[]) => {
    onUpdate({
      pages: [...thaiPages, ...newPages],
    })
  }

  const handleUpdatePosition = () => {
    onUpdate({
      positionX: note.positionX,
      positionY: note.positionY,
      positionZ: note.positionZ,
    })
    onStartMoveNote(note.id)
  }

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      onUpdate({
        mediaFileName: file.name,
        mediaFileData: data,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({
        mediaCoverEnabled: true,
        mediaCoverFileData: reader.result as string,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeMediaFile = () => {
    onUpdate({ mediaFileName: undefined, mediaFileData: undefined })
  }

  const handleLineMarkerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({
        lineMarkerFileName: file.name,
        lineMarkerFileData: reader.result as string,
        lineUseDefault: false,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeLineMarkerFile = () => {
    onUpdate({ lineMarkerFileName: undefined, lineMarkerFileData: undefined })
  }

  return (
    <Card className="overflow-hidden border border-border bg-card">
      <div className="flex items-center justify-between gap-2 p-3 bg-muted/40 border-b border-border">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 text-left font-medium text-sm"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">
            {titleTh.trim() ? titleTh.trim() : `Annotation ${index + 1}`}
          </span>
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onDelete} title="ลบ">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <>
          <div className="flex border-b border-border bg-muted/20">
            <button
              type="button"
              onClick={() => onTabChange('data')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'data'
                  ? 'bg-background border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ข้อมูลและปักตำแหน่ง
            </button>
            <button
              type="button"
              onClick={() => onTabChange('media')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'media'
                  ? 'bg-background border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              รูปภาพ/วิดีโอ/เสียง
            </button>
            <button
              type="button"
              onClick={() => onTabChange('line')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'line'
                  ? 'bg-background border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              เส้น Annotation
            </button>
          </div>

          <div className="p-3 space-y-4">
            {activeTab === 'data' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">ชื่อหัวข้อ (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={titleTh}
                    onChange={(e) => onUpdate({ title: e.target.value || undefined })}
                    placeholder="เช่น หลอดเลือดหัวใจ"
                    className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">ชื่อหัวข้อ (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => onUpdate({ titleEn: e.target.value || undefined })}
                    placeholder="Title (English)"
                    className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">คำอธิบาย (ภาษาไทย)</label>
                  <NoteRichEditor
                    pages={thaiPages.length ? thaiPages : [{ content: '' }]}
                    onChange={handlePagesTh}
                    height={140}
                    placeholder="เป็นส่วนหนึ่งของระบบไหลเวียนโลหิต..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">คำอธิบาย (ภาษาอังกฤษ)</label>
                  <NoteRichEditor
                    pages={englishPages.length ? englishPages : [{ content: '' }]}
                    onChange={handlePagesEn}
                    height={140}
                    placeholder="Description (English)..."
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Interaction Mode</label>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <select
                    value={interactionMode}
                    onChange={(e) => onUpdate({ interactionMode: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="On Click">On Click</option>
                    <option value="On Hover">On Hover</option>
                  </select>
                  <div className="flex items-center gap-1.5 pt-1">
                    <label className="text-xs font-medium text-muted-foreground">Display Style</label>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <select
                    value={displayStyle}
                    onChange={(e) => onUpdate({ displayStyle: e.target.value })}
                    className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Text">Text</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">ตำแหน่ง Annotation</p>
                  {(['x', 'y', 'z'] as const).map((axis) => {
                    const key = axis.toUpperCase()
                    const val = axis === 'x' ? note.positionX : axis === 'y' ? note.positionY : note.positionZ
                    const range = axis === 'x' ? POSITION_RANGE.x : axis === 'y' ? POSITION_RANGE.y : POSITION_RANGE.z
                    const sliderVal = Math.max(range.min, Math.min(range.max, val))
                    return (
                      <div key={axis} className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">แกน {key}</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            step="0.5"
                            value={Number.isFinite(val) ? val : ''}
                            onChange={(e) => {
                              const n = Number(e.target.value)
                              if (!Number.isFinite(n)) return
                              if (axis === 'x') onUpdate({ positionX: n })
                              else if (axis === 'y') onUpdate({ positionY: n })
                              else onUpdate({ positionZ: n })
                            }}
                            className="w-20 p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="range"
                            min={range.min}
                            max={range.max}
                            step={1}
                            value={sliderVal}
                            onChange={(e) => {
                              const n = Number(e.target.value)
                              if (axis === 'x') onUpdate({ positionX: n })
                              else if (axis === 'y') onUpdate({ positionY: n })
                              else onUpdate({ positionZ: n })
                            }}
                            className="flex-1 h-2 rounded-full bg-muted accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
                          />
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full gap-2 mt-2"
                    onClick={handleUpdatePosition}
                  >
                    <Pin className="h-4 w-4" />
                    อัปเดตตำแหน่ง Annotation
                  </Button>
                  {movingNoteId === note.id && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                      <p className="text-sm text-primary">
                        โหมดย้ายหมุด — หมุดนี้มีวงสีฟ้ารอบบนโมเดล ลากไปตำแหน่งที่ต้องการแล้วปล่อยเมาส์
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onStartMoveNote('')}
                      >
                        ยกเลิกโหมดย้าย
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ไฟล์ :</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`media-upload-${note.id}`}
                        checked={mediaUpload}
                        onChange={() => onUpdate({ mediaUpload: true })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">อัปโหลดไฟล์</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`media-upload-${note.id}`}
                        checked={!mediaUpload}
                        onChange={() => onUpdate({ mediaUpload: false })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">ไม่อัปโหลดไฟล์</span>
                    </label>
                  </div>
                </div>

                {mediaUpload && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">ประเภทไฟล์ :</p>
                      <div className="flex gap-4">
                        {(['image', 'video', 'audio'] as const).map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`media-type-${note.id}`}
                              checked={mediaType === type}
                              onChange={() => onUpdate({ mediaType: type })}
                              className="rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm">
                              {type === 'image' ? 'รูปภาพ' : type === 'video' ? 'วิดีโอ' : 'เสียง'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* รูปภาพ */}
                    {mediaType === 'image' && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">อัปโหลดไฟล์รูปภาพ</h4>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleMediaFileChange}
                        />
                        {mediaFileData || mediaFileName ? (
                          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                            {mediaFileData && (
                              <div className="rounded overflow-hidden bg-muted/50 max-h-40">
                                <img src={mediaFileData} alt="Preview" className="w-full h-auto object-contain max-h-40" />
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                                <Upload className="h-4 w-4 shrink-0" />
                                {mediaFileName || 'ไฟล์รูปภาพ'}
                              </span>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeMediaFile}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <Upload className="h-10 w-10 text-orange-500" />
                            <span className="text-sm">วางไฟล์ที่นี่ หรือ <span className="text-primary underline">เลือกไฟล์</span></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* วิดีโอ */}
                    {mediaType === 'video' && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">ประเภทไฟล์ :</p>
                          <select
                            value={mediaSource}
                            onChange={(e) => onUpdate({ mediaSource: e.target.value as 'url' | 'upload' })}
                            className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="url">URL</option>
                            <option value="upload">อัปโหลดไฟล์</option>
                          </select>
                        </div>
                        {mediaSource === 'url' && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">URL *</label>
                            <input
                              type="url"
                              value={mediaUrl}
                              onChange={(e) => onUpdate({ mediaUrl: e.target.value })}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        )}
                        {mediaSource === 'upload' && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">อัปโหลดไฟล์วิดีโอ</h4>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={handleMediaFileChange}
                            />
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                            >
                              <Upload className="h-10 w-10" />
                              <span className="text-sm">วางไฟล์ที่นี่ หรือ เลือกไฟล์</span>
                            </div>
                            {mediaFileName && (
                              <p className="text-xs text-muted-foreground mt-1">ไฟล์: {mediaFileName}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">ตั้งค่า</p>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`video-autoplay-${note.id}`}
                                checked={mediaAutoPlay}
                                onChange={() => onUpdate({ mediaAutoPlay: true })}
                                className="rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">เล่นอัตโนมัติ</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`video-autoplay-${note.id}`}
                                checked={!mediaAutoPlay}
                                onChange={() => onUpdate({ mediaAutoPlay: false })}
                                className="rounded-full border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">กดเพื่อเล่น</span>
                            </label>
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <h4 className="text-sm font-medium mb-2">อัปโหลดไฟล์ภาพหน้าปก</h4>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mediaCoverEnabled}
                              onChange={(e) => onUpdate({ mediaCoverEnabled: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                            />
                            <span className="text-xs text-muted-foreground">
                              อัปโหลดภาพปกวิดีโอ (หากไม่ได้อัปโหลดภาพ ระบบจะตั้งภาพวิดีโอเฟรมแรกเป็นภาพหน้าปก)
                            </span>
                          </label>
                          {mediaCoverEnabled && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleCoverFileChange}
                              />
                              {mediaCoverFileData ? (
                                <div className="flex items-center gap-2">
                                  <img src={mediaCoverFileData} alt="Cover" className="h-12 w-12 object-cover rounded border" />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => onUpdate({ mediaCoverFileData: undefined })}>
                                    ลบภาพปก
                                  </Button>
                                </div>
                              ) : (
                                <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                                  เลือกภาพ
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* เสียง */}
                    {mediaType === 'audio' && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">อัปโหลดไฟล์เสียง</h4>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".mp3,.wav,.wma,audio/mp3,audio/wav,audio/x-ms-wma"
                            className="hidden"
                            onChange={handleMediaFileChange}
                          />
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <Upload className="h-10 w-10 text-orange-500" />
                            <span className="text-sm text-center">
                              วางไฟล์ที่นี่ หรือ <span className="text-primary underline">เลือกไฟล์</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            อัปโหลดไฟล์เสียง .mp3, .wav, .wma (ขนาดไม่เกิน 1 MB)
                          </p>
                          {mediaFileName && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Upload className="h-3 w-3" /> {mediaFileName}
                              <button type="button" onClick={removeMediaFile} className="text-destructive hover:underline ml-1">ลบ</button>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">ตั้งค่าไฟล์เสียง</p>
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`audio-autoplay-${note.id}`}
                                  checked={mediaAutoPlay}
                                  onChange={() => onUpdate({ mediaAutoPlay: true })}
                                  className="rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">เล่นอัตโนมัติ</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`audio-autoplay-${note.id}`}
                                  checked={!mediaAutoPlay}
                                  onChange={() => onUpdate({ mediaAutoPlay: false })}
                                  className="rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">กดเพื่อเล่น</span>
                              </label>
                            </div>
                            <div className="flex gap-4">
                              <span className="text-xs text-muted-foreground">วนซ้ำ (Loop) :</span>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`audio-loop-${note.id}`}
                                  checked={!mediaLoop}
                                  onChange={() => onUpdate({ mediaLoop: false })}
                                  className="rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">ครั้งเดียว</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`audio-loop-${note.id}`}
                                  checked={mediaLoop}
                                  onChange={() => onUpdate({ mediaLoop: true })}
                                  className="rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">วนซ้ำ</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <h4 className="text-sm font-medium mb-2">อัปโหลดไฟล์ภาพหน้าปก</h4>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mediaCoverEnabled}
                              onChange={(e) => onUpdate({ mediaCoverEnabled: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                            />
                            <span className="text-xs text-muted-foreground">
                              อัปโหลดภาพปกไฟล์เสียง (หากไม่ได้อัปโหลดภาพ ระบบจะตั้ง Icon เป็นภาพหน้าปก)
                            </span>
                          </label>
                          {mediaCoverEnabled && (
                            <div className="mt-2">
                              <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleCoverFileChange}
                              />
                              {mediaCoverFileData ? (
                                <div className="flex items-center gap-2">
                                  <img src={mediaCoverFileData} alt="Cover" className="h-12 w-12 object-cover rounded border" />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => onUpdate({ mediaCoverFileData: undefined })}>
                                    ลบภาพปก
                                  </Button>
                                </div>
                              ) : (
                                <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                                  เลือกภาพ
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* สถานะ */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground">สถานะ :</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={mediaActive}
                        onClick={() => onUpdate({ mediaActive: !mediaActive })}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          mediaActive ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            mediaActive ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${mediaActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {mediaActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'line' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">ตั้งค่าเส้น Annotation</h4>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ไฟล์ :</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`line-file-${note.id}`}
                        checked={lineUseDefault}
                        onChange={() => onUpdate({ lineUseDefault: true })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">ใช้ค่าเริ่มต้น</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`line-file-${note.id}`}
                        checked={!lineUseDefault}
                        onChange={() => onUpdate({ lineUseDefault: false })}
                        className="rounded-full border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">อัปโหลดไฟล์</span>
                    </label>
                  </div>
                </div>

                {lineUseDefault ? (
                  <div className="flex gap-2 flex-wrap">
                    {(['circle', 'square', 'triangle', 'star'] as const).map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => onUpdate({ lineShape: shape })}
                        className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          lineShape === shape
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                        title={shape === 'circle' ? 'วงกลม' : shape === 'square' ? 'สี่เหลี่ยม' : shape === 'triangle' ? 'สามเหลี่ยม' : 'ดาว'}
                      >
                        {shape === 'circle' && <Circle className="w-6 h-6" fill="currentColor" />}
                        {shape === 'square' && <Square className="w-6 h-6" fill="currentColor" />}
                        {shape === 'triangle' && <Triangle className="w-6 h-6" fill="currentColor" />}
                        {shape === 'star' && <Star className="w-6 h-6" fill="currentColor" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => lineMarkerInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 cursor-pointer text-center"
                    >
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">.jpg, .png, .svg</span>
                      <span className="text-xs">100×100px, 1 MB</span>
                    </div>
                    <div className="border rounded-lg p-2 bg-muted/30 flex items-center justify-center min-h-[80px]">
                      {lineMarkerFileData ? (
                        <img src={lineMarkerFileData} alt="Preview" className="max-w-full max-h-20 object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">ตัวอย่าง</span>
                      )}
                    </div>
                    <input
                      ref={lineMarkerInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.svg,image/*"
                      className="hidden"
                      onChange={handleLineMarkerFileChange}
                    />
                  </div>
                )}

                {!lineUseDefault && (lineMarkerFileName || lineMarkerFileData) && (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">{lineMarkerFileName}</span>
                    <button type="button" onClick={removeLineMarkerFile} className="p-1 rounded hover:bg-muted shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">ขนาด</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={lineSize}
                    onChange={(e) => onUpdate({ lineSize: Number(e.target.value) })}
                    className="w-full h-2 rounded-full bg-muted accent-orange-500"
                  />
                </div>

                <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stroke</span>
                    <button type="button" className="p-1 rounded hover:bg-muted" title="ความช่วยเหลือ">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => onUpdate({ strokeColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={strokeColor.replace('#', '')}
                      onChange={(e) => {
                        const v = e.target.value
                        if (/^[0-9a-fA-F]*$/.test(v)) onUpdate({ strokeColor: v ? `#${v}` : '#000000' })
                      }}
                      className="w-16 p-1.5 text-xs font-mono border rounded bg-background"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={strokeOpacity}
                      onChange={(e) => onUpdate({ strokeOpacity: Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className="w-14 p-1.5 text-xs border rounded bg-background"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-0.5">Position</label>
                      <select
                        value={strokePosition}
                        onChange={(e) => onUpdate({ strokePosition: e.target.value as 'center' | 'inside' | 'outside' })}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      >
                        <option value="center">Center (กึ่งกลาง)</option>
                        <option value="inside">Inside</option>
                        <option value="outside">Outside</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-0.5">Weight</label>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={strokeWeight}
                        onChange={(e) => onUpdate({ strokeWeight: Math.max(0.5, Number(e.target.value) || 1) })}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-0.5">Start point</label>
                      <select
                        value={strokeStartPoint}
                        onChange={(e) => onUpdate({ strokeStartPoint: e.target.value as 'none' | 'arrow' })}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      >
                        <option value="none">None</option>
                        <option value="arrow">Arrow</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-0.5">End point</label>
                      <select
                        value={strokeEndPoint}
                        onChange={(e) => onUpdate({ strokeEndPoint: e.target.value as 'none' | 'arrow' })}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      >
                        <option value="none">None</option>
                        <option value="arrow">Arrow</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex gap-1 text-xs text-muted-foreground mb-1">
                      <span className="font-medium">Basic</span>
                      <span>Dynamic</span>
                      <span>Brush</span>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-0.5">Style</label>
                      <select
                        value={strokeStyle}
                        onChange={(e) => onUpdate({ strokeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Join</label>
                      <div className="flex gap-2">
                        {(['miter', 'round', 'bevel'] as const).map((join) => (
                          <button
                            key={join}
                            type="button"
                            onClick={() => onUpdate({ strokeJoin: join })}
                            className={`p-2 rounded border text-xs ${strokeJoin === join ? 'border-primary bg-primary/10' : 'border-border'}`}
                            title={join === 'miter' ? 'มุมแหลม' : join === 'round' ? 'มุมโค้ง' : 'มุมตัด'}
                          >
                            {join === 'miter' && <span className="inline-block w-4 h-4 border-2 border-current" style={{ transform: 'rotate(45deg)' }} />}
                            {join === 'round' && <span className="inline-block w-4 h-4 rounded-full border-2 border-current" />}
                            {join === 'bevel' && <span className="inline-block w-4 h-4 border-2 border-current" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

export default function AnnotationToolDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  notes = [],
  isPlacingNote = false,
  onTogglePlaceNote = () => {},
  movingNoteId = null,
  onStartMoveNote = () => {},
  onNoteUpdate = () => {},
  onNoteDelete = () => {},
  textAnnotations: _textAnnotations = [],
  isPlacingText = false,
  onTogglePlaceText = () => {},
  onTextUpdate: _onTextUpdate = () => {},
  onTextDelete: _onTextDelete = () => {},
  nodeNames: _nodeNames = [],
  partListItems = [],
  isAddingPart: _isAddingPart = false,
  setIsAddingPart: _setIsAddingPart = () => {},
  pendingPartNodeName: _pendingPartNodeName = null,
  setPendingPartNodeName: _setPendingPartNodeName = () => {},
  pendingPartLabel: _pendingPartLabel = '',
  setPendingPartLabel: _setPendingPartLabel = () => {},
  onPartListAdd: _onPartListAdd = () => {},
}: AnnotationToolDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeTabs, setActiveTabs] = useState<Record<string, AnnotationTab>>({})
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  useEffect(() => {
    if (notes.length > 0) setExpandedIds((prev) => new Set([...prev, ...notes.map((n) => n.id)]))
  }, [notes.length])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const setTab = (noteId: string, tab: AnnotationTab) => {
    setActiveTabs((prev) => ({ ...prev, [noteId]: tab }))
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
        className={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-lg transition-transform duration-300 z-[60] overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '420px' }}
      >
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="text-xl font-semibold">Annotation Tool</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Button
            onClick={onTogglePlaceNote}
            className={`w-full gap-2 ${isPlacingNote ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            variant={isPlacingNote ? 'destructive' : 'default'}
            size="lg"
          >
            <Plus className="h-4 w-4" />
            {isPlacingNote ? 'ยกเลิกการปักหมุด' : 'เพิ่ม Annotation'}
          </Button>

          {isPlacingNote && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-primary">
                คลิกบนโมเดล 3D เพื่อปักหมุดที่ตำแหน่งที่ต้องการ
              </p>
            </div>
          )}

          {notes.length === 0 && !isPlacingNote ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              ยังไม่มี Annotation คลิก &quot;เพิ่ม Annotation&quot; แล้วคลิกบนโมเดลเพื่อปักหมุด
            </div>
          ) : notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <AnnotationBlock
                  key={note.id}
                  note={note}
                  index={index}
                  isExpanded={expandedIds.has(note.id)}
                  onToggleExpand={() => toggleExpand(note.id)}
                  activeTab={activeTabs[note.id] ?? 'data'}
                  onTabChange={(tab) => setTab(note.id, tab)}
                  onUpdate={(updates) => onNoteUpdate(note.id, updates)}
                  onDelete={() => onNoteDelete(note.id)}
                  movingNoteId={movingNoteId ?? null}
                  onStartMoveNote={(id) => onStartMoveNote(id)}
                />
              ))}
            </div>
          ) : null}

          <div className="space-y-4 border-t pt-4 mt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Text Annotations</h3>
            <Button
              onClick={onTogglePlaceText}
              className={`w-full ${isPlacingText ? 'bg-destructive hover:bg-destructive/90' : ''}`}
              variant={isPlacingText ? 'destructive' : 'default'}
            >
              {isPlacingText ? (
                <>
                  <Minus className="mr-2 h-4 w-4" />
                  Cancel Placing Text
                </>
              ) : (
                <>
                  <Type className="mr-2 h-4 w-4" />
                  Add Text
                </>
              )}
            </Button>
            {partListItems.length > 0 && (
              <p className="text-xs text-muted-foreground">รายการ {partListItems.length} รายการ</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
