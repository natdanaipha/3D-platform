import { useState } from 'react'
import { Button } from './ui/button'
import { ChevronRight, List } from 'lucide-react'

interface TableOfContentsDrawerProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export default function TableOfContentsDrawer({
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
}: TableOfContentsDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-[calc(50%-3rem)] -translate-y-1/2 z-50 rounded-r-none rounded-l-lg"
        variant="secondary"
        size="icon"
        data-drawer-toggle="toc"
        title="Table of Contents"
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <List className="h-4 w-4" />}
      </Button>

      {/* Drawer */}
      <div
        data-drawer="toc"
        className={`fixed right-0 top-0 h-full bg-white border-l border-neutral-200 shadow-lg transition-transform duration-300 z-[41] overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '320px', maxHeight: '100vh' }}
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold text-black">Table of Contents</h2>
        </div>
      </div>
    </>
  )
}
