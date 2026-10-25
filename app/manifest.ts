import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Familie",
    short_name: "Familie",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#4f7cff",
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
