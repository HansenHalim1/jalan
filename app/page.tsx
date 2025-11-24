"use client";

import type { Polygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place>(POPULAR_PLACES[0]);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("All areas");
  const [categoryFilter, setCategoryFilter] = useState("All categories");

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

  const getBusyColor = (visitorCount: number) => {
    if (visitorCount >= 1800) return { label: "Very Busy", color: "#dc2626" };
    if (visitorCount >= 1200) return { label: "Busy", color: "#f97316" };
    if (visitorCount >= 800) return { label: "Moderate", color: "#facc15" };
    return { label: "Calm", color: "#22c55e" };
  };

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

        const busy = getBusyColor(place.visitorCount);
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
                background: getBusyColor(selectedPlace.visitorCount).color,
                color: "#0f172a",
              }}
            >
              {getBusyColor(selectedPlace.visitorCount).label} now
            </span>
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
      </aside>
    </div>
  );
}
