"use client";

import Link from "next/link";
import { MapPin, Clock, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import RatingStars from "./rating-stars";
import Button from "@/components/ui/button";
import { Offer, User } from "@/types";
import { formatDistance } from "@/lib/utils";

interface OfferCardProps {
  offer: Offer;
}

export default function OfferCard({ offer }: OfferCardProps) {
  const offerId = offer.id || offer._id;
  const user = offer.user || (typeof offer.userId === "object" ? offer.userId as User : null);
  const title = offer.skills?.join(", ") || "Helper Available";
  const description = offer.description || `Can help within ${offer.radiusKm || 0} km`;

  return (
    <Card hover className="cursor-pointer">
      <Link href={`/offers/${offerId}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {description}
              </CardDescription>
            </div>
            {offer.isActive && <Badge variant="success">Active</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* User info */}
          {user && (
            <div className="flex items-center space-x-3">
              <Avatar
                src={user.avatarUrl || user.avatar}
                alt={user.displayName || user.name}
                fallback={user.displayName || user.name}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{user.displayName || user.name}</p>
                {user.rating && (
                  <RatingStars rating={user.rating} size="sm" />
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {offer.distance !== undefined && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                {formatDistance(offer.distance)} away
              </div>
            )}
            {offer.availability && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                {offer.availability}
              </div>
            )}
          </div>

          {/* Skills */}
          {offer.skills && offer.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {offer.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {skill}
                </span>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
