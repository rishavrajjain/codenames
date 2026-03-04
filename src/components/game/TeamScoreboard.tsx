import { Team } from '../../types/game'

interface TeamScoreboardProps {
  redRemaining: number
  blueRemaining: number
  currentTeam: Team | null
}

export function TeamScoreboard({ redRemaining, blueRemaining, currentTeam }: TeamScoreboardProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <ScoreCard
        team="red"
        remaining={redRemaining}
        active={currentTeam === 'red'}
      />
      <span className="text-white/20 text-xl font-light">vs</span>
      <ScoreCard
        team="blue"
        remaining={blueRemaining}
        active={currentTeam === 'blue'}
      />
    </div>
  )
}

function ScoreCard({ team, remaining, active }: { team: Team; remaining: number; active: boolean }) {
  const isRed = team === 'red'
  const color = isRed ? 'text-red-400' : 'text-blue-400'
  const glow = active ? (isRed ? 'glow-red' : 'glow-blue') : ''
  const bg = isRed ? 'bg-red-500/10' : 'bg-blue-500/10'

  return (
    <div className={`glass ${bg} px-5 py-3 text-center ${glow} ${active ? 'animate-pulse-glow' : ''}`}>
      <p className={`text-3xl font-black ${color}`}>{remaining}</p>
      <p className="text-[0.65rem] text-white/40 uppercase tracking-wider">{team} left</p>
    </div>
  )
}
