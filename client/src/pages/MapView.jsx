import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useList } from "@/api/hooks.js";
import { Card, CardContent, Spinner } from "@/components/ui/index.jsx";

// Plots every site with coordinates on an OpenStreetMap layer, colored by danger status.
export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const { data: sites, isLoading } = useList("sites", { page: 1, limit: 200, sort: "s_id", order: "asc" });
  const { data: dangerSites } = useList("danger-sites", { page: 1, limit: 200, sort: "s_id", order: "asc" });

  const dangerIds = useMemo(
    () => new Set((dangerSites?.data || []).map((d) => d.s_id)),
    [dangerSites]
  );

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // (Re)draw markers whenever the data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sites) return;
    // The container may have been hidden while loading; ensure the map fills it.
    map.invalidateSize();
    if (layerRef.current) layerRef.current.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    for (const site of sites.data) {
      if (site.latitude == null || site.longitude == null) continue;
      const inDanger = dangerIds.has(site.s_id);
      const color = inDanger ? "#dc2626" : "#0284c7";
      L.circleMarker([site.latitude, site.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 2,
      })
        .bindPopup(
          `<strong>${site.site_name || "Unnamed"}</strong><br/>${site.category || ""}` +
            (inDanger ? '<br/><span style="color:#dc2626">⚠ In danger</span>' : "")
        )
        .addTo(group);
    }
  }, [sites, dangerIds]);

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Map</h1>
        <p className="text-muted-foreground mt-1">
          Heritage sites plotted by coordinates.
          <span className="inline-flex items-center gap-1 ml-2"><span className="inline-block h-3 w-3 rounded-full bg-sky-600" /> normal</span>
          <span className="inline-flex items-center gap-1 ml-2"><span className="inline-block h-3 w-3 rounded-full bg-red-600" /> in danger</span>
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
          )}
          <div ref={containerRef} className="h-[560px] w-full rounded-lg" style={{ display: isLoading ? "none" : "block" }} />
        </CardContent>
      </Card>
    </div>
  );
}
