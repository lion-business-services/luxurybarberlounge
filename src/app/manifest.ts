import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Luxury Barber Lounge", short_name: "LBL", description: "Luxury grooming, appointments, queue, and client portal.", start_url: "/", display: "standalone", background_color: "#0a0a0a", theme_color: "#0a0a0a", icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }] }; }
