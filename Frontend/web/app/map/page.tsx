"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, List, X, MapPin, Clock, Tag, ChevronRight, Wrench, HandHelping, Heart } from "lucide-react";
import Button from "@/components/ui/button";
import Avatar from "@/components/ui/avatar";
import RatingStars from "@/components/shared/rating-stars";
import SearchFilters from "@/components/shared/search-filters";
import { cn } from "@/lib/utils";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Request, Offer } from "@/types";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";

if (typeof window !== "undefined") {
  const L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

const categoryColors: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  grocery:   { border: "border-l-green-500",  bg: "bg-green-50",  text: "text-green-700",  dot: "#22C55E" },
  medical:   { border: "border-l-red-500",    bg: "bg-red-50",    text: "text-red-700",    dot: "#EF4444" },
  transport: { border: "border-l-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   dot: "#3B82F6" },
  repairs:   { border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-700", dot: "#F97316" },
  tutoring:  { border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "#A855F7" },
  "pet-care":{ border: "border-l-pink-500",   bg: "bg-pink-50",   text: "text-pink-700",   dot: "#EC4899" },
  gardening: { border: "border-l-lime-600",   bg: "bg-lime-50",   text: "text-lime-700",   dot: "#65A30D" },
  errands:   { border: "border-l-amber-500",  bg: "bg-amber-50",  text: "text-amber-700",  dot: "#F59E0B" },
  moving:    { border: "border-l-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", dot: "#6366F1" },
  other:     { border: "border-l-gray-400",   bg: "bg-gray-100",  text: "text-gray-600",   dot: "#9CA3AF" },
};

const getCategoryColor = (category: string) =>
  categoryColors[category?.toLowerCase()] || categoryColors.other;

const avatarBadgeColors = [
  { ring: "ring-indigo-400", bg: "bg-indigo-100", border: "border-indigo-300" },
  { ring: "ring-rose-400", bg: "bg-rose-100", border: "border-rose-300" },
  { ring: "ring-amber-400", bg: "bg-amber-100", border: "border-amber-300" },
  { ring: "ring-emerald-400", bg: "bg-emerald-100", border: "border-emerald-300" },
  { ring: "ring-violet-400", bg: "bg-violet-100", border: "border-violet-300" },
  { ring: "ring-cyan-400", bg: "bg-cyan-100", border: "border-cyan-300" },
  { ring: "ring-pink-400", bg: "bg-pink-100", border: "border-pink-300" },
  { ring: "ring-orange-400", bg: "bg-orange-100", border: "border-orange-300" },
];

export default function MapPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useUserStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeView, setActiveView] = useState<"helpers" | "requests">("helpers");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const userRole = user?.role;
  const showHelpers = userRole === "requester" || (userRole === "both" && activeView === "helpers");
  const showRequests = userRole === "helper" || (userRole === "both" && activeView === "requests");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.get(endpoints.favorites).then((res) => {
        const favs = res.data.favorites || [];
        const ids = new Set<string>();
        favs.forEach((f: any) => {
          if (f.requestId) ids.add(String(f.requestId));
          if (f.offerId) ids.add(String(f.offerId));
        });
        setFavoriteIds(ids);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const favLockRef = useRef<Set<string>>(new Set());
  const toggleFavorite = async (e: React.MouseEvent, itemId: string, type: "request" | "offer") => {
    e.stopPropagation();
    if (favLockRef.current.has(itemId)) return; 
    favLockRef.current.add(itemId);
    try {
      const body = type === "request" ? { requestId: itemId } : { offerId: itemId };
      const res = await api.post(endpoints.favorites, body);
      const favorited = res.data.favorited;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (favorited) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });
      toast.success(favorited ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Failed to update favorites");
    } finally {
      favLockRef.current.delete(itemId);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      initializeMap();
      fetchData();
    }
  }, [isAuthenticated, user, isHydrated, router]);

  useEffect(() => {
    if (!map || !user) return;
    if (showHelpers && offers.length > 0) {
      addOfferMarkers(offers);
    } else if (showRequests && requests.length > 0) {
      addRequestMarkers(requests);
    }
  }, [activeView, map, requests, offers, showHelpers, showRequests]);

  const initializeMap = async () => {
    if (!user?.home) return;
    if (typeof window === "undefined") return;

    const container = document.getElementById("map");
    if (!container) return;

    try {
      const L = (await import("leaflet")).default;

      if (map) {
        map.remove();
      }

      const leafletMap = L.map("map").setView([user.home.lat, user.home.lng], 13);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(leafletMap);

      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `<div style="position:relative;">
          <div style="position:absolute;top:-8px;left:-8px;width:32px;height:32px;border-radius:50%;background:rgba(17,24,39,0.15);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;background:#111827;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([user.home.lat, user.home.lng], { icon: userIcon })
        .addTo(leafletMap)
        .bindPopup("Your Location");

      setMap(leafletMap);
    } catch (error) {
      console.error("Map initialization error:", error);
      toast.error("Failed to load map");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userHome = user?.home;
      if (!userHome || !userHome.lng || !userHome.lat) {
        toast.error("Location not found. Please update your profile.");
        setIsLoading(false);
        return;
      }

      const { lng, lat } = userHome;

      if (userRole === "requester") {
        await fetchOffers(lng, lat);
      } else if (userRole === "helper") {
        await fetchRequests(lng, lat);
      } else {
        await Promise.all([fetchOffers(lng, lat), fetchRequests(lng, lat)]);
      }
    } catch (error: any) {
      console.error("Fetch data error:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async (lng: number, lat: number) => {
    const params: Record<string, any> = { lng, lat, radiusKm: 50000, sort: sortBy };
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;
    const response = await api.get(endpoints.requests, { params });
    const fetchedRequests = response.data.requests || response.data.data || response.data;
    setRequests(fetchedRequests);
    if (showRequests) {
      addRequestMarkers(fetchedRequests);
    }
  };

  const fetchOffers = async (lng: number, lat: number) => {
    const params: Record<string, any> = { lng, lat, radiusKm: 50000, sort: sortBy };
    if (searchQuery) params.search = searchQuery;
    const response = await api.get(endpoints.offers, { params });
    const fetchedOffers = response.data.offers || response.data.data || response.data;
    setOffers(fetchedOffers);
    if (showHelpers) {
      addOfferMarkers(fetchedOffers);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (user?.home) fetchData();
    }, 300);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setTimeout(() => { if (user?.home) fetchData(); }, 0);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setTimeout(() => { if (user?.home) fetchData(); }, 0);
  };

  const addRequestMarkers = async (reqs: Request[]) => {
    if (!map) return;
    const L = (await import("leaflet")).default;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    reqs.forEach((request) => {
      if (!request.location || (!request.location.lng && !request.location.coordinates)) return;
      const lat = request.location.lat || request.location.coordinates?.[1];
      const lng = request.location.lng || request.location.coordinates?.[0];
      if (!lat || !lng) return;

      const color = getCategoryColor(request.category);
      const requestIcon = L.divIcon({
        className: "custom-request-marker",
        html: `<div style="background:${color.dot};width:22px;height:22px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([lat, lng], { icon: requestIcon })
        .addTo(map)
        .bindPopup(`<b>${request.title}</b><br/><span style="color:#64748B;font-size:12px;">${request.category}</span>`);

      marker.on("click", () => {
        setSelectedOffer(null);
        setSelectedRequest(request);
        setShowBottomSheet(true);
      });

      markersRef.current.push(marker);
    });
  };

  const addOfferMarkers = async (ofrs: Offer[]) => {
    if (!map) return;
    const L = (await import("leaflet")).default;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    ofrs.forEach((offer) => {
      const lat = offer.home?.lat || offer.location?.coordinates?.[1];
      const lng = offer.home?.lng || offer.location?.coordinates?.[0];
      if (!lat || !lng) return;

      const helperIcon = L.divIcon({
        className: "custom-offer-marker",
        html: `<div style="background:#6366F1;width:22px;height:22px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const helperName = offer.user?.displayName || offer.user?.name || "Helper";
      const marker = L.marker([lat, lng], { icon: helperIcon })
        .addTo(map)
        .bindPopup(`<b>${helperName}</b><br/><span style="color:#64748B;font-size:12px;">${offer.skills?.join(", ") || "Available to help"}</span>`);

      marker.on("click", () => {
        setSelectedRequest(null);
        setSelectedOffer(offer);
        setShowBottomSheet(true);
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 300);
    }
  }, [sidebarOpen, map]);

  const handleCreateRequest = () => {
    if (user?.role === "helper") {
      toast.error("Helpers cannot create requests. Switch to 'Both' role in settings.");
      return;
    }
    router.push("/post/new");
  };

  const handleCreateOffer = () => {
    router.push("/create-offer");
  };

  const formatDist = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
  };

  const getAvailability = (val: any): string | null => {
    if (typeof val === "string" && val.trim()) return val;
    return null;
  };

  if (!isHydrated || (!isAuthenticated && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <div id="map" className="w-full h-full bg-gray-100" />

      {showHelpers && offers.length > 0 && (
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2.5 flex-wrap">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-gray-200/60 flex items-center gap-1.5">
            <HandHelping className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-gray-800">Helpers</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {offers.length}
            </span>
          </div>

          {userRole === "both" && (
            <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-200/60 flex p-0.5">
              <button
                onClick={() => setActiveView("helpers")}
                className={cn(
                  "text-[11px] font-medium px-3 py-1 rounded-full transition-all",
                  activeView === "helpers"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Helpers
              </button>
              <button
                onClick={() => setActiveView("requests")}
                className={cn(
                  "text-[11px] font-medium px-3 py-1 rounded-full transition-all",
                  activeView === "requests"
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Requests
              </button>
            </div>
          )}

          {offers.map((offer, index) => {
            const offerId = offer.id || offer._id;
            const offerUser = offer.user || (typeof offer.userId === "object" ? offer.userId as any : null);
            const helperName = offerUser?.displayName || offerUser?.name || "Helper";
            const isSelected = offerId === (selectedOffer?.id || selectedOffer?._id);
            const badgeColor = avatarBadgeColors[index % avatarBadgeColors.length];

            return (
              <div key={offerId} className="group relative">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setSelectedOffer(offer);
                    setShowBottomSheet(true);
                  }}
                  className={cn(
                    "relative rounded-full transition-all duration-200 hover:scale-110 ring-2 ring-offset-1",
                    badgeColor.ring,
                    isSelected ? "ring-[3px] shadow-lg scale-110" : ""
                  )}
                >
                  <Avatar
                    src={offerUser?.avatarUrl || offerUser?.avatar}
                    alt={helperName}
                    fallback={helperName}
                    size="md"
                    colorIndex={index}
                  />
                  {offer.isActive && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </button>

                <div className="absolute top-full left-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-30">
                  <div className="bg-white rounded-xl shadow-2xl p-3 w-52 border border-gray-200">
                    <p className="font-semibold text-sm text-gray-900 truncate mb-1">{helperName}</p>
                    {offerUser?.rating && (
                      <div className="mb-1.5">
                        <RatingStars rating={offerUser.rating} size="sm" showNumber />
                      </div>
                    )}

                    {offer.skills && offer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {offer.skills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-900 rounded text-[10px]">
                            <Wrench className="h-2.5 w-2.5" />
                            {skill}
                          </span>
                        ))}
                        {offer.skills.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{offer.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      {offer.distance !== undefined && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {formatDist(offer.distance)}
                        </span>
                      )}
                      {getAvailability(offer.availability) && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {getAvailability(offer.availability)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRequests && requests.length > 0 && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 md:hidden bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg z-20 flex items-center gap-2 border border-gray-200"
        >
          <List className="h-5 w-5 text-gray-900" />
          <span className="text-sm font-semibold text-gray-800">{requests.length}</span>
        </button>
      )}

      {showRequests && requests.length > 0 && (
        <div
          className={cn(
            "absolute top-3 left-3 bottom-24 w-[340px] max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden z-10 transition-all duration-300 border border-gray-200/60",
            sidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)] md:translate-x-0"
          )}
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-100 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-gray-200 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-900" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Nearby Requests</h2>
                  <p className="text-[11px] text-gray-500">{requests.length} found nearby</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {userRole === "both" && (
              <div className="flex mt-2.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveView("helpers")}
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                    activeView === "helpers"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Helpers ({offers.length})
                </button>
                <button
                  onClick={() => setActiveView("requests")}
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                    activeView === "requests"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Requests ({requests.length})
                </button>
              </div>
            )}

            <SearchFilters
              viewType="requests"
              onSearch={handleSearchChange}
              onCategoryChange={handleCategoryChange}
              onSortChange={handleSortChange}
              className="mt-2.5"
            />
          </div>

          <div className="overflow-y-auto h-[calc(100%-56px)] p-2.5 space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 animate-pulse">
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1.5"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                  <div className="flex gap-3 mt-3">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))
            ) : (
              requests.map((request) => {
                const reqId = request.id || request._id;
                const colors = getCategoryColor(request.category);
                const reqUser = request.user || (typeof request.userId === "object" ? request.userId as any : null);
                const isSelected = reqId === (selectedRequest?.id || selectedRequest?._id);

                return (
                  <div
                    key={reqId}
                    className={cn(
                      "p-3 rounded-xl border-l-[3px] border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white",
                      colors.border,
                      isSelected
                        ? "ring-2 ring-gray-700 ring-offset-1 shadow-md"
                        : "hover:border-gray-200"
                    )}
                    onClick={() => {
                      setSelectedOffer(null);
                      setSelectedRequest(request);
                      setShowBottomSheet(true);
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className="font-semibold text-gray-900 text-[13px] line-clamp-1 leading-tight">
                        {request.title}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 capitalize",
                        colors.bg, colors.text
                      )}>
                        {request.category}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">
                      {request.details || request.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {reqUser && (
                          <>
                            <Avatar
                              src={reqUser.avatarUrl || reqUser.avatar}
                              alt={reqUser.displayName || reqUser.name}
                              fallback={reqUser.displayName || reqUser.name}
                              size="sm"
                              className="h-5 w-5 text-[8px]"
                            />
                            <span className="text-[11px] text-gray-600 font-medium truncate max-w-[80px]">
                              {reqUser.displayName || reqUser.name}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
                        {request.distance !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {formatDist(request.distance)}
                          </span>
                        )}
                        {(request.timeNeeded || request.whenTime) && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {request.timeNeeded || request.whenTime}
                          </span>
                        )}
                        <button
                          onClick={(e) => toggleFavorite(e, reqId!, "request")}
                          className="p-0.5 hover:scale-110 transition-transform"
                        >
                          <Heart className={cn("h-3.5 w-3.5", favoriteIds.has(reqId!) ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400")} />
                        </button>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {(userRole === "requester" || userRole === "both") && (
        <button
          onClick={handleCreateRequest}
          className="group absolute bottom-8 right-6 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl hover:bg-black transition-all duration-200 hover:scale-105 z-10 flex items-center gap-2"
        >
          <Plus className="h-6 w-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 text-sm font-medium whitespace-nowrap">
            New Request
          </span>
        </button>
      )}
      {userRole === "helper" && (
        <button
          onClick={handleCreateOffer}
          className="group absolute bottom-8 right-6 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all duration-200 hover:scale-105 z-10 flex items-center gap-2"
        >
          <HandHelping className="h-6 w-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 text-sm font-medium whitespace-nowrap">
            New Offer
          </span>
        </button>
      )}

      {showBottomSheet && selectedOffer && (() => {
        const sheetUser = selectedOffer.user || (typeof selectedOffer.userId === "object" ? selectedOffer.userId as any : null);

        return (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 animate-slide-up">
            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar
                    src={sheetUser?.avatarUrl || sheetUser?.avatar}
                    alt={sheetUser?.displayName || sheetUser?.name || "Helper"}
                    fallback={sheetUser?.displayName || sheetUser?.name || "H"}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight truncate">
                      {sheetUser?.displayName || sheetUser?.name || "Helper"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        Helper
                      </span>
                      {sheetUser?.rating && (
                        <RatingStars rating={sheetUser.rating} size="sm" showNumber />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleFavorite(e, (selectedOffer.id || selectedOffer._id)!, "offer")}
                    className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Heart className={cn("h-5 w-5", favoriteIds.has((selectedOffer.id || selectedOffer._id)!) ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400")} />
                  </button>
                  <button
                    onClick={() => setShowBottomSheet(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {selectedOffer.skills && selectedOffer.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOffer.skills.map((skill, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-medium">
                        <Wrench className="h-3 w-3" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mb-4">
                {selectedOffer.distance !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDist(selectedOffer.distance)} away</span>
                  </div>
                )}
                {getAvailability(selectedOffer.availability) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{getAvailability(selectedOffer.availability)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
                <Button
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={() => router.push(`/offers/${selectedOffer.id || selectedOffer._id}`)}
                >
                  View Profile
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => router.push(`/offers/${selectedOffer.id || selectedOffer._id}`)}
                >
                  Request Help
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showBottomSheet && selectedRequest && (() => {
        const colors = getCategoryColor(selectedRequest.category);
        const sheetUser = selectedRequest.user || (typeof selectedRequest.userId === "object" ? selectedRequest.userId as any : null);

        return (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 animate-slide-up">
            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedRequest.title}</h2>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 capitalize",
                    colors.bg, colors.text
                  )}>
                    {selectedRequest.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleFavorite(e, (selectedRequest.id || selectedRequest._id)!, "request")}
                    className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Heart className={cn("h-5 w-5", favoriteIds.has((selectedRequest.id || selectedRequest._id)!) ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400")} />
                  </button>
                  <button
                    onClick={() => setShowBottomSheet(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {sheetUser && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                  <Avatar
                    src={sheetUser.avatarUrl || sheetUser.avatar}
                    alt={sheetUser.displayName || sheetUser.name}
                    fallback={sheetUser.displayName || sheetUser.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {sheetUser.displayName || sheetUser.name || "Anonymous"}
                    </p>
                    {sheetUser.rating && (
                      <RatingStars rating={sheetUser.rating} size="sm" showNumber />
                    )}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {selectedRequest.details || selectedRequest.description}
              </p>

              <div className="flex flex-wrap gap-3 mb-4">
                {selectedRequest.distance !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDist(selectedRequest.distance)} away</span>
                  </div>
                )}
                {(selectedRequest.timeNeeded || selectedRequest.whenTime) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedRequest.timeNeeded || selectedRequest.whenTime}</span>
                  </div>
                )}
                {selectedRequest.address && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 truncate">{selectedRequest.address}</span>
                  </div>
                )}
              </div>

              {selectedRequest.skillsRequired && selectedRequest.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedRequest.skillsRequired.map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-900 rounded-md text-xs">
                      <Tag className="h-3 w-3" />
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
                <Button
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={() => router.push(`/requests/${selectedRequest.id || selectedRequest._id}`)}
                >
                  View Details
                </Button>
                {(user?.role === "helper" || user?.role === "both") && (
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={() => router.push(`/requests/${selectedRequest.id || selectedRequest._id}`)}
                  >
                    Offer Help
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {isLoading && offers.length === 0 && requests.length === 0 && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-gray-900 mx-auto"></div>
            <p className="mt-3 text-sm font-medium text-gray-600">
              {showHelpers ? "Finding nearby helpers..." : "Finding nearby requests..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
