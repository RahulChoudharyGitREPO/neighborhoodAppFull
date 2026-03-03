"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, HandHeart, Users } from "lucide-react";
import Button from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { useUserStore } from "@/store/useUserStore";
import toast from "react-hot-toast";

type Role = "helper" | "requester" | "both";

interface RoleOption {
  value: Role;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function SelectRolePage() {
  const router = useRouter();
  const { user, setUser } = useUserStore();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roleOptions: RoleOption[] = [
    {
      value: "helper",
      icon: <HandHeart className="h-12 w-12" />,
      title: "Helper",
      description: "Offer your time, skills, or tools to neighbors who need help.",
      color: "blue",
    },
    {
      value: "requester",
      icon: <Heart className="h-12 w-12" />,
      title: "Requester",
      description: "Post tasks and get quick help from your community.",
      color: "green",
    },
    {
      value: "both",
      icon: <Users className="h-12 w-12" />,
      title: "Both",
      description: "Help others and request help when needed. Switch anytime in Settings.",
      color: "purple",
    },
  ];

  const handleSelectRole = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.patch("/me/profile", { role: selectedRole });
      console.log("Role updated:", response.data);

      // Update user in store
      setUser({ ...user, role: selectedRole } as any);

      toast.success("Role selected successfully!");
      router.push("/map");
    } catch (error: any) {
      console.error("Role selection error:", error);
      toast.error(error.message || "Failed to set role");
    } finally {
      setIsLoading(false);
    }
  };

  const getCardClasses = (value: Role) => {
    const isSelected = selectedRole === value;
    const baseClasses = "cursor-pointer transition-all duration-200";

    if (isSelected) {
      if (value === "helper") return `${baseClasses} border-gray-800 bg-gray-100 shadow-lg`;
      if (value === "requester") return `${baseClasses} border-green-500 bg-green-50 shadow-lg`;
      return `${baseClasses} border-purple-500 bg-purple-50 shadow-lg`;
    }

    return `${baseClasses} border-gray-200 hover:border-gray-300 hover:shadow-md`;
  };

  const getIconClasses = (value: Role) => {
    if (selectedRole === value) {
      if (value === "helper") return "text-gray-900";
      if (value === "requester") return "text-green-600";
      return "text-purple-600";
    }
    return "text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">
            How do you want to use Neighbour?
          </h1>
          <p className="text-lg text-gray-600">
            Choose your role to get started. You can change this anytime in Settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {roleOptions.map((option) => (
            <Card
              key={option.value}
              className={getCardClasses(option.value)}
              onClick={() => setSelectedRole(option.value)}
            >
              <CardContent className="pt-6 pb-6 text-center">
                <div className={`flex justify-center mb-4 ${getIconClasses(option.value)}`}>
                  {option.icon}
                </div>
                <CardTitle className="text-2xl mb-2">{option.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {option.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSelectRole}
            isLoading={isLoading}
            disabled={!selectedRole || isLoading}
            className="px-12"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
