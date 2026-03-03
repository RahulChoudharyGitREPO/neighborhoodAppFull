"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle, XCircle, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import api, { endpoints, API_BASE_URL } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Message, ChatThread, Match } from "@/types";
import { formatTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserStore();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (params.threadId) {
      fetchThread();
      fetchMessages();
      connectWebSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('thread:leave', { threadId: params.threadId });
        socketRef.current.disconnect();
      }
    };
  }, [params.threadId]);

  useEffect(() => {
    if (thread?.matchId) {
      fetchMatch();
    }
  }, [thread?.matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectWebSocket = () => {
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error("No auth token found");
      toast.error("Authentication required. Please log in again.");
      return;
    }

    // Initialize Socket.IO connection
    const socket = io(API_BASE_URL, {
      path: '/ws',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log("Socket.IO connected");

      // Join the thread room
      socket.emit('thread:join', { threadId: params.threadId });
    });

    socket.on('thread:joined', (data) => {
      console.log("Joined thread:", data.threadId);
    });

    socket.on('message:new', (data) => {
      console.log("New message received:", data);

      // Transform the message to match our Message type
      const message = {
        _id: data.id || data._id,
        threadId: data.threadId,
        senderId: data.senderId,
        body: data.body,
        attachments: data.attachments || [],
        createdAt: data.createdAt,
      };

      console.log("Transformed message:", message);
      console.log("Current user ID:", user?._id || user?.id);

      setMessages((prev) => {
        console.log("Adding message to state. Previous count:", prev.length);
        return [...prev, message];
      });
    });

    socket.on('error', (error) => {
      console.error("Socket.IO error:", error);
      toast.error(error.message || "Socket connection error");
    });

    socket.on('disconnect', () => {
      console.log("Socket.IO disconnected");
    });

    socket.on('connect_error', (error) => {
      console.error("Socket.IO connection error:", error);
    });

    socketRef.current = socket;
  };

  const fetchThread = async () => {
    try {
      // Find match by thread ID by getting all user's matches and finding the one with this thread
      const matchesResponse = await api.get('/matches');
      const userMatches = matchesResponse.data.matches || matchesResponse.data.data || matchesResponse.data || [];

      // Find the match that has this thread ID
      const matchWithThread = userMatches.find((m: any) =>
        m.chatThreadId === params.threadId || m.thread?.id === params.threadId || m.thread?._id === params.threadId
      );

      if (matchWithThread) {
        setMatch(matchWithThread);
        setThread({
          _id: params.threadId as string,
          matchId: matchWithThread.id || matchWithThread._id,
          participants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Fallback: just set basic thread info
        setThread({
          _id: params.threadId as string,
          matchId: "",
          participants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error("Failed to load thread:", error);
      // Still allow chat to work even if match lookup fails
      setThread({
        _id: params.threadId as string,
        matchId: "",
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const fetchMatch = async () => {
    // Match is already fetched in fetchThread, skip duplicate fetch
    return;
  };

  const markAsRead = async () => {
    try {
      await api.post(endpoints.markThreadAsRead(params.threadId as string));
      console.log("Messages marked as read");

      // Trigger navbar to refresh unread count
      window.dispatchEvent(new Event('messages-read'));
    } catch (error: any) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(endpoints.messages(params.threadId as string));
      const messagesData = response.data.messages || response.data.data || response.data;

      // Ensure we always set an array and map the data correctly
      if (Array.isArray(messagesData)) {
        // Transform messages to match our Message type
        const transformedMessages = messagesData.map((msg: any) => ({
          _id: msg._id || msg.id,
          threadId: msg.threadId,
          senderId: msg.sender || msg.senderId, // Backend returns 'sender' object in GET
          body: msg.body,
          attachments: msg.attachments || [],
          createdAt: msg.createdAt,
        }));
        setMessages(transformedMessages);

        // Mark all messages as read after loading
        markAsRead();
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error("Failed to load messages:", error);
      toast.error(error.message || "Failed to load messages");
      setMessages([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage;
    setNewMessage("");
    setIsSending(true);

    try {
      await api.post(endpoints.messages(params.threadId as string), {
        body: messageContent, // Changed from 'content' to 'body' to match backend validator
      });
      // Message will be received via WebSocket
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptHelper = async () => {
    if (!match) return;

    setIsAccepting(true);
    try {
      const matchId = match.id || match._id;
      const response = await api.patch(`/matches/${matchId}/status`, {
        status: "active",
      });

      const updatedMatch = response.data.data || response.data;
      setMatch(updatedMatch);
      toast.success("Helper accepted! Starting tracking...");

      // Start tracking
      const trackingResponse = await api.post(`/matches/${matchId}/tracking/start`);
      console.log("Tracking started:", trackingResponse.data);

      // Redirect to tracking page
      setTimeout(() => {
        router.push(`/tracking/${matchId}`);
      }, 1000);
    } catch (error: any) {
      console.error("Accept helper error:", error);
      toast.error(error.message || "Failed to accept helper");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectHelper = async () => {
    if (!match) return;

    setIsRejecting(true);
    try {
      const matchId = match.id || match._id;
      await api.patch(`/matches/${matchId}/status`, {
        status: "cancelled",
      });

      toast.success("Helper offer declined");
      router.push("/map");
    } catch (error: any) {
      console.error("Reject helper error:", error);
      toast.error(error.message || "Failed to reject helper");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
            {thread && (
              <p className="text-sm text-gray-600">
                {thread.participants.length} participants
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Accept/Reject Banner (for requester when match is pending) */}
      {match && match.status === "pending" && (
        typeof match.requesterId === "string"
          ? match.requesterId === user?._id || match.requesterId === user?.id
          : match.requesterId._id === user?._id || match.requesterId._id === user?.id
      ) && (
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Helper wants to assist you</h3>
                <p className="text-sm text-black mt-1">
                  Review their offer and accept to start tracking their location
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectHelper}
                  isLoading={isRejecting}
                  disabled={isAccepting || isRejecting}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptHelper}
                  isLoading={isAccepting}
                  disabled={isAccepting || isRejecting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept & Track
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Match Banner for Requester */}
      {match && match.status === "active" && match.trackingEnabled && (
        typeof match.requesterId === "string"
          ? match.requesterId === user?._id || match.requesterId === user?.id
          : match.requesterId?._id === user?._id || match.requesterId?._id === user?.id
      ) && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-900">
                Tracking enabled - Helper is on their way
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/tracking/${match.id || match._id}`)}
            >
              <MapPin className="h-4 w-4 mr-1" />
              View Map
            </Button>
          </div>
        </div>
      )}

      {/* Active Match Banner for Helper */}
      {match && match.status === "active" && match.trackingEnabled && (
        typeof match.helperId === "string"
          ? match.helperId === user?._id || match.helperId === user?.id
          : match.helperId?._id === user?._id || match.helperId?._id === user?.id
      ) && (
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-700 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">
                Sharing your location with requester
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/tracking/${match.id || match._id}`)}
            >
              <MapPin className="h-4 w-4 mr-1" />
              View Map
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                // Check if message is from current user
                // senderId can be either a string (user ID) or an object (populated user)
                let isOwnMessage = false;
                let sender = null;

                if (typeof message.senderId === "object" && message.senderId !== null) {
                  // senderId is populated user object
                  const senderId = message.senderId._id || message.senderId.id;
                  isOwnMessage = senderId === user?._id || senderId === user?.id;
                  sender = message.senderId;
                } else if (typeof message.senderId === "string") {
                  // senderId is just the ID string
                  isOwnMessage = message.senderId === user?._id || message.senderId === user?.id;
                }

                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] sm:max-w-md ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                      {!isOwnMessage && sender && (
                        <Avatar
                          src={sender.avatar}
                          alt={sender.name}
                          fallback={sender.name}
                          size="sm"
                        />
                      )}
                      <div>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwnMessage
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p className="text-sm">{message.body || message.content}</p>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? "text-right" : "text-left"}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all"
              disabled={isSending}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!newMessage.trim() || isSending}
              isLoading={isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
