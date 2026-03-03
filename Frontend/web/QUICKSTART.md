# Quick Start Guide - Neighborhood Helper Frontend

## 🚀 Get Running in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
If you want to use Google Maps tracking features:
```bash
cp .env.local.example .env.local
# Edit .env.local and add your Google Maps API key
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 📱 Test the App

### Create an Account
1. Go to `/register`
2. Fill in your details (name, email, password)
3. Submit to create your account
4. You'll be automatically logged in and redirected to `/home`

### Explore Features

#### View Requests & Offers
- On `/home`, use tabs to switch between "Requests" and "Offers"
- Browse cards showing nearby help requests or offers
- Click any card to see details

#### Create a Request
- Click "Create Request" button on home page
- Fill in title, description, category, and optional details
- Submit to post your request

#### Create an Offer
- Switch to "Offers" tab and click "Create Offer"
- Similar form to requests - describe what help you can provide
- Submit to share your offer with neighbors

#### View Details & Connect
- Click on any request/offer card
- View full details and user information
- Click "I'm Interested" or "Contact Helper" to match
- This would normally create a match and allow chat/tracking

#### Update Your Profile
- Click your avatar in the navbar
- Go to "Profile" from dropdown
- Upload avatar, edit bio, add skills
- Set your search radius and preferences

---

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

---

## 🎨 Pages Available

| Route | Description |
|-------|-------------|
| `/` | Root - redirects to `/home` or `/login` |
| `/login` | Login page |
| `/register` | Sign up page |
| `/home` | Main feed with requests/offers |
| `/create-request` | Form to create a help request |
| `/create-offer` | Form to offer help |
| `/requests/[id]` | View request details |
| `/offers/[id]` | View offer details |
| `/chat/[threadId]` | Real-time chat interface |
| `/tracking/[matchId]` | Live tracking with Google Maps |
| `/profile` | User profile settings |

---

## 🌐 Backend API

The frontend connects to: **https://neighborhood-oqx9.onrender.com**

All API calls are configured in [`lib/api.ts`](lib/api.ts)

### Authentication Flow
1. Login/Register sends credentials to `/auth/login` or `/auth/register`
2. Backend sets an HttpOnly cookie with JWT
3. All subsequent requests automatically include the cookie
4. On 401 response, user is redirected to `/login`

### WebSocket Connections
- **Chat**: `wss://neighborhood-oqx9.onrender.com/ws/thread:<id>`
- **Tracking**: `wss://neighborhood-oqx9.onrender.com/ws/track:<matchId>`

---

## 🎯 Key Features Implemented

✅ **Authentication**
- Login & Register with validation
- JWT-based auth with HttpOnly cookies
- Auto-redirect on unauthorized

✅ **Home Feed**
- Tabbed interface (Requests/Offers)
- Card-based listings
- Distance display
- Category badges
- Empty states

✅ **Create Forms**
- React Hook Form + Zod validation
- Category selection
- Location input
- Skills tagging
- Error handling

✅ **Detail Pages**
- Full request/offer details
- User info with ratings
- Match creation
- Status badges

✅ **Chat** (WebSocket)
- Real-time messaging
- Message bubbles (sent/received)
- Auto-scroll
- Reconnection on disconnect

✅ **Tracking** (Google Maps)
- Live location updates
- Helper marker movement
- ETA display
- Status progress
- Helper info sidebar

✅ **Profile**
- Avatar upload
- Edit personal info
- Skills management
- Search radius config
- Account details

---

## 🎨 Design System

**Colors:**
- Primary: Blue (#2563EB)
- Success: Green (#10B981)
- Danger: Red (#EF4444)
- Background: Light Gray (#F9FAFB)

**Typography:**
- Font Family: Inter
- Headings: 600-700 weight
- Body: 400 weight

**Components:**
- Rounded corners: `rounded-lg` to `rounded-2xl`
- Shadows: `shadow-sm`, `shadow-md`
- Transitions: 200ms ease
- Focus rings: Blue

---

## 🐛 Troubleshooting

### Build Errors
If you get TypeScript errors:
```bash
rm -rf .next node_modules
npm install
npm run build
```

### API Connection Issues
- Check that backend is running at `https://neighborhood-oqx9.onrender.com/health`
- Verify CORS settings allow your frontend origin
- Check browser console for network errors

### WebSocket Not Connecting
- Ensure backend supports WebSocket connections
- Check browser console for WS errors
- Verify firewall allows WSS protocol

### Google Maps Not Loading
- Add your API key to `.env.local`
- Restart dev server after adding env variables
- Check API key has Maps JavaScript API enabled
- Verify billing is enabled on Google Cloud project

---

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Maps**: Google Maps JavaScript API

---

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

---

## 📝 Notes

- The app uses `withCredentials: true` for Axios to support HttpOnly cookies
- WebSocket reconnects automatically after disconnection
- All forms have client-side validation with Zod schemas
- Profile changes are persisted in Zustand store
- Google Maps loads dynamically only on tracking page

---

Happy coding! 🎉
