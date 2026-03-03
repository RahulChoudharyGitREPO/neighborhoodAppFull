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

const offerSchema = z.object({
  skills: z.string().min(1, "Please enter at least one skill"),
  radiusKm: z.string().min(1, "Please select a radius"),
});

type OfferFormData = z.infer<typeof offerSchema>;

export default function CreateOfferPage() {
  const router = useRouter();
  const { user, location } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
  });

  const onSubmit = async (data: OfferFormData) => {
    setIsLoading(true);
    try {
      // Get user's home location from their profile
      const userHome = user?.home;

      if (!userHome || !userHome.lng || !userHome.lat) {
        toast.error("Location not found. Please update your profile.");
        setIsLoading(false);
        return;
      }

      const offerData = {
        skills: data.skills.split(",").map((s) => s.trim()),
        radiusKm: parseFloat(data.radiusKm),
        home: {
          lng: userHome.lng,
          lat: userHome.lat,
        },
        availability: {},
      };

      console.log("Creating offer:", offerData);
      await api.post(endpoints.offers, offerData);
      toast.success("Offer created successfully!");
      router.push("/map");
    } catch (error: any) {
      console.error("Create offer error:", error);
      toast.error(error.message || "Failed to create offer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create an Offer</CardTitle>
            <p className="text-gray-600 mt-2">
              Share your skills and help your neighbors
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Your Skills"
                placeholder="e.g., Driving, Cooking, Handyman (comma separated)"
                error={errors.skills?.message}
                {...register("skills")}
              />

              <Select
                label="How far can you travel?"
                options={[
                  { value: "0.5", label: "0.5 km" },
                  { value: "1", label: "1 km" },
                  { value: "2", label: "2 km" },
                  { value: "3", label: "3 km" },
                  { value: "5", label: "5 km" },
                  { value: "10", label: "10 km" },
                  { value: "25", label: "25 km" },
                  { value: "50", label: "50 km" },
                  { value: "100", label: "100 km" },
                  { value: "50000", label: "No limit" },
                ]}
                error={errors.radiusKm?.message}
                {...register("radiusKm")}
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
                  Create Offer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
