"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User as UserIcon, MapPin, Heart } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import toast from "react-hot-toast";

const registerSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          });
        },
        (error) => {
          console.log("Location access denied, using default location");
          // Default to a location (e.g., New York City)
          setUserLocation({ lng: -74.006, lat: 40.7128 });
        }
      );
    } else {
      // Fallback location
      setUserLocation({ lng: -74.006, lat: 40.7128 });
    }
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    if (!userLocation) {
      toast.error("Please allow location access or wait for location to load");
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...formData } = data;
      const registerData = {
        ...formData,
        home: {
          lng: userLocation.lng,
          lat: userLocation.lat,
        },
      };

      console.log("Registering with:", registerData);
      const response = await api.post(endpoints.register, registerData);
      console.log("Register response:", response.data);

      const userData = response.data.user || response.data.data?.user || response.data;
      const token = response.data.accessToken || response.data.token || response.data.data?.token;

      if (!userData) {
        throw new Error("Invalid response from server");
      }

      // Store token in localStorage if provided
      if (token) {
        console.log("Storing auth token:", token);
        localStorage.setItem("auth_token", token);
        console.log("Token stored. Verification:", localStorage.getItem("auth_token"));
      } else {
        console.warn("No token received from server");
      }

      // Fetch full user profile to get home coordinates
      console.log("Fetching full user profile...");
      const profileResponse = await api.get("/me");
      console.log("Profile response:", profileResponse.data);

      const fullUserData = profileResponse.data;

      console.log("Setting full user data:", fullUserData);
      setUser(fullUserData);
      toast.success("Account created successfully!");

      // New users always need to select a role
      setTimeout(() => {
        console.log("Redirecting to /select-role. Token check:", localStorage.getItem("auth_token"));
        router.replace("/select-role");
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-3 rounded-2xl w-fit mx-auto mb-4">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
            <p className="text-gray-600 mt-2">Join the community today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              icon={<UserIcon className="h-5 w-5" />}
              error={errors.displayName?.message}
              {...register("displayName")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {userLocation && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-900 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-black">
                  Location detected: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-6"
              isLoading={isLoading}
              disabled={!userLocation}
            >
              {userLocation ? "Create Account" : "Loading location..."}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-gray-900 hover:text-black font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
