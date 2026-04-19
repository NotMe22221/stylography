import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { Icon, Btn, Spinner, Wordmark } from './primitives.jsx';

// Leaflet CSS is loaded dynamically to avoid SSR issues
let leafletLoaded = false;

function loadLeafletCSS() {
  if (leafletLoaded) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  leafletLoaded = true;
}

// ─── Store Map Screen ─────────────────────────────────────────────────────────

export default function StoreMap({ push, allItems }) {
  const [stores, setStores]         = useState([]);
  const [userPos, setUserPos]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [selectedStore, setSelected] = useState(null);
  const [mapReady, setMapReady]     = useState(false);
  const mapRef                      = useRef(null);
  const mapContainerRef             = useRef(null);
  const markersRef                  = useRef([]);

  // Load Leaflet CSS
  useEffect(() => { loadLeafletCSS(); }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          // Default to Minneapolis (Jessica's store area)
          setUserPos({ lat: 44.9778, lng: -93.2650 });
        },
        { timeout: 5000 }
      );
    } else {
      setUserPos({ lat: 44.9778, lng: -93.2650 });
    }
  }, []);

  // Load stores from Firestore
  useEffect(() => {
    getDocs(query(collection(db, 'stores'), where('onboarded', '==', true)))
      .then(snap => {
        const storeList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStores(storeList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Initialize map once we have position
  useEffect(() => {
    if (!userPos || !mapContainerRef.current || mapReady) return;

    import('leaflet').then((L) => {
      // Fix default marker icons (Leaflet + bundlers issue)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current).setView([userPos.lat, userPos.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:var(--aubergine-600);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: '',
      });
      L.marker([userPos.lat, userPos.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('You are here');

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, [userPos]);

  // Add store markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    import('leaflet').then((L) => {
      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // For stores without coordinates, generate nearby positions for demo
      const storesWithPos = stores.map((store, i) => {
        if (store.lat && store.lng) return store;
        // Spread stores around user position for demo
        const angle = (i / Math.max(stores.length, 1)) * 2 * Math.PI;
        const dist = 0.01 + Math.random() * 0.03;
        return {
          ...store,
          lat: (userPos?.lat || 44.9778) + Math.cos(angle) * dist,
          lng: (userPos?.lng || -93.2650) + Math.sin(angle) * dist,
        };
      });

      const storeIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#5B4D7A;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px">🏪</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
      });

      storesWithPos.forEach(store => {
        const marker = L.marker([store.lat, store.lng], { icon: storeIcon })
          .addTo(mapRef.current)
          .on('click', () => setSelected(store));
        markersRef.current.push(marker);
      });

      // Fit bounds if we have stores
      if (storesWithPos.length > 0 && userPos) {
        const allPoints = [
          [userPos.lat, userPos.lng],
          ...storesWithPos.map(s => [s.lat, s.lng]),
        ];
        mapRef.current.fitBounds(allPoints, { padding: [50, 50], maxZoom: 14 });
      }
    });
  }, [mapReady, stores, userPos]);

  // Count items per store
  const itemCountByStore = {};
  allItems.forEach(item => {
    const sid = item.storeId || item.store;
    if (sid) itemCountByStore[sid] = (itemCountByStore[sid] || 0) + 1;
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      {/* Header */}
      <div style={{
        padding: '56px 20px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        zIndex: 10,
      }}>
        <button onClick={() => push('feed')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Icon name="arrow-left" size={20} color="var(--ink-900)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Stores near you</h1>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
            {stores.length} {stores.length === 1 ? 'store' : 'stores'} on Stylography
          </div>
        </div>
        <button
          onClick={() => {
            if (mapRef.current && userPos) {
              mapRef.current.setView([userPos.lat, userPos.lng], 13, { animate: true });
            }
          }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--aubergine-100)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Icon name="pin" size={16} color="var(--aubergine-600)" />
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--cream-50)',
          }}>
            <Spinner size={32} />
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Selected store card */}
      {selectedStore && (
        <div style={{
          position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
          padding: 16, borderRadius: 16,
          background: 'var(--surface)', border: '1px solid var(--line)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--cream-100)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Icon name="close" size={12} color="var(--ink-500)" />
          </button>

          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: selectedStore.color || '#5B4D7A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, flexShrink: 0, overflow: 'hidden',
            }}>
              {selectedStore.heroImageUrl
                ? <img src={selectedStore.heroImageUrl} style={{ width: 56, height: 56, objectFit: 'cover' }} alt="" />
                : selectedStore.emoji || '🏪'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}>
                {selectedStore.name || 'Store'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2, textTransform: 'capitalize' }}>
                {selectedStore.type || 'Vintage'}{selectedStore.city ? ` · ${selectedStore.city}` : ''}
              </div>
              {selectedStore.bio && (
                <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {selectedStore.bio}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn variant="accent" size="sm" onClick={() => push('store', { store: selectedStore })}>
                  View store
                </Btn>
                <span style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--cream-100)', fontSize: 11, fontWeight: 600,
                  color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Icon name="grid" size={11} color="var(--ink-500)" />
                  {itemCountByStore[selectedStore.id] || 0} items
                </span>
                {selectedStore.fulfillment?.pickup && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: 'var(--sage-200)', fontSize: 11, fontWeight: 600,
                    color: '#2E3A2E',
                  }}>
                    Pickup
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
