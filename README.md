# Cieljo

Cieljo is a multiplayer online card game in the style of **Skyjo**. Players create or join a game room with a 4-character code and play against each other in their browser.

> 🚧 Work in progress: accounts, game rooms, the deal, the reveal of the first cards, the turns, the removal of columns and the rounds with their scores work: a game is played in several rounds until a player reaches 100 points.

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

By default the frontend calls the API at `http://localhost:3000/api/v1`, and the API only accepts calls from `http://localhost:5173` (CORS). Keep these default ports, or change them with `VITE_API_URL` (copy `cieljo-frontend/.env.example` to `.env.local`) and `FRONTEND_ORIGIN` on the backend.

## How to play (current state)

1. Open http://localhost:5173/auth and create an account, then log in.
2. On the home page, **create a game**. You are taken to the room `/game/<ROOM_CODE>`, shown as a green table with the room code in the middle.
3. Share the room code. Other players join it from the home page and sit around the table: **2 to 8 players**, as in the official rules. The lobby shows how many players have joined ("3/8 players"). You always sit at the bottom center; the others are seated clockwise in turn order, one per place, in the 7 places around you.
4. Once at least 2 players are seated, the host clicks **Start the game**. The room code fades out, the draw pile appears, and the cards are dealt: 12 face-down cards to each player (a 3×4 grid), then one card is flipped onto the discard pile.
5. Each player reveals 2 cards of their grid by clicking them. Once everyone has, the player with the highest total plays first.
6. On your turn, either:
   - **click the draw pile**: the card flips face up on top of it. Then **drag it onto a card of your grid** to swap them, or **click a face-down card** of your grid to throw the drawn card onto the discard pile and reveal that card;
   - or **take the discard pile card** (click it, or drag it straight onto your grid) and drag it onto a card of your grid to swap them.

   Instead of dragging, you can also swap with two clicks: click the card in your hand to select it (it stays raised), then click the card of your grid to replace. A discard pile card taken with a click is selected at once. Click the card in your hand again to cancel.

   The replaced card goes face up onto the discard pile, then the turn passes to the next player. The drag and drop works with a mouse, a finger or a pen, and the whole game can be played with the keyboard (Tab, then Enter) or a screen reader, which names every card.
7. When a column of your grid holds **3 face-up cards of the same value**, it is removed: its cards fly to the discard pile and the remaining columns close up.
8. When a player has revealed **all the cards left in their grid**, the last round begins: every other player plays one more turn. Then all the cards are revealed and each player scores the total of their grid (removed columns no longer count). If the player who ended the round does not have the lowest score (a tie is not enough), their points are doubled when positive (shown as `6×2`). The scores show in the middle of the table, with the points of every round and each player's total.

   During a round, the points of your face-up cards show under each player's name.
9. Between two rounds, click **Ready**: the next round starts once every player is ready, or after 30 seconds anyway. A new deck is dealt, everyone reveals 2 cards, and the player who ended the previous round plays first. When a player reaches **100 points**, the game is over: the lowest total wins.
10. Click the **"i" button** in the bottom right corner of the table to see what to do and whose turn it is. A yellow dot appears on it when the message changes. From the second round on, the bubble also shows each player's total score. The name of the player whose turn it is is highlighted in yellow.
11. To leave, click **Leave the table**. In the lobby you simply leave (you can join again with the code). During a game you can **pause it** (your seat waits for you) or **quit it for good** (you forfeit: your cards leave the game and the others go on). When only one player is left, they win. Between two rounds, leaving works the same way. After the final scores, going back home keeps the game on screen for the others. Find your paused games with the **My games** button on the home page.

Games nobody has played for 24 hours are deleted automatically.

> To test with several players on one computer, use a private window or another browser for each account: the login token is stored in `localStorage`, which is shared by the tabs of one browser.

The game room refreshes every 3 seconds while its tab is visible, so the other players see your actions with a short delay. A hidden tab stops refreshing and catches up as soon as you come back to it.

Animations (the deal, the flying cards, the flips) only play while you are looking: what happened while the tab was hidden shows in its final state when you come back, and leaving the tab ends a running animation at once. They are also turned off when your system asks to reduce motion.

Sessions last 24 hours. When a session has expired, or after logging out (which logs you out on all your devices), the app sends you to the login page and brings you back to the page you were on, such as a game room opened from a link.

The table follows the size of your window: on a computer or a tablet in landscape, it grows or shrinks to fit the screen (phones in portrait are not supported yet).

## API overview

All routes are under `/api/v1`. Every endpoint except sign-up and login needs an `Authorization: Bearer <token>` header.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/users` | Sign up with `{ user: { email, password, username } }`; the password needs at least 8 characters (5 sign-ups per hour per IP address) |
| `POST` | `/auth/login` | Log in with `{ user: { email, password } }`. Returns the token in `data.token`; 401 for wrong credentials, 400 without credentials (10 attempts per 3 minutes per IP address) |
| `DELETE` | `/auth/logout` | Log out: revokes every token of the user, on all their devices |
| `GET` | `/me` | The logged-in user (`id`, `email`, `username`) |
| `GET` | `/games` | Your games in the lobby, in progress or between two rounds, most recently active first, with whose turn it is |
| `POST` | `/games` | Create a game room. The current user becomes the host (10 per minute per user) |
| `GET` | `/games/:room_code` | Get a game, its players and their grids, the piles (with the last 5 discarded cards) and the current player (players only), the round number, each player's total and points per round, and between two rounds who is ready and the seconds left. The values of face-down cards are never sent |
| `POST` | `/games/join` | Join a pending game with `{ room_code }` (8 players maximum) |
| `POST` | `/games/:room_code/leave` | Leave the lobby (the next player becomes the host if needed), or forfeit a game in progress |
| `POST` | `/games/:room_code/start` | Start the game and deal the cards (host only, at least 2 players) |
| `POST` | `/games/:room_code/reveal` | Reveal one of your first 2 cards with `{ card_id }` |
| `POST` | `/games/:room_code/draw` | On your turn, take a card from `{ source: "draw_pile" \| "discard_pile" }` into your hand |
| `POST` | `/games/:room_code/swap` | Put the card in your hand in place of a grid card `{ card_id }`, which goes onto the discard pile. Removes a completed column, returned as `removed_column`. Ends the turn |
| `POST` | `/games/:room_code/discard` | Throw a card drawn from the draw pile and reveal a face-down grid card `{ card_id }`. Removes a completed column, returned as `removed_column`. Ends the turn |
| `POST` | `/games/:room_code/ready` | Between two rounds, you are ready for the next one. It starts once every player is ready, or on any request after 30 seconds |

Account routes: only sign-up (`POST /users`), login (`POST /auth/login`), logout (`DELETE /auth/logout`) and the current user (`GET /me`) exist. Devise's other routes (sign in/out, password, account edit or delete) are not exposed because they do not work with the JWT flow; editing or deleting an account and "forgot password" emails are planned as dedicated endpoints.

**Rate limits**: logins (10 per 3 minutes per IP address), sign-ups (5 per hour per IP address) and new games (`POST /games`, 10 per minute per user) are limited. Over the limit, the API answers `429 Too Many Requests` with a JSON error.

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
    ├── pages/                    # Home, Auth, GameRoom
    ├── components/               # Card, PlayerGrid, TableLayout, TableCenter, RoomCode,
    │                             # InfoButton, RoundScores, ScoreTable, LeaveGameDialog, GameTable
    ├── game/                     # pure game logic, tested with Vitest: seating, table changes,
    │                             # info message, deal order, rules from the API, card labels,
│                             # round scores, live points
    ├── hooks/                    # useDealAnimation, useCardDrag, useThrowToDiscard, useTableChanges
    ├── utils/                    # flyCard (cards flying over the table), prefersReducedMotion
    └── styles/                   # shared SCSS variables and mixins
```

Each component's `.scss` file sits next to its `.jsx` file.

### Game domain

- **Game**: has a unique 4-character `room_code`, a `status` (`pending`, `in_progress`, `round_over` between two rounds, or `finished`), a `round_number` and a `current_player`. The host is the player who created the game.
- **Player**: links a `User` to a `Game`, with a `score` (the total of the rounds), a `turn_order` and `ready_for_next_round`. **RoundResult** keeps the points of each player for each round. A game has 2 to 8 players (`Game::MAX_PLAYERS`).
- **Card**: has a `value`, a `location` (`draw_pile`, `player_grid`, `discard_pile` or `hand` for the card the current player has drawn), `is_face_up`, and a `row`/`column` in a player's grid.
- The deck uses the Skyjo distribution of 150 cards: -2 ×5, -1 ×15, and 0 to 12 ×10 each. It is shuffled when the game is created.
- **Reveal phase**: after the deal, the game is `in_progress` without a `current_player` until every player has revealed 2 cards. The player who ended the previous round then plays first; in the first round (or if that player has quit), the player with the highest total (on a tie, the first in turn order).
- **Turns**: the current player draws a card (`games.drawn_from` remembers whether it comes from the draw pile or the discard pile), then swaps it or, for a draw pile card, discards it and reveals a grid card. The turn then goes to the next player in turn order. When the draw pile is empty, it is refilled with the discard pile except its top card.
- **Column removal**: after a move, a column of 3 face-up cards of the same value goes onto the discard pile; the other cards keep their row and column, and the grid closes up on screen.
- **End of the round**: the first player with no face-down card left in their grid ends the round (`games.round_ender_turn_order` keeps their seat); each other player plays once more, then every card is revealed, the round points are saved as `RoundResult`s and added to `players.score`. If a player reaches 100 points the game is `finished`; otherwise it is `round_over` until every player is ready or 30 seconds have passed (`NextRoundService`), and the next round is dealt with a new shuffled deck. The points of the player who ended the round are doubled when positive and another player has a lower or equal score.
- **Leaving**: in the lobby the player is removed and the seats are renumbered; an empty lobby is deleted. In a game in progress the player forfeits: their cards leave the game, a card in their hand goes onto the discard pile, the turn passes on if it was theirs (or the round ends, during the last round), and with one player left the game is `finished` (that player wins). Between two rounds the player is removed, and the next round starts if all the others are ready.
- **Cleanup**: a job (Solid Queue, every hour in production) deletes the games where nothing changed for 24 hours.

## Deploying to Render

The whole app is described in `render.yaml` (a Render Blueprint): the Rails API, its PostgreSQL database and the React frontend, all in Frankfurt.

| Part | On Render | Plan |
| --- | --- | --- |
| API (`cieljo-backend`) | Web service `cieljo-api` | Starter (~7 $/month, always on) |
| Database | PostgreSQL `cieljo-db` | `0.1c-256mb` (~6–7 $/month) |
| Frontend (`cieljo-frontend`) | Static site `cieljo` | Free, within the included bandwidth |

Check the current prices on Render before creating the services.

### First deployment

1. Create a Render account and connect it to GitHub.
2. In the Render dashboard, choose **New → Blueprint** and select this repository. Render reads `render.yaml` and lists the database and the two services.
3. Render asks for the two values it cannot guess:
   - `FRONTEND_ORIGIN` (API): the address of the frontend, for example `https://cieljo.onrender.com`;
   - `VITE_API_URL` (frontend): the address of the API, for example `https://cieljo-api.onrender.com/api/v1`.
4. Create the Blueprint. Render creates the database, builds both parts, prepares the database (`bin/rails db:prepare`) and starts the API.
5. If Render gave the services other addresses (a name already taken gets a suffix), update `FRONTEND_ORIGIN` in the API's **Environment** and `VITE_API_URL` in the frontend's **Environment**, then redeploy the frontend: `VITE_API_URL` is built into its JavaScript.
6. Check that `https://<api address>/up` answers with a green page, then open the frontend and create an account.

On the first build of the frontend, check in the log that the published folder is `dist`.

### Environment variables

| Variable | Service | Set by |
| --- | --- | --- |
| `DATABASE_URL` | API | Render, from the database |
| `SECRET_KEY_BASE` | API | Render, generated once |
| `JWT_SECRET_KEY` | API | Render, generated once (changing it logs every player out) |
| `APP_HOST` | API | Render, the API's own address (only requests to it are accepted) |
| `FRONTEND_ORIGIN` | API | You (comma-separated if there are several) |
| `SOLID_QUEUE_IN_PUMA` | API | `render.yaml` (background jobs run inside the web process) |
| `VITE_API_URL` | Frontend | You, built into the JavaScript |

Without `DATABASE_URL`, `JWT_SECRET_KEY`, `APP_HOST` or `FRONTEND_ORIGIN`, the API refuses to start in production with a message naming the missing variable.

### Next deployments

Every merge into `main` deploys again, each part only when its folder changes. Before the new version of the API starts, `bin/rails db:prepare` applies the new migrations; if it fails, the previous version stays online.

## Development

Backend (from `cieljo-backend/`):

```bash
bin/rails test       # run the test suite (Minitest)
bin/rubocop          # lint
bin/ci               # full CI: setup, rubocop, bundler-audit, brakeman, tests, seeds (passes on main)
```

To test a game by hand without playing every turn (development only; quote the task name in zsh):

```bash
bin/rails "dev:reveal[ABCD]"      # reveal every grid card but one per player: the next move can end the round
bin/rails "dev:scores[ABCD,95]"   # set every player's total score (the round history is not changed)
```

Frontend (from `cieljo-frontend/`):

```bash
npm test             # Vitest (npm run test:watch to rerun on save)
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
- [x] Accessibility: play with clicks or the keyboard, cards and forms named for screen readers
- [x] Game info bubble (what to do, whose turn)
- [x] Leave, pause or forfeit a game, and automatic cleanup of inactive games
- [x] Column removal (3 identical face-up cards), with its animation
- [x] End of the round and scoring
- [x] Several rounds, until a player reaches 100 points
- [x] Live points of the round under each name, total scores in the info bubble
- [x] Up to 8 players, seated around a table of fixed width
- [x] A table that adapts to the size of the screen (computers and tablets)
- [ ] A layout for phones in portrait
- [ ] Real-time updates with Action Cable (the game room polls the API for now)
- [ ] Friends and invitations
