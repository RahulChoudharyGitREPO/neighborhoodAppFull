"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function StarRatingInput({
  value,
  onChange,
  size = "lg",
  className,
}: StarRatingInputProps) {
  const [hoverIndex, setHoverIndex] = useState(0);

  const sizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverIndex || value);

        return (
          <button
            key={index}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHoverIndex(starValue)}
            onMouseLeave={() => setHoverIndex(0)}
            className="p-0.5 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors duration-150",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
