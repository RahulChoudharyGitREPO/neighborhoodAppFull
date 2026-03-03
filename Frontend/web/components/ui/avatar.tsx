import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const avatarGradients = [
  "from-gray-700 to-gray-900",
  "from-indigo-500 to-indigo-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
  "from-emerald-500 to-emerald-700",
  "from-violet-500 to-violet-700",
  "from-cyan-500 to-cyan-700",
  "from-pink-500 to-pink-700",
  "from-orange-500 to-orange-700",
  "from-blue-500 to-blue-700",
];

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  colorIndex?: number;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = "md", fallback, colorIndex, ...props }, ref) => {
    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
    };

    const getInitials = (name?: string) => {
      if (!name) return "?";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    const gradient = colorIndex !== undefined
      ? avatarGradients[colorIndex % avatarGradients.length]
      : avatarGradients[0];

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full bg-gradient-to-br text-white font-medium overflow-hidden",
          gradient,
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitials(fallback || alt)}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export default Avatar;
