# Cieljo

Cieljo is a multiplayer online card game in the style of **Skyjo**. Players create or join a game room with a 4-character code and play against each other in their browser.

> 🚧 Work in progress: accounts, game rooms and the waiting room work. The gameplay itself (dealing, turns, scoring) is still being built.

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
2. On the home page, **create a game**. You are taken to the room `/game/<ROOM_CODE>`.
3. Share the room code. Other players join it from the home page.
4. The host sees the **Start** button. The other players wait for the host to start the game.

## API overview

All routes are under `/api/v1`. Every endpoint except sign-up and login needs an `Authorization: Bearer <token>` header.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users` | Sign up |
| `POST` | `/auth/login` | Log in. Returns the token in `data.token` |
| `POST` | `/games` | Create a game room. The current user becomes the host |
| `GET` | `/games/:room_code` | Get a game and its players (players only) |
| `POST` | `/games/join` | Join a pending game with `{ room_code }` |

## Project structure

```
cieljo/
├── cieljo-backend/
│   ├── app/controllers/api/v1/   # auth, games, users (Devise)
│   ├── app/models/               # User, Game, Player, Card, Invitation, Friendship
│   └── app/services/             # GameInitializerService (builds the 150-card deck)
└── cieljo-frontend/
    └── src/pages/                # home, Auth, GameRoom
```

### Game domain

- **Game**: has a unique 4-character `room_code`, a `status` (`pending`, `in_progress` or `finished`) and a `current_player`.
- **Player**: links a `User` to a `Game`, with a `score` and a `turn_order`.
- **Card**: has a `value`, a `location` (for example `draw_pile`), `is_face_up`, and a `row`/`column` in a player's grid.
- The deck uses the Skyjo distribution of 150 cards: -2 ×5, -1 ×15, and 0 to 12 ×10 each.

## Development

Backend (from `cieljo-backend/`):

```bash
bin/rails test       # run the test suite (Minitest)
bin/rubocop          # lint
bin/ci               # full CI: setup, rubocop, bundler-audit, brakeman, tests, seeds
```

Frontend (from `cieljo-frontend/`):

```bash
npm run lint
npm run build
```

## Roadmap

- [x] Sign up and log in with JWT
- [x] Create and join a game room by code
- [x] Waiting room with the list of players
- [ ] Start the game and deal 12 cards to each player (3×4 grid)
- [ ] Turns: draw, swap or discard, reveal cards
- [ ] Column removal, end of round and scoring
- [ ] Real-time updates (polling or Action Cable)
- [ ] Friends and invitations
