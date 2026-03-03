"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogOut, User, MessageCircle, Menu, X, Pencil } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/lib/utils";
import api, { endpoints } from "@/lib/api";
import toast from "react-hot-toast";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useUserStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);

      const handleMessagesRead = () => {
        fetchUnreadCount();
      };
      window.addEventListener('messages-read', handleMessagesRead);

      return () => {
        clearInterval(interval);
        window.removeEventListener('messages-read', handleMessagesRead);
      };
    }
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/matches/unread-count");
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(endpoints.logout);
      localStorage.removeItem("auth_token");
      logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("auth_token");
      logout();
      router.push("/login");
    }
  };

  // Don't show navbar on auth pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/map" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-2 rounded-xl group-hover:scale-105 transition-transform">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              <span className="hidden sm:inline">Neighborhood Helper</span>
              <span className="sm:hidden">NH</span>
            </span>
          </Link>

          {/* Desktop right side */}
          {isAuthenticated && user ? (
            <>
              <div className="hidden md:flex items-center space-x-4">
                {/* Inbox link */}
                <Link
                  href="/inbox"
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Inbox"
                >
                  <MessageCircle className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <Avatar
                      src={user.avatar || user.avatarUrl}
                      alt={user.displayName || user.name}
                      fallback={user.displayName || user.name}
                      size="md"
                    />
                    <div className="hidden sm:block text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || user.name}</p>
                        {user.role && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize leading-none",
                            user.role === "helper" ? "bg-indigo-100 text-indigo-700" :
                            user.role === "requester" ? "bg-gray-200 text-gray-900" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {user.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </button>

                  {/* Dropdown menu */}
                  <div
                    className={cn(
                      "absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 transition-all",
                      dropdownOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    )}
                  >
                    {/* User info header */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName || user.name}</p>
                        {user.role && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize leading-none shrink-0",
                            user.role === "helper" ? "bg-indigo-100 text-indigo-700" :
                            user.role === "requester" ? "bg-gray-200 text-gray-900" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {user.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && isAuthenticated && user && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-1 bg-white">
          <Link
            href="/inbox"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
          >
            <MessageCircle className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Inbox</span>
            {unreadCount > 0 && (
              <span className="ml-auto h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
          >
            <User className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 w-full text-left"
          >
            <LogOut className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
