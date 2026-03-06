"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ArrowLeft, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import { InboxSkeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Match } from "@/types";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";

export default function InboxPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/matches");
      const matchesData = response.data.matches || response.data.data || response.data || [];

      // Sort by most recent first
      const sorted = matchesData.sort((a: Match, b: Match) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setMatches(sorted);
    } catch (error: any) {
      console.error("Fetch matches error:", error);
      toast.error(error.message || "Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  };

  const getOtherUser = (match: Match) => {
    const currentUserId = user?._id || user?.id;

    if (typeof match.requesterId === "object" && match.requesterId._id === currentUserId) {
      return match.helperId;
    } else if (typeof match.helperId === "object" && match.helperId._id === currentUserId) {
      return match.requesterId;
    } else if (match.requesterId === currentUserId) {
      return match.helperId;
    } else {
      return match.requesterId;
    }
  };

  const getUserDisplayName = (userObj: any) => {
    if (typeof userObj === "string") return "User";
    return userObj?.displayName || userObj?.name || "User";
  };

  const getUserAvatar = (userObj: any) => {
    if (typeof userObj === "string") return undefined;
    return userObj?.avatarUrl || userObj?.avatar;
  };

  const handleOpenChat = (match: Match) => {
    if (match.chatThreadId) {
      router.push(`/chat/${match.chatThreadId}`);
    } else if ((match as any).thread) {
      const thread = (match as any).thread;
      const threadId = typeof thread === "string" ? thread : thread._id || thread.id;
      router.push(`/chat/${threadId}`);
    } else {
      toast.error("Chat thread not found");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "active": return "success";
      case "completed": return "default";
      case "cancelled": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/map")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
              <p className="text-sm text-gray-600">Your conversations and matches</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <InboxSkeleton />
        ) : matches.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-600">
              When someone offers to help with your request or you offer to help others, conversations will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const otherUser = getOtherUser(match);
              const otherUserName = getUserDisplayName(otherUser);
              const otherUserAvatar = getUserAvatar(otherUser);
              const request = typeof match.requestId === "object" ? match.requestId : null;

              return (
                <Card
                  key={match.id || match._id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenChat(match)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={otherUserAvatar}
                      alt={otherUserName}
                      fallback={otherUserName}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {otherUserName}
                        </h3>
                        <Badge variant={getStatusColor(match.status)}>
                          {match.status}
                        </Badge>
                      </div>
                      {request && (
                        <p className="text-sm text-gray-600 truncate">
                          {request.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(match.updatedAt)}
                      </p>
                    </div>
                    <MessageCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
