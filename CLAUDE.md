# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cieljo is a multiplayer online card game in the style of Skyjo. It is a monorepo with two independent apps (there is no root-level tooling):

- `cieljo-backend/`: Rails 8.1 API-only app (Ruby 3.3.5, PostgreSQL, Devise + devise-jwt)
- `cieljo-frontend/`: React 19 + Vite SPA (plain JSX, react-router-dom v7, no TypeScript)

All code, comments, API messages and UI text must be in English. The user communicates in French, so chat replies are in French.

## Commands

Backend (run from `cieljo-backend/`):

```bash
bin/setup                      # install gems, prepare DB
bin/rails server               # API on http://localhost:3000
bin/rails db:migrate
bin/rails test                                   # all tests (Minitest, parallel, fixtures :all)
bin/rails test test/models/game_test.rb          # single file
bin/rails test test/models/game_test.rb:12       # single test by line
bin/rubocop                    # lint (rubocop-rails-omakase)
bin/ci                         # full CI pipeline: setup, rubocop, bundler-audit, brakeman, tests, seeds (config/ci.rb)
```

Frontend (run from `cieljo-frontend/`):

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build
npm run lint     # ESLint
```

The frontend has no test setup.

## Architecture

### Integration between frontend and backend
- All API routes live under `/api/v1` (`config/routes.rb`). `src/api.js` exports `API_URL` (`http://localhost:3000/api/v1`), `jsonHeaders` for public requests and `authHeaders()`, which adds the `Authorization` header from `localStorage`. Every page uses them. There is no Vite proxy.
- CORS (`config/initializers/cors.rb`) only allows `http://localhost:5173` and exposes the `Authorization` header.

### Authentication (custom JWT flow, not standard Devise)
- **Sign-up**: `POST /api/v1/users` goes to `Api::V1::Users::RegistrationsController`. `sign_up` is overridden so it does not log the user in through the session.
- **Login**: `POST /api/v1/auth/login` goes to `Api::V1::AuthController#login`. This is a custom endpoint, not Devise's `sessions#create`. It checks the password manually, encodes a token with `Warden::JWTAuth::UserEncoder`, and returns it as `data.token` (already prefixed with `"Bearer "`) in the JSON body, not in a header.
- **Request auth**: `ApplicationController#authenticate_user!` **overrides** Devise's version. It decodes the token from the `Authorization` header with `Warden::JWTAuth::TokenDecoder`, loads the user from `sub`, and checks that `user.jti == payload['jti']` (JTIMatcher revocation). It sets `@current_user`. Every controller requires auth by default. Public endpoints must use `skip_before_action :authenticate_user!`.
- `RackSessionFix` concern: Devise controllers need it in API mode because there is no session store.
- The JWT secret comes from `ENV['JWT_SECRET_KEY']` or `credentials.jwt_secret_key`. Tokens expire after 1 day.
- Frontend: the token and the username are stored in `localStorage` (`token`, `username`). The token is sent as-is in the `Authorization` header.

### Game domain (`app/models`, `app/services`)
- `Game` has many `Player`s (the join between `User` and `Game`, with `score` and `turn_order`), `Card`s and `Invitation`s. `Game#current_player` points to a `Player`. On create, `room_code` is generated automatically as a unique 4-character code. `status` is one of `pending | in_progress | finished`.
- `Card`: `value`, `location` (string, for example `draw_pile`), `is_face_up`, and `row`/`column` for its position in a player's grid. `player_id` is null for draw pile and discard pile cards (`belongs_to :player, optional: true`). Locations in use: `draw_pile`, `player_grid`, `discard_pile`, `hand` (the card the current player has drawn, face up). The deal takes the draw pile in `id` order (the deck is shuffled before insertion); during the turns, `TurnService` draws a random draw pile card, so the pile stays shuffled after being refilled. The top of the discard pile is its most recently updated card.
- `GameInitializerService` builds the 150-card Skyjo deck (-2×5, -1×15, 0..12×10), shuffles it, and inserts it with `insert_all!`, which skips model validations.
- `POST /api/v1/games` creates the game, adds the current user as player 1, sets `current_player`, then runs the initializer.
- The host is the player with `turn_order` 1. `POST /api/v1/games/join` adds a player to a `pending` game.
- `POST /api/v1/games/:room_code/start` (host only, at least 2 players) runs `GameStarterService`: under a row lock, it deals a 3x4 grid (`row` 0..2, `column` 0..3) of face-down cards to each player, flips the next draw pile card onto the discard pile, sets the game `in_progress` and clears `current_player`.
- Initial reveal phase (`Game#initial_reveal_phase?`: `in_progress` with no `current_player`): each player reveals `Game::INITIAL_REVEAL_COUNT` (2) cards of their grid with `POST /api/v1/games/:room_code/reveal` (`{ card_id }`, `InitialRevealService`). Once everyone has, the player with the highest revealed total becomes `current_player` (tie: lowest `turn_order`).
- Turns (`TurnService`, under a row lock, current player only, after the reveal phase): `POST /api/v1/games/:room_code/draw` (`{ source: "draw_pile" | "discard_pile" }`) puts a card in the player's hand and stores its origin in `games.drawn_from`; an empty draw pile is refilled with the discard pile except its top card. Then `POST .../swap` (`{ card_id }`) puts the card in hand in place of a grid card, which goes to the discard pile, or `POST .../discard` (`{ card_id }`, only for a card drawn from the draw pile) throws the card in hand and reveals a face-down grid card. Both end the turn: next player in turn order, `drawn_from` cleared, `turn_number` + 1. Column removal and the end of the round are not implemented yet.
- `GET /api/v1/games/:room_code` (players only) returns `initial_reveal`, `current_player_id`, the `hand` card (with `player_id` and `drawn_from`), the players with their `grid`, the `draw_pile_count` and the `discard_top` card. The value of a face-down card is never sent (`card_json` in `GamesController`).
- `Friendship` (self-join on `User`, status `pending|accepted|blocked`) and `Invitation` (`host`/`guest` users) exist only as models for now, with no endpoints.

### Frontend routes (`src/App.jsx`)
- `/` → `pages/home.jsx` (creates a game or joins one with a room code, then navigates to the room)
- `/auth` → `pages/Auth.jsx`
- `/game/:room_code` → `pages/GameRoom.jsx` (polls the game every 3 seconds; shows the lobby on the table while `pending`, then `components/GameTable.jsx`)
- `pages/Dashboard.jsx` exists but is not routed.

### Frontend structure
- `src/pages/`: one component per route. `src/components/`: reusable components (`Card`, `PlayerGrid`, `TableLayout` for the green table and the seats around it, `RoomCode` shown in its middle in the lobby, `TableCenter` for the piles and the game message in its middle during the game, `GameTable`). The table keeps the same size when the game starts: the room code fades out, the piles fade in, then the cards are dealt.
- `src/hooks/`: custom hooks. `useDealAnimation` plays the ~10 s deal animation (cards fly from the draw pile with the Web Animations API, then the first discard card flips) when a page sees the game go from `pending` to `in_progress`. It is skipped with `prefers-reduced-motion`.
- `useCardDrag` is a home-made drag and drop with Pointer Events (mouse, touch, pen; no library): a copy of the card follows the pointer, the target is found with `elementFromPoint` and `data-card-id`. During a turn, the card in hand sits on the pile it was taken from and is dragged onto a grid card to swap it; clicking a face-down grid card discards a card drawn from the draw pile and reveals it; before drawing, the discard pile card can be dragged straight onto the grid (draw then swap).
- `GameRoom` sends every action through `postAction`, which reloads the game before resolving, and polls the game every 3 seconds.
- Each component's `.scss` file sits next to its `.jsx` file and is imported by it. `src/styles/` only holds shared SCSS (`_variables.scss`, `_mixins.scss`), used with `@use`.
