# Neighborhood Helper — Test Guide

## Running the App

| Service | Directory | Command | URL |
|---------|-----------|---------|-----|
| **Backend** | `backend/` | `npm run dev` | http://localhost:5000 |
| **Frontend** | `Frontend/web/` | `npm run dev` | http://localhost:3000 |
| **API Docs** | — | — | http://localhost:5000/docs |

---

## Existing Users in Database

> [!IMPORTANT]
> Passwords are bcrypt-hashed in the DB, so original passwords can't be recovered.
> If you don't remember the passwords, **create a new user** via the Register flow, or **reset a password** using the steps below.

| # | Display Name | Email | Role | Email Verified |
|---|-------------|-------|------|----------------|
| 1 | rahul | `rahul@gmail.com` | **both** | ❌ |
| 2 | chirag | `chirag@gmail.com` | **helper** | ❌ |
| 3 | xy | `x@gmail.com` | **requester** | ❌ |
| 4 | chirag | `chirag1@gmail.com` | **helper** | ❌ |
| 5 | raj | `raj@gmail.com` | **helper** | ❌ |
| 6 | john | `j@gmail.com` | **helper** | ❌ |
| 7 | john | `johndoe@example.com` | **helper** | ❌ |

### Available Roles
- **`helper`** — Can create offers and help others
- **`requester`** — Can create help requests
- **`both`** — Can do both

---

## Existing Data in Database

| Collection | Count |
|-----------|-------|
| Requests | 3 |
| Offers | 1 |
| Matches | 4 |
| Users | 7 |

---

## Quick Test: Register a New User

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User",
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

## Quick Test: Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

> Save the `accessToken` from the response to use in authenticated requests.

## Quick Test: Reset a Password (for existing users)

If you forgot the password for an existing user, you can update it directly:

```bash
# Run from the backend/ directory
node -e "
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const uri = 'mongodb+srv://rahulrajwwe2:12345678Rahul@cluster0.jcrzs.mongodb.net/neighbourhood?retryWrites=true&w=majority';
(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const hash = await bcrypt.hash('NewPassword@123', 12);
  await client.db('neighbourhood').collection('usercontacts')
    .updateOne({ primaryEmail: 'rahul@gmail.com' }, { \$set: { passwordHash: hash } });
  console.log('Password updated!');
  await client.close();
})();
"
```

Then login with `rahul@gmail.com` / `NewPassword@123`

---

## API Endpoints Cheat Sheet

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |

### Requests & Offers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/requests` | Create help request |
| GET | `/requests?lng=X&lat=Y&radiusKm=Z` | Search nearby requests |
| POST | `/offers` | Create offer |
| GET | `/offers?lng=X&lat=Y&radiusKm=Z` | Search nearby offers |

### Profile & Matching
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile |
| PATCH | `/me/profile` | Update profile |
| POST | `/matches` | Create a match |
| GET | `/matches/:id` | Get match details |

### Health Check
```bash
curl http://localhost:5000/health
```
