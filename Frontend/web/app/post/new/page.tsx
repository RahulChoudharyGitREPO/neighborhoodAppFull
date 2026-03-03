"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import api, { endpoints } from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import toast from "react-hot-toast";
import { Category } from "@/types";

const categoryOptions = [
  { value: "errands", label: "Errands" },
  { value: "moving", label: "Moving Help" },
  { value: "repairs", label: "Home Repairs" },
  { value: "gardening", label: "Gardening" },
  { value: "tech", label: "Tech Support" },
  { value: "tutoring", label: "Tutoring" },
  { value: "other", label: "Other" },
];

const requestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  details: z.string().min(10, "Details must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  whenTime: z.string().min(1, "Please select when you need help"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function CreateRequestPage() {
  const router = useRouter();
  const { user, location } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      // Get user's home location from their profile
      const userHome = user?.home;

      if (!userHome || !userHome.lng || !userHome.lat) {
        toast.error("Location not found. Please update your profile.");
        setIsLoading(false);
        return;
      }

      const requestData = {
        title: data.title,
        details: data.details,
        category: data.category,
        whenTime: new Date(data.whenTime).toISOString(),
        location: {
          lng: userHome.lng,
          lat: userHome.lat,
        },
      };

      console.log("Creating request:", requestData);
      await api.post(endpoints.requests, requestData);
      toast.success("Request created successfully!");
      router.push("/map");
    } catch (error: any) {
      console.error("Create request error:", error);
      toast.error(error.message || "Failed to create request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create a Request</CardTitle>
            <p className="text-gray-600 mt-2">
              Let your neighbors know how they can help you
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Title"
                placeholder="e.g., Need help with grocery shopping"
                error={errors.title?.message}
                {...register("title")}
              />

              <Textarea
                label="Details"
                placeholder="Describe what help you need in detail..."
                rows={5}
                error={errors.details?.message}
                {...register("details")}
              />

              <Select
                label="Category"
                options={categoryOptions}
                error={errors.category?.message}
                {...register("category")}
              />

              <Input
                label="When do you need help?"
                type="datetime-local"
                error={errors.whenTime?.message}
                {...register("whenTime")}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                >
                  Create Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
