"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Heart } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      console.log("Logging in with:", data.email);
      const response = await api.post(endpoints.login, data);
      console.log("Login response:", response.data);

      const userData = response.data.user || response.data.data?.user || response.data;
      const token = response.data.accessToken || response.data.token || response.data.data?.token;

      if (!userData) {
        console.error("No user data in response");
        throw new Error("Invalid response from server");
      }

      // Store token in localStorage if provided (fallback if cookies don't work cross-domain)
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

      toast.success("Welcome back!");

      // Check if user has selected a role
      const targetPage = !fullUserData.role ? "/select-role" : "/map";

      // Use replace instead of push to avoid back button issues
      // Longer delay to ensure token is fully available
      setTimeout(() => {
        console.log(`Redirecting to ${targetPage}. Token check:`, localStorage.getItem("auth_token"));
        router.replace(targetPage);
      }, 500);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Please try again.");
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
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-5 w-5" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-900 hover:text-black font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-gray-900 hover:text-black font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
