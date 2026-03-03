import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ViewerPage from './pages/ViewerPage'
import LayoutPage from './pages/LayoutPage'
import TableOfContentsPage from './pages/TableOfContentsPage'
import TimelinePage from './pages/TimelinePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/viewer" element={<ViewerPage />} />
      <Route path="/annotation-tool" element={<ViewerPage />} />
      <Route path="/table-content" element={<TableOfContentsPage />} />
      <Route path="/timeline" element={<TimelinePage />} />
      <Route path="/layout" element={<LayoutPage />} />
    </Routes>
  )
}
