"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, MessageCircle, Share2, HandHelping, User, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Friend, FriendMatch } from "@/types";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

type TabFilter = "all" | "helper" | "requester";

export default function FriendsPage() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [friendMatches, setFriendMatches] = useState<Record<string, FriendMatch[]>>({});
  const [loadingMatches, setLoadingMatches] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchFriends();
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFriends();
  }, [activeTab]);

  const fetchFriends = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.role = activeTab;
      const response = await api.get(endpoints.friends, { params });
      setFriends(response.data.friends || []);
    } catch (error: any) {
      toast.error("Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriendHistory = async (friendId: string) => {
    if (expandedFriend === friendId) {
      setExpandedFriend(null);
      return;
    }

    setExpandedFriend(friendId);

    if (!friendMatches[friendId]) {
      setLoadingMatches(friendId);
      try {
        const response = await api.get(endpoints.friendMatches(friendId));
        setFriendMatches((prev) => ({
          ...prev,
          [friendId]: response.data.matches || [],
        }));
      } catch {
        toast.error("Failed to load history");
      } finally {
        setLoadingMatches(null);
      }
    }
  };

  const getRelationshipBadge = (rel: string) => {
    switch (rel) {
      case "helper":
        return <Badge variant="primary">Helped You</Badge>;
      case "requester":
        return <Badge variant="success">You Helped</Badge>;
      case "both":
        return <Badge variant="warning">Mutual</Badge>;
      default:
        return null;
    }
  };

  const tabs: { key: TabFilter; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: Users },
    { key: "helper", label: "My Helpers", icon: HandHelping },
    { key: "requester", label: "I Helped", icon: User },
  ];

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
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-48 bg-gray-100 rounded" />
                    </div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No friends yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  People you interact with through requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Friend Card */}
                    <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                      <Avatar
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        fallback={friend.displayName}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {friend.displayName}
                          </p>
                          {getRelationshipBadge(friend.relationship)}
                        </div>
                        {friend.skills.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {friend.skills.slice(0, 3).join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {friend.matchCount} interaction{friend.matchCount !== 1 ? "s" : ""} · Last: {formatDate(friend.lastInteraction)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {friend.lastRequest && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (friend.lastMatchId) {
                                // Find the chat thread for the latest match
                                toggleFriendHistory(friend.id);
                              }
                            }}
                            className="text-gray-500"
                            title="View history"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <button
                          onClick={() => toggleFriendHistory(friend.id)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {expandedFriend === friend.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Match History */}
                    {expandedFriend === friend.id && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Interaction History
                        </p>
                        {loadingMatches === friend.id ? (
                          <div className="flex items-center gap-2 py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                            <span className="text-xs text-gray-400">Loading...</span>
                          </div>
                        ) : (friendMatches[friend.id] || []).length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">No history found</p>
                        ) : (
                          <div className="space-y-2">
                            {(friendMatches[friend.id] || []).map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {m.requestTitle}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {m.category && (
                                      <Badge variant="warning">{m.category}</Badge>
                                    )}
                                    <Badge variant={m.status === "completed" ? "success" : "default"}>
                                      {m.status}
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      {formatDate(m.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                {m.chatThreadId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/chat/${m.chatThreadId}`)}
                                    className="shrink-0 ml-2"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
