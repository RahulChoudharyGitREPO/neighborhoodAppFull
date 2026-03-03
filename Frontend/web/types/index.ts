// User types
export interface User {
  id?: string;
  _id?: string;
  displayName: string;
  name?: string; // Alias for displayName for backward compatibility
  email: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  home?: {
    lng: number;
    lat: number;
  };
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: string;
  radius?: number; // in meters
  radiusKm?: number;
  skills?: string[];
  role?: "helper" | "requester" | "both" | null;
  createdAt: string;
  updatedAt?: string;
}

// Request types
export interface Request {
  id?: string; // Backend uses 'id'
  _id?: string; // Fallback for consistency
  userId: User | string;
  title: string;
  details?: string; // Backend uses 'details'
  description?: string; // Fallback
  category: string;
  location: {
    type?: "Point";
    coordinates?: [number, number];
    lng?: number; // Backend can return flat lng/lat
    lat?: number;
  };
  address?: string;
  status: "open" | "matched" | "in-progress" | "completed" | "cancelled";
  whenTime?: string; // Backend uses 'whenTime'
  timeNeeded?: string; // Fallback
  skillsRequired?: string[];
  distance?: number; // in meters (from user's location)
  user?: {
    displayName: string;
    name?: string;
    avatarUrl?: string;
    avatar?: string;
    rating?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

// Offer types
export interface Offer {
  id?: string; // Backend uses 'id'
  _id?: string; // Fallback
  userId: User | string;
  title?: string;
  description?: string;
  skills?: string[];
  radiusKm?: number;
  category?: string;
  location?: {
    type?: "Point";
    coordinates?: [number, number];
  };
  home?: {
    lng: number;
    lat: number;
  };
  address?: string;
  status?: "available" | "matched" | "busy" | "inactive";
  isActive?: boolean;
  availability?: any;
  distance?: number;
  user?: {
    displayName: string;
    name?: string;
    avatarUrl?: string;
    avatar?: string;
    rating?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

// Match types
export interface Match {
  id?: string;
  _id?: string;
  requestId: Request | string;
  request?: Request; // Populated by backend in some responses
  offerId?: Offer | string | null;
  requesterId: User | string;
  helperId: User | string;
  status: "pending" | "active" | "en-route" | "enroute" | "arrived" | "completed" | "cancelled";
  chatThreadId?: string;
  trackingEnabled?: boolean;
  helperLocation?: {
    type: "Point";
    coordinates: [number, number];
  };
  eta?: number; // in seconds
  distance?: number; // in meters
  startedAt?: string;
  endedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Chat types
export interface ChatThread {
  _id: string;
  matchId: string;
  participants: User[] | string[];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  id?: string;
  threadId: string;
  senderId: User | string;
  body: string; // Backend uses 'body' not 'content'
  content?: string; // Fallback for compatibility
  attachments?: Array<{
    url: string;
    type: string;
    publicId?: string;
  }>;
  type?: "text" | "system";
  read?: boolean;
  createdAt: string;
}

// Location types
export interface LocationUpdate {
  coordinates: [number, number];
  timestamp: string;
}

// Category types
export type Category =
  | "grocery"
  | "medical"
  | "transport"
  | "repairs"
  | "tutoring"
  | "pet-care"
  | "gardening"
  | "other";

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface RequestFormData {
  title: string;
  description: string;
  category: Category;
  location: {
    coordinates: [number, number];
    address?: string;
  };
  timeNeeded?: string;
  skillsRequired?: string[];
}

export interface OfferFormData {
  title: string;
  description: string;
  category: Category;
  location: {
    coordinates: [number, number];
    address?: string;
  };
  availability?: string;
  skills?: string[];
}

export interface ProfileFormData {
  name: string;
  bio?: string;
  phone?: string;
  address?: string;
  radius?: number;
  skills?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
