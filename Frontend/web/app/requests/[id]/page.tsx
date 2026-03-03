"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Tag, MessageCircle, User as UserIcon, Edit, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import RatingStars from "@/components/shared/rating-stars";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Request, User } from "@/types";
import { formatDistance, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useUserStore();
  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfferingHelp, setIsOfferingHelp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id]);

  useEffect(() => {
    if (request) {
      initializeMap();
    }
  }, [request]);

  const fetchRequest = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(endpoints.requestById(params.id as string));
      const requestData = response.data || response.data.data;
      console.log("Request data:", requestData);
      setRequest(requestData);
    } catch (error: any) {
      console.error("Fetch request error:", error);
      toast.error(error.message || "Failed to load request");
      router.push("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!request?.location) return;
    if (typeof window === "undefined") return; // Ensure client-side only

    // Check if map container exists
    const container = document.getElementById("request-map");
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

      const lat = request.location.lat || request.location.coordinates?.[1];
      const lng = request.location.lng || request.location.coordinates?.[0];

      if (!lat || !lng) return;

      // Initialize map centered on request location
      const leafletMap = L.map("request-map").setView([lat, lng], 15);

      // Add CartoDB Voyager tiles (OpenStreetMap tiles were blocked)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(leafletMap);

      // Add marker for request location
      const requestIcon = L.divIcon({
        className: "custom-request-marker",
        html: '<div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([lat, lng], { icon: requestIcon })
        .addTo(leafletMap)
        .bindPopup("Request Location");

      // Add current user's location if available
      if (currentUser?.home) {
        const userIcon = L.divIcon({
          className: "custom-user-marker",
          html: '<div style="background-color: #0F766E; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        L.marker([currentUser.home.lat, currentUser.home.lng], { icon: userIcon })
          .addTo(leafletMap)
          .bindPopup("Your Location");

        // Draw line between user and request
        L.polyline(
          [
            [currentUser.home.lat, currentUser.home.lng],
            [lat, lng],
          ],
          {
            color: "#0F766E",
            weight: 2,
            opacity: 0.6,
          }
        ).addTo(leafletMap);

        // Adjust bounds to show both markers
        const bounds = L.latLngBounds([
          [currentUser.home.lat, currentUser.home.lng],
          [lat, lng],
        ]);
        leafletMap.fitBounds(bounds, { padding: [50, 50] });
      }

      setMap(leafletMap);
    } catch (error) {
      console.error("Map initialization error:", error);
      toast.error("Failed to load map");
    }
  };

  const handleOfferHelp = async () => {
    if (!request) return;

    setIsOfferingHelp(true);
    try {
      // Create a match/conversation
      const response = await api.post(endpoints.createMatch, {
        requestId: request.id || request._id,
      });

      console.log("Match created:", response.data);

      // Extract thread ID from response
      const threadId = response.data.chatThreadId
        || response.data.thread?.id
        || response.data.thread?._id
        || response.data.data?.thread?.id;

      if (!threadId) {
        console.error("No thread ID found in response:", response.data);
        toast.error("Failed to create chat thread");
        setIsOfferingHelp(false);
        return;
      }

      toast.success("Opening chat with requester...");

      // Redirect to chat
      setTimeout(() => {
        router.push(`/chat/${threadId}`);
      }, 500);
    } catch (error: any) {
      console.error("Offer help error:", error);

      // Show user-friendly error messages
      const errorMsg = error.message || error.data?.error || error.data?.message || "Failed to offer help";

      if (errorMsg.includes("already been assigned") || errorMsg.includes("already exists")) {
        toast.error("This request has already been assigned to another helper. Please try a different request.");
      } else if (errorMsg.includes("not open")) {
        toast.error("This request is no longer accepting new helpers.");
      } else if (errorMsg.includes("own request")) {
        toast.error("You cannot offer help on your own request.");
      } else {
        toast.error(errorMsg);
      }

      setIsOfferingHelp(false);
    }
  };

  const handleEditRequest = () => {
    router.push(`/requests/${params.id}/edit`);
  };

  const handleDeleteRequest = async () => {
    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(endpoints.requestById(params.id as string));
      toast.success("Request deleted successfully");
      router.push("/map");
    } catch (error: any) {
      console.error("Delete request error:", error);
      toast.error(error.message || "Failed to delete request");
      setIsDeleting(false);
    }
  };

  const isOwner = typeof request?.userId === "string"
    ? request.userId === currentUser?._id || request.userId === currentUser?.id
    : request?.userId?._id === currentUser?._id || request?.userId?._id === currentUser?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const requester: any = request.user || (typeof request.userId === "object" ? request.userId : null);
  const description = request.details || request.description;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Map
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="primary" className="text-sm">
                    {request.category}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Badge variant={request.status === "open" ? "success" : "default"}>
                      {request.status}
                    </Badge>
                    {isOwner && request.status === "open" && (
                      <>
                        <button
                          onClick={handleEditRequest}
                          className="p-2 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit request"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleDeleteRequest}
                          disabled={isDeleting}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete request"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-3xl font-bold">{request.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-gray-600">
                  {request.distance !== undefined && (
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                      <span>{Math.round(request.distance)}m away</span>
                    </div>
                  )}
                  {request.whenTime && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-gray-400" />
                      <span>{new Date(request.whenTime).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Skills Required */}
                {request.skillsRequired && request.skillsRequired.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Skills Needed
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {request.skillsRequired.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-black text-sm font-medium"
                        >
                          <Tag className="h-3.5 w-3.5 mr-1.5" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Approximate location of the request
                </p>
              </CardHeader>
              <CardContent>
                <div
                  id="request-map"
                  className="w-full h-64 rounded-lg overflow-hidden"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requester Info */}
            {requester && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Requester</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={requester.avatarUrl || requester.avatar}
                      alt={requester.displayName || requester.name}
                      fallback={requester.displayName || requester.name}
                      size="lg"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {requester.displayName || requester.name || "Anonymous"}
                      </p>
                      {requester.rating && (
                        <RatingStars rating={requester.rating} showNumber size="sm" />
                      )}
                    </div>
                  </div>

                  {requester.bio && (
                    <p className="text-sm text-gray-600">{requester.bio}</p>
                  )}

                  {/* Only show Offer Help button if user is not the requester */}
                  {(currentUser?.role === "helper" || currentUser?.role === "both") &&
                   (typeof request.userId === "string"
                     ? request.userId !== currentUser?._id && request.userId !== currentUser?.id
                     : request.userId?._id !== currentUser?._id && request.userId?._id !== currentUser?.id
                   ) && (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleOfferHelp}
                        isLoading={isOfferingHelp}
                        disabled={request.status !== "open"}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Offer Help
                      </Button>
                      {request.status !== "open" && (
                        <p className="text-xs text-amber-600 text-center mt-2">
                          This request is no longer accepting new helpers
                        </p>
                      )}
                    </>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    Posted {formatDate(request.createdAt)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
