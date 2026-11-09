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
- All API routes live under `/api/v1` (`config/routes.rb`). The frontend hardcodes `API_URL = 'http://localhost:3000/api/v1'` in each page file. There is no shared API client or Vite proxy.
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
- `Card`: `value`, `location` (string, for example `draw_pile`), `is_face_up`, and `row`/`column` for its position in a player's grid. `player_id` is nullable in the DB (it is null for deck cards), but the model still declares `belongs_to :player` without `optional: true`.
- `GameInitializerService` builds the 150-card Skyjo deck (-2×5, -1×15, 0..12×10), shuffles it, and inserts it with `insert_all!`, which skips model validations.
- `POST /api/v1/games` creates the game, adds the current user as player 1, sets `current_player`, then runs the initializer.
- `Friendship` (self-join on `User`, status `pending|accepted|blocked`) and `Invitation` (`host`/`guest` users) exist only as models for now, with no endpoints.

### Frontend routes (`src/App.jsx`)
- `/` → `pages/home.jsx` (creates a game, then navigates to the room)
- `/auth` → `pages/Auth.jsx`
- `/game/:room_code` → `pages/GameRoom.jsx`
- `pages/Dashboard.jsx` exists but is not routed.
