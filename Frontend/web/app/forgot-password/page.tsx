"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Heart, CheckCircle, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import api, { endpoints } from "@/lib/api";
import toast from "react-hot-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await api.post(endpoints.requestPasswordReset, { email: data.email });
      setIsSubmitted(true);
      toast.success("Check your email for reset instructions");
    } catch (error: any) {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
      toast.success("Check your email for reset instructions");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-8">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-3 rounded-2xl w-fit mx-auto mb-4">
                  <Heart className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Reset your password</h2>
                <p className="text-gray-600 mt-2">
                  Enter your email and we&apos;ll send you a reset link
                </p>
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

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600">
                If an account exists with that email, we&apos;ve sent you instructions to reset your password.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-900 hover:text-black font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
