import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, GripVertical, Edit2, Eye, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '../ui/dialog'
import type { NotePage } from '../../types'

const DEFAULT_WIDTH = 300
const DEFAULT_HEIGHT = 240
const MIN_WIDTH = 220
const MIN_HEIGHT = 160
const MAX_WIDTH = 560
const MAX_HEIGHT = 480

const DEFAULT_NOTE_COLOR = '#ef4444'

/** แปลง YouTube/Vimeo watch URL เป็น embed URL สำหรับ iframe */
function getEmbedVideoUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const u = url.trim()
  // YouTube: watch?v=ID, youtu.be/ID, embed/ID
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo: vimeo.com/ID
  const vimeoMatch = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

interface NoteCardProps {
  id: string
  /** หัวข้อการ์ด (ภาษาไทย) */
  title?: string
  /** ชื่อหัวข้อภาษาอังกฤษ (เมื่อมี thaiPageCount ใช้สลับตามปุ่มภาษา) */
  titleEn?: string
  /** เนื้อหาแบบเก่า (ข้อความเดียว) */
  content?: string
  /** เนื้อหาแบบหลายหน้า (HTML ได้) */
  pages?: NotePage[]
  /** จำนวนหน้าของคำอธิบายไทย (เมื่อมี = แยกไทย/อังกฤษ ไม่รวมกัน; ไม่ส่ง = แสดงทุกหน้ารวม) */
  thaiPageCount?: number
  /** สีหัวการ์ด/เส้นเชื่อม (hex) */
  color?: string
  position3D: [number, number, number]
  position2D: { x: number; y: number }
  /** ความกว้าง/สูงการ์ด (px) — ไม่ส่งใช้ค่า default */
  width?: number
  height?: number
  onPositionChange: (pos: { x: number; y: number }) => void
  onSizeChange?: (size: { width: number; height: number }) => void
  onDelete: () => void
  onEdit?: () => void
  /** แสดงปุ่มปากกา (แก้ไข) ในหัวการ์ด — ค่าเริ่มต้น true สำหรับ Intro / Table of Contents */
  showEditButton?: boolean
  /** 'bubble' = หน้าตาแบบฟอง (Annotation Tool), 'default' = การ์ดหัวแดง */
  variant?: 'default' | 'bubble'
  /** ข้อมูลสื่อจาก Annotation Tool สำหรับแสดงต่อท้ายหน้า 1 */
  mediaUpload?: boolean
  mediaType?: 'image' | 'video' | 'audio'
  mediaSource?: 'url' | 'upload'
  mediaUrl?: string
  mediaFileName?: string
  mediaFileData?: string
  mediaAutoPlay?: boolean
  mediaLoop?: boolean
  mediaCoverEnabled?: boolean
  mediaCoverFileData?: string
  mediaActive?: boolean
}

export default function NoteCard(props: NoteCardProps) {
  const {
    id,
    title,
    titleEn,
    content = '',
    pages: propPages,
    thaiPageCount: propThaiPageCount,
    color = DEFAULT_NOTE_COLOR,
    position2D,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    onPositionChange,
    onSizeChange,
    onDelete,
    onEdit,
    showEditButton = true,
    variant = 'default',
    mediaType,
    mediaSource,
    mediaUrl,
    mediaFileName,
    mediaFileData,
    mediaAutoPlay,
    mediaLoop,
    mediaCoverEnabled,
    mediaCoverFileData,
    mediaActive,
  } = props
  const pages: NotePage[] = propPages?.length ? propPages : [{ content: content || '' }]
  const hasLangSplit = propThaiPageCount != null && propThaiPageCount >= 1
  const thaiPages = hasLangSplit ? pages.slice(0, propThaiPageCount) : []
  const englishPages = hasLangSplit ? pages.slice(propThaiPageCount) : []
  const withContent = (arr: NotePage[]) => arr.filter((p) => p && (p.content || '').trim().length > 0)
  const displayPagesTh: NotePage[] = hasLangSplit ? (withContent(thaiPages).length >= 1 ? withContent(thaiPages) : [thaiPages[0] || { content: '' }]) : []
  const displayPagesEn: NotePage[] = hasLangSplit ? (withContent(englishPages).length >= 1 ? withContent(englishPages) : [englishPages[0] || { content: '' }]) : []
  const displayPages: NotePage[] = hasLangSplit
    ? [] // ใช้ displayPagesTh / displayPagesEn ตาม viewLang
    : (() => {
        const withContentAll = pages.filter((p) => p && (p.content || '').trim().length > 0)
        return withContentAll.length >= 1 ? withContentAll : [pages[0] || { content: '' }]
      })()
  const [viewLang, setViewLang] = useState<'th' | 'en'>('th')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewPageIndex, setViewPageIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, w: width, h: height })
  const cardRef = useRef<HTMLDivElement>(null)

  const activeDisplayPages: NotePage[] = hasLangSplit
    ? (viewLang === 'th' ? displayPagesTh : displayPagesEn)
    : displayPages
  const currentPage = activeDisplayPages[currentPageIndex]
  const baseHtml = currentPage?.content ?? ''

  // HTML ของสื่อ (รูป / วิดีโอ / เสียง) ต่อท้ายหน้า 1
  // วิดีโอ: แสดงเมื่อมี mediaUrl (ลิงก์) หรือ mediaFileData (อัปโหลด) — ถ้าไม่ระบุ mediaSource ถือว่าเป็น url
  const hasVideoSrc =
    mediaType === 'video' &&
    (mediaSource === 'upload' ? !!mediaFileData : !!(mediaUrl || mediaFileData))
  const shouldShowMedia =
    mediaActive !== false &&
    !!mediaType &&
    (mediaType === 'image'
      ? !!mediaFileData
      : mediaType === 'video'
        ? hasVideoSrc
        : mediaType === 'audio'
          ? !!mediaFileData
          : false)

  let mediaHtml = ''
  let showCoverAboveMedia = false // ใช้ภาพหน้าปกแสดงด้านบน (YouTube/เสียง; วิดีโออัปโหลดใช้ poster ใน <video>)
  if (shouldShowMedia) {
    if (mediaType === 'image' && mediaFileData) {
      mediaHtml = `<div class="mt-3"><img src="${mediaFileData}" alt="${mediaFileName ?? ''}" style="max-width:100%;height:auto;border-radius:0.5rem;"/></div>`
    } else if (mediaType === 'video') {
      const src = (mediaSource === 'upload' ? mediaFileData : mediaUrl || mediaFileData) ?? ''
      if (src) {
        const embedUrl = mediaSource !== 'upload' ? getEmbedVideoUrl(src) : null
        const coverPoster = mediaCoverEnabled && mediaCoverFileData ? ` poster="${String(mediaCoverFileData).replace(/"/g, '&quot;')}"` : ''
        if (embedUrl) {
          showCoverAboveMedia = true
          const params = new URLSearchParams()
          if (mediaAutoPlay) params.set('autoplay', '1')
          if (mediaLoop) {
            params.set('loop', '1')
            const ytId = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1]
            if (ytId) params.set('playlist', ytId)
          }
          const iframeSrc = params.toString() ? `${embedUrl}?${params.toString()}` : embedUrl
          mediaHtml = `<div class="mt-3 rounded-lg overflow-hidden" style="aspect-ratio:16/9;"><iframe src="${iframeSrc}" style="width:100%;height:100%;border:0;border-radius:0.5rem;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`
        } else {
          const safeSrc = src.replace(/"/g, '&quot;')
          mediaHtml = `<div class="mt-3"><video src="${safeSrc}" controls style="max-width:100%;height:auto;border-radius:0.5rem;"${coverPoster}${mediaAutoPlay ? ' autoplay muted' : ''}${mediaLoop ? ' loop' : ''}></video></div>`
        }
      }
    } else if (mediaType === 'audio' && mediaFileData) {
      showCoverAboveMedia = true
      mediaHtml = `<div class="mt-3"><audio src="${mediaFileData}" controls${mediaAutoPlay ? ' autoplay' : ''}${mediaLoop ? ' loop' : ''}></audio></div>`
    }

    // ภาพหน้าปก: วิดีโอ YouTube/Vimeo แสดงด้านบน iframe, วิดีโออัปโหลดใช้ poster ใน <video>, เสียงแสดงด้านบน
    if (showCoverAboveMedia && mediaCoverEnabled && mediaCoverFileData) {
      const safeCover = String(mediaCoverFileData).replace(/"/g, '&quot;')
      const coverHtml = `<div class="mt-3"><img src="${safeCover}" alt="ภาพหน้าปก" style="max-width:100%;height:auto;border-radius:0.5rem;display:block;"/></div>`
      mediaHtml = coverHtml + mediaHtml
    }
  }

  const html = currentPageIndex === 0 ? `${baseHtml}${mediaHtml}` : baseHtml
  const hasMultiplePages = activeDisplayPages.length > 1
  /** หัวข้อที่แสดงตามภาษาที่เลือก (ไทย = title, อังกฤษ = titleEn) */
  const displayTitle = hasLangSplit && viewLang === 'en' ? (titleEn ?? title ?? '') : (title ?? '')

  useEffect(() => {
    setCurrentPageIndex(0)
    setViewPageIndex(0)
  }, [viewLang])

  useEffect(() => {
    setCurrentPageIndex((i) => Math.min(i, Math.max(0, activeDisplayPages.length - 1)))
    setViewPageIndex((i) => Math.min(i, Math.max(0, activeDisplayPages.length - 1)))
  }, [activeDisplayPages.length])

  /** ขนาดโซนมุมล่างขวา (px) — คลิกในโซนนี้ = ปรับขนาด, นอกโซน = ลากย้าย */
  const RESIZE_ZONE = 48

  const handleResizeZoneMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onSizeChange) return
    setIsResizing(true)
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: width, h: height }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('[data-resize-zone]')) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const inResizeZone =
      onSizeChange &&
      e.clientX >= rect.right - RESIZE_ZONE &&
      e.clientY >= rect.bottom - RESIZE_ZONE
    if (inResizeZone) {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      resizeStartRef.current = { x: e.clientX, y: e.clientY, w: width, h: height }
      return
    }
    setIsDragging(true)
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault()
        let newX = e.clientX - dragOffset.x
        let newY = e.clientY - dragOffset.y
        newX = Math.max(0, Math.min(newX, window.innerWidth - width))
        newY = Math.max(0, Math.min(newY, window.innerHeight - height))
        onPositionChange({ x: newX, y: newY })
      }
      if (isResizing && onSizeChange) {
        e.preventDefault()
        const { x, y, w, h } = resizeStartRef.current
        let newW = w + (e.clientX - x)
        let newH = h + (e.clientY - y)
        newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newW))
        newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newH))
        onSizeChange({ width: newW, height: newH })
        resizeStartRef.current = { x: e.clientX, y: e.clientY, w: newW, h: newH }
      }
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, width, height, onPositionChange, onSizeChange])

  useEffect(() => {
    if (!viewOpen || activeDisplayPages.length <= 1) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setViewPageIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight') {
        setViewPageIndex((i) => Math.min(activeDisplayPages.length - 1, i + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [viewOpen, activeDisplayPages.length])

  const isBubble = variant === 'bubble'

  return (
    <div
      ref={cardRef}
      data-annotation-id={id}
      className={`fixed z-50 overflow-hidden flex flex-col ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isResizing ? 'select-none' : ''} ${
        isBubble
          ? 'rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/90 shadow-lg ring-1 ring-black/5'
          : 'bg-white rounded-lg shadow-xl'
      }`}
      style={{
        left: `${position2D.x}px`,
        top: `${position2D.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.15s ease-out',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        contain: 'paint',
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as const,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* หัวการ์ด: แบบเดิม (แดง) หรือแบบ bubble (แถบบาง + ปุ่ม) */}
      {isBubble ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 min-h-[40px] border-b border-slate-200/60">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
            {displayTitle.trim() !== '' && (
              <span className="text-sm font-semibold text-slate-800 truncate">{displayTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewPageIndex(currentPageIndex); setViewOpen(true) }}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
              title="ดูเนื้อหาแต่ละหน้า"
            >
              <Eye className="w-4 h-4" />
            </button>
            {showEditButton && onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-700" title="แก้ไข">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onDelete} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-red-600" title="ลบ">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-white p-3 rounded-t-lg flex items-center justify-between"
          style={{ backgroundColor: color }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical className="w-4 h-4 opacity-70 shrink-0" />
            {displayTitle.trim() !== '' && (
              <span className="text-lg truncate">{displayTitle}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewPageIndex(currentPageIndex); setViewOpen(true) }}
              className="p-1 hover:bg-white/20 rounded"
              title="ดูเนื้อหาแต่ละหน้า"
            >
              <Eye className="w-4 h-4" />
            </button>
            {showEditButton && onEdit && (
              <button onClick={onEdit} className="p-1 hover:bg-white/20 rounded" title="แก้ไข">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onDelete} className="p-1 hover:bg-white/20 rounded" title="ลบ">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className={`note-card-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden overflow-x-clip ${isBubble ? 'px-4 py-3' : 'p-4'}`}>
        {/* ปุ่ม TH/EN โชว์เฉพาะการ์ดแบบ default (Intro, Table of Contents) — หน้า Annotation Tool (bubble) ไม่แสดง จะมีในโมดัลเมื่อกดลูกตา */}
        {hasLangSplit && !isBubble && (
          <div className="flex items-center gap-1 mb-2 pb-2 border-b border-gray-200">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewLang('th'); setCurrentPageIndex(0) }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewLang === 'th' ? 'bg-primary text-primary-foreground' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              TH
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewLang('en'); setCurrentPageIndex(0) }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewLang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              EN
            </button>
          </div>
        )}
        {hasMultiplePages && (
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-200">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentPageIndex((i) => Math.max(0, i - 1)) }}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">หน้า {currentPageIndex + 1} / {activeDisplayPages.length}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentPageIndex((i) => Math.min(activeDisplayPages.length - 1, i + 1)) }}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
              disabled={currentPageIndex === activeDisplayPages.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {isBubble ? (
          <div
            className="text-slate-700 text-sm leading-relaxed prose prose-sm max-w-none prose-img:max-w-full prose-video:max-w-full [&:has(iframe)_iframe]:bg-transparent"
            style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}
            dangerouslySetInnerHTML={{ __html: html || '<span class="text-slate-400">(ไม่มีข้อความ)</span>' }}
          />
        ) : (
          <div
            className="text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none prose-img:max-w-full prose-video:max-w-full [&:has(iframe)_iframe]:bg-transparent"
            dangerouslySetInnerHTML={{ __html: html || '<span class="text-gray-400">(ไม่มีข้อความ)</span>' }}
          />
        )}
      </div>
      <div
        data-resize-handle
        className={`absolute bottom-0 right-0 z-10 flex items-center justify-end pb-1.5 pr-1.5 pointer-events-none ${onSizeChange ? '' : 'opacity-50'}`}
        title={onSizeChange ? 'ลากเพื่อขยาย/ย่อกล่อง' : undefined}
      >
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-tl-md shadow-sm ${isBubble ? 'bg-slate-200/60 text-slate-500' : 'bg-black/5 text-gray-400'}`} title="ลากเพื่อขยาย/ย่อ">
          <Maximize2 className="w-3.5 h-3.5 shrink-0 -rotate-90" strokeWidth={2.5} aria-hidden />
        </span>
      </div>

      {onSizeChange && (
        <div
          data-resize-zone
          className="absolute bottom-0 right-0 z-[60] cursor-se-resize"
          style={{ width: RESIZE_ZONE, height: RESIZE_ZONE }}
          onMouseDown={handleResizeZoneMouseDown}
          title="ลากเพื่อปรับขนาดกล่อง"
        />
      )}

      {viewOpen &&
        createPortal(
          <Dialog open={viewOpen} onOpenChange={setViewOpen} closeOnOverlayClick>
            <DialogContent
              className="note-detail-modal max-w-lg w-full mx-auto max-h-[85vh] flex flex-col"
              onClose={() => setViewOpen(false)}
              showCloseButton
            >
              <DialogHeader className="flex flex-col gap-1">
                <DialogTitle>รายละเอียดเนื้อหา</DialogTitle>
                {displayTitle.trim() !== '' && (
                  <p className="text-sm font-medium text-foreground mt-0.5">หัวข้อ: {displayTitle}</p>
                )}
              </DialogHeader>
              <DialogBody className="flex flex-col min-h-0 flex-1 overflow-hidden p-0">
                {hasLangSplit && (
                  <div className="flex items-center gap-1 px-6 pt-4 pb-2 border-b bg-muted/20">
                    <button
                      type="button"
                      onClick={() => { setViewLang('th'); setViewPageIndex(0) }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewLang === 'th' ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-muted'}`}
                    >
                      ไทย
                    </button>
                    <button
                      type="button"
                      onClick={() => { setViewLang('en'); setViewPageIndex(0) }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewLang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-muted'}`}
                    >
                      English
                    </button>
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4">
                  <div className="border rounded-lg p-4 bg-muted/30 min-w-0">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      หน้า {viewPageIndex + 1} / {activeDisplayPages.length}
                    </h4>
                    <div
                      className="note-detail-modal-prose text-gray-800 text-sm leading-relaxed prose prose-sm max-w-none prose-img:max-w-full prose-img:w-full prose-video:max-w-full [&:has(iframe)_iframe]:bg-transparent"
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          const page = activeDisplayPages[viewPageIndex]
                          const base = page?.content?.trim()
                            ? page.content
                            : '<span class="text-gray-400">(ไม่มีข้อความ)</span>'
                          return viewPageIndex === 0 ? `${base}${mediaHtml}` : base
                        })(),
                      }}
                    />
                  </div>
                </div>
                {activeDisplayPages.length > 1 && (
                  <div className="flex items-center justify-between gap-2 px-6 py-3 border-t bg-muted/20 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewPageIndex((i) => Math.max(0, i - 1))}
                      disabled={viewPageIndex === 0}
                      className="px-3 py-1.5 rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                      ← ก่อนหน้า
                    </button>
                    <span className="text-sm text-muted-foreground">
                      หน้า {viewPageIndex + 1} / {activeDisplayPages.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewPageIndex((i) => Math.min(activeDisplayPages.length - 1, i + 1))}
                      disabled={viewPageIndex === activeDisplayPages.length - 1}
                      className="px-3 py-1.5 rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                      ถัดไป →
                    </button>
                  </div>
                )}
              </DialogBody>
            </DialogContent>
          </Dialog>,
          document.body
        )}
    </div>
  )
}
