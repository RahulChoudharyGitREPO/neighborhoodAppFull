"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, ArrowLeft, MapPin, Star, Shield } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Avatar from "@/components/ui/avatar";
import Toggle from "@/components/ui/toggle";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import { Rating } from "@/types";
import RatingStars from "@/components/shared/rating-stars";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  radius: z.number().min(100).max(5000).optional(),
  skills: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetchingLocation, setIsRefetchingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "privacy" | "reviews">("profile");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsSummary, setRatingsSummary] = useState({ averageRating: 0, totalRatings: 0 });
  const [ratingsPage, setRatingsPage] = useState(1);
  const [hasMoreRatings, setHasMoreRatings] = useState(false);
  const [maskLocation, setMaskLocation] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; displayName: string; avatarUrl?: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.displayName || user?.name || "",
      bio: user?.bio || "",
      phone: user?.phone || "",
      address: user?.address || "",
      radius: user?.radius || user?.radiusKm ? (user?.radiusKm || 5) * 1000 : 5000,
      skills: user?.skills?.join(", ") || "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Fetch fresh user data
    fetchUserProfile();
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === "reviews" && user) {
      fetchRatings(1);
    }
    if (activeTab === "privacy" && user) {
      fetchPrivacyData();
    }
  }, [activeTab]);

  const fetchPrivacyData = async () => {
    try {
      const [profileRes, blockedRes] = await Promise.all([
        api.get(endpoints.profile),
        api.get(endpoints.blockedUsers),
      ]);
      const privacy = profileRes.data?.privacy || profileRes.data?.data?.privacy;
      if (privacy) setMaskLocation(privacy.maskExactLocation || false);
      setBlockedUsers(blockedRes.data?.blockedUsers || []);
    } catch (error: any) {
      console.error("Failed to fetch privacy data:", error);
    }
  };

  const handleToggleMask = async (checked: boolean) => {
    setMaskLocation(checked);
    try {
      await api.patch(endpoints.updatePrivacy, { maskExactLocation: checked });
      toast.success("Privacy settings updated");
    } catch (error: any) {
      setMaskLocation(!checked);
      toast.error("Failed to update privacy settings");
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.patch(endpoints.updatePrivacy, { unblockUserId: userId });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User unblocked");
    } catch (error: any) {
      toast.error("Failed to unblock user");
    }
  };

  const fetchRatings = async (page: number) => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    setRatingsLoading(true);
    try {
      const response = await api.get(`${endpoints.userRatings(userId)}?page=${page}&limit=10`);
      const data = response.data;
      const ratingsData = data.ratings || data.data || [];
      if (page === 1) {
        setRatings(ratingsData);
      } else {
        setRatings((prev) => [...prev, ...ratingsData]);
      }
      setRatingsSummary({
        averageRating: data.summary?.averageRating || data.averageRating || user?.rating || 0,
        totalRatings: data.summary?.totalRatings || data.totalRatings || 0,
      });
      setHasMoreRatings(data.pagination?.hasMore || false);
      setRatingsPage(page);
    } catch (error: any) {
      console.error("Failed to fetch ratings:", error);
    } finally {
      setRatingsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get(endpoints.profile);
      const userData = response.data.data || response.data;
      setUser(userData);
      reset({
        name: userData.displayName || userData.name || "",
        bio: userData.bio || "",
        phone: userData.phone || "",
        address: userData.address || "",
        radius: userData.radius || (userData.radiusKm ? userData.radiusKm * 1000 : 5000),
        skills: userData.skills?.join(", ") || "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile");
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const updateData: Record<string, any> = {};

      // Map frontend field names to backend field names
      if (data.name) updateData.displayName = data.name;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.skills) {
        updateData.skills = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
      }
      // Convert radius from meters to km for backend
      if (data.radius) updateData.radiusKm = data.radius / 1000;

      const response = await api.patch(endpoints.updateProfile, updateData);
      const updatedUser = response.data.data || response.data;

      setUser(updatedUser);
      toast.success("Profile updated successfully!");
      router.push("/map");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await api.post(endpoints.uploadAvatar, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const data = response.data.data || response.data;
      // Merge new avatar URL into existing user data
      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl, avatar: data.avatarUrl });
      }
      toast.success("Avatar updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    }
  };

  const handleRefetchLocation = async () => {
    setIsRefetchingLocation(true);
    try {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Update user's home location
          const response = await api.patch(endpoints.updateProfile, {
            home: {
              lat: latitude,
              lng: longitude,
            },
          });

          const updatedUser = response.data.data || response.data;
          setUser(updatedUser);
          toast.success("Location updated successfully!");
          setIsRefetchingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to get your location. Please enable location permissions.");
          setIsRefetchingLocation(false);
        }
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update location");
      setIsRefetchingLocation(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile Settings</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-4 sm:gap-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === "profile"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Profile Info
                </button>
                <button
                  onClick={() => setActiveTab("account")}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === "account"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Account
                </button>
                <button
                  onClick={() => setActiveTab("privacy")}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === "privacy"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Privacy
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === "reviews"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Reviews
                </button>
              </div>
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar
                    src={user.avatar || user.avatarUrl}
                    alt={user.displayName || user.name}
                    fallback={user.displayName || user.name}
                    size="lg"
                  />
                  <div>
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                      >
                        <Camera className="h-4 w-4 mr-1.5" />
                        Change Avatar
                      </Button>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column */}
                    <Input
                      label="Full Name"
                      error={errors.name?.message}
                      {...register("name")}
                    />

                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      error={errors.phone?.message}
                      {...register("phone")}
                    />

                    {/* Bio spans full width */}
                    <div className="md:col-span-2">
                      <Textarea
                        label="Bio"
                        placeholder="Tell others about yourself..."
                        rows={3}
                        error={errors.bio?.message}
                        {...register("bio")}
                      />
                    </div>

                    <Input
                      label="Address"
                      placeholder="Your address"
                      error={errors.address?.message}
                      {...register("address")}
                    />

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Location
                      </label>
                      <div className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200 h-[46px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-4 w-4 text-gray-700 shrink-0" />
                          {user.home ? (
                            <span className="text-sm text-gray-600 truncate">
                              {user.home.lat.toFixed(4)}, {user.home.lng.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Not set</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRefetchLocation}
                          isLoading={isRefetchingLocation}
                          disabled={isRefetchingLocation}
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <Input
                      label="Search Radius (meters)"
                      type="number"
                      placeholder="5000"
                      error={errors.radius?.message}
                      {...register("radius", { valueAsNumber: true })}
                    />

                    <Input
                      label="Skills"
                      placeholder="e.g., Driving, Cooking, Gardening"
                      error={errors.skills?.message}
                      {...register("skills")}
                    />
                  </div>

                  <div className="flex gap-3 pt-5 mt-5 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Account Information</h3>
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-gray-500">Member since</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {user.rating && (
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Rating</span>
                      <span className="text-sm font-medium text-gray-900">
                        {user.rating.toFixed(1)} / 5.0
                      </span>
                    </div>
                  )}
                  {user.role && (
                    <div className="flex justify-between py-3">
                      <span className="text-sm text-gray-500">Role</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{user.role}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                {/* Location Masking */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Mask Exact Location</p>
                    <p className="text-xs text-gray-500 mt-0.5">Show approximate area instead of exact address</p>
                  </div>
                  <Toggle checked={maskLocation} onChange={handleToggleMask} />
                </div>

                {/* Blocked Users */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Blocked Users</h3>
                  </div>
                  {blockedUsers.length === 0 ? (
                    <p className="text-xs text-gray-400 p-4 bg-gray-50 rounded-xl text-center">No blocked users</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar src={u.avatarUrl} alt={u.displayName} fallback={u.displayName} size="sm" />
                            <span className="text-sm text-gray-900">{u.displayName}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleUnblock(u.id)}>
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {ratingsSummary.averageRating.toFixed(1)}
                    </p>
                    <RatingStars rating={ratingsSummary.averageRating} size="sm" />
                    <p className="text-xs text-gray-500 mt-1">
                      {ratingsSummary.totalRatings} review{ratingsSummary.totalRatings !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Reviews List */}
                {ratingsLoading && ratings.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : ratings.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <div key={rating.id || rating._id} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar
                            src={rating.from?.avatarUrl}
                            alt={rating.from?.displayName}
                            fallback={rating.from?.displayName}
                            size="sm"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {rating.from?.displayName || "Anonymous"}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(rating.createdAt)}</p>
                          </div>
                          <RatingStars rating={rating.stars} size="sm" />
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-gray-700 mt-2">{rating.comment}</p>
                        )}
                      </div>
                    ))}

                    {hasMoreRatings && (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchRatings(ratingsPage + 1)}
                          isLoading={ratingsLoading}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
