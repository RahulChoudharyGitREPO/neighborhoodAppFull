"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Wrench, MessageCircle, CheckCircle, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import RatingStars from "@/components/shared/rating-stars";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Offer, Request } from "@/types";
import { formatDistance, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserStore();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContacting, setIsContacting] = useState(false);
  const [showRequestPicker, setShowRequestPicker] = useState(false);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOffer();
    }
  }, [params.id]);

  const fetchOffer = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(endpoints.offerById(params.id as string));
      setOffer(response.data.data || response.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load offer");
      router.push("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    if (!user?.home) return;
    setLoadingRequests(true);
    try {
      const response = await api.get(endpoints.requests, {
        params: { lng: user.home.lng, lat: user.home.lat, radiusKm: 5 }
      });
      const allRequests: Request[] = response.data.requests || response.data.data || response.data;
      // Filter to only show the current user's open requests
      const mine = allRequests.filter((r) => {
        const reqUserId = typeof r.userId === "object" ? (r.userId as any)?._id || (r.userId as any)?.id : r.userId;
        return reqUserId === user.id || reqUserId === user._id;
      });
      setMyRequests(mine);
    } catch (error: any) {
      toast.error("Failed to load your requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleContactClick = async () => {
    // Fetch user's requests and show picker
    await fetchMyRequests();
    setShowRequestPicker(true);
  };

  const handleSelectRequest = async (requestId: string) => {
    setIsContacting(true);
    setShowRequestPicker(false);
    try {
      const response = await api.post(endpoints.createMatch, {
        requestId,
        offerId: offer?.id || offer?._id,
      });
      const match = response.data.match || response.data;
      const threadId = response.data.thread?.id || match?.threadId;
      toast.success("Match created! You can now chat with the helper.");
      if (threadId) {
        router.push(`/chat/${threadId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create match");
    } finally {
      setIsContacting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const helperUser = offer.user || (typeof offer.userId === "object" ? offer.userId as any : null);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="primary">Helper</Badge>
                  <Badge variant={offer.isActive ? "success" : "default"}>
                    {offer.isActive ? "Available" : "Inactive"}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">
                  {helperUser?.displayName || helperUser?.name || "Helper"}&apos;s Offer
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Skills */}
                {offer.skills && offer.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2.5">
                      Skills Offered
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {offer.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium"
                        >
                          <Wrench className="h-3.5 w-3.5 mr-1.5" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {offer.distance !== undefined && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDistance(offer.distance)} away</span>
                    </div>
                  )}
                  {typeof offer.availability === "string" && offer.availability.trim() && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{offer.availability}</span>
                    </div>
                  )}
                  {offer.radiusKm && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Covers {offer.radiusKm}km radius</span>
                    </div>
                  )}
                  {offer.isActive && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Currently available</span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {offer.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Location</h3>
                    <p className="text-sm text-gray-600">{offer.address}</p>
                  </div>
                )}

                <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                  Posted on {formatDate(offer.createdAt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Helper info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About the Helper</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={helperUser?.avatarUrl || helperUser?.avatar}
                    alt={helperUser?.displayName || helperUser?.name || "Helper"}
                    fallback={helperUser?.displayName || helperUser?.name || "H"}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {helperUser?.displayName || helperUser?.name || "Helper"}
                    </p>
                    {helperUser?.rating && (
                      <RatingStars rating={helperUser.rating} showNumber size="sm" />
                    )}
                  </div>
                </div>

                {helperUser?.bio && (
                  <p className="text-sm text-gray-600 leading-relaxed">{helperUser.bio}</p>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleContactClick}
                  isLoading={isContacting}
                  disabled={!offer.isActive}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Helper
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Request Picker Modal */}
      {showRequestPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select a Request</h3>
                <p className="text-xs text-gray-500 mt-0.5">Choose which request you need help with</p>
              </div>
              <button
                onClick={() => setShowRequestPicker(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 max-h-[50vh]">
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-3">You don&apos;t have any open requests yet.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowRequestPicker(false);
                      router.push("/post/new");
                    }}
                  >
                    Create a Request
                  </Button>
                </div>
              ) : (
                myRequests.map((req) => {
                  const reqId = req.id || req._id;
                  return (
                    <button
                      key={reqId}
                      onClick={() => handleSelectRequest(reqId!)}
                      className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-100/50 transition-all group"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 group-hover:text-gray-900">
                          {req.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize shrink-0">
                          {req.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {req.details || req.description}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
