# Cieljo

Cieljo is a multiplayer online card game in the style of **Skyjo**. Players create or join a game room with a 4-character code and play against each other in their browser.

> 🚧 Work in progress: accounts, game rooms, the deal, the reveal of the first cards and the turns work. Column removal, the end of the round and the scoring are still being built.

## Tech stack

| Part | Stack |
| --- | --- |
| Backend (`cieljo-backend/`) | Ruby 3.3.5, Rails 8.1 (API only), PostgreSQL, Devise + devise-jwt |
| Frontend (`cieljo-frontend/`) | React 19, Vite, react-router-dom v7, Sass |

The repository is a monorepo with two independent apps. There is no root-level tooling, so each app is installed and run from its own folder.

## Getting started

### Prerequisites

- Ruby 3.3.5 and Bundler
- PostgreSQL running locally
- Node.js and npm

### 1. Backend

```bash
cd cieljo-backend
bin/setup            # installs gems and prepares the database
bin/rails server     # API on http://localhost:3000
```

The JWT secret is read from `ENV['JWT_SECRET_KEY']` or, if it is not set, from `credentials.jwt_secret_key`. For example:

```bash
export JWT_SECRET_KEY=$(bin/rails secret)
```

### 2. Frontend

```bash
cd cieljo-frontend
npm install
npm run dev          # app on http://localhost:5173
```

The frontend calls the API at `http://localhost:3000/api/v1`, and CORS only allows `http://localhost:5173`. Keep these default ports.

## How to play (current state)

1. Open http://localhost:5173/auth and create an account, then log in.
2. On the home page, **create a game**. You are taken to the room `/game/<ROOM_CODE>`, shown as a green table with the room code in the middle.
3. Share the room code. Other players join it from the home page and sit around the table.
4. Once at least 2 players are seated, the host clicks **Start the game**. The room code fades out, the draw pile appears, and the cards are dealt: 12 face-down cards to each player (a 3×4 grid), then one card is flipped onto the discard pile.
5. Each player reveals 2 cards of their grid by clicking them. Once everyone has, the player with the highest total plays first.
6. On your turn, either:
   - **click the draw pile**: the card flips face up on top of it. Then **drag it onto a card of your grid** to swap them, or **click a face-down card** of your grid to throw the drawn card onto the discard pile and reveal that card;
   - or **take the discard pile card** (click it, or drag it straight onto your grid) and drag it onto a card of your grid to swap them.

   The replaced card goes face up onto the discard pile, then the turn passes to the next player. The drag and drop works with a mouse, a finger or a pen.
7. Click the **"i" button** in the bottom right corner of the table to see what to do and whose turn it is. A yellow dot appears on it when the message changes. The name of the player whose turn it is is highlighted in yellow.

> To test with several players on one computer, use a private window or another browser for each account: the login token is stored in `localStorage`, which is shared by the tabs of one browser.

The game room refreshes every 3 seconds, so the other players see your actions with a short delay.

## API overview

All routes are under `/api/v1`. Every endpoint except sign-up and login needs an `Authorization: Bearer <token>` header.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users` | Sign up |
| `POST` | `/auth/login` | Log in. Returns the token in `data.token` |
| `POST` | `/games` | Create a game room. The current user becomes the host |
| `GET` | `/games/:room_code` | Get a game, its players and their grids, the piles and the current player (players only). The values of face-down cards are never sent |
| `POST` | `/games/join` | Join a pending game with `{ room_code }` |
| `POST` | `/games/:room_code/start` | Start the game and deal the cards (host only, at least 2 players) |
| `POST` | `/games/:room_code/reveal` | Reveal one of your first 2 cards with `{ card_id }` |
| `POST` | `/games/:room_code/draw` | On your turn, take a card from `{ source: "draw_pile" \| "discard_pile" }` into your hand |
| `POST` | `/games/:room_code/swap` | Put the card in your hand in place of a grid card `{ card_id }`, which goes onto the discard pile. Ends the turn |
| `POST` | `/games/:room_code/discard` | Throw a card drawn from the draw pile and reveal a face-down grid card `{ card_id }`. Ends the turn |

## Project structure

```
cieljo/
├── cieljo-backend/
│   ├── app/controllers/api/v1/   # auth, games, users (Devise)
│   ├── app/models/               # User, Game, Player, Card, Invitation, Friendship
│   └── app/services/             # GameInitializerService (builds the 150-card deck),
│                                 # GameStarterService (deals the cards),
│                                 # InitialRevealService (first 2 cards, first player),
│                                 # TurnService (draw, swap, discard)
└── cieljo-frontend/src/
    ├── api.js                    # API_URL and request headers
    ├── pages/                    # home, Auth, GameRoom
    ├── components/               # Card, PlayerGrid, TableLayout, TableCenter, RoomCode,
    │                             # InfoButton, GameTable
    ├── hooks/                    # useDealAnimation (deal animation), useCardDrag (drag and drop)
    ├── utils/                    # flyCard (cards flying over the table)
    └── styles/                   # shared SCSS variables and mixins
```

Each component's `.scss` file sits next to its `.jsx` file.

### Game domain

- **Game**: has a unique 4-character `room_code`, a `status` (`pending`, `in_progress` or `finished`) and a `current_player`. The host is the player who created the game.
- **Player**: links a `User` to a `Game`, with a `score` and a `turn_order`.
- **Card**: has a `value`, a `location` (`draw_pile`, `player_grid`, `discard_pile` or `hand` for the card the current player has drawn), `is_face_up`, and a `row`/`column` in a player's grid.
- The deck uses the Skyjo distribution of 150 cards: -2 ×5, -1 ×15, and 0 to 12 ×10 each. It is shuffled when the game is created.
- **Reveal phase**: after the deal, the game is `in_progress` without a `current_player` until every player has revealed 2 cards. The player with the highest total then becomes the current player (on a tie, the first in turn order).
- **Turns**: the current player draws a card (`games.drawn_from` remembers whether it comes from the draw pile or the discard pile), then swaps it or, for a draw pile card, discards it and reveals a grid card. The turn then goes to the next player in turn order. When the draw pile is empty, it is refilled with the discard pile except its top card.

## Development

Backend (from `cieljo-backend/`):

```bash
bin/rails test       # run the test suite (Minitest)
bin/rubocop          # lint
bin/ci               # full CI: setup, rubocop, bundler-audit, brakeman, tests, seeds (passes on main)
```

Frontend (from `cieljo-frontend/`):

```bash
npm run lint
npm run build
```

## Roadmap

- [x] Sign up and log in with JWT
- [x] Create and join a game room by code
- [x] Waiting room around the game table
- [x] Start the game and deal 12 cards to each player (3×4 grid), with a deal animation
- [x] Reveal the first 2 cards and choose the first player
- [x] Turns: draw, swap or discard, reveal cards, with drag and drop and card animations
- [x] Game info bubble (what to do, whose turn)
- [ ] Column removal, end of round and scoring
- [ ] Real-time updates with Action Cable (the game room polls the API for now)
- [ ] Friends and invitations
