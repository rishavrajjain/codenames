# Codenames - Multiplayer Web Game

## Tech Stack
- React 18 + TypeScript + Vite 5
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Firebase: Firestore (real-time sync), Anonymous Auth, Hosting
- React Router v6, Framer Motion, canvas-confetti

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Type-check + production build
- `npx tsc --noEmit` — Type-check only
- `firebase deploy` — Deploy to Firebase Hosting

## File Structure
```
src/
├── config/firebase.ts       — Firebase init, exports db & auth
├── types/game.ts            — All TypeScript types
├── constants/words.ts       — ~400 word list
├── lib/                     — Pure functions (shuffle, roomCode, gameLogic)
├── services/                — Firebase read/write (authService, roomService, gameService)
├── hooks/                   — React hooks (useAuth, useGame, useToast)
├── components/
│   ├── ui/                  — Reusable: Button, Input, Badge, Spinner, Modal, Toast
│   ├── layout/Container.tsx
│   └── game/                — Board, Card, ClueDisplay, ClueInput, etc.
├── pages/                   — HomePage, LobbyPage, PlayPage, ResultsPage
├── App.tsx                  — Router setup
└── main.tsx                 — Entry point
```

## Conventions
- Functional components with named exports
- Tailwind utility classes (no CSS modules)
- Firestore transactions for all game-state mutations
- Custom `.glass` CSS class for glassmorphism cards
- Dark theme: navy-900 (#0A0E1A) background, red-team (#EF4444), blue-team (#3B82F6)

## Firebase Config
Environment variables in `.env.local` (gitignored), template in `.env.example`.
Project: recipebutler-fd32c

## Firestore Schema
Single doc per game at `games/{roomCode}` with: players, phase, board (25 cards), currentTurn, clueHistory, scores, winner.
