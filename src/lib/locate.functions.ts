import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { parseCoords } from "./locate";

/**
 * Turns a pasted Google Maps link (short or long), plain "lat, lng" text,
 * or a place name into coordinates. Signed-in users only.
 */
export const resolveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    const text = String(input?.text ?? "").trim();
    if (!text || text.length > 2000) throw new Error("Paste a Google Maps link or place name.");
    return { text };
  })
  .handler(async ({ data }) => {
    let text = data.text;
    const direct = parseCoords(text);
    if (direct) return { ...direct, label: null as string | null };

    let placeName: string | null = null;
    if (/^https?:\/\//i.test(text)) {
      const url = new URL(text);
      if (!/(^|\.)(google\.[a-z.]+|goo\.gl)$/i.test(url.hostname)) {
        throw new Error("Only Google Maps links are supported.");
      }
      const res = await fetch(text, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
      text = decodeURIComponent(res.url);
      const fromUrl = parseCoords(text);
      if (fromUrl) return { ...fromUrl, label: null };
      const body = await res.text();
      const fromBody = parseCoords(body.slice(0, 200000));
      const m = text.match(/\/place\/([^/]+)/);
      placeName = m?.[1] ? m[1].replace(/\+/g, " ") : null;
      if (fromBody) return { ...fromBody, label: placeName };
    } else {
      placeName = text;
    }
    if (!placeName) throw new Error("Couldn't read a location from that link.");

    const q = new URLSearchParams({ q: placeName, format: "json", limit: "1", countrycodes: "ke" });
    const geo = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { "user-agent": "PascoLabs-SchoolTransport/1.0" },
    });
    const hits = (await geo.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    let hit = hits[0];
    if (!hit && placeName.includes(",")) {
      const q2 = new URLSearchParams({ q: placeName.split(",").slice(1).join(","), format: "json", limit: "1", countrycodes: "ke" });
      const g2 = await fetch(`https://nominatim.openstreetmap.org/search?${q2}`, { headers: { "user-agent": "PascoLabs-SchoolTransport/1.0" } });
      hit = ((await g2.json()) as typeof hits)[0];
    }
    if (!hit) throw new Error("Couldn't find that place. Try 'Share → Copy link' after dropping a pin.");
    return { lat: Number(hit.lat), lng: Number(hit.lon), label: placeName };
  });
