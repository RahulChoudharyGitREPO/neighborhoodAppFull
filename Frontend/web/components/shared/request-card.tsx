"use client";

import Link from "next/link";
import { MapPin, Clock, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import RatingStars from "./rating-stars";
import Button from "@/components/ui/button";
import { Request, User } from "@/types";
import { formatDistance } from "@/lib/utils";

interface RequestCardProps {
  request: Request;
}

export default function RequestCard({ request }: RequestCardProps) {
  const requestId = request.id || request._id;
  const user = request.user || (typeof request.userId === "object" ? request.userId as User : null);
  const description = request.details || request.description;

  return (
    <Card hover className="cursor-pointer">
      <Link href={`/requests/${requestId}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{request.title}</CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {description}
              </CardDescription>
            </div>
            <Badge variant="primary">{request.category}</Badge>
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
            {request.distance !== undefined && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                {formatDistance(request.distance)} away
              </div>
            )}
            {request.timeNeeded && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                {request.timeNeeded}
              </div>
            )}
          </div>

          {/* Skills */}
          {request.skillsRequired && request.skillsRequired.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {request.skillsRequired.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-900 text-xs"
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
