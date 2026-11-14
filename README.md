# Least Count - Real-Time Multiplayer Card Game

A production-ready, authoritative, real-time multiplayer implementation of the classic Indian card game **"Least Count"** (also known as *Low Count* or *Lobo*). Built for cross-device play (smartphones, tablets, and desktops) with synchronized state over WebSockets, deployed on Cloudflare Pages and Cloudflare Workers (using Durable Objects and the WebSocket Hibernation API).

---

## 🃏 Rule Assumptions & Mechanics

Where game rules have regional variations, this implementation adheres to the following clear and fair standard conventions:

1. **Objective**: Hold the strictly lowest hand total points when calling **"Show"**.
2. **Hand Size**: Exactly **5 cards** are dealt to each player at the start of a round.
3. **Turn Sequence**:
   - Clockwise order.
   - At the start of their turn (before discarding), a player may declare **"Show"** if their hand total is $\le$ the host-configured `showLimit` (default **10 points**).
   - Otherwise, the player must **discard** either 1 card or multiple cards of the **exact same rank** (e.g. `[7♠, 7♦]`).
   - After discarding, the player must **draw 1 card**: either the top card of the face-down **stock pile** or from the **discard pile**. If the previous player discarded a set of cards, the drawer can choose **any one card** from that set.
4. **Show Resolution & Penalties**:
   - **Successful Show**: The caller has the strictly lowest hand total. The caller scores **0 points** for the round. All opponents add their current hand total to their cumulative score.
   - **Wrong Show (Tie or Beaten)**: If any opponent has a hand total equal to or lower than the caller, the caller is penalized by adding **+40 penalty points** (configurable) **plus** their hand total. The opponent with the lowest hand total scores **0 points**. All other opponents add their hand total.
5. **Card Point Values**:
   - Number cards `2`–`10`: Face value (2 to 10 points).
   - `Ace`: Configurable as **1 point** (default) or **14 points**.
   - Face Cards (`K`, `Q`, `J`): Configurable as **10 points each** (default) or actual values (`J=11`, `Q=12`, `K=13`).
   - External Jokers: Optional printed jokers (2 per deck) worth **0 points**.
6. **Stock Depletion & Reshuffle**:
   - When the stock pile runs out, the discard pile (excluding its current top card) is shuffled to form the new stock pile.
7. **Slap / Quick Match (Optional Bonus)**:
   - When enabled by the host, any player may discard card(s) matching the rank of the current top discard card **out of turn**. No card is drawn in replacement.
8. **Elimination & Winner**:
   - In target mode (default **100 points**), players whose cumulative score reaches or exceeds the target are eliminated. The last remaining player wins.
   - In single-round mode, the winner of the single round wins the game.
9. **Turn Timers**:
   - Optional host setting (15s, 30s, 45s, 60s). On timeout, the server auto-discards the player's highest-value card and auto-draws from the stock pile.

---

## 🏗️ Architecture & Tech Stack

```
LeastCount/
├── shared/           # Pure TypeScript game engine, deck builder, scoring & types
│   ├── src/          # Authoritative logic, validation, pure functions
│   └── tests/        # 33 Vitest unit tests covering all rules & edge cases
├── worker/           # Cloudflare Worker with Durable Object (RoomDO)
│   ├── src/          # WebSocket Hibernation API, session tokens, sequential queues
│   └── wrangler.toml # DO migrations & bindings
├── frontend/         # React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
│   ├── src/          # Fanned hand, Opponent views, Sound FX, QR code share
│   └── dist/         # Cloudflare Pages production build output
└── package.json      # Root npm workspaces configuration
```

### Key Technical Highlights
- **Authoritative Server**: All game actions are validated and executed inside Cloudflare Durable Objects. Clients only send intents (`discard`, `draw`, `show`).
- **Hidden Information Guarantee**: Other players' hands and the stock deck are **never** transmitted over the network until a round officially concludes.
- **WebSocket Hibernation API**: The Worker uses Cloudflare's WebSocket Hibernation API to maintain idle connections without charging active compute.
- **Auto-Reconnection**: Rejoining via `sessionToken` stored in `localStorage` restores a player's seat, hand, and score after refreshing, mobile network shifts, or tab closing.
- **Synthesized Audio (Web Audio API)**: Zero external MP3/WAV dependencies; crisp procedural sound effects for dealing, drawing, snapping, turns, and win fanfares work offline and with instant responsiveness.

---

## 🚀 Local Development Setup

Run both the Cloudflare Worker backend and Vite frontend together with a single command:

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Unit Tests
Verify the rules engine and deck logic:
```bash
npm test
```
All 33 Vitest unit tests will execute.

### 4. Start Local Dev Servers
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Worker (Durable Objects)**: `http://localhost:8787`

---

## 📱 Testing Multi-Device Play on the Same Wi-Fi

1. Find your computer's local IP address:
   - **Windows**: Run `ipconfig` (e.g. `192.168.1.45`)
   - **macOS / Linux**: Run `ifconfig` or `ip a`
2. Start the development server with host exposure:
   ```bash
   npm run dev
   ```
   (Vite is already pre-configured with `server.host = true`).
3. Open `http://<YOUR_LOCAL_IP>:5173` on your computer and create a room.
4. From your phone, tablet, or another laptop connected to the same Wi-Fi:
   - Scan the **QR Code** in the room lobby, or
   - Open `http://<YOUR_LOCAL_IP>:5173/room/<ROOM_CODE>` in your mobile browser.
5. All devices will connect in real time, synchronizing actions and turns instantly.

---

## ☁️ Deployment Guide

### A. Deploy the Backend Worker (Cloudflare Workers + Durable Objects)

1. Log in to Cloudflare from your terminal:
   ```bash
   npx wrangler login
   ```
2. Deploy the Worker:
   ```bash
   npm run deploy:worker
   ```
3. Take note of the deployed Worker URL (e.g. `https://least-count-worker.<your-subdomain>.workers.dev`).

### B. Deploy the Frontend (Cloudflare Pages)

#### Option 1: Git Integration (Recommended)
1. Push this repository to GitHub or GitLab.
2. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_WS_URL`: `https://least-count-worker.<your-subdomain>.workers.dev` (the URL from Step A)
5. Click **Save and Deploy**.

#### Option 2: Direct Upload via Wrangler CLI
1. Build the shared library and frontend:
   ```bash
   npm run build
   ```
2. Deploy the `frontend/dist` directory to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy frontend/dist --project-name least-count
   ```

---

## ⚙️ Environment Variables

| Variable | Scope | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_WS_URL` | Frontend (`frontend/.env` or Pages Settings) | Cloudflare Worker URL for WebSocket connections. When omitted in dev, defaults to `window.location.host` or port `8787`. | `https://least-count-worker.subdomain.workers.dev` |

---

## 🧪 Unit Test Coverage

The `shared/tests` suite validates:
- **Deck generation**: Standard 52-card single deck, 104-card double deck, and optional printed jokers (54 / 108 cards).
- **Dealing & Reshuffling**: 5-card distribution, stock depletion, and discard reshuffling preserving top card.
- **Scoring**: Number cards (2–10), Ace values (1 vs 14), Face cards (10 vs actual 11, 12, 13), and Jokers (0 pts).
- **Rule Validations**: Single card discard, same-rank multi-card discard sets, mismatched rank rejections, and draw source checks.
- **Show Resolution**: Strict-lowest winning show (0 pts), wrong show tie/loss penalties (+40 pts + hand total), target score elimination, and single-round match crowning.

