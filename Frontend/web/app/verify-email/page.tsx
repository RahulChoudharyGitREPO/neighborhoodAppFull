"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api, { endpoints } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        await api.get(`${endpoints.verifyEmail}?token=${token}`);
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } catch (error: any) {
        setStatus("error");
        setMessage(error.message || "Verification failed. The link may have expired.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
            </>
          )}

          {status === "success" && (
            <>
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/login"
                className="text-sm text-gray-900 hover:text-black font-medium"
              >
                Continue to login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="bg-red-100 p-3 rounded-full w-fit mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/login"
                className="text-sm text-gray-900 hover:text-black font-medium"
              >
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-gray-900 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
