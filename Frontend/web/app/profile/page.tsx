"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, ArrowLeft, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Avatar from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
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
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "privacy">("profile");

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
              <div className="py-8 text-center">
                <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">Privacy Settings</p>
                <p className="text-xs text-gray-400 mt-1">Coming soon. Your data is always secure.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
