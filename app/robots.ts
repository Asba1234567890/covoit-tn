import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/search", "/rides", "/privacy", "/terms"],
        disallow: ["/api/", "/admin/", "/my-bookings", "/my-rides", "/messages", "/notifications", "/profile", "/vehicles"],
      },
    ],
  };
}
