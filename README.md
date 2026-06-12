# Syncora Backend Server 🚀

Syncora is a real-time collaborative music listening and voice communication platform—**"The Discord + Spotify experience for shared emotional listening."** 

This directory contains the Node.js, Express, TypeScript, and Prisma backend that powers Syncora's real-time music state synchronization, WebRTC voice signaling, and administrative APIs.

---

## 🗺️ System Architecture

The following diagram illustrates how clients communicate with the Syncora backend server, database, and peer networks:

```mermaid
graph TD
    Client[Next.js Frontend Client] <-->|HTTP REST / NextAuth| API[Express API Gateway]
    Client <-->|Socket.io Connections| Sockets[Socket.io Server]
    Client <-->|P2P WebRTC Streams| Client2[Other Frontend Clients]

    subgraph Backend [Syncora Backend Server]
        API
        Sockets
        Signaling[WebRTC Signaling Server]
        SyncEngine[Music Sync Engine]
        Security[Helmet & Rate Limiter]

        API --> Security
        Sockets --> SyncEngine
        Sockets --> Signaling
    end

    API -->|Prisma Client| DB[(PostgreSQL Database)]
    Sockets -->|Prisma Client| DB
```

---

## 🛠️ Technology Stack

The backend uses a production-ready, modular stack designed for real-time responsiveness and low latency:

*   **Runtime Environment**: Node.js
*   **Language**: TypeScript (using `tsx` for live-reload development compiles)
*   **Web Framework**: Express.js
*   **Real-time Engine**: Socket.io (handling persistent bi-directional communication)
*   **Voice Signaling Protocol**: WebRTC (facilitated via Socket.io signaling channels)
*   **Database ORM**: Prisma client communicating with a PostgreSQL database (e.g., hosted on Supabase)
*   **Caching (Future/Proposed)**: Redis (for room state retention and rapid read/write of live session tracking)
*   **Security & Optimization Middleware**:
    *   `helmet`: Secures HTTP response headers.
    *   `express-rate-limit`: Prevents API flooding and brute force attacks.
    *   `compression`: Enables Gzip compression to reduce packet transmission sizes.
    *   `cors`: Manages cross-origin resource sharing securely.

---

## 📂 Project Structure

```txt
backend/
├── prisma/
│   ├── schema.prisma   # PostgreSQL Database Schema & Relationships
│   └── seed.ts         # Seeding script for songs and initial records
├── src/
│   ├── config/         # App configuration settings
│   ├── controllers/    # Route controllers (express route handlers)
│   ├── middleware/     # Custom middlewares (auth validation, rate limiters)
│   ├── routes/         # Express router entry points (auth, rooms, playlists)
│   ├── services/       # Database & auxiliary business logic helper classes
│   ├── sockets/        # Socket.io connection handlers (room & music sync logic)
│   ├── utils/          # General utilities
│   ├── webrtc/         # WebRTC signaling handler
│   └── index.ts        # Main Express/Socket.io server startup script
├── public/
│   └── music/          # Static audio files directory
├── .env.example        # Reference for environment variables configurations
├── tsconfig.json       # TypeScript configuration parameters
└── package.json        # Dependendencies and startup scripts
```

---

## 🗄️ Database Design (Prisma Model Relations)

We use **Prisma** to manage relationships in the PostgreSQL database. The core tables are modeled as follows:

1.  **User**: Represents accounts authenticated via Google OAuth. Tracks role (`USER`, `MODERATOR`, `ADMIN`), tier (`FREE`, `PREMIUM`), and links to playlists, sessions, and host properties.
2.  **Room**: Manages shared sessions. Each room has a unique `roomCode` and references a host user, active participants, and a list of queued songs.
3.  **RoomParticipant**: A join table linking users to live rooms, tracking when they joined and their mute status.
4.  **Song**: Stores track details including title, artist, audio file URL, and cover thumbnail image.
5.  **Queue**: Handles shared playlists inside active rooms, ordered by an incrementing order number.
6.  **Playlist & PlaylistSong**: Enables users to save personal lists of tracks that they can reload into any room.
7.  **History**: Records song play history for each user.
8.  **Report**: Logs toxic behavior or audio abuse reports sent to moderators.

---

## 🔌 Socket.io Events Reference

Real-time synchronization and voice signaling are driven by Socket.io events.

### 🏠 Room Management (`src/sockets/roomSocket.ts`)
*   `join-room`: Sent by a client to join a specific room room channel.
*   `leave-room`: Sent when a user explicitly exits the room.
*   `user-joined`: Broadcasted by the server to inform others a new participant entered.
*   `user-left`: Broadcasted by the server when a user departs or disconnects.

### 🎵 Music Synchronization (`src/sockets/syncSocket.ts`)
The host controls playback state, which is broadcasted to guests. If a guest drifts by more than **250ms**, the client automatically corrects playback.
*   `music-play`: Emitted by host / guests to start a song or sync.
*   `music-pause`: Emitted by host to halt playback for everyone.
*   `seek-update`: Emitted to adjust player seek timers across all clients.
*   `queue-update`: Notifies clients that a song has been added, removed, or reordered in the queue.

### 🎙️ WebRTC Voice Call Signaling (`src/webrtc/rtc.ts`)
Voice chats connect automatically upon room entry using WebRTC channels.
*   `speaking`: Emitted when client microphone inputs cross a threshold, triggering speaker highlight glows in the UI.
*   `webrtc-offer`: Exchanged to initialize the P2P connection.
*   `webrtc-answer`: Returned in response to a WebRTC offer.
*   `ice-candidate`: Shared to negotiate NAT traverses through STUN/TURN servers.

---

## 🌐 REST API Router Endpoints

Prefix: `/api`

### 🔑 Authentication Routes
*   `POST /api/auth/login` - Authenticate user session.
*   `POST /api/auth/logout` - Discard session cookies.
*   `GET /api/user/me` - Fetch profile of currently logged-in user.

### 🚪 Room Routes
*   `POST /api/rooms/create` - Instantiate a new room (Public/Private/Solo).
*   `POST /api/rooms/join` - Verify room code and authorize entry.
*   `GET /api/rooms/:id` - Fetch live participants and current queue status.

### 🎶 Playlist Routes
*   `POST /api/playlists` - Create a custom playlist.
*   `POST /api/playlists/song` - Add a song to a playlist.
*   `DELETE /api/playlists/:id` - Remove a playlist.

### 🔍 Search & Logs
*   `GET /api/search?q=query` - Query songs, artists, or playlists with a 300ms input debounce.
*   `GET /health` - Public endpoint monitoring API health, CPU, and database reachability.

### 🛡️ Admin & Moderation Routes
*   `GET /api/admin/metrics` - Fetch real-time KPI overview (Active users, active rooms, crash reports).
*   `POST /api/reports` - Submit user abuse report.

---

## ⚙️ Setup & Installation

Follow these steps to run the backend server locally:

### 1. Prerequisites
*   **Node.js** (v18.x or higher recommended)
*   **PostgreSQL Database** (local instance or remote Supabase instance)

### 2. Configure Environment Variables
Create a `.env` file in the root of the `backend/` directory, copying the variables from `.env.example`:
```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Postgres database URLs
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REG].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REG].pooler.supabase.com:5432/postgres"
```

### 3. Install Dependencies
Run this command from inside the `backend/` directory:
```bash
npm install
```

### 4. Initialize the Database
Generate Prisma TypeScript bindings and push the schema directly to your PostgreSQL database:
```bash
# Generate Prisma Client
npm run db:generate

# Push schema structure to Database
npm run db:push

# Optional: Seed initial songs and test data
npx prisma db seed
```

### 5. Start Development Server
Launch the server in watch mode utilizing `tsx`:
```bash
npm run dev
```
The server will boot on [http://localhost:3001](http://localhost:3001).
