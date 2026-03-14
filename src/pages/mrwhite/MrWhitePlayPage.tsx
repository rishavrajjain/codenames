import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useMrWhiteGame } from '../../hooks/useMrWhiteGame'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { MrWhiteGameState, MrWhitePlayer } from '../../types/mrwhite'
import {
  markReady,
  forceStartDescribing,
  advanceDescriber,
  startVoting,
  submitVote,
  revealVotes,
  hostBreakTie,
  continueAfterVoteResult,
  submitMrWhiteGuess,
} from '../../services/mrwhiteGameService'
import { tallyVotes } from '../../lib/mrwhiteLogic'

export function MrWhitePlayPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = useMrWhiteGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    if (game?.phase === 'finished') {
      navigate(`/mrwhite/${roomCode}/results`, { replace: true })
    }
    if (game?.phase === 'lobby') {
      navigate(`/mrwhite/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  // Auto-advance from word_reveal when all players are ready
  useEffect(() => {
    if (!game || !roomCode) return
    if (game.phase !== 'word_reveal') return
    const me = user ? game.players[user.uid] : null
    if (!me?.isHost) return
    const allReady = Object.values(game.players).every(p => p.isReady)
    if (allReady) {
      forceStartDescribing(roomCode)
    }
  }, [game?.phase, game && Object.values(game.players).map(p => p.isReady).join(',')])

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
              <h1 className="text-2xl font-bold text-white/90">Mr. White</h1>
              {game.round > 0 && (
                <span className="text-white/30 text-sm">Round {game.round}</span>
              )}
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
            {game.phase === 'word_reveal' && (
              <WordRevealPhase key="reveal" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
            {game.phase === 'describing' && (
              <DescribingPhase key="describing" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
            {game.phase === 'voting' && (
              <VotingPhase key="voting" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
            {game.phase === 'vote_result' && (
              <VoteResultPhase key="vote_result" game={game} me={me} isHost={isHost} roomCode={roomCode!} />
            )}
            {game.phase === 'mrwhite_guess' && (
              <MrWhiteGuessPhase key="guess" game={game} me={me} isHost={isHost} roomCode={roomCode!} addToast={addToast} />
            )}
          </AnimatePresence>

          {/* Player List - always visible */}
          <PlayerListSidebar game={game} me={me} />
        </motion.div>
      </Container>
    </div>
  )
}

// ─── Phase Components ──────────────────────────────────

interface PhaseProps {
  game: MrWhiteGameState
  me: MrWhitePlayer | null
  isHost: boolean
  roomCode: string
  addToast?: (msg: string, type: 'success' | 'error' | 'info') => void
}

function WordRevealPhase({ game, me, isHost, roomCode }: PhaseProps) {
  const readyCount = Object.values(game.players).filter(p => p.isReady).length
  const totalCount = Object.keys(game.players).length
  const amReady = me?.isReady ?? false

  async function handleReady() {
    if (!me) return
    await markReady(roomCode, me.id)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Your role card */}
      {me && (
        <div className="max-w-md mx-auto mb-8">
          <div className={`glass p-8 text-center space-y-4 ${
            me.role === 'mrwhite' ? 'border-white/30' :
            me.role === 'undercover' ? 'border-amber-500/30' :
            'border-green-500/30'
          }`}>
            <div className="text-sm uppercase tracking-widest text-white/40">Your Role</div>
            <div className={`text-2xl font-bold ${
              me.role === 'mrwhite' ? 'text-white' :
              me.role === 'undercover' ? 'text-amber-400' :
              'text-green-400'
            }`}>
              {me.role === 'mrwhite' ? 'Mr. White' :
               me.role === 'undercover' ? 'Undercover' :
               'Civilian'}
            </div>

            {me.role === 'mrwhite' ? (
              <div className="space-y-2">
                <div className="text-5xl">?</div>
                <p className="text-white/50 text-sm">You have no word. Listen carefully and blend in!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl font-black text-white tracking-wide">
                  {me.word}
                </div>
                <p className="text-white/50 text-sm">
                  {me.role === 'undercover'
                    ? "Your word is different from the majority. Don't get caught!"
                    : "Describe this word without giving it away to Mr. White."
                  }
                </p>
              </div>
            )}

            {!amReady ? (
              <Button size="lg" className="w-full" onClick={handleReady}>
                I'm Ready
              </Button>
            ) : (
              <div className="text-green-400/60 text-sm">You're ready!</div>
            )}
          </div>
        </div>
      )}

      {/* Ready status */}
      <div className="text-center space-y-3">
        <div className="text-white/40 text-sm">
          {readyCount}/{totalCount} players ready
        </div>
        <div className="flex justify-center gap-2">
          {Object.values(game.players).map(p => (
            <div
              key={p.id}
              className={`w-3 h-3 rounded-full ${p.isReady ? 'bg-green-400' : 'bg-white/20'}`}
              title={`${p.name}: ${p.isReady ? 'Ready' : 'Not ready'}`}
            />
          ))}
        </div>
        {isHost && (
          <Button variant="secondary" size="sm" onClick={() => forceStartDescribing(roomCode)}>
            Skip Waiting
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function DescribingPhase({ game, me, isHost, roomCode }: PhaseProps) {
  const allDescribed = game.describerIndex >= game.describerOrder.length
  const currentDescriberId = game.currentDescriber
  const isMyTurnToDescribe = me?.id === currentDescriberId && me?.isAlive

  async function handleDone() {
    await advanceDescriber(roomCode)
  }

  async function handleStartVoting() {
    await startVoting(roomCode)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      {/* Your word reminder (small) */}
      {me?.isAlive && me.role !== 'mrwhite' && (
        <div className="text-center mb-4">
          <span className="text-xs text-white/30">Your word: </span>
          <span className="text-sm font-semibold text-white/70">{me.word}</span>
        </div>
      )}
      {me?.isAlive && me.role === 'mrwhite' && (
        <div className="text-center mb-4">
          <span className="text-xs text-white/40">You are Mr. White — no word, blend in!</span>
        </div>
      )}

      {!allDescribed ? (
        <>
          {/* Current describer highlight */}
          <div className="glass p-6 mb-6 text-center">
            {isMyTurnToDescribe ? (
              <div className="space-y-3">
                <div className="text-lg text-violet-400 font-bold animate-pulse-glow">
                  It's YOUR turn to describe!
                </div>
                <p className="text-white/40 text-sm">Describe your word to the group, then click Done.</p>
                <Button onClick={handleDone}>Done Describing</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-white/40 text-sm">Now describing:</div>
                <div className="text-2xl font-bold text-white">
                  {currentDescriberId && game.players[currentDescriberId]?.name}
                </div>
              </div>
            )}
            {isHost && !isMyTurnToDescribe && (
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={handleDone}>
                  Skip (Host)
                </Button>
              </div>
            )}
          </div>

          {/* Turn order */}
          <div className="glass p-4 mb-6">
            <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Speaking Order</h3>
            <div className="flex flex-wrap gap-2">
              {game.describerOrder.map((playerId, idx) => {
                const player = game.players[playerId]
                if (!player) return null
                const isDone = idx < game.describerIndex
                const isCurrent = idx === game.describerIndex
                return (
                  <div
                    key={playerId}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isCurrent
                        ? 'bg-violet-500/30 border border-violet-500/50 text-white font-semibold'
                        : isDone
                        ? 'bg-white/5 text-white/30 line-through'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    <span className="text-xs text-white/20">{idx + 1}.</span>
                    {player.name}
                    {isDone && <span className="text-green-400 text-xs ml-1">done</span>}
                    {isCurrent && <span className="text-violet-400 text-xs ml-1">speaking</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* Everyone has described — discussion time */
        <div className="glass p-8 mb-6 text-center space-y-4">
          <div className="text-2xl font-bold text-white/80">Discussion Time!</div>
          <p className="text-white/40">Everyone has described. Discuss who you think is the impostor.</p>
          {isHost && (
            <Button size="lg" onClick={handleStartVoting}>
              Start Voting
            </Button>
          )}
          {!isHost && (
            <p className="text-white/30 text-sm">Waiting for host to start voting...</p>
          )}
        </div>
      )}
    </motion.div>
  )
}

function VotingPhase({ game, me, isHost, roomCode }: PhaseProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const alivePlayers = Object.values(game.players).filter(p => p.isAlive)
  const hasVoted = me ? !!game.votes[me.id] : false
  const totalAlive = alivePlayers.length
  const votedCount = Object.keys(game.votes).length
  const allVoted = votedCount >= totalAlive
  const hasTie = game.tiedPlayers.length > 0

  // Tally for display after all voted
  const voteCounts = allVoted || hasTie ? tallyVotes(game.votes) : null

  async function handleVote() {
    if (!me || !selectedPlayer || hasVoted) return
    setSubmitting(true)
    await submitVote(roomCode, me.id, selectedPlayer)
    setSubmitting(false)
    setSelectedPlayer(null)
  }

  async function handleRevealVotes() {
    await revealVotes(roomCode)
  }

  async function handleTieBreak(playerId: string) {
    await hostBreakTie(roomCode, playerId)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white/80">
          {hasTie ? 'Tie! Host Decides' : 'Vote to Eliminate'}
        </h2>
        <p className="text-white/40 text-sm mt-1">
          {hasTie
            ? 'There was a tie. The host must choose who to eliminate.'
            : `${votedCount}/${totalAlive} votes cast`
          }
        </p>
      </div>

      {/* Tie breaker — host picks */}
      {hasTie && isHost && (
        <div className="glass p-6 mb-6 space-y-4">
          <p className="text-white/60 text-center">These players are tied. Pick one to eliminate:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {game.tiedPlayers.map(pid => {
              const p = game.players[pid]
              if (!p) return null
              return (
                <button
                  key={pid}
                  onClick={() => handleTieBreak(pid)}
                  className="glass-hover p-4 text-center cursor-pointer hover:border-red-500/50 transition-all"
                >
                  <div className="text-lg font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-white/30 mt-1">{voteCounts?.[pid] || 0} votes</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Voting grid */}
      {!hasTie && (
        <>
          {/* Vote buttons — show player cards to vote for */}
          {me?.isAlive && !hasVoted && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {alivePlayers
                .filter(p => p.id !== me.id)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    className={`glass-hover p-4 text-center cursor-pointer transition-all ${
                      selectedPlayer === p.id
                        ? 'border-red-500/60 bg-red-500/10'
                        : ''
                    }`}
                  >
                    <div className="text-lg font-semibold text-white">{p.name}</div>
                    {selectedPlayer === p.id && (
                      <div className="text-xs text-red-400 mt-1">Selected</div>
                    )}
                  </button>
                ))}
            </div>
          )}

          {/* Submit vote */}
          {me?.isAlive && !hasVoted && selectedPlayer && (
            <div className="text-center mb-6">
              <Button variant="danger" onClick={handleVote} loading={submitting}>
                Vote to Eliminate {game.players[selectedPlayer]?.name}
              </Button>
            </div>
          )}

          {/* Already voted */}
          {hasVoted && !allVoted && (
            <div className="glass p-6 mb-6 text-center">
              <div className="text-green-400/60 mb-2">Vote submitted!</div>
              <p className="text-white/30 text-sm">Waiting for others... ({votedCount}/{totalAlive})</p>
            </div>
          )}

          {/* Eliminated player can't vote */}
          {me && !me.isAlive && (
            <div className="glass p-6 mb-6 text-center">
              <p className="text-white/30">You've been eliminated. Watching the vote...</p>
            </div>
          )}

          {/* Vote status indicators */}
          <div className="glass p-4 mb-6">
            <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Vote Status</h3>
            <div className="flex flex-wrap gap-2">
              {alivePlayers.map(p => (
                <div
                  key={p.id}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    game.votes[p.id]
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-white/30'
                  }`}
                >
                  {p.name} {game.votes[p.id] ? ' voted' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Host: force reveal votes */}
          {isHost && !allVoted && (
            <div className="text-center mb-4">
              <Button variant="ghost" size="sm" onClick={handleRevealVotes}>
                Force Reveal Votes (Host)
              </Button>
            </div>
          )}

          {/* All voted — host reveals */}
          {allVoted && isHost && (
            <div className="text-center mb-4">
              <Button size="lg" onClick={handleRevealVotes}>
                Reveal Votes
              </Button>
            </div>
          )}
          {allVoted && !isHost && (
            <div className="text-center mb-4 text-white/30 text-sm">
              All votes cast. Waiting for host to reveal...
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

function VoteResultPhase({ game, isHost, roomCode }: PhaseProps) {
  const eliminated = game.lastEliminated ? game.players[game.lastEliminated] : null
  const role = game.lastEliminatedRole

  const roleColor = role === 'mrwhite' ? 'text-white' : role === 'undercover' ? 'text-amber-400' : 'text-green-400'
  const roleLabel = role === 'mrwhite' ? 'Mr. White' : role === 'undercover' ? 'Undercover' : 'Civilian'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="max-w-md mx-auto">
        <div className="glass p-8 text-center space-y-4 mb-6">
          <div className="text-white/40 text-sm uppercase tracking-wider">Eliminated</div>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="text-3xl font-black text-white"
          >
            {eliminated?.name}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`text-xl font-bold ${roleColor}`}
          >
            {roleLabel}
          </motion.div>

          {role === 'mrwhite' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-white/50"
            >
              Mr. White gets one chance to guess the civilian word!
            </motion.p>
          )}

          {isHost && (
            <div className="pt-4">
              <Button size="lg" onClick={() => continueAfterVoteResult(roomCode)}>
                {role === 'mrwhite' ? 'Let Mr. White Guess' : 'Continue'}
              </Button>
            </div>
          )}
          {!isHost && (
            <p className="text-white/30 text-sm pt-2">Waiting for host to continue...</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function MrWhiteGuessPhase({ game, me, roomCode }: PhaseProps) {
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isMrWhite = me?.role === 'mrwhite' && game.lastEliminated === me.id

  async function handleGuess() {
    if (!guess.trim()) return
    setSubmitting(true)
    await submitMrWhiteGuess(roomCode, guess.trim())
    setSubmitting(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="max-w-md mx-auto">
        <div className="glass p-8 text-center space-y-4">
          <div className="text-2xl font-bold text-white/80">Mr. White's Last Chance</div>

          {isMrWhite ? (
            <div className="space-y-4">
              <p className="text-white/50">Guess the civilian word to win the game!</p>
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuess()}
                placeholder="Type your guess..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-center text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                autoFocus
              />
              <Button size="lg" className="w-full" onClick={handleGuess} loading={submitting} disabled={!guess.trim()}>
                Submit Guess
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-6xl animate-pulse-glow">?</div>
              <p className="text-white/50">Mr. White is thinking of their guess...</p>
              <p className="text-white/30 text-sm">Don't say the word out loud!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Player List ──────────────────────────────────

function PlayerListSidebar({ game, me }: { game: MrWhiteGameState; me: MrWhitePlayer | null }) {
  const players = Object.values(game.players)

  return (
    <div className="glass p-4 mt-6">
      <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">Players</h3>
      <div className="flex flex-wrap gap-2">
        {players.map(p => (
          <div
            key={p.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
              !p.isAlive
                ? 'bg-white/5 text-white/20 line-through'
                : p.id === me?.id
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-white/5 text-white/60'
            }`}
          >
            {p.name}
            {p.isHost && <span className="text-xs">host</span>}
            {!p.isAlive && <span className="text-xs text-red-400/50 ml-1">out</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
