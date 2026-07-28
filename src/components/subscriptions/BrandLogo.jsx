import React, { useMemo, useState } from "react";
import { Avatar, Box } from "@mui/material";

// Subscription logos (feature doc §2A.2). Resolution order per sub:
//   1. manual `logo` URL if set
//   2. real brand logo via Clearbit by domain
//   3. favicon fallbacks (DuckDuckGo, then Google)
//   4. coloured initial avatar
// Domain is derived from the sub's `url`, else a small brand map, else `<firstword>.com`.
//
// NOTE: fetching logos client-side tells that provider which merchants you track.
// Acceptable for a single-user home-LAN app; documented in the feature register.

// Common merchant → domain, so a logo appears even when no URL is set.
const BRAND_DOMAINS = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  spotifypremium: "spotify.com",
  amazonprime: "amazon.com",
  prime: "amazon.com",
  primevideo: "primevideo.com",
  disney: "disneyplus.com",
  disneyplus: "disneyplus.com",
  stan: "stan.com.au",
  binge: "binge.com.au",
  kayo: "kayosports.com.au",
  paramount: "paramountplus.com",
  paramountplus: "paramountplus.com",
  hbomax: "max.com",
  max: "max.com",
  hulu: "hulu.com",
  youtube: "youtube.com",
  youtubepremium: "youtube.com",
  audible: "audible.com",
  appletv: "apple.com",
  applemusic: "apple.com",
  apple: "apple.com",
  icloud: "icloud.com",
  microsoft: "microsoft.com",
  office365: "microsoft.com",
  microsoft365: "microsoft.com",
  adobe: "adobe.com",
  dropbox: "dropbox.com",
  googleone: "one.google.com",
  google: "google.com",
  github: "github.com",
  notion: "notion.so",
  onepassword: "1password.com",
  nordvpn: "nordvpn.com",
  expressvpn: "expressvpn.com",
  surfshark: "surfshark.com",
  canva: "canva.com",
  figma: "figma.com",
  openai: "openai.com",
  chatgpt: "openai.com",
  anthropic: "anthropic.com",
  claude: "claude.ai",
  strava: "strava.com",
  headspace: "headspace.com",
  calm: "calm.com",
  audiblecom: "audible.com",
  xbox: "xbox.com",
  playstation: "playstation.com",
  nintendo: "nintendo.com",
};

const AVATAR_COLORS = [
  "#1976d2",
  "#ef5350",
  "#66bb6a",
  "#ff7043",
  "#ab47bc",
  "#26a69a",
  "#42a5f5",
  "#ec407a",
  "#ffa726",
  "#78909c",
];

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function domainFromUrl(url) {
  if (!url) return null;
  try {
    const withProto = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const host = new URL(withProto).hostname.replace(/^www\./, "");
    return host || null;
  } catch (e) {
    return null;
  }
}

function resolveDomain(sub) {
  const fromUrl = domainFromUrl(sub.url);
  if (fromUrl) return fromUrl;
  const norm = normalizeName(sub.name);
  if (BRAND_DOMAINS[norm]) return BRAND_DOMAINS[norm];
  // partial match — e.g. "Netflix AU" → contains "netflix"
  for (const key of Object.keys(BRAND_DOMAINS)) {
    if (norm.includes(key)) return BRAND_DOMAINS[key];
  }
  const firstWord = (sub.name || "")
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return firstWord ? `${firstWord}.com` : null;
}

function colorFor(name) {
  const n = name || "?";
  let hash = 0;
  for (let i = 0; i < n.length; i++)
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function BrandLogo({ sub, size = 40 }) {
  const candidates = useMemo(() => {
    const list = [];
    if (sub.logo) list.push(sub.logo);
    const domain = resolveDomain(sub);
    if (domain) {
      list.push(`https://logo.clearbit.com/${domain}`);
      list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
    }
    return list;
  }, [sub]);

  const [idx, setIdx] = useState(0);

  const initial = (sub.name || "?").trim().charAt(0).toUpperCase();

  if (idx >= candidates.length) {
    return (
      <Avatar
        variant="rounded"
        sx={{
          width: size,
          height: size,
          bgcolor: colorFor(sub.name),
          fontSize: size * 0.45,
          fontWeight: 700,
        }}
      >
        {initial}
      </Avatar>
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        border: 1,
        borderColor: "divider",
      }}
    >
      <img
        src={candidates[idx]}
        onError={() => setIdx((i) => i + 1)}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
      />
    </Box>
  );
}
