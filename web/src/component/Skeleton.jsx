import React from "react";

export default function Skeleton({ width, height, borderRadius = "8px", style }) {
  return (
    <div 
      className="skeleton-loader" 
      style={{ width, height, borderRadius, ...style }} 
    />
  );
}