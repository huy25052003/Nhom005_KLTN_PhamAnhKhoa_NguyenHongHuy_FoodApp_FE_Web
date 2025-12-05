import React, { useState } from "react";

export default function LazyImage({ src, alt, className, style, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div 
      className={className} 
      style={{ ...style, position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}
      onClick={onClick}
    >
      {/* Skeleton Loading */}
      {!loaded && !error && (
        <div className="loading" style={{ 
            position: 'absolute', inset: 0, margin: 'auto', 
            width: '100%', height: '100%', borderRadius: 'inherit',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s infinite'
        }} />
      )}
      
      <img
        src={error ? "/placeholder.jpg" : src}
        alt={alt}
        style={{ 
           width: '100%', 
           height: '100%', 
           objectFit: 'cover',       // Vẫn giữ cover để không bị méo ảnh
           objectPosition: 'center', // THÊM: Căn giữa ảnh
           opacity: loaded ? 1 : 0, 
           transition: 'opacity 0.4s ease-in-out',
           display: 'block'
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      <style>{`
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}