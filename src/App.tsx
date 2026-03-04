import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { HomePage } from './pages/HomePage'
import { LobbyPage } from './pages/LobbyPage'
import { PlayPage } from './pages/PlayPage'
import { ResultsPage } from './pages/ResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:roomCode/lobby" element={<LobbyPage />} />
          <Route path="/game/:roomCode/play" element={<PlayPage />} />
          <Route path="/game/:roomCode/results" element={<ResultsPage />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
