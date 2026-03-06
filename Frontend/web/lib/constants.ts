export const CATEGORIES = [
  { value: "grocery", label: "Grocery", color: "amber" },
  { value: "medical", label: "Medical", color: "red" },
  { value: "transport", label: "Transport", color: "blue" },
  { value: "repairs", label: "Repairs", color: "orange" },
  { value: "tutoring", label: "Tutoring", color: "purple" },
  { value: "pet-care", label: "Pet Care", color: "pink" },
  { value: "gardening", label: "Gardening", color: "lime" },
  { value: "other", label: "Other", color: "gray" },
] as const;

export const SORT_OPTIONS = {
  requests: [
    { value: "distance", label: "Distance" },
    { value: "date", label: "Most Recent" },
    { value: "urgency", label: "Most Urgent" },
  ],
  offers: [
    { value: "distance", label: "Distance" },
    { value: "date", label: "Most Recent" },
    { value: "rating", label: "Highest Rated" },
  ],
} as const;
