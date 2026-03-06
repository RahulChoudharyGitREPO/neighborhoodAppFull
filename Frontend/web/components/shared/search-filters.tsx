"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Select from "@/components/ui/select";
import { CATEGORIES, SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  viewType: "requests" | "offers";
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  className?: string;
}

export default function SearchFilters({
  viewType,
  onSearch,
  onCategoryChange,
  onSortChange,
  className,
}: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const sortOptions = viewType === "requests" ? SORT_OPTIONS.requests : SORT_OPTIONS.offers;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={viewType === "requests" ? "Search requests..." : "Search helpers..."}
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-1.5 rounded-lg border transition-colors",
            showFilters
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-2">
          <select
            onChange={(e) => onCategoryChange(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            onChange={(e) => onSortChange(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
