"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { Polygon } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type Place = {
  name: string;
  coordinates: [number, number];
  description: string;
  image?: string;
  images?: string[];
  address: string;
  area: string;
  category: string;
  rating: number;
  visitorCount: number;
  youtubeQuery?: string;
};

type VisitEntry = {
  place: string;
  visitedAt: string;
};

type RankingItem = {
  place: string;
  score: number;
  live: number;
  isFavorite: boolean;
};

const BASE_HOURLY_WEIGHTS: number[] = [
  0.18, 0.16, 0.14, 0.13, 0.15, 0.32, 0.48, 0.62, 0.72, 0.82, 0.92, 0.98,
  1, 0.98, 0.95, 0.9, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22,
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const POPULAR_PLACES: Place[] = [
  {
    name: "Monas (National Monument)",
    coordinates: [106.827172, -6.175392],
    description:
      "The iconic 132m-tall obelisk independence monument featuring an observation deck and a historical museum.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/af/Jakarta_Indonesia_Bus-stop-Monumen-Nasional-01.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/a/af/Jakarta_Indonesia_Bus-stop-Monumen-Nasional-01.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f3/Jakarta_Panorama.jpg",
    ],
    address: "Gambir, Central Jakarta",
    area: "Central Jakarta",
    category: "Landmark",
    rating: 4.7,
    visitorCount: 1280,
    youtubeQuery: "Monas Jakarta walking tour",
  },
  {
    name: "Kota Tua (Old Town)",
    coordinates: [106.813202, -6.1352],
    description:
      "Jakarta's historic district showcasing Dutch colonial architecture, fascinating museums, and the bustling Fatahillah Square.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/a9/Jakarta_Indonesia_Business-in-Kota-Jakarta-01.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/a/a9/Jakarta_Indonesia_Business-in-Kota-Jakarta-01.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/87/Jakarta_Indonesia_Hawkers-in-Kota-Jakarta-02.jpg",
    ],
    address: "Pinangsia, West Jakarta",
    area: "West Jakarta",
    category: "Historic District",
    rating: 4.5,
    visitorCount: 980,
    youtubeQuery: "Kota Tua Jakarta vlog",
  },
  {
    name: "Istiqlal Mosque",
    coordinates: [106.831315, -6.170166],
    description:
      "The largest mosque in Southeast Asia, renowned for its grand scale and modern Islamic architectural design.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/2/27/Woman_in_Istiqlal_mosque%2C_Jakarta%2C_Indonesia.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/2/27/Woman_in_Istiqlal_mosque%2C_Jakarta%2C_Indonesia.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f3/Jakarta_Panorama.jpg",
    ],
    address: "Gambir, Central Jakarta",
    area: "Central Jakarta",
    category: "Religious Site",
    rating: 4.8,
    visitorCount: 1420,
    youtubeQuery: "Istiqlal Mosque Jakarta tour",
  },
  {
    name: "Jakarta Cathedral",
    coordinates: [106.8338, -6.16951],
    description:
      "A stunning Neo-gothic Roman Catholic cathedral situated directly opposite the Istiqlal Mosque, symbolizing religious harmony.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/9/97/Jakarta_Indonesia_Jakarta-Cathedral-07.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/9/97/Jakarta_Indonesia_Jakarta-Cathedral-07.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f3/Jakarta_Panorama.jpg",
    ],
    address: "Pasar Baru, Central Jakarta",
    area: "Central Jakarta",
    category: "Religious Site",
    rating: 4.7,
    visitorCount: 640,
    youtubeQuery: "Jakarta Cathedral walkthrough",
  },
  {
    name: "Grand Indonesia Mall",
    coordinates: [106.82299, -6.19507],
    description:
      "A premier, expansive shopping mall complex in Central Jakarta, offering a wide array of retail, dining, and entertainment options.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Kempideli_at_Grand_Indonesia.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Kempideli_at_Grand_Indonesia.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/4/4b/Yoshinoya_at_Grand_Indonesia.jpg",
    ],
    address: "MH Thamrin, Central Jakarta",
    area: "Central Jakarta",
    category: "Shopping",
    rating: 4.6,
    visitorCount: 2100,
    youtubeQuery: "Grand Indonesia Mall tour",
  },
  {
    name: "Taman Mini Indonesia Indah (TMII)",
    coordinates: [106.895157, -6.302446],
    description:
      "A unique culture-based recreational park showcasing the diversity of Indonesian provinces in detailed miniature pavilions.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Caping_Gunung_Restaurant%2C_Taman_Mini_Indonesia_Indah.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Caping_Gunung_Restaurant%2C_Taman_Mini_Indonesia_Indah.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/e2/Saudjana_Viewing_Tower%2C_Taman_Mini_Indonesia_Indah%2C_lower_perspective.jpg",
    ],
    address: "East Jakarta",
    area: "East Jakarta",
    category: "Theme Park",
    rating: 4.5,
    visitorCount: 1520,
    youtubeQuery: "Taman Mini Indonesia Indah highlights",
  },
];

const formatHourLabel = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${suffix}`;
};

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatTimeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const buildHourlyProfiles = (places: Place[]) => {
  return places.reduce((acc, place, idx) => {
    const weightJitter = 0.92 + (idx % 5) * 0.02;
    acc[place.name] = BASE_HOURLY_WEIGHTS.map((weight, hour) => {
      const weekendLift = hour >= 10 && hour <= 20 ? 1.05 : 0.95;
      const noise = 0.9 + Math.random() * 0.15;
      const count = Math.round(place.visitorCount * weight * weightJitter * weekendLift * noise);
      return Math.max(70, count);
    });
    return acc;
  }, {} as Record<string, number[]>);
};

const generateLiveSnapshot = (profiles: Record<string, number[]>) => {
  const now = new Date();
  const hour = now.getHours();
  const minuteWave = 0.9 + 0.1 * Math.sin((now.getMinutes() / 60) * Math.PI * 2);

  return POPULAR_PLACES.reduce((acc, place) => {
    const baseline = profiles[place.name]?.[hour] ?? place.visitorCount;
    const jitter = 0.9 + Math.random() * 0.25;
    acc[place.name] = Math.max(50, Math.round(baseline * jitter * minuteWave));
    return acc;
  }, {} as Record<string, number>);
};

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place>(POPULAR_PLACES[0]);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All areas");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const siteUrl = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<VisitEntry[]>([]);
  const [remoteRanking, setRemoteRanking] = useState<RankingItem[]>([]);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const hourlyProfiles = useMemo(
    () => buildHourlyProfiles(POPULAR_PLACES),
    []
  );
  const createLiveSnapshot = useMemo(
    () => () => generateLiveSnapshot(hourlyProfiles),
    [hourlyProfiles]
  );
  const liveVisitorsRef = useRef<Record<string, number>>({});
  const [liveVisitors, setLiveVisitors] = useState<Record<string, number>>(() => {
    const fallback = POPULAR_PLACES.reduce((acc, place) => {
      acc[place.name] = place.visitorCount;
      return acc;
    }, {} as Record<string, number>);
    liveVisitorsRef.current = fallback;
    return fallback;
  });

  const token = useMemo(
    () => process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
    []
  );

  const areaOptions = useMemo(() => {
    const unique = Array.from(new Set(POPULAR_PLACES.map((p) => p.area)));
    return ["All areas", ...unique];
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(POPULAR_PLACES.map((p) => p.category)));
    return ["All categories", ...unique];
  }, []);

  const filteredPlaces = useMemo(() => {
    return POPULAR_PLACES.filter((place) => {
      const matchesSearch =
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.area.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        areaFilter === "All areas" || place.area === areaFilter;
      const matchesCategory =
        categoryFilter === "All categories" ||
        place.category === categoryFilter;
      return matchesSearch && matchesArea && matchesCategory;
    });
  }, [areaFilter, categoryFilter, searchQuery]);

  const fetchFavorites = useCallback(async (client: SupabaseClient, userId: string) => {
    const { data, error } = await client
      .from("favorites")
      .select("place_name")
      .eq("user_id", userId)
      .order("place_name", { ascending: true })
      .limit(100);

    if (error) {
      console.warn("Failed to load favorites", error.message);
      return;
    }

    const next = new Set<string>();
    data?.forEach((row: { place_name: string }) => next.add(row.place_name));
    setFavorites(next);
  }, []);

  const fetchHistory = useCallback(async (client: SupabaseClient, userId: string) => {
    const { data, error } = await client
      .from("visit_history")
      .select("place_name, visited_at")
      .eq("user_id", userId)
      .order("visited_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Failed to load history", error.message);
      return;
    }

    const mapped: VisitEntry[] =
      data?.map((row: { place_name: string; visited_at: string }) => ({
        place: row.place_name,
        visitedAt: row.visited_at,
      })) ?? [];
    setHistory(mapped);
  }, []);

  const fetchRemoteRanking = useCallback(async (client: SupabaseClient) => {
    const { data, error } = await client
      .from("popularity_ranking")
      .select("place_name, score, live_count")
      .order("score", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("Failed to load popularity ranking", error.message);
      return;
    }

    const mapped: RankingItem[] =
      data?.map(
        (row: { place_name: string; score: number; live_count?: number }) => ({
          place: row.place_name,
          score: row.score ?? row.live_count ?? 0,
          live: row.live_count ?? row.score ?? 0,
          isFavorite: favorites.has(row.place_name),
        })
      ) ?? [];
    setRemoteRanking(mapped);
  }, [favorites]);

  const loadUserData = useCallback(async (client: SupabaseClient, userSession: Session) => {
    setUserDataLoading(true);
    await Promise.allSettled([
      fetchFavorites(client, userSession.user.id),
      fetchHistory(client, userSession.user.id),
      fetchRemoteRanking(client),
    ]);
    setUserDataLoading(false);
  }, [fetchFavorites, fetchHistory, fetchRemoteRanking]);

  useEffect(() => {
    if (
      filteredPlaces.length > 0 &&
      !filteredPlaces.find((p) => p.name === selectedPlace.name)
    ) {
      setSelectedPlace(filteredPlaces[0]);
      if (mapRef.current) {
        flyToPlace(mapRef.current, filteredPlaces[0]);
      }
    }
  }, [filteredPlaces, selectedPlace.name]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session) {
        loadUserData(supabase, data.session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          loadUserData(supabase, newSession);
        } else {
          setFavorites(new Set());
          setHistory([]);
          setRemoteRanking([]);
        }
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, [loadUserData, supabase]);

  const getBusyColor = (visitorCount: number) => {
    if (visitorCount >= 1800) return { label: "Very Busy", color: "#dc2626" };
    if (visitorCount >= 1200) return { label: "Busy", color: "#f97316" };
    if (visitorCount >= 800) return { label: "Moderate", color: "#facc15" };
    return { label: "Calm", color: "#22c55e" };
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    if (!supabase) {
      setAuthError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.");
      return;
    }
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    setAuthLoading(true);

    const { data, error } =
      authMode === "signin"
        ? await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          })
        : await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: siteUrl
              ? {
                  emailRedirectTo: `${siteUrl}/`,
                }
              : undefined,
          });

    if (error) {
      setAuthError(error.message);
    } else {
      setSession(data.session ?? null);
      if (data.session) {
        loadUserData(supabase, data.session);
      }
    }

    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setFavorites(new Set());
    setHistory([]);
    setRemoteRanking([]);
  };

  const toggleFavorite = async (place: Place) => {
    const isFav = favorites.has(place.name);
    const optimistic = new Set(favorites);
    if (isFav) {
      optimistic.delete(place.name);
    } else {
      optimistic.add(place.name);
    }
    setFavorites(optimistic);

    if (!supabase || !session) return;

    if (isFav) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("place_name", place.name);
      if (error) {
        console.warn("Failed to remove favorite", error.message);
        const revert = new Set(favorites);
        setFavorites(revert);
      }
    } else {
      const { error } = await supabase.from("favorites").upsert({
        user_id: session.user.id,
        place_name: place.name,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Failed to save favorite", error.message);
        const revert = new Set(favorites);
        revert.delete(place.name);
        setFavorites(revert);
      }
    }
  };

  const recordVisit = useCallback(
    async (placeName: string) => {
      const entry: VisitEntry = {
        place: placeName,
        visitedAt: new Date().toISOString(),
      };

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.place !== placeName);
        return [entry, ...filtered].slice(0, 30);
      });

      if (!supabase || !session) return;

      const { error } = await supabase.from("visit_history").insert({
        user_id: session.user.id,
        place_name: placeName,
        visited_at: entry.visitedAt,
      });

      if (error) {
        console.warn("Failed to write history", error.message);
      }
    },
    [session, supabase]
  );

  const createPolygonAround = (
    [lng, lat]: [number, number],
    size = 0.01
  ): Polygon => {
    return {
      type: "Polygon",
      coordinates: [
        [
          [lng - size, lat - size],
          [lng + size, lat - size],
          [lng + size, lat + size],
          [lng - size, lat + size],
          [lng - size, lat - size],
        ],
      ],
    };
  };

  useEffect(() => {
    recordVisit(selectedPlace.name);
  }, [recordVisit, selectedPlace.name]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!token) {
      setTokenError("Missing Mapbox token. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local and restart dev server.");
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [106.8272, -6.1751],
      zoom: 11.5,
      pitch: 50,
      bearing: -15,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.setFog({});

      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      const layers = map.getStyle().layers;
      const firstSymbolId = layers?.find((l) => l.type === "symbol")?.id;

      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#cfd4dc",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["get", "height"],
                0,
                0,
                200,
                200,
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["get", "min_height"],
                0,
                0,
                200,
                200,
              ],
              "fill-extrusion-opacity": 0.75,
            },
          },
          firstSymbolId
        );
      }

      POPULAR_PLACES.forEach((place) => {
        const marker = new mapboxgl.Marker({ color: "#007cbf" })
          .setLngLat(place.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<h3>${place.name}</h3><p>${place.description.substring(
                0,
                90
              )}...</p>`
            )
          )
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          flyToPlace(map, place);
          setSelectedPlace(place);
        });

        markersRef.current[place.name] = marker;

        const busy = getBusyColor(liveVisitorsRef.current[place.name] ?? place.visitorCount);
        const sourceId = `${place.name}-zone`;
        const layerId = `${place.name}-zone-fill`;
        const outlineId = `${place.name}-zone-outline`;

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: createPolygonAround(place.coordinates, 0.012),
              properties: {
                name: place.name,
              },
            },
          });
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": busy.color,
              "fill-opacity": 0.14,
            },
          });
        }

        if (!map.getLayer(outlineId)) {
          map.addLayer({
            id: outlineId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": busy.color,
              "line-width": 2,
              "line-opacity": 0.7,
            },
          });
        }
      });

      flyToPlace(map, POPULAR_PLACES[0]);

      map.addControl(new mapboxgl.NavigationControl(), "top-left");
      map.addControl(new mapboxgl.FullscreenControl(), "top-left");
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-left"
      );
    });

    map.on("error", (e) => {
      console.error("MAPBOX MAP ERROR:", e);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    liveVisitorsRef.current = liveVisitors;
  }, [liveVisitors]);

  useEffect(() => {
    const initialSnapshot = createLiveSnapshot();
    liveVisitorsRef.current = initialSnapshot;
    setLiveVisitors(initialSnapshot);

    const interval = setInterval(() => {
      const snapshot = createLiveSnapshot();
      liveVisitorsRef.current = snapshot;
      setLiveVisitors(snapshot);
    }, 15000);

    return () => clearInterval(interval);
  }, [createLiveSnapshot]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    POPULAR_PLACES.forEach((place) => {
      const liveCount = liveVisitors[place.name] ?? place.visitorCount;
      const busy = getBusyColor(liveCount);
      const fillId = `${place.name}-zone-fill`;
      const outlineId = `${place.name}-zone-outline`;

      if (map.getLayer(fillId)) {
        map.setPaintProperty(fillId, "fill-color", busy.color);
      }

      if (map.getLayer(outlineId)) {
        map.setPaintProperty(outlineId, "line-color", busy.color);
      }
    });
  }, [liveVisitors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    POPULAR_PLACES.forEach((place) => {
      const fillId = `${place.name}-zone-fill`;
      const outlineId = `${place.name}-zone-outline`;
      const favorite = favorites.has(place.name);

      if (map.getLayer(outlineId)) {
        map.setPaintProperty(outlineId, "line-width", favorite ? 3.5 : 2);
        map.setPaintProperty(outlineId, "line-opacity", favorite ? 0.95 : 0.7);
      }

      if (map.getLayer(fillId)) {
        map.setPaintProperty(fillId, "fill-opacity", favorite ? 0.2 : 0.14);
      }
    });
  }, [favorites]);

  const flyToPlace = (map: mapboxgl.Map, place: Place) => {
    map.flyTo({
      center: place.coordinates,
      zoom: 15.5,
      pitch: 60,
      bearing: map.getBearing(),
      speed: 0.7,
      essential: true,
    });
  };

  const handleSelect = (place: Place) => {
    setSelectedPlace(place);
    if (mapRef.current) {
      flyToPlace(mapRef.current, place);
    }
  };

  useEffect(() => {
    const markerKeys = Object.keys(markersRef.current);
    markerKeys.forEach((name) => {
      const marker = markersRef.current[name];
      if (!marker) return;
      const isVisible = filteredPlaces.some((p) => p.name === name);
      marker.getElement().style.display = isVisible ? "block" : "none";
    });
  }, [filteredPlaces]);

  const renderPhotos = (place: Place) => {
    if (place.images && place.images.length > 0) {
      return (
        <div className="photo-grid">
          {place.images.map((url) => (
            <img key={url} src={url} alt={place.name} />
          ))}
        </div>
      );
    }

    if (place.image) {
      return <img src={place.image} alt={place.name} />;
    }

    return null;
  };

  const liveCount = liveVisitors[selectedPlace.name] ?? selectedPlace.visitorCount;
  const busyNow = getBusyColor(liveCount);
  const hourlySeries = hourlyProfiles[selectedPlace.name] || [];
  const nowHour = new Date().getHours();
  const maxHourly = Math.max(...hourlySeries, liveCount, 1);
  const computedRanking = useMemo<RankingItem[]>(() => {
    return POPULAR_PLACES.map((place) => {
      const live = liveVisitors[place.name] ?? place.visitorCount;
      const isFavorite = favorites.has(place.name);
      return {
        place: place.name,
        live,
        score: live + (isFavorite ? 120 : 0),
        isFavorite,
      };
    }).sort((a, b) => b.score - a.score);
  }, [favorites, liveVisitors]);
  const popularityRanking = useMemo<RankingItem[]>(() => {
    const source = remoteRanking.length > 0 ? remoteRanking : computedRanking;
    return source.map((item) => ({
      ...item,
      isFavorite: favorites.has(item.place),
    }));
  }, [computedRanking, favorites, remoteRanking]);
  const favoriteList = useMemo(() => Array.from(favorites), [favorites]);
  const recentHistory = useMemo(() => history.slice(0, 8), [history]);

  return (
    <div className="page">
      <div ref={mapContainerRef} className="map" />
      <aside className="info-panel">
        <header className="info-header">
          <p className="eyebrow">Jakarta</p>
          <h1>3D Tourist Spots</h1>
          <p className="lede">
            Explore Jakarta&apos;s landmarks with 3D terrain, interactive
            fly-to, and photo highlights.
          </p>
        </header>
        {tokenError ? (
          <div className="alert">
            <strong>Token needed:</strong> {tokenError}
          </div>
        ) : null}
        <div className="filters">
          <input
            type="search"
            placeholder="Search places or areas"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="filter-row">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="legend">
            {[
              { label: "Calm", color: "#22c55e" },
              { label: "Moderate", color: "#facc15" },
              { label: "Busy", color: "#f97316" },
              { label: "Very Busy", color: "#dc2626" },
            ].map((item) => (
              <span key={item.label} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-head">
            <div>
              <p className="eyebrow small">Account</p>
              <p className="auth-title">
                {session
                  ? `Signed in as ${session.user.email}`
                  : "Sign in to save favorites, history, and rankings"}
              </p>
            </div>
            {session ? (
              <button className="ghost-btn" onClick={handleSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
          {!supabase ? (
            <p className="muted">
              Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
              in `.env.local` to enable Supabase auth.
            </p>
          ) : session ? (
            <div className="auth-summary">
              <span className="badge muted">
                Synced favorites & history {userDataLoading ? "…" : ""}
              </span>
            </div>
          ) : (
            <div className="auth-fields">
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              {authError ? <p className="auth-error">{authError}</p> : null}
              <div className="auth-actions">
                <button className="primary-btn" onClick={handleAuthSubmit} disabled={authLoading}>
                  {authLoading
                    ? "Working..."
                    : authMode === "signin"
                    ? "Sign in"
                    : "Create account"}
                </button>
                <button
                  className="ghost-btn"
                  onClick={() =>
                    setAuthMode((mode) => (mode === "signin" ? "signup" : "signin"))
                  }
                >
                  {authMode === "signin"
                    ? "Need an account? Sign up"
                    : "Have an account? Sign in"}
                </button>
              </div>
            </div>
          )}
        </div>
        <ul className="place-list">
          {filteredPlaces.length === 0 ? (
            <li className="empty">No places match your search.</li>
          ) : (
            filteredPlaces.map((place) => (
              <li
                key={place.name}
                className={
                  selectedPlace.name === place.name ? "active" : undefined
                }
                onClick={() => handleSelect(place)}
              >
                <div className="place-meta">
                  <span className="place-name">{place.name}</span>
                  <span className="meta-line">{place.area}</span>
                </div>
                <div className="place-meta-right">
                  <span className="badge">{place.category}</span>
                  <span className="chevron">›</span>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="place-details">
          <h3>{selectedPlace.name}</h3>
          <p className="muted">{selectedPlace.address}</p>
          <p>{selectedPlace.description}</p>
          <div className="live-row">
            <span
              className="live-dot"
              style={{
                backgroundColor: busyNow.color,
                boxShadow: `0 0 0 8px ${busyNow.color}22`,
              }}
            />
            <div className="live-copy">
              <span className="live-title">Live visitors</span>
              <span className="live-value">
                {formatNumber(liveCount)} people now · {busyNow.label}
              </span>
              <span className="live-subtitle">
                Refreshed every 15s using live activity signal
              </span>
            </div>
          </div>
          <div className="stats">
            <span className="badge muted">
              {selectedPlace.area} · {selectedPlace.category}
            </span>
            <span className="badge">
              ⭐ {selectedPlace.rating.toFixed(1)} rating
            </span>
            <span
              className="badge"
              style={{
                background: busyNow.color,
                color: "#0f172a",
              }}
            >
              {busyNow.label} now · {formatNumber(liveCount)} visitors
            </span>
          </div>
          <button
            className={`favorite-btn${favorites.has(selectedPlace.name) ? " active" : ""}`}
            onClick={() => toggleFavorite(selectedPlace)}
            disabled={!supabase}
            title={supabase ? "Save this place to your Supabase favorites" : "Add Supabase env keys to enable sync"}
          >
            {favorites.has(selectedPlace.name) ? "★ Favorited" : "☆ Add to favorites"}
          </button>
          {!supabase ? (
            <p className="muted small">
              Favorites & history are stored when Supabase keys are configured.
            </p>
          ) : null}
          <div className="popular-times">
            <div className="popular-times-header">
              <span>Hourly visitors (local time)</span>
              <span className="muted">Live-based hourly estimate</span>
            </div>
            <div className="popular-grid">
              {hourlySeries.map((count, hour) => {
                const isNow = hour === nowHour;
                const value = isNow ? liveCount : count;
                const busy = getBusyColor(value);
                const barHeight = Math.max(8, Math.round((value / maxHourly) * 82));

                return (
                  <div key={hour} className={`popular-bar${isNow ? " now" : ""}`}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${barHeight}px`,
                          background: busy.color,
                        }}
                      />
                    </div>
                    <span className="bar-label">{formatHourLabel(hour)}</span>
                    <span className="bar-value">{formatNumber(value)}</span>
                    {isNow ? <span className="bar-now">Now</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
          {renderPhotos(selectedPlace)}
          {selectedPlace.youtubeQuery ? (
            <div className="video">
              <iframe
                src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
                  selectedPlace.youtubeQuery
                )}`}
                title={`YouTube: ${selectedPlace.youtubeQuery}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
        <div className="dashboard">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow small">Dashboard</p>
              <h4>Favorites, history, and popularity</h4>
            </div>
            {userDataLoading ? <span className="badge muted">Syncing…</span> : null}
          </div>
          <div className="dashboard-grid">
            <div className="dash-card">
              <div className="dash-card-head">
                <span>Favorites</span>
                <span className="badge">{favoriteList.length}</span>
              </div>
              {favoriteList.length === 0 ? (
                <p className="muted small">No favorites yet.</p>
              ) : (
                <ul className="mini-list">
                  {favoriteList.map((name) => (
                    <li key={name}>
                      <span>{name}</span>
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          const place = POPULAR_PLACES.find((p) => p.name === name);
                          if (place) handleSelect(place);
                        }}
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="dash-card">
              <div className="dash-card-head">
                <span>Recent history</span>
                <span className="badge">{recentHistory.length}</span>
              </div>
              {recentHistory.length === 0 ? (
                <p className="muted small">You have not viewed any places yet.</p>
              ) : (
                <ul className="mini-list">
                  {recentHistory.map((item) => (
                    <li key={`${item.place}-${item.visitedAt}`}>
                      <div>
                        <strong>{item.place}</strong>
                        <span className="muted small"> · {formatTimeAgo(item.visitedAt)}</span>
                      </div>
                      <button
                        className="ghost-btn"
                        onClick={() => {
                          const place = POPULAR_PLACES.find((p) => p.name === item.place);
                          if (place) handleSelect(place);
                        }}
                      >
                        Revisit
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="dash-card">
              <div className="dash-card-head">
                <span>Popularity ranking</span>
                <span className="badge">Top {Math.min(popularityRanking.length, 5)}</span>
              </div>
              <ul className="mini-list">
                {popularityRanking.slice(0, 5).map((item, idx) => (
                  <li key={item.place}>
                    <div className="ranking-row">
                      <span className="rank-index">#{idx + 1}</span>
                      <div className="ranking-copy">
                        <strong>{item.place}</strong>
                        <span className="muted small">
                          {formatNumber(item.live)} live · score {formatNumber(item.score)}
                          {item.isFavorite ? " · ★" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      className="ghost-btn"
                      onClick={() => {
                        const place = POPULAR_PLACES.find((p) => p.name === item.place);
                        if (place) handleSelect(place);
                      }}
                    >
                      Fly
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
