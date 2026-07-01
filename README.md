# 🎯 QuizLive — Real-Time Polling & Quiz Platform

A full-stack, production-quality Kahoot-style live quiz platform. Hosts create quizzes, participants join with a room code, questions sync in real time over WebSockets, and a leaderboard updates instantly after every question.

---

## ✨ Features

- **JWT authentication** — register, login, forgot/reset password, protected routes
- **Role-based access** — Host (create/manage quizzes) vs Participant (join/play)
- **Real-time engine** — Socket.IO powers room state, synchronized countdowns, live answers, and leaderboard broadcasts
- **Server-controlled timers** — prevents client-side cheating; scores are calculated server-side from response time
- **Live leaderboard** — ranks by score, ties broken by response time, animates on update
- **Quiz builder** — multiple choice, true/false, and poll (no correct answer) question types, configurable timer & points per question
- **Analytics dashboard** — accuracy per question, hardest question, completion rate, average response time, Chart.js visualizations
- **Room management** — unique 6-character codes, reconnect support, kick participants, waiting-room chat
- **Bonus features implemented** — poll mode, question/option randomization, CSV export of results, pause/resume, kick participant, invite link copy, dark mode UI

---

## 🏗 Architecture

```
quizlive/
├── backend/      Node.js + Express + MongoDB + Socket.IO (MVC)
└── frontend/     React (Vite) + Tailwind CSS + Socket.IO client
```

**Backend (MVC):**
```
backend/src/
├── config/         MongoDB connection
├── controllers/    Auth, Quiz, Room, Analytics business logic
├── middleware/      JWT auth, validation, error handling
├── models/          User, Quiz, Room, Submission (Mongoose schemas)
├── routes/          REST endpoint definitions
├── socket/          Real-time engine: timers, leaderboard, chat
├── utils/           Token gen, room codes, score calc
├── app.js           Express app config
└── server.js        Entry point
```

**Frontend:**
```
frontend/src/
├── components/      Reusable UI (Button, Card, Modal, Navbar...)
├── context/         AuthContext, QuizContext (global state)
├── hooks/           useSocketEvent, useSocketEmit
├── pages/           One file per route
├── services/        api.js (Axios), socket.js (Socket.IO client)
└── App.jsx           Router
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment variables

**backend/.env**
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quizlive
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run locally

```bash
# Terminal 1 — backend
cd backend
npm run dev      # nodemon, http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm run dev       # http://localhost:5173
```

Open `http://localhost:5173`, register as a **Host**, create a quiz, and start a session. Open a second browser/incognito window, register as a **Participant**, and join with the room code shown on the host screen.

---

## ☁️ Deployment

### Backend → Render
1. Push `backend/` to a GitHub repo (or monorepo with root directory set to `backend`)
2. Create a new **Web Service** on Render, connect the repo
3. Build command: `npm install` · Start command: `npm start`
4. Add environment variables from `.env.example` (use your MongoDB Atlas URI and set `CLIENT_URL` to your deployed frontend URL)

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import into Vercel, framework preset: **Vite**
3. Add environment variables: `VITE_API_URL` and `VITE_SOCKET_URL` pointing to your Render backend
4. Deploy

### Database → MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Add a database user and whitelist `0.0.0.0/0` (or Render's IPs) under Network Access
3. Copy the connection string into `MONGODB_URI`

---

## 📡 REST API

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create account | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/profile` | Get current user | Private |
| PUT | `/api/auth/profile` | Update profile | Private |
| POST | `/api/auth/forgot-password` | Request reset link | Public |
| POST | `/api/auth/reset-password/:token` | Reset password | Public |
| GET | `/api/quizzes` | List my quizzes | Private |
| POST | `/api/quizzes` | Create quiz | Host |
| GET | `/api/quizzes/:id` | Get quiz | Private |
| PUT | `/api/quizzes/:id` | Update quiz | Host (owner) |
| DELETE | `/api/quizzes/:id` | Delete quiz | Host (owner) |
| GET | `/api/quizzes/:id/history` | Past sessions | Host (owner) |
| POST | `/api/rooms` | Create room from quiz | Host |
| POST | `/api/rooms/join` | Join with room code | Private |
| GET | `/api/rooms/:id` | Room details | Private |
| GET | `/api/rooms/code/:code` | Lookup by code | Private |
| GET | `/api/rooms/:id/results` | Final results | Private |
| GET | `/api/analytics/:quizId` | Quiz analytics | Host (owner) |
| GET | `/api/analytics/dashboard` | Host dashboard stats | Host |

---

## 🔌 Socket.IO Events

**Client → Server**
| Event | Payload | Role |
|---|---|---|
| `create-room` | `{ roomCode }` | Host |
| `start-quiz` | `{ roomCode }` | Host |
| `next-question` | `{ roomCode }` | Host |
| `pause-quiz` / `resume-quiz` | `{ roomCode }` | Host |
| `end-quiz` | `{ roomCode }` | Host |
| `kick-participant` | `{ roomCode, userId }` | Host |
| `join-room` | `{ roomCode }` | Participant |
| `submit-answer` | `{ roomCode, questionIndex, selectedOption }` | Participant |
| `chat-message` | `{ roomCode, message }` | Both |

**Server → Client (broadcast)**
| Event | Description |
|---|---|
| `participant-joined` / `participant-left` | Roster updates |
| `quiz-started` | Quiz session begins |
| `new-question` | Next question payload (answers hidden) |
| `timer-update` | Countdown tick, every second |
| `answer-received` | Per-user confirmation w/ correctness & points |
| `answer-submitted` | Notifies host someone answered |
| `leaderboard-updated` | Sorted leaderboard after each question |
| `quiz-paused` / `quiz-resumed` | Pause state |
| `quiz-ended` | Final leaderboard + redirect to results |
| `chat-message` | New chat message |
| `kicked` | Participant removed by host |

---

## 🔐 Security

- Passwords hashed with **bcrypt** (cost factor 12)
- **JWT** with configurable expiry, verified on every protected route and socket connection
- **Helmet** for secure HTTP headers
- **express-rate-limit** — 100 req/15min globally, 10 req/15min on auth routes
- **express-validator** on all mutating endpoints
- Server-authoritative timers and scoring — clients cannot manipulate response times or correctness
- CORS locked to `CLIENT_URL`

---

## 🗺 Future Improvements

- Avatar image upload (currently uses DiceBear generated avatars)
- Sound effects for correct/incorrect answers and countdown
- PWA manifest + service worker for offline shell
- Refresh tokens / silent re-auth
- Quiz templates / question bank import
- Team mode (group participants into teams)

---

## 📸 Screenshots

_Add screenshots here: landing page, quiz builder, host control panel, live question, leaderboard, analytics dashboard._

---

## 🧰 Tech Stack

**Frontend:** React 18 (Vite) · React Router · Axios · Context API · Socket.IO Client · Tailwind CSS · React Hook Form · Chart.js · React Toastify

**Backend:** Node.js · Express · MongoDB · Mongoose · Socket.IO · JWT · bcryptjs · Helmet · Morgan · CORS · express-validator · express-rate-limit
