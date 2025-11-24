"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type Place = {
  name: string;
  coordinates: [number, number];
  description: string;
  image?: string;
};

const POPULAR_PLACES: Place[] = [
  {
    name: "Monas (National Monument)",
    coordinates: [106.827172, -6.175392],
    description:
      "The iconic 132m-tall obelisk independence monument featuring an observation deck and a historical museum.",
    image:
      "https://img.freepik.com/free-photo/monas-national-monument-jakarta-indonesia_1203-5403.jpg?w=996&t=st=1715245839~exp=1715246439~hmac=079b76159769038a833f6993f685fdf879041105280e0d1e324bb88d3e878b31",
  },
  {
    name: "Kota Tua (Old Town)",
    coordinates: [106.813202, -6.1352],
    description:
      "Jakarta's historic district showcasing Dutch colonial architecture, fascinating museums, and the bustling Fatahillah Square.",
    image:
      "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0d/99/59/08/fatahillah-square.jpg?w=1200&h=-1&s=1",
  },
  {
    name: "Istiqlal Mosque",
    coordinates: [106.831315, -6.170166],
    description:
      "The largest mosque in Southeast Asia, renowned for its grand scale and modern Islamic architectural design.",
    image:
      "https://media.istockphoto.com/id/508085408/photo/istiqlal-mosque-in-jakarta-indonesia.jpg?s=612x612&w=0&k=20&c=2A9yB6g7qZl96_273X2K1F46CIg0psx3MAlvMh7E9cE=",
  },
  {
    name: "Jakarta Cathedral",
    coordinates: [106.8338, -6.16951],
    description:
      "A stunning Neo-gothic Roman Catholic cathedral situated directly opposite the Istiqlal Mosque, symbolizing religious harmony.",
    image:
      "https://media.cntraveler.com/photos/5b914c77093178457c11a978/master/w_1920,c_limit/Jakarta-Cathedral_GettyImages-505077674.jpg",
  },
  {
    name: "Grand Indonesia Mall",
    coordinates: [106.82299, -6.19507],
    description:
      "A premier, expansive shopping mall complex in Central Jakarta, offering a wide array of retail, dining, and entertainment options.",
    image:
      "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0d/7e/a0/9c/grand-indonesia-mall.jpg?w=1200&h=-1&s=1",
  },
  {
    name: "Taman Mini Indonesia Indah (TMII)",
    coordinates: [106.895157, -6.302446],
    description:
      "A unique culture-based recreational park showcasing the diversity of Indonesian provinces in detailed miniature pavilions.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Taman_Mini_Indonesia_Indah_aerial_view.jpg/1024px-Taman_Mini_Indonesia_Indah_aerial_view.jpg",
  },
];

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place>(POPULAR_PLACES[0]);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const token = useMemo(
    () => process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
    []
  );

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
        <ul className="place-list">
          {POPULAR_PLACES.map((place) => (
            <li
              key={place.name}
              className={
                selectedPlace.name === place.name ? "active" : undefined
              }
              onClick={() => handleSelect(place)}
            >
              <span className="place-name">{place.name}</span>
              <span className="chevron">›</span>
            </li>
          ))}
        </ul>
        <div className="place-details">
          <h3>{selectedPlace.name}</h3>
          <p>{selectedPlace.description}</p>
          {selectedPlace.image ? (
            <img src={selectedPlace.image} alt={selectedPlace.name} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
