"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookmarkX, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Favorite } from "@/types";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchFavorites();
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(endpoints.favorites);
      setFavorites(response.data.favorites || []);
    } catch (error: any) {
      toast.error("Failed to load favorites");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`${endpoints.favorites}/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id && f._id !== id));
      toast.success("Removed from favorites");
    } catch (error: any) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Saved Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2"><div className="h-5 w-16 bg-gray-200 rounded-full" /><div className="h-5 w-20 bg-gray-200 rounded-full" /></div>
                      <div className="h-4 w-48 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <BookmarkX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No saved items yet</p>
                <p className="text-xs text-gray-400 mt-1">Items you save will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((fav) => {
                  const id = fav.id || fav._id;
                  const isRequest = !!fav.request;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => {
                          if (isRequest && fav.requestId) router.push(`/requests/${fav.requestId}`);
                          else if (fav.offerId) router.push(`/offers/${fav.offerId}`);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isRequest ? "default" : "primary"}>
                            {isRequest ? "Request" : "Offer"}
                          </Badge>
                          {fav.request?.category && (
                            <Badge variant="warning">{fav.request.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isRequest
                            ? fav.request?.title || "Saved request"
                            : fav.offer?.user?.displayName
                              ? `${fav.offer.user.displayName} — ${fav.offer?.skills?.join(", ") || "Helper"}`
                              : fav.offer?.skills?.join(", ") || "Saved helper"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Saved {formatDate(fav.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(id!)}
                        className="text-red-500 hover:text-red-700 shrink-0 ml-3"
                      >
                        <BookmarkX className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
