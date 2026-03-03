"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, CheckCircle, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import RatingStars from "@/components/shared/rating-stars";
import api, { endpoints, API_BASE_URL } from "@/lib/api";
import { Match, User as UserType } from "@/types";
import { formatDistance } from "@/lib/utils";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import { useUserStore } from "@/store/useUserStore";
import "leaflet/dist/leaflet.css";

const STATUS_STEPS = [
  { key: "pending", label: "Searching", icon: Clock },
  { key: "accepted", label: "Assigned", icon: User },
  { key: "en-route", label: "En-route", icon: MapPin },
  { key: "arrived", label: "Arrived", icon: MapPin },
  { key: "in-progress", label: "In Progress", icon: Clock },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eta, setEta] = useState<number | null>(null);
  const [map, setMap] = useState<any>(null);
  const helperMarkerRef = useRef<any>(null);
  const requesterMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (params.matchId) {
      fetchMatch();
      connectWebSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('tracking:leave', { matchId: params.matchId });
        socketRef.current.disconnect();
      }
    };
  }, [params.matchId]);

  // Initialize map after component mounts and match is loaded
  useEffect(() => {
    if (match && !isLoading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [match, isLoading]);

  // Update map with location data when map is ready
  useEffect(() => {
    if (map && match?.helperLocation) {
      updateHelperLocation(match.helperLocation.coordinates);
    }
  }, [map, match?.helperLocation]);

  // Start location sharing if user is the helper
  useEffect(() => {
    if (!match || !user || !socketRef.current || !map) return;

    // Check if current user is the helper
    const isHelper = typeof match.helperId === "string"
      ? match.helperId === user._id || match.helperId === user.id
      : match.helperId?._id === user._id || match.helperId?._id === user.id;

    if (isHelper && match.trackingEnabled) {
      console.log("Helper detected, starting location sharing...");
      startLocationSharing();
    }

    return () => {
      stopLocationSharing();
    };
  }, [match, user, socketRef.current, map]);

  const initializeMap = async () => {
    if (typeof window === "undefined") return; // Ensure client-side only

    // Check if map container exists
    const container = document.getElementById("tracking-map");
    if (!container) {
      console.error("Map container not found");
      return;
    }

    try {
      const L = (await import("leaflet")).default;

      // Check if map is already initialized
      if (map) {
        map.remove(); // Clean up existing map
      }

      // Get initial center from request location if available
      let initialCenter: [number, number] = [0, 0];
      let initialZoom = 13;

      if (match?.request?.location) {
        initialCenter = [match.request.location.lat!, match.request.location.lng!];
        initialZoom = 15;
      }

      const leafletMap = L.map("tracking-map").setView(initialCenter, initialZoom);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(leafletMap);

      // Add request location marker if available
      if (match?.request?.location) {
        const requestIcon = L.divIcon({
          className: "custom-request-marker",
          html: '<div style="background-color: #DC2626; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        // Determine if current user is the helper
        const isHelper = typeof match.helperId === "string"
          ? match.helperId === user?._id || match.helperId === user?.id
          : match.helperId?._id === user?._id || match.helperId?._id === user?.id;

        requesterMarkerRef.current = L.marker([match.request.location.lat!, match.request.location.lng!], { icon: requestIcon })
          .addTo(leafletMap)
          .bindPopup(isHelper ? "Requester Location" : "Task Location");
      }

      setMap(leafletMap);
    } catch (error) {
      console.error("Failed to load map:", error);
      toast.error("Failed to load map");
    }
  };

  const connectWebSocket = async () => {
    try {
      // Start tracking session
      console.log("Starting tracking...");
      const response = await api.post(endpoints.startTracking(params.matchId as string));
      console.log("Tracking started:", response.data);

      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      // Initialize Socket.IO connection
      const socket = io(API_BASE_URL, {
        path: '/ws',
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log("Socket.IO connected for tracking");
        // Join tracking room
        socket.emit('tracking:join', { matchId: params.matchId });
      });

      socket.on('tracking:joined', (data) => {
        console.log("Joined tracking room:", data.matchId);
      });

      socket.on('location:update', (data) => {
        console.log("Location update received:", data);
        if (data.coordinates) {
          updateHelperLocation([data.coordinates.lng, data.coordinates.lat]);
        }
        if (data.eta !== undefined) {
          setEta(data.eta);
        }
      });

      socket.on('error', (error) => {
        console.error("Socket.IO error:", error);
        toast.error(error.message || "Tracking connection error");
      });

      socket.on('disconnect', () => {
        console.log("Socket.IO disconnected");
      });

      socket.on('connect_error', (error) => {
        console.error("Socket.IO connection error:", error);
        toast.error("Failed to connect to tracking server");
      });

      socketRef.current = socket;
    } catch (error: any) {
      console.error("Failed to start tracking:", error);
      toast.error(error.message || "Failed to start tracking");
    }
  };

  const fetchMatch = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(endpoints.matchById(params.matchId as string));
      const matchData = response.data.data || response.data;
      setMatch(matchData);

      // Map will be initialized in separate useEffect after DOM is ready
    } catch (error: any) {
      toast.error(error.message || "Failed to load tracking info");
      router.push("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const updateHelperLocation = async (coordinates: [number, number]) => {
    if (!map) {
      console.warn("Map not ready, cannot update helper location");
      return;
    }

    const L = (await import("leaflet")).default;
    const [lng, lat] = coordinates;
    console.log("Updating helper marker at:", lat, lng);

    // Update or create helper marker
    if (helperMarkerRef.current) {
      console.log("Updating existing helper marker position");
      helperMarkerRef.current.setLatLng([lat, lng]);
    } else {
      console.log("Creating new helper marker at", lat, lng);
      const helperIcon = L.divIcon({
        className: "custom-helper-marker",
        html: '<div style="background-color: #111827; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      helperMarkerRef.current = L.marker([lat, lng], { icon: helperIcon })
        .addTo(map)
        .bindPopup("Helper Location");

      console.log("Helper marker created:", helperMarkerRef.current);
    }

    // Update route between helper and requester
    if (match?.request?.location && requesterMarkerRef.current) {
      drawRoute([lat, lng], [match.request.location.lat!, match.request.location.lng!]);
    }

    // Adjust map bounds to show both markers
    if (requesterMarkerRef.current) {
      const bounds = L.latLngBounds([
        [lat, lng],
        [match?.request?.location.lat || 0, match?.request?.location.lng || 0]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Just center on helper if no requester location
      map.setView([lat, lng], 15);
    }
  };

  const drawRoute = async (helperCoords: [number, number], requesterCoords: [number, number]) => {
    if (!map) return;

    const L = (await import("leaflet")).default;

    // Remove existing route if any
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    // Draw a simple straight line (you can integrate with routing API later for actual roads)
    routeLayerRef.current = L.polyline(
      [helperCoords, requesterCoords],
      {
        color: '#111827',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
        lineJoin: 'round'
      }
    ).addTo(map);
  };

  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    console.log("Starting location sharing for helper");
    toast.success("Sharing your location with requester");

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        console.log("Initial helper location:", { lat: latitude, lng: longitude });

        // Send to server and update map immediately
        if (socketRef.current) {
          socketRef.current.emit('location:update', {
            matchId: params.matchId,
            lat: latitude,
            lng: longitude,
            speed: speed || 0,
            heading: heading || 0,
          });
        }
        updateHelperLocation([longitude, latitude]);
      },
      (error) => {
        console.error("Initial location error:", error);
      }
    );

    // Then watch for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;

        console.log("Helper location update:", { lat: latitude, lng: longitude });

        // Send location to server via Socket.IO
        if (socketRef.current) {
          socketRef.current.emit('location:update', {
            matchId: params.matchId,
            lat: latitude,
            lng: longitude,
            speed: speed || 0,
            heading: heading || 0,
          });
        }

        // Update own marker on map
        updateHelperLocation([longitude, latitude]);
      },
      (error) => {
        console.error("Location error:", error);
        toast.error("Failed to get location. Please enable location permissions.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    locationWatchIdRef.current = watchId;
  };

  const stopLocationSharing = () => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
      console.log("Stopped location sharing");
    }
  };

  const handleMarkCompleted = async () => {
    try {
      await api.patch(endpoints.matchById(params.matchId as string), {
        status: "completed",
      });
      toast.success("Marked as completed!");
      setMatch((prev) => prev ? { ...prev, status: "completed" } : null);
      stopLocationSharing(); // Stop sharing when completed
    } catch (error: any) {
      toast.error(error.message || "Failed to mark as completed");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!match) {
    return null;
  }

  const helper = typeof match.helperId === "object" ? match.helperId as UserType : null;
  const currentStepIndex = STATUS_STEPS.findIndex((step) => step.key === match.status);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Live Tracking</h1>
            <p className="text-sm text-gray-600">Match #{match._id ? match._id.slice(-6) : match.id?.slice(-6) || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative min-h-0 max-h-[50vh] lg:max-h-none">
          <div id="tracking-map" className="w-full h-full min-h-[250px] sm:min-h-[400px]" />
        </div>

        {/* Status Panel */}
        <div className="lg:w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* ETA */}
            {eta && match.status === "en-route" && (
              <Card className="bg-gray-100 border-gray-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-black font-medium">
                        Estimated Arrival
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(eta / 60)} min
                      </p>
                    </div>
                    <Clock className="h-10 w-10 text-gray-900" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {STATUS_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isCompleted ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-gray-900">Current</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Helper Info */}
            {helper && (
              <Card>
                <CardHeader>
                  <CardTitle>Helper</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={helper.avatar}
                      alt={helper.name}
                      fallback={helper.name}
                      size="lg"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{helper.name}</p>
                      {helper.rating && (
                        <RatingStars rating={helper.rating} size="sm" showNumber />
                      )}
                    </div>
                  </div>

                  {match.status !== "completed" && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleMarkCompleted}
                    >
                      Mark as Completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
