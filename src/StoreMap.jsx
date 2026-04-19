import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { Icon, Btn, Spinner } from './primitives.jsx';

const DEFAULT_POS = { lat: 44.9778, lng: -93.2650 }; // Minneapolis

export default function StoreMap({ push, allItems }) {
  const [stores, setStores]         = useState([]);
  const [userPos, setUserPos]       = useState(DEFAULT_POS);
  const [loading, setLoading]       = useState(true);
  const [selectedStore, setSelected] = useState(null);
  const [mapReady, setMapReady]     = useState(false);
  const mapContainerRef             = useRef(null);
  const mapInstanceRef              = useRef(null);
  const userMarkerRef               = useRef(null);
  const storeMarkersRef             = useRef([]);
  const leafletRef                  = useRef(null);

  // Load stores from Firestore
  useEffect(() => {
    getDocs(query(collection(db, 'stores'), where('onboarded', '==', true)))
      .then(snap => {
        setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Initialize map IMMEDIATELY on mount (don't wait for geolocation)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Inject Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      leafletRef.current = L;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, { zoomControl: true })
        .setView([DEFAULT_POS.lat, DEFAULT_POS.lng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userMarker = L.circleMarker([DEFAULT_POS.lat, DEFAULT_POS.lng], {
        radius: 8, fillColor: '#5B4D7A', fillOpacity: 1,
        color: '#fff', weight: 3,
      }).addTo(map).bindPopup('You are here');

      userMarkerRef.current = userMarker;
      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Request geolocation in background, update map when it resolves
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(newPos);

        if (mapInstanceRef.current && userMarkerRef.current) {
          userMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
          mapInstanceRef.current.setView([newPos.lat, newPos.lng], 13, { animate: true });
        }
      },
      () => { /* keep default position */ },
      { timeout: 8000 }
    );
  }, []);

  // Global handler for popup "View store" button clicks
  useEffect(() => {
    window.__selectStore = (storeId) => {
      const store = stores.find(s => s.id === storeId);
      if (store) setSelected(store);
    };
    return () => { delete window.__selectStore; };
  }, [stores]);

  // Add store markers when map is ready and stores are loaded
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !leafletRef.current || loading) return;

    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Clear old markers
    storeMarkersRef.current.forEach(m => m.remove());
    storeMarkersRef.current = [];

    // Give stores demo positions if they don't have real coordinates
    const storesWithPos = stores.map((store, i) => {
      if (store.lat && store.lng) return store;
      const angle = (i / Math.max(stores.length, 1)) * 2 * Math.PI;
      const dist = 0.012 + Math.random() * 0.025;
      return {
        ...store,
        lat: userPos.lat + Math.cos(angle) * dist,
        lng: userPos.lng + Math.sin(angle) * dist,
      };
    });

    const storeMarkerIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const bounds = [[userPos.lat, userPos.lng]];

    storesWithPos.forEach(store => {
      bounds.push([store.lat, store.lng]);

      const popupHtml = `
        <div style="min-width:140px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${store.emoji || '🏪'} ${store.name || 'Store'}</div>
          <div style="font-size:12px;color:#666;text-transform:capitalize;margin-bottom:8px">${store.type || 'Vintage'}${store.city ? ' · ' + store.city : ''}</div>
          <button onclick="window.__selectStore('${store.id}')" style="padding:6px 14px;border-radius:8px;background:#5B4D7A;color:#fff;font-size:12px;font-weight:700;cursor:pointer;border:none">View store</button>
        </div>
      `;

      const marker = L.marker([store.lat, store.lng], { icon: storeMarkerIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      storeMarkersRef.current.push(marker);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [mapReady, stores, loading, userPos]);

  // Count items per store
  const itemCountByStore = {};
  allItems.forEach(item => {
    const sid = item.storeId || item.store;
    if (sid) itemCountByStore[sid] = (itemCountByStore[sid] || 0) + 1;
  });

  // Stores with positions for the list
  const storesForList = stores.map((store, i) => {
    if (store.lat && store.lng) return store;
    const angle = (i / Math.max(stores.length, 1)) * 2 * Math.PI;
    const dist = 0.012 + Math.random() * 0.025;
    return {
      ...store,
      lat: userPos.lat + Math.cos(angle) * dist,
      lng: userPos.lng + Math.sin(angle) * dist,
    };
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      {/* Header */}
      <div style={{
        padding: '56px 20px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', borderBottom: '1px solid var(--line)',
        zIndex: 10, flexShrink: 0,
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
            if (mapInstanceRef.current && userPos) {
              mapInstanceRef.current.setView([userPos.lat, userPos.lng], 13, { animate: true });
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
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Store list below map */}
      {stores.length > 0 && (
        <div style={{
          flexShrink: 0, maxHeight: '35vh', overflowY: 'auto',
          borderTop: '1px solid var(--line)', background: 'var(--surface)',
        }}>
          <div style={{ padding: '12px 16px 6px', fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            All stores
          </div>
          {storesForList.map(store => (
            <button
              key={store.id}
              onClick={() => {
                setSelected(store);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([store.lat, store.lng], 15, { animate: true });
                }
              }}
              style={{
                width: '100%', padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid var(--line)',
                background: selectedStore?.id === store.id ? 'var(--aubergine-100)' : 'transparent',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: store.color || '#5B4D7A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0, overflow: 'hidden',
              }}>
                {store.heroImageUrl
                  ? <img src={store.heroImageUrl} style={{ width: 44, height: 44, objectFit: 'cover' }} alt="" />
                  : store.emoji || '🏪'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{store.name || 'Store'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', textTransform: 'capitalize' }}>
                  {store.type || 'Vintage'}{store.city ? ` · ${store.city}` : ''} · {itemCountByStore[store.id] || 0} items
                </div>
              </div>
              <Icon name="arrow-right" size={14} color="var(--ink-400)" />
            </button>
          ))}
        </div>
      )}

      {/* Selected store detail card */}
      {selectedStore && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          padding: '16px 16px 32px', borderRadius: '16px 16px 0 0',
          background: 'var(--surface)', border: '1px solid var(--line)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              position: 'absolute', top: 12, right: 12,
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
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Btn variant="accent" size="sm" onClick={() => push('store', { store: selectedStore })}>
                  View store
                </Btn>
                <span style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--cream-100)', fontSize: 11, fontWeight: 600,
                  color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {itemCountByStore[selectedStore.id] || 0} items
                </span>
                {selectedStore.fulfillment?.pickup && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: 'var(--sage-200)', fontSize: 11, fontWeight: 600,
                    color: '#2E3A2E',
                  }}>
                    Pickup available
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
