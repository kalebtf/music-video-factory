import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function getToken() {
  return localStorage.getItem('access_token');
}

// Fetch authenticated media using fetch() (not axios) to avoid XHR blob responseType errors
async function fetchAuthMedia(apiPath) {
  const token = getToken();
  const url = `${API_BASE}/api/${apiPath}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function AuthImage({ src, alt, className, style, onLoad, onError }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    if (!src) {
      setLoading(false);
      return;
    }

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      setLoading(false);
      return;
    }

    const isApiPath = src.includes('/api/');

    if (isApiPath) {
      const apiPathMatch = src.match(/\/api\/(.*)/);
      if (!apiPathMatch) {
        setBlobUrl(src);
        setLoading(false);
        return;
      }

      fetchAuthMedia(apiPathMatch[1])
        .then((url) => {
          if (!cancelled) {
            objectUrl = url;
            setBlobUrl(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
            if (onError) onError();
          }
        });
    } else {
      setBlobUrl(src);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, onError]);

  if (loading) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' }}>
        <div className="w-6 h-6 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' }}>
        <span className="text-[#8b8b99] text-xs">Failed to load</span>
      </div>
    );
  }

  return <img src={blobUrl} alt={alt || ''} className={className} style={style} onLoad={onLoad} />;
}

export function AuthVideo({ src, className, controls, playsInline, autoPlay, muted, loop }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    if (!src) {
      setLoading(false);
      return;
    }

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      setLoading(false);
      return;
    }

    const isApiPath = src.includes('/api/');

    if (isApiPath) {
      const apiPathMatch = src.match(/\/api\/(.*)/);
      if (!apiPathMatch) {
        setBlobUrl(src);
        setLoading(false);
        return;
      }

      fetchAuthMedia(apiPathMatch[1])
        .then((url) => {
          if (!cancelled) {
            objectUrl = url;
            setBlobUrl(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setBlobUrl(src);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (loading) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c0c0f' }}>
        <div className="w-6 h-6 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c0c0f' }}>
        <span className="text-[#8b8b99] text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <video
      src={blobUrl}
      className={className}
      controls={controls}
      playsInline={playsInline}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
    />
  );
}

export default AuthImage;
