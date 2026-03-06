"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import StarRatingInput from "@/components/shared/star-rating-input";
import api, { endpoints } from "@/lib/api";
import toast from "react-hot-toast";

interface RatingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  toUserId: string;
  toUserName: string;
}

export default function RatingFormModal({
  isOpen,
  onClose,
  matchId,
  toUserId,
  toUserName,
}: RatingFormModalProps) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsLoading(true);
    try {
      await api.post(endpoints.ratings, {
        toUserId,
        matchId,
        stars,
        comment: comment.trim() || undefined,
      });
      toast.success("Rating submitted!");
      // Store in localStorage so we don't show the prompt again
      localStorage.setItem(`rated_${matchId}`, "true");
      onClose();
    } catch (error: any) {
      if (error.status === 409) {
        toast.error("You have already rated this match");
        localStorage.setItem(`rated_${matchId}`, "true");
        onClose();
      } else {
        toast.error(error.message || "Failed to submit rating");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Rate your experience</h3>
        <p className="text-sm text-gray-600 mb-6">
          How was your experience with {toUserName}?
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center">
            <StarRatingInput value={stars} onChange={setStars} size="lg" />
          </div>

          <div>
            <Textarea
              label="Comment (optional)"
              placeholder="Share your experience..."
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
            >
              Submit Rating
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
