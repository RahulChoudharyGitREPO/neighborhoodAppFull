# Neighborhood Helper

A community-based peer-to-peer service platform that connects neighbors who need help with those willing to offer assistance. Post requests, discover helpers nearby, chat in real time, and track help on its way — all within your neighborhood.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Database Models](#database-models)
- [Security](#security)
- [License](#license)

---

## Features

### Core

- **User Authentication** — Register, login, password reset, JWT-based sessions with refresh tokens.
- **Dual-Role System** — Users can act as a helper, a requester, or both.
- **Help Requests** — Create, search, edit, and manage requests for help with geospatial radius filtering.
- **Service Offers** — Post what you can help with so nearby neighbors can find you.
- **Smart Matching** — Connect requesters with available helpers and manage the lifecycle of each match.

### Real-Time

- **Live Chat** — WebSocket-powered messaging between matched users with read receipts and attachment support.
- **Live Location Tracking** — Swiggy-style real-time tracking of a helper's location once they're en route.

### Community

- **Ratings & Reviews** — 5-star rating system with written reviews after a match is completed.
- **User Profiles** — Avatar upload (via Cloudinary), bio, skills list, and configurable search radius.
- **Privacy Controls** — Block users and mask your exact location.

### Categories

Errands · Moving · Repairs · Gardening · Tech Support · Tutoring · Other

---

## Tech Stack

### Backend

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Runtime        | Node.js 16+                                    |
| Framework      | Express.js 4.18                                |
| Database       | MongoDB with Mongoose ODM                      |
| Real-Time      | Socket.IO 4.6                                  |
| Auth           | JWT (access + refresh tokens), bcryptjs         |
| Validation     | Joi                                            |
| Image Upload   | Cloudinary + Multer                            |
| API Docs       | Swagger UI (swagger-jsdoc)                     |
| Security       | Helmet.js, CORS, express-rate-limit            |
| Testing        | Jest + Supertest                               |

### Frontend

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Framework      | Next.js 16 (App Router)                        |
| Language       | TypeScript                                     |
| Styling        | Tailwind CSS v4                                |
| State          | Zustand (with localStorage persistence)        |
| HTTP Client    | Axios (with interceptors)                      |
| Forms          | React Hook Form + Zod                          |
| Maps           | Google Maps JavaScript API                     |
| Animations     | Framer Motion                                  |
| Icons          | Lucide React                                   |
| Notifications  | React Hot Toast                                |

### Infrastructure

- Docker & docker-compose for containerized development
- Mongo Express for database UI in development

---

## Project Structure

```
neighbuorhoodFinderApp/
├── backend/
│   └── src/
│       ├── config/          # env, database, swagger config
│       ├── middleware/       # auth, validation, error handler
│       ├── models/          # 11 Mongoose schemas
│       ├── routes/          # 8 route files (40+ endpoints)
│       ├── validators/      # Joi validation schemas
│       ├── utils/           # jwt, crypto, mailer, sms, audit
│       ├── socket/          # WebSocket event handlers
│       └── server.js        # Entry point
│
└── Frontend/web/
    ├── app/                 # Next.js App Router pages
    │   ├── login/           # Login page
    │   ├── register/        # Registration page
    │   ├── select-role/     # Role selection
    │   ├── map/             # Main map & feed view
    │   ├── post/new/        # Create a request
    │   ├── create-offer/    # Create an offer
    │   ├── requests/[id]/   # Request detail & edit
    │   ├── offers/[id]/     # Offer detail
    │   ├── chat/[threadId]/ # Real-time chat
    │   ├── tracking/[matchId]/ # Live location tracking
    │   ├── profile/         # User profile & settings
    │   └── inbox/           # Message threads
    ├── components/
    │   ├── shared/          # navbar, request-card, offer-card, rating-stars
    │   └── ui/              # button, input, textarea, select, badge, card, avatar
    ├── lib/                 # Axios client, utilities
    ├── store/               # Zustand user store
    └── types/               # TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 16+
- npm
- MongoDB (local or Atlas)
- Docker (optional, recommended)
- Google Maps API key (optional, for map & tracking features)

### Option 1 — Docker (Recommended)

```bash
cd backend
docker-compose --profile dev up
```

Then in a separate terminal:

```bash
cd Frontend/web
npm install
npm run dev
```

### Option 2 — Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd Frontend/web
npm install
npm run dev
```

> Make sure MongoDB is running locally or update `MONGODB_URI` in the backend `.env` to point to your instance.

### Access Points

| Service       | URL                          |
| ------------- | ---------------------------- |
| Frontend      | http://localhost:3000         |
| Backend API   | http://localhost:5000         |
| API Docs      | http://localhost:5000/docs    |
| Health Check  | http://localhost:5000/health  |
| Mongo Express | http://localhost:8081         |

---

---

## API Documentation

Interactive Swagger docs are available at `http://localhost:5000/docs` when the backend is running.

### Key Endpoints

| Method | Endpoint                           | Description                  |
| ------ | ---------------------------------- | ---------------------------- |
| POST   | `/auth/register`                   | Register a new user          |
| POST   | `/auth/login`                      | Login                        |
| POST   | `/auth/refresh`                    | Refresh access token         |
| POST   | `/auth/logout`                     | Logout                       |
| POST   | `/auth/request-password-reset`     | Request password reset       |
| GET    | `/me`                              | Get current user profile     |
| PATCH  | `/me/profile`                      | Update profile               |
| POST   | `/me/avatar`                       | Upload avatar                |
| POST   | `/requests`                        | Create a help request        |
| GET    | `/requests`                        | Search requests (geospatial) |
| GET    | `/requests/:id`                    | Get request details          |
| POST   | `/offers`                          | Create a service offer       |
| GET    | `/offers`                          | Search offers (geospatial)   |
| POST   | `/matches`                         | Create a match               |
| PATCH  | `/matches/:id/status`              | Update match status          |
| GET    | `/matches/threads`                 | List chat threads            |
| POST   | `/matches/threads/:id/messages`    | Send a message               |
| GET    | `/matches/threads/:id/messages`    | Get messages                 |
| POST   | `/matches/:id/tracking/start`      | Start live tracking          |
| POST   | `/ratings`                         | Submit a rating              |
| GET    | `/ratings/:userId`                 | Get user ratings             |

---

## WebSocket Events

| Event             | Direction      | Description                        |
| ----------------- | -------------- | ---------------------------------- |
| `thread:join`     | Client → Server | Join a chat thread                |
| `thread:leave`    | Client → Server | Leave a chat thread               |
| `message:new`     | Bidirectional   | Send / receive a chat message     |
| `location:update` | Client → Server | Push helper's live location       |

---

## Database Models

| Model           | Purpose                                     |
| --------------- | ------------------------------------------- |
| **User**        | Profile, skills, home location, role, privacy settings |
| **UserContact** | Email, password hash, phone, verification tokens       |
| **Request**     | Help requests with geospatial location      |
| **Offer**       | Service offers with radius and availability |
| **Match**       | Links a request to an offer                 |
| **Thread**      | Chat conversation between matched users     |
| **Message**     | Individual chat messages with attachments   |
| **Rating**      | Star ratings and reviews                    |
| **LiveLocation**| Real-time helper coordinates                |
| **DeviceToken** | Push notification tokens (iOS/Android/Web)  |
| **AuditLog**    | User action history for security            |

All location-based models use MongoDB **2dsphere** indexes for efficient geospatial queries.

---

---

## License

This project is for educational and personal use.
