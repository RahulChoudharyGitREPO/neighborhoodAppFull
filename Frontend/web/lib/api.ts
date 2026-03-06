import axios from "axios";

// Base API URL - deployed backend on Render
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Important for HttpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage (fallback if cookies don't work)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - Token:`, token ? "present" : "missing");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("[API] Authorization header set");
      } else {
        console.warn("[API] No token available for request");
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Only redirect to login if we have no valid token or it's an authentication error
        // Don't redirect for permission errors (user is logged in but not authorized for specific resource)
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const isAuthError = data?.message?.toLowerCase().includes("token") ||
                           data?.error?.toLowerCase().includes("token") ||
                           data?.message?.toLowerCase().includes("authentication") ||
                           !token;

        if (isAuthError && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          console.log("[API] Authentication error, redirecting to login");
          localStorage.removeItem("auth_token"); // Clear invalid token
          window.location.href = "/login";
        }
      }

      // Return formatted error
      return Promise.reject({
        message: data?.message || data?.error || "An error occurred",
        status,
        data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        message: "No response from server. Please check your connection.",
        status: 0,
      });
    } else {
      // Something else happened
      return Promise.reject({
        message: error.message || "An error occurred",
        status: 0,
      });
    }
  }
);

export default api;

// API endpoint helpers
export const endpoints = {
  // Auth
  login: "/auth/login",
  register: "/auth/register",
  logout: "/auth/logout",
  me: "/auth/me",

  // Requests
  requests: "/requests",
  myRequests: "/requests/mine",
  requestById: (id: string) => `/requests/${id}`,
  nearbyRequests: "/requests/nearby",

  // Offers
  offers: "/offers",
  offerById: (id: string) => `/offers/${id}`,
  nearbyOffers: "/offers/nearby",

  // Matches
  matches: "/matches",
  matchById: (id: string) => `/matches/${id}`,
  createMatch: "/matches",

  // Chat (threads are under /matches/)
  threads: "/matches/threads",
  threadById: (id: string) => `/matches/threads/${id}`,
  messages: (threadId: string) => `/matches/threads/${threadId}/messages`,
  markThreadAsRead: (threadId: string) => `/matches/threads/${threadId}/read`,

  // Tracking
  tracking: (matchId: string) => `/tracking/${matchId}`,
  updateLocation: (matchId: string) => `/tracking/${matchId}/location`,
  startTracking: (matchId: string) => `/matches/${matchId}/tracking/start`,

  // Profile
  profile: "/me",
  updateProfile: "/me/profile",
  uploadAvatar: "/me/avatar",

  // Ratings
  ratings: "/ratings",
  userRatings: (userId: string) => `/ratings/${userId}`,

  // Password reset
  requestPasswordReset: "/auth/request-password-reset",
  confirmPasswordReset: "/auth/confirm-password-reset",

  // Privacy
  updatePrivacy: "/me/privacy",
  blockedUsers: "/me/privacy/blocked",

  // Admin
  adminStats: "/admin/stats",
  adminUsers: "/admin/users",
  adminUserById: (id: string) => `/admin/users/${id}`,
  adminRequests: "/admin/requests",
  adminRequestById: (id: string) => `/admin/requests/${id}`,
  adminOffers: "/admin/offers",
  adminOfferById: (id: string) => `/admin/offers/${id}`,

  // Favorites
  favorites: "/favorites",

  // Verification
  verifyEmail: "/verify/email",

  // Match actions
  acceptMatch: (id: string) => `/matches/${id}/accept`,
  declineMatch: (id: string) => `/matches/${id}/decline`,

  // Friends
  friends: "/friends",
  friendMatches: (friendId: string) => `/friends/${friendId}/matches`,

  // Health check
  health: "/health",
};
