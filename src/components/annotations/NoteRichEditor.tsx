import { useState, useRef, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { Button } from '../ui/button'
import { Plus, Trash2, FileText } from 'lucide-react'
import type { NotePage } from '../../types'

/** TinyMCE จาก CDN (ไม่ต้องใช้ API key; สำหรับ production ควรใช้ VITE_TINYMCE_API_KEY) */
const TINYMCE_SCRIPT =
  (import.meta.env.VITE_TINYMCE_API_KEY
    ? `https://cdn.tiny.cloud/1/${import.meta.env.VITE_TINYMCE_API_KEY}/tinymce/7/tinymce.min.js`
    : 'https://cdn.jsdelivr.net/npm/tinymce@7/tinymce.min.js')

interface NoteRichEditorProps {
  pages: NotePage[]
  onChange: (pages: NotePage[]) => void
  height?: number
  placeholder?: string
  /** true = โหมด Annotation Tool: ไม่แสดงปุ่มเพิ่มหน้า และเอา link รูป วิดีโอ ออกจาก toolbar */
  annotationToolMode?: boolean
}

const defaultInit: Record<string, unknown> = {
  height: 280,
  menubar: false,
  plugins: 'lists link image media code table',
  toolbar:
    'undo redo | blocks | bold italic underline strikethrough | ' +
    'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | link image media | removeformat',
  content_style: 'body { font-family: inherit; font-size: 14px; }',
  branding: false,
  promotion: false,
  link_title: false,
  automatic_uploads: true,
  file_picker_types: 'image media',
  relative_urls: false,
  convert_urls: false,
}

const annotationToolInit: Record<string, unknown> = {
  ...defaultInit,
  plugins: 'lists code table',
  toolbar:
    'undo redo | blocks | bold italic underline strikethrough | ' +
    'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | removeformat',
}

function getDefaultPage(): NotePage {
  return { content: '' }
}

export default function NoteRichEditor({
  pages: initialPages,
  onChange,
  height = 280,
  placeholder = 'พิมพ์ข้อความ ใส่รูป ลิงก์ หรือวิดีโอ...',
  annotationToolMode = false,
}: NoteRichEditorProps) {
  const [pages, setPages] = useState<NotePage[]>(
    initialPages.length > 0 ? initialPages : [getDefaultPage()]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const editorRef = useRef<any>(null)

  // ซิงก์ state ภายในกับ props เมื่อมีการอัปเดตจากภายนอก
  useEffect(() => {
    const nextPages = initialPages.length > 0 ? initialPages : [getDefaultPage()]
    setPages(nextPages)
    setActiveIndex((prev) => Math.min(prev, nextPages.length - 1))
  }, [initialPages])

  const syncPageContent = (index: number, content: string) => {
    const next = [...pages]
    next[index] = { content }
    setPages(next)
    onChange(next)
  }

  const addPage = () => {
    const next = [...pages, getDefaultPage()]
    setPages(next)
    setActiveIndex(next.length - 1)
    onChange(next)
  }

  const removePage = (index: number) => {
    if (pages.length <= 1) return
    const next = pages.filter((_, i) => i !== index)
    setPages(next)
    setActiveIndex(Math.min(activeIndex, next.length - 1))
    onChange(next)
  }

  const currentPage = pages[activeIndex]
  const safeContent = currentPage?.content ?? ''

  return (
    <div className="space-y-2 border rounded-md overflow-hidden bg-background">
      {/* แท็บหลายหน้า: หน้า 1, 2, 3 ... (ไม่แสดงใน annotationToolMode) */}
      {!annotationToolMode && (
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeIndex === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            หน้า {i + 1}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={addPage}
        >
          <Plus className="h-3.5 w-3.5" />
          เพิ่มหน้า
        </Button>
      </div>
      )}

      {/* TinyMCE สำหรับหน้าปัจจุบัน */}
      <div className="p-2">
        {pages.length > 1 && (
          <div className="flex justify-end mb-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-destructive"
              onClick={() => removePage(activeIndex)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              ลบหน้านี้
            </Button>
          </div>
        )}
        <Editor
          tinymceScriptSrc={TINYMCE_SCRIPT}
          onInit={(_ev, editor) => { editorRef.current = editor }}
          value={safeContent}
          onEditorChange={(content) => syncPageContent(activeIndex, content)}
          init={{
            ...(annotationToolMode ? annotationToolInit : defaultInit),
            height,
            placeholder,
            // ใส่รูป: embed as base64 (ไม่ใช้ใน annotationToolMode)
            ...(annotationToolMode ? {} : {
              images_upload_handler: (blobInfo: { blob: () => Blob }) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve((reader.result as string) || '')
                reader.readAsDataURL(blobInfo.blob())
              }),
            }),
          }}
        />
      </div>
    </div>
  )
}
