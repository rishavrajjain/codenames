import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LobbyPage } from './pages/LobbyPage'
import { PlayPage } from './pages/PlayPage'
import { ResultsPage } from './pages/ResultsPage'
import { MrWhiteLobbyPage } from './pages/mrwhite/MrWhiteLobbyPage'
import { MrWhitePlayPage } from './pages/mrwhite/MrWhitePlayPage'
import { MrWhiteResultsPage } from './pages/mrwhite/MrWhiteResultsPage'
import { PsychLobbyPage } from './pages/psych/PsychLobbyPage'
import { PsychPlayPage } from './pages/psych/PsychPlayPage'
import { PsychResultsPage } from './pages/psych/PsychResultsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join/:roomCode" element={<JoinPage />} />

          {/* Codenames */}
          <Route path="/game/:roomCode/lobby" element={<LobbyPage />} />
          <Route path="/game/:roomCode/play" element={<PlayPage />} />
          <Route path="/game/:roomCode/results" element={<ResultsPage />} />

          {/* Mr. White */}
          <Route path="/mrwhite/:roomCode/lobby" element={<MrWhiteLobbyPage />} />
          <Route path="/mrwhite/:roomCode/play" element={<MrWhitePlayPage />} />
          <Route path="/mrwhite/:roomCode/results" element={<MrWhiteResultsPage />} />

          {/* Psych! */}
          <Route path="/psych/:roomCode/lobby" element={<PsychLobbyPage />} />
          <Route path="/psych/:roomCode/play" element={<PsychPlayPage />} />
          <Route path="/psych/:roomCode/results" element={<PsychResultsPage />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
