import React from "react";

export default function Sparkline({ points = [], width = 320, height = 80, padding = 6 }) {
  if (!points.length) return <svg width={width} height={height} />;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (x) => {
    if (maxX === minX) return padding;
    return padding + (x - minX) * (width - 2*padding) / (maxX - minX);
  };
  const sy = (y) => {
    if (maxY === minY) return height - padding;
    return height - padding - (y - minY) * (height - 2*padding) / (maxY - minY);
  };
  const d = points.map((p,i)=> `${i?'L':'M'} ${sx(p.x)} ${sy(p.y)}`).join(" ");
  const last = points[points.length-1];
  return (
    <svg width={width} height={height}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx={sx(last.x)} cy={sy(last.y)} r="3" />
    </svg>
  );
}
