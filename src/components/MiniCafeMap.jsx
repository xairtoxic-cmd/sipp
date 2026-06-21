"use client";

import { useEffect, useRef } from "react";

// Lightweight Leaflet map that plots a set of cafés as coloured pins.
// points: [{ id, lat, lng, color }]
export default function MiniCafeMap({ points = [], onPick, height = 240 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current, { zoomControl: false, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      mapRef.current = { L, map };
      render();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  function render() {
    const ctx = mapRef.current;
    if (!ctx) return;
    const { L, map } = ctx;
    if (ctx.layer) map.removeLayer(ctx.layer);
    const group = L.layerGroup().addTo(map);
    ctx.layer = group;
    if (!points.length) {
      map.setView([25.165, 55.24], 11);
      return;
    }
    const latlngs = [];
    points.forEach((p) => {
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${p.color};border:2px solid #FFFBF4;box-shadow:0 2px 6px rgba(43,33,24,.4)"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(group);
      if (onPick) m.on("click", () => onPick(p.id));
      latlngs.push([p.lat, p.lng]);
    });
    if (latlngs.length === 1) map.setView(latlngs[0], 13);
    else map.fitBounds(latlngs, { padding: [30, 30] });
  }

  return <div ref={elRef} style={{ height }} className="w-full overflow-hidden rounded-xl2 border border-line" />;
}
