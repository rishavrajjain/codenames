import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { usePsychGame } from '../../hooks/usePsychGame'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { PsychGameState, PsychPlayer, PsychAnswer } from '../../types/psych'
import {
  submitAnswer,
  startVoting,
  submitVote,
  revealRound,
  nextRound,
} from '../../services/psychGameService'

export function PsychPlayPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = usePsychGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    if (game?.phase === 'finished') {
      navigate(`/psych/${roomCode}/results`, { replace: true })
    }
    if (game?.phase === 'lobby') {
      navigate(`/psych/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  // Auto-advance to voting when all players have submitted
  useEffect(() => {
    if (!game || !roomCode) return
    if (game.phase !== 'answering') return
    const me = user ? game.players[user.uid] : null
    if (!me?.isHost) return
    const playerIds = Object.keys(game.players)
    const allSubmitted = playerIds.every(id => game.answers[id])
    if (allSubmitted && playerIds.length > 0) {
      startVoting(roomCode)
    }
  }, [game?.phase, game && Object.keys(game.answers).length])

  // Auto-reveal when all players have voted
  useEffect(() => {
    if (!game || !roomCode) return
    if (game.phase !== 'voting') return
    const me = user ? game.players[user.uid] : null
    if (!me?.isHost) return
    const playerIds = Object.keys(game.players)
    const allVoted = playerIds.every(id => game.votes[id])
    if (allVoted && playerIds.length > 0) {
      revealRound(roomCode)
    }
  }, [game?.phase, game && Object.keys(game.votes).length])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 text-center space-y-4">
          <p className="text-red-400">{error || 'Game not found'}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  const me = user ? game.players[user.uid] : null
  const isHost = me?.isHost ?? false

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Container className="py-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white/90">Psych!</h1>
              <span className="text-white/30 text-sm">Round {game.currentRound} of {game.config.numRounds}</span>
            </div>
            <div className="flex items-center gap-3">
              {me && (
                <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
                  {me.name} {isHost && '(Host)'}
                </span>
              )}
              <span className="text-xs text-white/20 font-mono">{roomCode}</span>
            </div>
          </div>

          {/* Phase Content */}
          <AnimatePresence mode="wait">
            {game.phase === 'answering' && (
              <AnsweringPhase key="answering" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
            {game.phase === 'voting' && (
              <VotingPhase key="voting" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
            {game.phase === 'round_result' && (
              <RoundResultPhase key="round_result" game={game} me={me} isHost={isHost} roomCode={roomCode!} />
            )}
          </AnimatePresence>

          {/* Scoreboard - always visible */}
          <Scoreboard game={game} me={me} />
        </motion.div>
      </Container>
    </div>
  )
}

// ─── Phase Components ──────────────────────────────────

interface PhaseProps {
  game: PsychGameState
  me: PsychPlayer | null
  isHost: boolean
  roomCode: string
  addToast?: (msg: string, type: 'success' | 'error' | 'info') => void
}

function AnsweringPhase({ game, me, isHost, roomCode, addToast }: PhaseProps) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hasSubmitted = me ? !!game.answers[me.id] : false
  const submittedCount = Object.keys(game.answers).length
  const totalPlayers = Object.keys(game.players).length

  async function handleSubmit() {
    if (!me || !answer.trim()) return
    if (answer.trim().toLowerCase() === game.realAnswer?.toLowerCase()) {
      addToast?.("Your answer is too close to the real one! Try something different.", 'error')
      return
    }
    setSubmitting(true)
    await submitAnswer(roomCode, me.id, answer.trim())
    setSubmitting(false)
  }

  async function handleForceAdvance() {
    await startVoting(roomCode)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Question */}
      <div className="glass p-6 mb-6 text-center">
        <div className="text-xs text-violet-400/60 uppercase tracking-wider mb-3">Question</div>
        <div className="text-xl sm:text-2xl font-bold text-white/90">{game.currentQuestion}</div>
      </div>

      {/* Answer input */}
      {me && !hasSubmitted ? (
        <div className="max-w-md mx-auto glass p-6 mb-6 space-y-4">
          <p className="text-white/50 text-sm text-center">Write a fake but believable answer to trick others!</p>
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your fake answer..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-center text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            maxLength={100}
            autoFocus
          />
          <Button size="lg" className="w-full" onClick={handleSubmit} loading={submitting} disabled={!answer.trim()}>
            Submit Answer
          </Button>
        </div>
      ) : me && hasSubmitted ? (
        <div className="max-w-md mx-auto glass p-6 mb-6 text-center">
          <div className="text-green-400/60 mb-2">Answer submitted!</div>
          <p className="text-white/30 text-sm">Waiting for others... ({submittedCount}/{totalPlayers})</p>
        </div>
      ) : null}

      {/* Submission status */}
      <div className="glass p-4 mb-6">
        <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Submissions</h3>
        <div className="flex flex-wrap gap-2">
          {Object.values(game.players).map(p => (
            <div
              key={p.id}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                game.answers[p.id]
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-white/30'
              }`}
            >
              {p.name} {game.answers[p.id] ? 'done' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Host force advance */}
      {isHost && submittedCount > 0 && submittedCount < totalPlayers && (
        <div className="text-center mb-4">
          <Button variant="ghost" size="sm" onClick={handleForceAdvance}>
            Force Start Voting (Host)
          </Button>
        </div>
      )}
    </motion.div>
  )
}

function VotingPhase({ game, me, isHost, roomCode }: PhaseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hasVoted = me ? !!game.votes[me.id] : false
  const votedCount = Object.keys(game.votes).length
  const totalPlayers = Object.keys(game.players).length

  // Filter out the player's own fake answer from voting options
  const votableAnswers = me
    ? game.displayAnswers.filter(a => a.id !== `fake-${me.id}`)
    : game.displayAnswers

  async function handleVote() {
    if (!me || !selectedAnswer || hasVoted) return
    setSubmitting(true)
    await submitVote(roomCode, me.id, selectedAnswer)
    setSubmitting(false)
    setSelectedAnswer(null)
  }

  async function handleForceReveal() {
    await revealRound(roomCode)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Question reminder */}
      <div className="glass p-4 mb-6 text-center">
        <div className="text-xs text-violet-400/60 uppercase tracking-wider mb-2">Question</div>
        <div className="text-lg font-bold text-white/90">{game.currentQuestion}</div>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white/80">Pick the Real Answer</h2>
        <p className="text-white/40 text-sm mt-1">{votedCount}/{totalPlayers} votes cast</p>
      </div>

      {/* Answer cards */}
      {me && !hasVoted ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {votableAnswers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => setSelectedAnswer(answer.id)}
                className={`glass p-4 text-center cursor-pointer transition-all text-left ${
                  selectedAnswer === answer.id
                    ? 'border-violet-500/60 bg-violet-500/10'
                    : 'hover:border-white/20'
                }`}
              >
                <div className="text-base font-semibold text-white">{answer.text}</div>
                {selectedAnswer === answer.id && (
                  <div className="text-xs text-violet-400 mt-1">Selected</div>
                )}
              </button>
            ))}
          </div>

          {selectedAnswer && (
            <div className="text-center mb-6">
              <Button onClick={handleVote} loading={submitting}>
                Lock In Vote
              </Button>
            </div>
          )}
        </>
      ) : me && hasVoted ? (
        <div className="glass p-6 mb-6 text-center">
          <div className="text-green-400/60 mb-2">Vote submitted!</div>
          <p className="text-white/30 text-sm">Waiting for others... ({votedCount}/{totalPlayers})</p>
        </div>
      ) : null}

      {/* Vote status */}
      <div className="glass p-4 mb-6">
        <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Vote Status</h3>
        <div className="flex flex-wrap gap-2">
          {Object.values(game.players).map(p => (
            <div
              key={p.id}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                game.votes[p.id]
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/5 text-white/30'
              }`}
            >
              {p.name} {game.votes[p.id] ? 'voted' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Host force reveal */}
      {isHost && votedCount > 0 && votedCount < totalPlayers && (
        <div className="text-center mb-4">
          <Button variant="ghost" size="sm" onClick={handleForceReveal}>
            Force Reveal (Host)
          </Button>
        </div>
      )}
    </motion.div>
  )
}

function RoundResultPhase({ game, me, isHost, roomCode }: PhaseProps) {
  const lastResult = game.roundHistory[game.roundHistory.length - 1]
  if (!lastResult) return null

  const players = game.players
  const isLastRound = game.currentRound >= game.config.numRounds

  async function handleNext() {
    await nextRound(roomCode)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Correct answer reveal */}
      <div className="glass p-6 mb-6 text-center">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-2">The correct answer was</div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="text-2xl font-black text-green-400"
        >
          {lastResult.realAnswer}
        </motion.div>
      </div>

      {/* All answers with votes */}
      <div className="glass p-6 mb-6">
        <h3 className="text-xs text-white/30 uppercase tracking-wider mb-4">All Answers</h3>
        <div className="space-y-3">
          {lastResult.answers.map((answer: PsychAnswer) => {
            const isReal = answer.playerId === null
            const voterIds = Object.entries(lastResult.votes)
              .filter(([, aid]) => aid === answer.id)
              .map(([vid]) => vid)

            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl border ${
                  isReal
                    ? 'border-green-500/40 bg-green-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`font-semibold ${isReal ? 'text-green-400' : 'text-white/80'}`}>
                      {answer.text}
                    </div>
                    <div className="text-xs text-white/30 mt-1">
                      {isReal ? 'Real answer' : `Written by ${players[answer.playerId!]?.name ?? 'Unknown'}`}
                    </div>
                  </div>
                  {isReal && (
                    <span className="text-green-400 text-xs font-bold bg-green-500/20 px-2 py-1 rounded-full shrink-0">REAL</span>
                  )}
                </div>
                {voterIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {voterIds.map(vid => (
                      <span key={vid} className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                        {players[vid]?.name ?? 'Unknown'} voted
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Points earned this round */}
      <div className="glass p-6 mb-6">
        <h3 className="text-xs text-white/30 uppercase tracking-wider mb-4">Points This Round</h3>
        <div className="space-y-2">
          {Object.entries(lastResult.pointsEarned)
            .sort(([, a], [, b]) => b - a)
            .map(([pid, pts]) => (
              <div key={pid} className="flex items-center justify-between">
                <span className={`text-sm ${pid === me?.id ? 'text-violet-300 font-semibold' : 'text-white/70'}`}>
                  {players[pid]?.name ?? 'Unknown'}
                </span>
                <span className="text-sm font-bold text-amber-400">+{pts}</span>
              </div>
            ))}
          {Object.keys(lastResult.pointsEarned).length === 0 && (
            <p className="text-white/30 text-sm text-center">No one scored this round!</p>
          )}
        </div>
      </div>

      {/* Next / Finish */}
      {isHost ? (
        <div className="text-center">
          <Button size="lg" onClick={handleNext}>
            {isLastRound ? 'See Final Results' : 'Next Round'}
          </Button>
        </div>
      ) : (
        <p className="text-center text-white/30 text-sm">
          Waiting for host to {isLastRound ? 'show results' : 'start next round'}...
        </p>
      )}
    </motion.div>
  )
}

// ─── Scoreboard ──────────────────────────────────

function Scoreboard({ game, me }: { game: PsychGameState; me: PsychPlayer | null }) {
  const sorted = Object.values(game.players).sort((a, b) => b.score - a.score)

  return (
    <div className="glass p-4 mt-6">
      <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Scoreboard</h3>
      <div className="space-y-1.5">
        {sorted.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
              p.id === me?.id
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-white/5 text-white/60'
            }`}
          >
            <span>
              <span className="text-xs text-white/20 mr-2">{idx + 1}.</span>
              {p.name}
              {p.isHost && <span className="text-xs ml-1">host</span>}
            </span>
            <span className="font-bold text-amber-400">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
