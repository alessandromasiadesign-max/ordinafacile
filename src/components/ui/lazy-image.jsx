import React, { useState } from "react";
import { motion } from "framer-motion";

export default function LazyImage({ src, alt, className, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center`}>
        <span className="text-gray-400 text-sm">🖼️</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={`${className} bg-gray-200 animate-pulse`}></div>
      )}
      <motion.img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: loaded ? 'block' : 'none' }}
        {...props}
      />
    </>
  );
}