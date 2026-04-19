import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from './firebase.js';
import { tagGarment, generateOutfitFromPieces, generateOutfitImage, generateVisualDescription } from './gemini.js';
import { indexItem } from './vectorSearch.js';
import { Wordmark, Btn, Icon, Dot, Field, Spinner, inputStyle } from './primitives.jsx';
import { GarmentSVG } from './garments.jsx';
import { ITEMS } from './data.jsx'; // fallback for demo data
import DashboardGuide from './DashboardGuide.jsx';

// ─── Main shell ───────────────────────────────────────────────────────────────

export default function StoreOwnerApp({ user }) {
  const [screen, setScreen] = useState('dashboard');
  const [store,  setStore]  = useState(null);
  const [items,  setItems]  = useState([]);
  const [claims, setClaims] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  /** Increment when reopening the tour so DashboardGuide remounts (fresh mode picker + steps) */
  const [guideSession, setGuideSession] = useState(0);

  // Load store profile
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'stores', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setStore({ id: snap.id, ...data });
        // First-time / never completed: show the walkthrough once automatically
        setShowGuide(data.guideTourCompleted !== true);
      }
      setLoading(false);
    });
  }, [user]);

  // Live listener for items
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'items'), where('storeId', '==', user.uid), where('status', '!=', 'deleted'));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // Live listener for claims
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'claims'), where('storeId', '==', user.uid));
    return onSnapshot(q, snap => {
      const nextClaims = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      nextClaims.sort((a, b) => {
        const aTs = a?.createdAt?.toMillis?.() || a?.updatedAt?.toMillis?.() || 0;
        const bTs = b?.createdAt?.toMillis?.() || b?.updatedAt?.toMillis?.() || 0;
        return bTs - aTs;
      });
      setClaims(nextClaims);
    });
  }, [user]);

  // Live listener for analytics events (capped at 2000 for MVP — BigQuery at scale)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'events'), where('storeId', '==', user.uid), limit(2000));
    return onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    );
  }

  const pendingClaimsCount = claims.filter(c => c.status === 'pending').length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--cream-50)' }}>
      <OwnerSidebar screen={screen} setScreen={setScreen} store={store} onLogout={handleLogout} pendingClaims={pendingClaimsCount} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {screen === 'dashboard' && <OwnerDashboard store={store} items={items} claims={claims} events={events} setScreen={setScreen} />}
        {screen === 'upload'    && <OwnerUpload store={store} user={user} onDone={() => setScreen('inventory')} />}
        {screen === 'inventory' && <OwnerInventory items={items} />}
        {screen === 'claims'    && <OwnerClaims claims={claims} items={items} />}
        {screen === 'boards'   && <OwnerBoards store={store} user={user} items={items} />}
        {screen === 'profile'  && <OwnerStoreProfile store={store} items={items} />}
        {screen === 'settings' && (
          <OwnerSettings
            store={store}
            user={user}
            onLogout={handleLogout}
            onGuideTourReset={() => setStore((prev) => (prev ? { ...prev, guideTourCompleted: false } : null))}
          />
        )}
      </div>
      {showGuide && screen === 'dashboard' && (
        <DashboardGuide
          key={`guide-${user?.uid}-${guideSession}`}
          userId={user?.uid}
          onDismiss={() => {
            setShowGuide(false);
            setStore((prev) => (prev ? { ...prev, guideTourCompleted: true } : null));
          }}
        />
      )}

      {store && !showGuide && (
        <button
          type="button"
          title="Replay dashboard tour"
          aria-label="Replay dashboard tour"
          onClick={() => {
            setGuideSession((s) => s + 1);
            setShowGuide(true);
            setScreen('dashboard');
          }}
          style={{
            position: 'fixed',
            zIndex: 50,
            right: 24,
            bottom: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            boxShadow: '0 4px 20px rgba(31,24,32,0.12), 0 0 0 1px rgba(91,77,122,0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(91,77,122,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(31,24,32,0.12), 0 0 0 1px rgba(91,77,122,0.08)';
          }}
        >
          <Icon name="sparkle" size={22} color="var(--aubergine-600)" />
        </button>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const OwnerSidebar = ({ screen, setScreen, store, onLogout, pendingClaims }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard',    icon: 'trending' },
    { id: 'inventory', label: 'Inventory',    icon: 'grid' },
    { id: 'upload',    label: 'Upload items', icon: 'plus' },
    { id: 'claims',    label: 'Claims',       icon: 'tag', badge: pendingClaims || null },
    { id: 'boards',    label: 'Outfit boards',icon: 'bookmark' },
    { id: 'profile',   label: 'Store profile',icon: 'shop' },
    { id: 'settings',  label: 'Settings',     icon: 'user' },
  ];
  return (
    <div style={{ width: 232, borderRight: '1px solid var(--line)', padding: '24px 16px', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)', flexShrink: 0 }} data-guide="sidebar">
      <div style={{ padding: '0 8px 20px' }}><Wordmark size={18} /></div>

      {/* Store chip */}
      {store && (
        <div style={{ padding: 10, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: store.color || '#5B4D7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {store.heroImageUrl
              ? <img src={store.heroImageUrl} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} alt="" />
              : store.emoji || '🏪'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name || 'Your Store'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'capitalize' }}>{store.type || 'Vintage'}</div>
          </div>
          <Icon name="chevron-down" size={14} color="var(--ink-500)" />
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(it => {
          const active = screen === it.id;
          return (
            <button key={it.id} onClick={() => setScreen(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 10px', borderRadius: 'var(--r-sm)',
              background: active ? 'var(--aubergine-100)' : 'transparent',
              color: active ? 'var(--aubergine-600)' : 'var(--ink-700)',
              fontWeight: active ? 600 : 500, fontSize: 13, textAlign: 'left',
              cursor: 'pointer', transition: 'all .12s', position: 'relative',
            }}>
              <Icon name={it.icon} size={16} color={active ? 'var(--aubergine-600)' : 'var(--ink-500)'} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge ? <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', background: 'var(--blush-500)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span> : null}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--blush-100)', fontSize: 12, lineHeight: 1.4, color: 'var(--plum-900)', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Weekly tip</div>
        Uploads before noon get 2× more views than afternoon uploads.
      </div>

      <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--r-sm)', color: 'var(--ink-500)', fontSize: 13, cursor: 'pointer' }}>
        <Icon name="logout" size={16} color="var(--ink-400)" /> Sign out
      </button>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const OwnerDashboard = ({ store, items, claims, events, setScreen }) => {
  const DAY = 86400000;
  const now = Date.now();
  const [rangeDays, setRangeDays] = useState(14);
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  const RANGE_OPTIONS = [
    { days: 7, label: 'Last 7 days' },
    { days: 14, label: 'Last 14 days' },
    { days: 30, label: 'Last 30 days' },
    { days: 90, label: 'Last 90 days' },
  ];
  const rangeLabel = RANGE_OPTIONS.find(r => r.days === rangeDays)?.label || `Last ${rangeDays} days`;

  // Filter events by selected range
  const recent = events.filter(e => {
    const ts = e.timestamp?.toDate?.();
    return ts && (now - ts.getTime()) <= rangeDays * DAY;
  });

  const totalViews       = recent.filter(e => e.type === 'item_view').length;
  const totalSaves       = recent.filter(e => e.type === 'item_save').length;
  const totalStoreVisits = recent.filter(e => e.type === 'store_view').length;
  const activeClaims     = claims.filter(c => c.status === 'pending' || c.status === 'confirmed').length;
  const completedClaims  = claims.filter(c => c.status === 'completed').length;
  const conversionRate   = claims.length > 0 ? Math.round((completedClaims / claims.length) * 100) : 0;

  // Revenue: sum amounts from paid/completed claims
  const totalRevenue = claims
    .filter(c => c.status === 'paid' || c.status === 'completed')
    .reduce((sum, c) => {
      const amt = c.amount || items.find(i => i.id === c.itemId)?.price || 0;
      return sum + amt;
    }, 0);
  const storeBalance = store?.balance || 0;

  // Per-item stats from events (for real engagement data)
  const savesPerItem = {}, viewsPerItem = {};
  recent.forEach(e => {
    if (e.type === 'item_save' && e.itemId) savesPerItem[e.itemId] = (savesPerItem[e.itemId] || 0) + 1;
    if (e.type === 'item_view' && e.itemId) viewsPerItem[e.itemId] = (viewsPerItem[e.itemId] || 0) + 1;
  });

  // Garment types from claimed items
  const kindClaimed = {};
  claims
    .filter(c => ['paid', 'completed', 'confirmed', 'pending'].includes(c.status))
    .forEach(c => {
      const kind = c.itemKind || items.find(i => i.id === c.itemId)?.kind || 'other';
      kindClaimed[kind] = (kindClaimed[kind] || 0) + 1;
    });
  const garmentClaimedData = Object.entries(kindClaimed).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Daily breakdown for chart (dynamic range, zero-filled)
  const days = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date(now - (rangeDays - 1 - i) * DAY);
    return d.toISOString().split('T')[0];
  });
  const viewsByDay = {}, savesByDay = {};
  recent.forEach(e => {
    const ts = e.timestamp?.toDate?.();
    if (!ts) return;
    const day = ts.toISOString().split('T')[0];
    if (e.type === 'item_view') viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    if (e.type === 'item_save') savesByDay[day] = (savesByDay[day] || 0) + 1;
  });
  const viewsData = days.map(d => viewsByDay[d] || 0);
  const savesData = days.map(d => savesByDay[d] || 0);
  const dayLabels = days.map((d, i) => {
    const step = Math.max(1, Math.floor(rangeDays / 5));
    if (i === 0 || i === days.length - 1 || i % step === 0) {
      const date = new Date(d + 'T12:00:00');
      return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
    }
    return '';
  });

  // Style cluster demand from real events
  const STYLE_COLORS = {
    'Y2K': '#D4A5A5', 'Minimalist': '#5B4D7A', 'Cottagecore': '#A8B79E',
    'Streetwear': '#3A2E3A', 'Vintage Classic': '#B88468', 'Preppy': '#C9A14A',
  };
  const styleCount = {};
  recent.filter(e => e.type === 'item_view' && e.itemStyle).forEach(e => {
    styleCount[e.itemStyle] = (styleCount[e.itemStyle] || 0) + 1;
  });
  const totalStyleEvents = Object.values(styleCount).reduce((s, v) => s + v, 0) || 1;
  const styleData = Object.entries(styleCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name, pct: Math.round((count / totalStyleEvents) * 100), color: STYLE_COLORS[name] || '#B88468',
    }));

  // Size demand from real events
  const sizeCount = {};
  recent.filter(e => e.type === 'item_view' && e.itemSize).forEach(e => {
    sizeCount[e.itemSize] = (sizeCount[e.itemSize] || 0) + 1;
  });
  const topSizes = Object.entries(sizeCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ownerFirstName = store?.ownerEmail?.split('@')[0] || 'there';
  const hasData = events.length > 0;

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Good morning, {ownerFirstName}</div>
          <h1 className="display" style={{ fontSize: 38, lineHeight: 1, margin: '4px 0 0', fontWeight: 500 }}>
            Dashboard <span style={{ color: 'var(--ink-400)', fontSize: 22 }}>· {rangeLabel.toLowerCase()}</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Btn variant="soft" size="md" icon={<Icon name="calendar" size={14} />} onClick={() => setShowRangeMenu(v => !v)}>{rangeLabel}</Btn>
            {showRangeMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: 160, overflow: 'hidden',
              }}>
                {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => { setRangeDays(opt.days); setShowRangeMenu(false); }}
                    style={{
                      width: '100%', padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                      fontSize: 13, fontWeight: rangeDays === opt.days ? 700 : 500,
                      color: rangeDays === opt.days ? 'var(--aubergine-600)' : 'var(--ink-700)',
                      background: rangeDays === opt.days ? 'var(--aubergine-100)' : 'transparent',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div data-guide="upload-btn" style={{ display: 'inline-flex' }}>
          <Btn variant="accent" size="md" onClick={() => setScreen('upload')} icon={<Icon name="plus" size={14} color="#fff" />}>Upload items</Btn>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div data-guide="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
        <DashKpi label="Item views"    value={totalViews.toLocaleString()}  delta={hasData ? rangeLabel.toLowerCase() : 'No data yet'} color="var(--aubergine-600)" neutral={!hasData} />
        <DashKpi label="Items saved"   value={totalSaves.toLocaleString()}  delta={hasData ? rangeLabel.toLowerCase() : '—'} color="var(--blush-500)" neutral={!hasData} />
        <DashKpi label="Store visits"  value={totalStoreVisits.toLocaleString()} delta={hasData ? 'profile views' : '—'} color="var(--sage-500)" neutral={!hasData} />
        <DashKpi label="Active claims" value={String(activeClaims)} delta={`${claims.filter(c => c.status === 'pending').length} pending`} color="var(--clay-500)" neutral />
        <DashKpi label="Total revenue" value={totalRevenue > 0 ? `$${totalRevenue.toFixed(0)}` : '—'} delta={totalRevenue > 0 ? 'paid + completed' : 'No sales yet'} color="var(--sage-500)" neutral={totalRevenue === 0} />
        <DashKpi label="Store balance" value={storeBalance > 0 ? `$${storeBalance.toFixed(2)}` : '—'} delta={storeBalance > 0 ? 'via Stripe' : 'No payments yet'} color="var(--aubergine-600)" neutral={storeBalance === 0} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <div data-guide="attention-chart">
        <DashCard title="Shopper attention" subtitle="Item views + saves per day">
          <AttentionChart viewsData={viewsData} savesData={savesData} dayLabels={dayLabels} hasData={hasData} />
        </DashCard>
        </div>
        <div data-guide="style-demand">
        <DashCard title="Style cluster demand" subtitle="What shoppers engage with most">
          <StyleDemand styleData={styleData} hasData={hasData} />
        </DashCard>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div data-guide="top-saved">
        <DashCard title="Top saved items" subtitle="Strongest purchase intent signal">
          <TopSaved items={items} savesPerItem={savesPerItem} viewsPerItem={viewsPerItem} />
        </DashCard>
        </div>
        <DashCard title="Dead inventory" subtitle="No views in 14+ days — restyle or reprice" action="Export">
          <DeadInventory items={items} viewsPerItem={viewsPerItem} />
        </DashCard>
      </div>

      {/* Size demand + claims */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
        <DashCard title="Size demand" subtitle="Most-viewed sizes from shoppers">
          <SizeDemand topSizes={topSizes} hasData={hasData} />
        </DashCard>
        <div data-guide="recent-claims">
        <DashCard title="Recent claims" subtitle="Respond within 2 hours for best experience">
          <RecentClaims claims={claims} items={items} />
        </DashCard>
        </div>
      </div>

      {/* Garment pickup breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <DashCard title="Garment type claimed" subtitle="What shoppers are actually picking up">
          <GarmentClaimed data={garmentClaimedData} totalClaims={claims.length} />
        </DashCard>
        <DashCard title="Claim pipeline" subtitle="Status breakdown of all claims">
          <ClaimPipeline claims={claims} items={items} />
        </DashCard>
      </div>
    </div>
  );
};

const DashKpi = ({ label, value, delta, color, neutral }) => (
  <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
    <div className="display" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.05, margin: '10px 0 4px' }}>{value}</div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: neutral ? 'var(--cream-100)' : color + '22', color: neutral ? 'var(--ink-700)' : color, fontSize: 11, fontWeight: 600 }}>
      {!neutral && <Icon name="trending" size={12} color={color} />}
      {delta}
    </div>
  </div>
);

const DashCard = ({ title, subtitle, children, action }) => (
  <div style={{ padding: 20, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action && <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--aubergine-600)', cursor: 'pointer' }}>{action}</button>}
    </div>
    {children}
  </div>
);

const AttentionChart = ({ viewsData, savesData, dayLabels, hasData }) => {
  const maxV = Math.max(...viewsData, ...savesData.map(v => v * 6), 10);
  const w = 700, h = 220, pad = { l: 30, r: 12, t: 12, b: 24 };
  const cx = (i) => pad.l + (i / (viewsData.length - 1)) * (w - pad.l - pad.r);
  const cy = (v) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b);
  const viewsPath = viewsData.map((v, i) => `${i ? 'L' : 'M'} ${cx(i)} ${cy(v)}`).join(' ');
  const areaPath  = viewsPath + ` L ${cx(viewsData.length - 1)} ${h - pad.b} L ${cx(0)} ${h - pad.b} Z`;
  const savesPath = savesData.map((v, i) => `${i ? 'L' : 'M'} ${cx(i)} ${cy(v * 6)}`).join(' ');
  return (
    <div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot color="var(--aubergine-600)" /> Views</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot color="var(--blush-500)" /> Saves (×6)</span>
        {!hasData && <span style={{ fontSize: 11, color: 'var(--ink-400)', marginLeft: 4 }}>— live data appears as shoppers engage</span>}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + (i / 3) * (h - pad.t - pad.b)} y2={pad.t + (i / 3) * (h - pad.t - pad.b)} stroke="var(--cream-200)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <path d={areaPath} fill="var(--aubergine-100)" opacity="0.6" />
        <path d={viewsPath} fill="none" stroke="var(--aubergine-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={savesPath} fill="none" stroke="var(--blush-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {viewsData.map((v, i) => <circle key={i} cx={cx(i)} cy={cy(v)} r={i === viewsData.length - 1 ? 5 : 0} fill="var(--aubergine-600)" stroke="#fff" strokeWidth="2" />)}
        {dayLabels.map((t, i) => t && (
          <text key={i} x={cx(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--ink-500)" fontFamily="Figtree">{t}</text>
        ))}
      </svg>
    </div>
  );
};

const StyleDemand = ({ styleData, hasData }) => {
  const FALLBACK = [
    { name: 'Y2K',         pct: 38, color: '#D4A5A5' },
    { name: 'Minimalist',  pct: 26, color: '#5B4D7A' },
    { name: 'Cottagecore', pct: 18, color: '#A8B79E' },
    { name: 'Streetwear',  pct: 12, color: '#3A2E3A' },
    { name: 'Other',       pct: 6,  color: '#B88468' },
  ];
  const data = hasData && styleData?.length > 0 ? styleData : FALLBACK;
  return (
    <div>
      {!hasData && <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 10 }}>Sample — updates live as shoppers engage</div>}
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 18 }}>
        {data.map(d => <div key={d.name} style={{ width: `${d.pct}%`, background: d.color }} />)}
      </div>
      {data.map(d => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Dot color={d.color} size={10} />
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>{d.pct}%</span>
        </div>
      ))}
      {hasData && data[0] && (
        <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: 'var(--aubergine-100)', fontSize: 12, color: 'var(--plum-900)', lineHeight: 1.4 }}>
          <strong>Tip:</strong> {data[0].name} is your most-engaged style cluster. Source more to match demand.
        </div>
      )}
    </div>
  );
};

const SizeDemand = ({ topSizes, hasData }) => {
  const FALLBACK = [['M', 42], ['S', 28], ['L', 18], ['XS', 8], ['XL', 4]];
  const data     = hasData && topSizes.length > 0 ? topSizes : FALLBACK;
  const maxVal   = data[0]?.[1] || 1;
  return (
    <div>
      {!hasData && <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 10 }}>Sample — updates as shoppers view items</div>}
      {data.map(([size, count]) => (
        <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, fontSize: 13, fontWeight: 700, color: 'var(--ink-900)', textAlign: 'center', flexShrink: 0 }}>{size}</div>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--cream-200)', overflow: 'hidden' }}>
            <div style={{ width: `${(count / maxVal) * 100}%`, height: '100%', background: 'var(--aubergine-600)', borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
        </div>
      ))}
    </div>
  );
};

const TopSaved = ({ items, savesPerItem = {}, viewsPerItem = {} }) => {
  const hasEventData = Object.keys(savesPerItem).length > 0 || Object.keys(viewsPerItem).length > 0;

  const displayItems = items.length > 0 ? items : ITEMS.slice(0, 5);
  const rows = displayItems
    .map(it => ({
      ...it,
      saves: savesPerItem[it.id] ?? it.saves ?? 0,
      views: viewsPerItem[it.id] ?? it.views ?? 0,
    }))
    .sort((a, b) => b.saves - a.saves || b.views - a.views)
    .slice(0, 5)
    .filter((r, _, arr) => arr.some(x => x.saves > 0 || x.views > 0) ? (r.saves > 0 || r.views > 0) : true);

  if (items.length > 0 && !hasEventData) {
    return <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '24px 0', textAlign: 'center' }}>Engagement data will appear here as shoppers interact with your items.</div>;
  }

  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-400)', width: 16, fontWeight: 600 }}>{i + 1}</div>
          <ItemThumb item={r} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{r.aiTags?.era || r.era} · ${r.price}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--aubergine-600)' }}>{r.saves} saves</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{r.views} views</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DeadInventory = ({ items, viewsPerItem = {} }) => {
  const hasEventData = Object.keys(viewsPerItem).length > 0;
  const rows = (items.length > 0
    ? items.filter(i => !viewsPerItem[i.id] && !i.views)
    : ITEMS.slice(10, 14)
  ).slice(0, 4).map((it, i) => ({ ...it, days: it.createdAt?.toDate ? Math.floor((Date.now() - it.createdAt.toDate().getTime()) / 86400000) : 16 + i * 3 }));

  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '20px 0', textAlign: 'center' }}>All items have received views — great work!</div>;
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <ItemThumb item={r} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{r.days} days · 0 views · ${r.price}</div>
          </div>
          <Btn variant="soft" size="sm">Restyle</Btn>
        </div>
      ))}
    </div>
  );
};

const RecentClaims = ({ claims, items }) => {
  const rows = claims.slice(0, 4);

  const confirmClaim = async (claimId) => {
    await updateDoc(doc(db, 'claims', claimId), {
      status: 'confirmed',
      pickupStatus: 'ready_for_pickup',
      updatedAt: serverTimestamp(),
    });
    const claim = claims.find(c => c.id === claimId);
    if (claim?.itemId) {
      updateDoc(doc(db, 'items', claim.itemId), { status: 'reserved', updatedAt: serverTimestamp() }).catch(() => {});
    }
  };

  const pill = (s) => {
    const map = {
      pending:         { bg: 'var(--blush-100)',  c: 'var(--plum-900)', label: 'Needs response' },
      pending_payment: { bg: '#FEF3C7',            c: '#92400E',         label: 'Awaiting payment' },
      paid:            { bg: 'var(--sage-200)',    c: '#2E3A2E',         label: '✓ Paid · Awaiting pickup' },
      confirmed:       { bg: 'var(--aubergine-100)', c: 'var(--aubergine-600)', label: 'Ready for pickup' },
      completed:       { bg: 'var(--cream-100)',   c: 'var(--ink-500)', label: 'Picked up' },
    };
    const v = map[s] || map.pending;
    return <span style={{ padding: '3px 10px', borderRadius: 999, background: v.bg, color: v.c, fontSize: 11, fontWeight: 600 }}>{v.label}</span>;
  };

  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '20px 0', textAlign: 'center' }}>No claims yet — they'll appear here once shoppers start reserving items.</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Item</th>
          <th style={{ textAlign: 'left', fontWeight: 600 }}>Buyer</th>
          <th style={{ textAlign: 'left', fontWeight: 600 }}>Method</th>
          <th style={{ textAlign: 'left', fontWeight: 600 }}>Status</th>
          <th style={{ textAlign: 'left', fontWeight: 600 }}>When</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const item = items.find(i => i.id === r.itemId) || {};
          return (
            <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={{ padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ItemThumb item={item} size={{ w: 38, h: 46 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name || 'Item'}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>${item.price || '—'}</div>
                  </div>
                </div>
              </td>
              <td style={{ fontSize: 13 }}>@{r.buyerHandle || 'shopper'}</td>
              <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>{r.method === 'ship' ? 'Ship' : `Pickup · ${r.window || 48}h`}</td>
              <td>{pill(r.status)}</td>
              <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                {r.window && r.createdAt?.toDate ? (
                  <span title={`Created ${timeAgo(r.createdAt.toDate())}`}>
                    By {new Date(r.createdAt.toDate().getTime() + parseInt(r.window) * 3600000).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                ) : timeAgo(r.createdAt?.toDate?.())}
              </td>
              <td style={{ textAlign: 'right' }}>
                {r.status === 'pending' && <Btn variant="accent" size="sm" onClick={() => confirmClaim(r.id)}>Confirm</Btn>}
                {r.status === 'paid' && <Btn variant="accent" size="sm" onClick={() => confirmClaim(r.id)}>Ready for pickup</Btn>}
                {(r.status === 'confirmed' || r.status === 'completed') && <Btn variant="soft" size="sm">View</Btn>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const GarmentClaimed = ({ data, totalClaims }) => {
  const KIND_EMOJI = { top: '👕', blouse: '👚', dress: '👗', jacket: '🧥', coat: '🧥', jeans: '👖', pants: '👖', skirt: '🩳', boots: '👢', heels: '👠', sneakers: '👟', shoes: '👟', bag: '👜', hat: '🎩', scarf: '🧣', belt: '🩹', sunglasses: '🕶️', jewelry: '💍', other: '🛍️' };
  const total = data.reduce((s, [, n]) => s + n, 0) || 1;

  if (data.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '24px 0', textAlign: 'center' }}>Claimed items will show pickup trends here once shoppers start reserving.</div>;
  }

  return (
    <div>
      {data.map(([kind, count]) => (
        <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{KIND_EMOJI[kind] || '🛍️'}</span>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{kind}</span>
          <div style={{ width: 120, height: 8, borderRadius: 4, background: 'var(--cream-200)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ width: `${(count / total) * 100}%`, height: '100%', background: 'var(--aubergine-600)', borderRadius: 4, transition: 'width .4s' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-500)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
        </div>
      ))}
      <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: 'var(--aubergine-100)', fontSize: 12, color: 'var(--plum-900)', lineHeight: 1.4 }}>
        <strong>{totalClaims}</strong> total claims · {data[0]?.[0] ? <><strong style={{ textTransform: 'capitalize' }}>{data[0][0]}</strong> is most claimed</> : 'No data yet'}
      </div>
    </div>
  );
};

const ClaimPipeline = ({ claims, items }) => {
  const statuses = [
    { key: 'pending',         label: 'Awaiting response', color: '#D4A5A5' },
    { key: 'pending_payment', label: 'Payment pending',   color: '#C9A14A' },
    { key: 'paid',            label: 'Paid via Stripe',   color: '#A8B79E' },
    { key: 'confirmed',       label: 'Confirmed',         color: '#5B9A6A' },
    { key: 'completed',       label: 'Picked up',         color: '#5B4D7A' },
    { key: 'declined',        label: 'Declined',          color: '#B0B0B0' },
  ];
  const total = claims.length || 1;
  const paidRevenue = claims.filter(c => c.status === 'paid' || c.status === 'completed').reduce((s, c) => s + (c.amount || items.find(i => i.id === c.itemId)?.price || 0), 0);

  if (claims.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '24px 0', textAlign: 'center' }}>Claims appear here once shoppers start reserving items.</div>;
  }

  return (
    <div>
      {statuses.map(s => {
        const count = claims.filter(c => c.status === s.key).length;
        if (count === 0) return null;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
            <div style={{ width: 100, height: 8, borderRadius: 4, background: 'var(--cream-200)', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ width: `${(count / total) * 100}%`, height: '100%', background: s.color, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
          </div>
        );
      })}
      {paidRevenue > 0 && (
        <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: 'var(--sage-200)', fontSize: 12, color: '#2E3A2E', lineHeight: 1.4 }}>
          <strong>${paidRevenue.toFixed(2)}</strong> confirmed revenue from paid &amp; completed claims
        </div>
      )}
    </div>
  );
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export function OwnerUpload({ store, user, onDone }) {
  const [pieces, setPieces]       = useState([]);
  const [activeId, setActive]     = useState(null);
  const fileRef                   = useRef();
  const [publishing, setPub]      = useState(false);
  const [enableIndexing, setIdx]  = useState(true); // consent: index for vector search

  const addFiles = async (files) => {
    const newPieces = Array.from(files).slice(0, 20 - pieces.length).map(file => ({
      id: `u${Date.now()}${Math.random()}`,
      file, imagePreview: URL.createObjectURL(file),
      kind: 'top', color: '#A8B79E', bg: '#E8EEE2', accent: '#3A4A2E',
      aiTags: null, tagging: false, confirmed: false,
      title: '', price: '', was: '', size: 'M', condition: 'Excellent', notes: '',
    }));
    setPieces(prev => [...prev, ...newPieces]);
    if (!activeId && newPieces[0]) setActive(newPieces[0].id);
    for (const p of newPieces) runTagging(p.id, p.file);
  };

  const runTagging = async (id, file) => {
    update(id, { tagging: true });
    try {
      const base64 = await fileToBase64(file);
      const tags   = await tagGarment(base64, file.type);
      const kind   = deriveKind(tags.category);
      const colors = KIND_COLORS[kind] || {};
      update(id, { tagging: false, aiTags: tags, kind, title: `${tags.era} ${tags.category}`, ...colors });
      // Generate rich visual description in background — improves text embedding quality
      generateVisualDescription(base64, file.type, tags)
        .then(desc => update(id, { visualDescription: desc }))
        .catch(() => {});
    } catch {
      update(id, { tagging: false });
    }
  };

  const update = (id, patch) => setPieces(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));

  const publish = async () => {
    setPub(true);
    const confirmed = pieces.filter(p => p.confirmed);
    try {
      for (const p of confirmed) {
        let imageUrl = '';
        if (p.file) {
          const sRef = storageRef(storage, `stores/${user.uid}/items/${Date.now()}_${p.file.name}`);
          await uploadBytes(sRef, p.file);
          imageUrl = await getDownloadURL(sRef);
        }
        const itemData = {
          storeId: user.uid, name: p.title, kind: p.kind,
          price: Number(p.price) || 0, was: Number(p.was) || null,
          size: p.size, condition: p.condition, notes: p.notes,
          aiTags: p.aiTags || {}, imageUrl,
          visualDescription: p.visualDescription || null,
          status: 'active', views: 0, saves: 0,
          createdAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, 'items'), itemData);
        // Fire-and-forget: embed the actual stock photo image for accurate visual search
        if (enableIndexing && p.file) {
          fileToBase64(p.file).then(b64 =>
            indexItem(ref.id, { ...itemData, id: ref.id }, b64, p.file.type)
          ).catch(() => {});
        }
      }
      onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setPub(false);
    }
  };

  const active         = pieces.find(p => p.id === activeId);
  const confirmedCount = pieces.filter(p => p.confirmed).length;

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <button onClick={onDone} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-500)', cursor: 'pointer', marginBottom: 6 }}>
            <Icon name="arrow-left" size={14} color="var(--ink-500)" /> Dashboard
          </button>
          <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: 0, fontWeight: 500 }}>Upload items</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 6 }}>
            {pieces.length > 0 ? `Batch ${pieces.length} of 20 · AI drafts tags — confirm in seconds` : 'Drop up to 20 photos — AI will auto-tag each one'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pieces.length > 0 && <div style={{ fontSize: 13, color: 'var(--ink-500)' }}><strong style={{ color: 'var(--ink-900)' }}>{confirmedCount}</strong> / {pieces.length} confirmed</div>}
          <Btn variant="soft" size="md" icon={<Icon name="plus" size={14} />} onClick={() => fileRef.current.click()}>Add photos</Btn>
          {pieces.length > 0 && <Btn variant="accent" size="md" disabled={confirmedCount === 0 || publishing} icon={publishing ? <Spinner size={14} /> : null} onClick={publish}>
            {publishing ? 'Publishing…' : `Publish ${confirmedCount} items`}
          </Btn>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />

      {pieces.length === 0 ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current.click()}
          style={{ height: 340, border: '2px dashed var(--line)', borderRadius: 'var(--r-md)', background: 'var(--cream-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, cursor: 'pointer' }}
        >
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="upload" size={32} color="var(--aubergine-600)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Drop item photos here</div>
            <div style={{ fontSize: 14, color: 'var(--ink-500)', marginTop: 4 }}>or click to browse · up to 20 items per batch</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ height: 4, background: 'var(--cream-200)', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ width: `${(confirmedCount / pieces.length) * 100}%`, height: '100%', background: 'var(--aubergine-600)', transition: 'width .3s' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: 14 }}>
            {/* Queue */}
            <div style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', alignSelf: 'start' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px 10px' }}>Queue</div>
              {pieces.map((p, i) => (
                <button key={p.id} onClick={() => setActive(p.id)} style={{ width: '100%', padding: 8, borderRadius: 8, marginBottom: 4, background: activeId === p.id ? 'var(--aubergine-100)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 34, height: 42, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: p.bg }}>
                    {p.imagePreview
                      ? <img src={p.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={p.kind} color={p.color} accent={p.accent} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.aiTags?.category || `Item ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>#{i + 1} · {p.tagging ? 'Tagging…' : p.confirmed ? 'Ready' : 'Needs tags'}</div>
                  </div>
                  {p.confirmed && <Icon name="check-circle" size={16} color="var(--sage-500)" />}
                </button>
              ))}
              <button onClick={() => fileRef.current.click()} style={{ width: '100%', padding: 10, marginTop: 6, border: '1px dashed var(--line)', borderRadius: 8, color: 'var(--ink-500)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <Icon name="upload" size={14} /> Drop more photos
              </button>
            </div>

            {/* Preview */}
            <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              {active && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--aubergine-100)', color: 'var(--aubergine-600)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="sparkle" size={12} color="var(--aubergine-600)" /> AI drafted these
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Confirm or correct — avg 22s per item</span>
                  </div>

                  <div style={{ borderRadius: 'var(--r-md)', background: active.bg, height: 320, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
                    {active.imagePreview
                      ? <img src={active.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ position: 'absolute', inset: '6% 20%' }}><GarmentSVG kind={active.kind} color={active.color} accent={active.accent} /></div>}
                    {active.tagging && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(91,77,122,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
                        <Spinner size={32} color="#fff" />
                        <div style={{ fontSize: 14, fontWeight: 600 }}>Gemini is analyzing…</div>
                      </div>
                    )}
                    {active.aiTags && !active.tagging && (
                      <div style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 999, background: 'rgba(91,77,122,0.95)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="sparkle" size={12} color="#fff" />
                        {Math.round((active.aiTags.confidence || 0.9) * 100)}% confidence
                      </div>
                    )}
                  </div>

                  {active.aiTags && !active.tagging && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>AI Tags</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(active.aiTags).filter(([k]) => k !== 'confidence').map(([k, v]) => (
                          <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 5px', borderRadius: 999, background: 'var(--aubergine-100)', fontSize: 12 }}>
                            <Icon name="sparkle" size={10} color="var(--aubergine-600)" />
                            <span style={{ color: 'var(--ink-500)', fontSize: 10 }}>{k}:</span>
                            <strong style={{ color: 'var(--aubergine-600)' }}>{String(v)}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Form */}
            {active && (
              <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', alignSelf: 'start' }}>
                <Field label="Title">
                  <input style={inputStyle} value={active.title} onChange={e => update(active.id, { title: e.target.value })} placeholder={active.aiTags ? `${active.aiTags.era} ${active.aiTags.category}` : 'e.g. 90s Corduroy Midi Dress'} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Price ($)"><input style={inputStyle} type="number" min="0" value={active.price} onChange={e => update(active.id, { price: e.target.value })} placeholder="48" /></Field>
                  <Field label="Was (optional)"><input style={inputStyle} type="number" min="0" value={active.was} onChange={e => update(active.id, { was: e.target.value })} placeholder="—" /></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Size">
                    <select style={inputStyle} value={active.size} onChange={e => update(active.id, { size: e.target.value })}>
                      {['XS','S','M','L','XL','XXL','OS'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Condition">
                    <select style={inputStyle} value={active.condition} onChange={e => update(active.id, { condition: e.target.value })}>
                      {['Excellent','Good','Fair','Loved'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Notes (optional)">
                  <textarea rows={2} value={active.notes} onChange={e => update(active.id, { notes: e.target.value })}
                    placeholder="e.g. slight wear on hem, original buttons"
                    style={{ ...inputStyle, resize: 'none' }} />
                </Field>

                <div style={{ padding: 10, borderRadius: 8, background: 'var(--cream-100)', fontSize: 11, color: 'var(--ink-700)', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Icon name="eye" size={14} color="var(--ink-500)" />
                  <span>Going live to shoppers matching {active.aiTags?.style || 'your style cluster'} nearby.</span>
                </div>

                {/* Indexing consent */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 8, background: enableIndexing ? 'var(--aubergine-100)' : 'var(--surface)', border: `1px solid ${enableIndexing ? 'var(--aubergine-600)' : 'var(--line)'}`, cursor: 'pointer', marginBottom: 14, transition: 'all .15s' }}>
                  <input type="checkbox" checked={enableIndexing} onChange={e => setIdx(e.target.checked)} style={{ marginTop: 1, accentColor: 'var(--aubergine-600)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: enableIndexing ? 'var(--aubergine-600)' : 'var(--ink-700)' }}>
                      Enable photo-match search <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>(recommended)</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2, lineHeight: 1.4 }}>
                      Stylography will use Gemini AI to create a searchable fingerprint of this item so shoppers can find it by uploading outfit inspiration photos. No data is shared with third parties.
                    </div>
                  </div>
                </label>

                <Btn variant={active.confirmed ? 'soft' : 'accent'} size="md" fullWidth
                  disabled={active.tagging || !active.title}
                  onClick={() => {
                    update(active.id, { confirmed: !active.confirmed });
                    if (!active.confirmed) {
                      const idx  = pieces.findIndex(p => p.id === active.id);
                      const next = pieces[idx + 1];
                      if (next) setActive(next.id);
                    }
                  }}
                  icon={active.confirmed ? <Icon name="check-circle" size={14} color="var(--sage-500)" /> : <Icon name="checkmark" size={14} color="#fff" strokeWidth={2.5} />}>
                  {active.confirmed ? 'Confirmed — click to undo' : 'Confirm & next'}
                </Btn>
                <button style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 12, color: 'var(--ink-500)', cursor: 'pointer' }}
                  onClick={() => {
                    const idx = pieces.findIndex(p => p.id === active.id);
                    const next = pieces[idx + 1];
                    if (next) setActive(next.id);
                  }}>
                  Skip for now
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

const OwnerInventory = ({ items }) => {
  const [deletingId, setDeletingId] = useState(null);
  const displayItems = items.length > 0 ? items : ITEMS.slice(0, 10);

  const statusUi = (status) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'sold') {
      return { label: 'Sold', bg: '#E8F3E8', color: '#2E6B3A' };
    }
    if (s === 'reserved') {
      return { label: 'Reserved', bg: '#FFF3DF', color: '#9A5D00' };
    }
    if (s === 'confirmed') {
      return { label: 'Confirmed', bg: '#E9EDFF', color: '#3F4C9B' };
    }
    return { label: 'Active', bg: 'var(--cream-100)', color: 'var(--ink-600)' };
  };

  const deleteInventoryItem = async (item) => {
    // Demo seed items (i1, i2, ...) are static and not stored in Firestore.
    if (!item?.id || /^i\d+$/.test(item.id)) return;
    const ok = window.confirm(`Delete "${item.name}" from inventory?`);
    if (!ok) return;
    setDeletingId(item.id);
    try {
      await updateDoc(doc(db, 'items', item.id), {
        status: 'deleted',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to delete inventory item:', err.message);
      alert('Could not delete item. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
      <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: 0, fontWeight: 500 }}>Inventory</h1>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 6, marginBottom: 24 }}>
        All inventory items · {displayItems.length} pieces
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {displayItems.map(item => (
          <div key={item.id} style={{ padding: 10, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', opacity: item.status === 'sold' ? 0.78 : 1 }}>
            <div style={{ aspectRatio: '3/4', borderRadius: 8, background: item.bg || '#EDE8F5', position: 'relative', overflow: 'hidden', marginBottom: 8 }}>
              {item.imageUrl
                ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>}
              <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px', borderRadius: 999, background: statusUi(item.status).bg, color: statusUi(item.status).color, fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>
                {statusUi(item.status).label}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{item.aiTags?.era || item.era} · Size {item.size}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontWeight: 600 }}>${item.price}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{item.views || 0} views</span>
            </div>
            {!/^i\d+$/.test(item.id) && (
              <button
                type="button"
                onClick={() => deleteInventoryItem(item)}
                disabled={deletingId === item.id}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #F2C9D1',
                  background: '#FFF5F7',
                  color: '#B54A6A',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: deletingId === item.id ? 'wait' : 'pointer',
                  opacity: deletingId === item.id ? 0.7 : 1,
                }}
              >
                {deletingId === item.id ? 'Deleting…' : 'Delete item'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Claims ───────────────────────────────────────────────────────────────────

const OwnerClaims = ({ claims, items }) => {
  const confirmClaim = async (id) => {
    const claim = claims.find(c => c.id === id);
    await updateDoc(doc(db, 'claims', id), {
      status: 'confirmed',
      pickupStatus: 'ready_for_pickup',
      updatedAt: serverTimestamp(),
    });
    // Mark item reserved so it's hidden from other shoppers
    if (claim?.itemId) {
      updateDoc(doc(db, 'items', claim.itemId), { status: 'reserved', updatedAt: serverTimestamp() }).catch(() => {});
    }
  };
  const completeClaim = async (id, itemId, storeId, amount) => {
    await updateDoc(doc(db, 'claims', id), {
      status: 'completed',
      pickupStatus: 'picked_up',
      pickedUpAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'items', itemId), { status: 'sold', updatedAt: serverTimestamp() });
    // Credit store balance for non-Stripe (pay-at-pickup) transactions
    if (storeId && amount > 0) {
      const { increment: inc } = await import('firebase/firestore');
      updateDoc(doc(db, 'stores', storeId), { balance: inc(amount), updatedAt: serverTimestamp() }).catch(() => {});
    }
  };

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 900 }}>
      <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: '0 0 6px', fontWeight: 500 }}>Claims</h1>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 28 }}>{claims.length} total · {claims.filter(c => c.status === 'pending').length} need a response</div>

      {claims.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 'var(--r-md)', color: 'var(--ink-400)' }}>
          <Icon name="tag" size={32} color="var(--ink-300)" />
          <div style={{ marginTop: 12, fontSize: 14 }}>Claims will appear here when shoppers reserve your items.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {claims.map(c => {
          const item = items.find(i => i.id === c.itemId) || {};
          return (
            <div key={c.id} style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: `1px solid ${c.status === 'pending' ? 'var(--blush-500)' : 'var(--line)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ItemThumb item={item} size={{ w: 48, h: 60 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name || c.itemName || 'Item'} <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>→ @{c.buyerHandle || 'shopper'}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>
                    {c.method === 'ship' ? 'Ship' : `Pickup · ${c.window || 48}h window`}
                    {c.window && c.createdAt?.toDate ? ` · by ${new Date(c.createdAt.toDate().getTime() + parseInt(c.window) * 3600000).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: 'numeric' })}` : ''} · {timeAgo(c.createdAt?.toDate?.())}
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.amount > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--cream-100)', border: '1px solid var(--line)', fontWeight: 600 }}>${c.amount}</span>}
                    {c.status === 'paid' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--sage-200)', color: '#2E3A2E', fontWeight: 600 }}>✓ Paid via Stripe</span>}
                    {c.status === 'pending_payment' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>Payment pending</span>}
                    {(c.status === 'pending' || c.status === 'confirmed') && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--blush-100)', color: 'var(--plum-900)', fontWeight: 600 }}>Pay at pickup</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'pending' && (
                    <>
                      <Btn variant="soft" size="sm" onClick={() => updateDoc(doc(db, 'claims', c.id), { status: 'declined', updatedAt: serverTimestamp() })}>Decline</Btn>
                      <Btn variant="accent" size="sm" onClick={() => confirmClaim(c.id)}>Confirm</Btn>
                    </>
                  )}
                  {c.status === 'confirmed' && (
                    <Btn variant="accent" size="sm" onClick={() => completeClaim(c.id, c.itemId, c.storeId, c.amount || items.find(i => i.id === c.itemId)?.price || 0)}>Mark picked up</Btn>
                  )}
                  {(c.status === 'completed' || c.status === 'declined') && (
                    <span style={{ fontSize: 12, color: 'var(--ink-400)', padding: '6px 12px', background: 'var(--cream-100)', borderRadius: 999, textTransform: 'capitalize' }}>{c.status}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Outfit Boards ────────────────────────────────────────────────────────────

const OwnerBoards = ({ store, user, items }) => {
  const [boards,     setBoards]     = useState([]);
  const [selected,   setSelected]   = useState(new Set()); // selected item IDs
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'outfits'), where('storeId', '==', user.uid));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => !b.deleted);
      // Most recently created first
      all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBoards(all);
      setLoading(false);
    });
  }, [user]);

  const toggleSelect = (itemId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); return next; }
      if (next.size >= 4) return prev; // max 4
      next.add(itemId);
      return next;
    });
  };

  const generate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setGenError('');
    try {
      const selectedItems = items.filter(i => selected.has(i.id));

      // Run metadata + image generation in parallel
      const [outfitMeta, outfitImg] = await Promise.all([
        generateOutfitFromPieces(selectedItems),
        generateOutfitImage(selectedItems),
      ]);

      // Upload generated image to Firebase Storage
      let generatedImageUrl = '';
      if (outfitImg?.base64) {
        const byteChars = atob(outfitImg.base64);
        const byteArr   = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob      = new Blob([byteArr], { type: outfitImg.mimeType });
        const imgRef    = storageRef(storage, `stores/${user.uid}/outfits/${Date.now()}.jpg`);
        await uploadBytes(imgRef, blob);
        generatedImageUrl = await getDownloadURL(imgRef);
      }

      await addDoc(collection(db, 'outfits'), {
        ...outfitMeta,
        generatedImageUrl,
        storeId:   user.uid,
        storeName: store?.name || '',
        curator:   store?.name || 'Stylography AI',
        likes:     0,
        saves:     0,
        createdAt: serverTimestamp(),
      });
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      setGenError(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const deleteBoard = async (boardId) => {
    await updateDoc(doc(db, 'outfits', boardId), { deleted: true });
  };

  const displayItems = items.length > 0 ? items : [];

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1200 }}>
      <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: '0 0 6px', fontWeight: 500 }}>Outfit boards</h1>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 28 }}>
        Pick 1–4 pieces from your inventory, then generate a styled outfit with Gemini.
      </div>

      {/* Generated boards — shown on top */}
      {!loading && boards.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Generated boards ({boards.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {boards.map(board => (
              <BoardPreviewCard key={board.id} board={board} items={items} onDelete={() => deleteBoard(board.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Inventory selection grid */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        Your inventory
        {selected.size > 0 && (
          <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--aubergine-600)', color: '#fff', fontSize: 11, fontWeight: 700, textTransform: 'none' }}>
            {selected.size} selected
          </span>
        )}
        {selected.size === 4 && (
          <span style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 400, textTransform: 'none' }}>Max 4 reached</span>
        )}
      </div>

      {genError && (
        <div style={{ padding: 12, borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', fontSize: 13, marginBottom: 16 }}>{genError}</div>
      )}

      {displayItems.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', border: '2px dashed var(--line)', borderRadius: 'var(--r-md)', color: 'var(--ink-400)' }}>
          <Icon name="grid" size={32} color="var(--ink-300)" />
          <div style={{ marginTop: 12, fontSize: 14 }}>Upload items first — they'll appear here for selection.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {displayItems.map(item => {
            const isSelected = selected.has(item.id);
            const isDisabled = !isSelected && selected.size >= 4;
            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && toggleSelect(item.id)}
                style={{
                  padding: 0, textAlign: 'left', cursor: isDisabled ? 'not-allowed' : 'pointer',
                  borderRadius: 'var(--r-md)', overflow: 'hidden',
                  border: isSelected ? '2.5px solid var(--aubergine-600)' : '1.5px solid var(--line)',
                  background: 'var(--surface)',
                  opacity: isDisabled ? 0.4 : 1,
                  transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                  transition: 'all .15s',
                  boxShadow: isSelected ? '0 0 0 3px var(--aubergine-100)' : 'none',
                  position: 'relative',
                }}
              >
                <div style={{ aspectRatio: '3/4', background: item.bg || '#EDE8F5', position: 'relative', overflow: 'hidden' }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--aubergine-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="checkmark" size={12} color="#fff" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                    {item.aiTags?.era || item.era} · ${item.price}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky generate bar */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 232, right: 0, padding: '16px 32px', background: 'rgba(251,247,241,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>
              {selected.size} piece{selected.size > 1 ? 's' : ''} selected
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
              {items.filter(i => selected.has(i.id)).map(i => i.name).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="soft" size="md" onClick={() => setSelected(new Set())}>Clear</Btn>
            <Btn variant="accent" size="md"
              disabled={generating}
              onClick={generate}
              icon={generating ? <Spinner size={14} /> : <Icon name="sparkle" size={14} color="#fff" />}>
              {generating ? 'Generating outfit…' : 'Generate outfit'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

const BoardPreviewCard = ({ board, items, onDelete }) => {
  const boardItems = (board.itemIds || []).map(id => items.find(i => i.id === id)).filter(Boolean);
  const positions  = [
    { left: '12%', right: '42%', top: '4%',  height: '60%', rot: '-5deg' },
    { left: '40%', right: '6%',  top: '16%', height: '58%', rot: '6deg'  },
    { left: '6%',  right: '58%', top: '56%', height: '38%', rot: '-3deg' },
    { left: '52%', right: '8%',  top: '60%', height: '36%', rot: '8deg'  },
  ];
  return (
    <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div style={{ height: 280, background: boardItems[0]?.bg || 'var(--cream-100)', position: 'relative', overflow: 'hidden' }}>
        {board.generatedImageUrl ? (
          // AI-generated outfit image
          <img src={board.generatedImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={board.name} />
        ) : (
          // Fallback: garment SVG collage
          boardItems.map((item, i) => (
            <div key={item.id} style={{ position: 'absolute', left: positions[i].left, right: positions[i].right, top: positions[i].top, height: positions[i].height, transform: `rotate(${positions[i].rot})` }}>
              {item.imageUrl
                ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} alt="" />
                : <GarmentSVG kind={item.kind} color={item.color} accent={item.accent} />}
            </div>
          ))
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', borderRadius: 999, background: 'rgba(91,77,122,0.9)', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="sparkle" size={9} color="#fff" /> {board.generatedImageUrl ? 'AI Generated' : 'Gemini'}
        </div>
        <button onClick={onDelete} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="close" size={12} color="#fff" />
        </button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{board.mood}</div>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>{board.name}</div>
        {board.reason && (
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 6, lineHeight: 1.4 }}>{board.reason}</div>
        )}
        {board.stylingTip && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: 'var(--aubergine-100)', fontSize: 11, color: 'var(--plum-900)', lineHeight: 1.4 }}>
            <strong>Tip:</strong> {board.stylingTip}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--ink-400)' }}>
          <Icon name="grid" size={11} color="var(--ink-400)" />
          {(board.itemIds || []).length} pieces · {board.saves || 0} saves
        </div>
      </div>
    </div>
  );
};

// ─── Store Profile Preview ─────────────────────────────────────────────────────

const OwnerStoreProfile = ({ store, items }) => {
  const activeItems = items.filter(i => i.status === 'active' || !i.status);

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 900 }}>
      <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: '0 0 6px', fontWeight: 500 }}>Store profile</h1>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 20 }}>
        Preview how shoppers see your store
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'var(--aubergine-100)', border: '1px solid var(--aubergine-100)', marginBottom: 24 }}>
        <Icon name="eye" size={16} color="var(--aubergine-600)" />
        <span style={{ fontSize: 13, color: 'var(--aubergine-600)', fontWeight: 500 }}>Shopper view — this is exactly what they see</span>
      </div>

      {/* Store header card */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', overflow: 'hidden', marginBottom: 16 }}>
        {store?.heroImageUrl && (
          <div style={{ height: 200, overflow: 'hidden' }}>
            <img src={store.heroImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Store" />
          </div>
        )}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 68, height: 68, borderRadius: 'var(--r-md)', background: store?.color || '#5B4D7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, overflow: 'hidden' }}>
              {store?.heroImageUrl
                ? <img src={store.heroImageUrl} style={{ width: 68, height: 68, objectFit: 'cover' }} alt="" />
                : store?.emoji || '🏪'}
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="display" style={{ fontSize: 24, fontWeight: 500, margin: '0 0 4px' }}>{store?.name || 'Your Store'}</h2>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', textTransform: 'capitalize' }}>
                {store?.type}{store?.city ? ` · ${store.city}` : ''}
                {store?.address ? ` · ${store.address}` : ''}
              </div>
              {store?.bio && (
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-700)', marginTop: 10, maxWidth: 500 }}>{store.bio}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <Btn variant="accent" size="sm">Follow</Btn>
                <Btn variant="soft" size="sm" icon={<Icon name="pin" size={12} />}>Directions</Btn>
                {store?.instagram && (
                  <Btn variant="soft" size="sm">@{store.instagram.replace('@', '')}</Btn>
                )}
                {store?.website && (
                  <Btn variant="soft" size="sm" icon={<Icon name="link" size={12} />}>Website</Btn>
                )}
              </div>
            </div>
          </div>

          {/* Fulfillment badges */}
          {store?.fulfillment && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {store.fulfillment.pickup      && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--sage-200)', color: '#2E3A2E', fontSize: 11, fontWeight: 600 }}>In-store pickup</span>}
              {store.fulfillment.localDelivery && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--cream-200)', color: 'var(--ink-700)', fontSize: 11, fontWeight: 600 }}>Local delivery</span>}
              {store.fulfillment.shipping    && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--cream-200)', color: 'var(--ink-700)', fontSize: 11, fontWeight: 600 }}>Ships anywhere</span>}
            </div>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', padding: '20px 24px' }}>
        <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Available now ({activeItems.length})
        </div>
        {activeItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
            No items yet — upload some to fill your profile.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {activeItems.map(item => (
              <div key={item.id} style={{ aspectRatio: '3/4', borderRadius: 'var(--r-sm)', overflow: 'hidden', position: 'relative', background: item.bg || '#EDE8F5', border: '1px solid var(--line)' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 8px 8px', background: 'linear-gradient(transparent, rgba(31,24,32,0.7))', color: '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 10, opacity: 0.85 }}>Size {item.size}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>${item.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings ─────────────────────────────────────────────────────────────────

const OwnerSettings = ({ store, user, onLogout, onGuideTourReset }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    claimAlerts: store?.notifications?.claimAlerts !== false,
    weeklyDigest: store?.notifications?.weeklyDigest !== false,
    marketingTips: store?.notifications?.marketingTips !== false,
  });

  const saveNotifs = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'stores', user.uid), {
        notifications: notifs,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resetGuideTour = async () => {
    try {
      await updateDoc(doc(db, 'stores', user.uid), {
        guideTourCompleted: false,
      });
      onGuideTourReset?.();
      alert('The guide will appear again next time you open the dashboard — or tap the sparkle button anytime.');
    } catch {}
  };

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 640 }}>
      <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: '0 0 6px', fontWeight: 500 }}>Settings</h1>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 28 }}>Manage your account and preferences</div>

      {/* Account */}
      <SettingsSection title="Account">
        <SettingsRow label="Email" value={user?.email || '—'} />
        <SettingsRow label="Store" value={store?.name || '—'} />
        <SettingsRow label="Store ID" value={user?.uid?.slice(0, 12) + '…' || '—'} mono />
        <SettingsRow label="Member since" value={store?.createdAt?.toDate?.()
          ? store.createdAt.toDate().toLocaleDateString('en', { month: 'long', year: 'numeric' })
          : '—'} />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingsToggle label="Claim alerts" hint="Get notified when a shopper reserves an item" checked={notifs.claimAlerts} onChange={v => setNotifs(n => ({ ...n, claimAlerts: v }))} />
        <SettingsToggle label="Weekly digest" hint="Summary of views, saves, and trends" checked={notifs.weeklyDigest} onChange={v => setNotifs(n => ({ ...n, weeklyDigest: v }))} />
        <SettingsToggle label="Tips & insights" hint="Occasional tips to help you sell more" checked={notifs.marketingTips} onChange={v => setNotifs(n => ({ ...n, marketingTips: v }))} />
        <div style={{ marginTop: 12 }}>
          <Btn variant="accent" size="md" disabled={saving} onClick={saveNotifs}
            icon={saved ? <Icon name="check-circle" size={14} color="#fff" /> : null}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save preferences'}
          </Btn>
        </div>
      </SettingsSection>

      {/* Store */}
      <SettingsSection title="Store">
        <SettingsRow label="Store type" value={store?.type || '—'} capitalize />
        <SettingsRow label="Fulfillment" value={
          [store?.fulfillment?.pickup && 'Pickup', store?.fulfillment?.localDelivery && 'Delivery', store?.fulfillment?.shipping && 'Shipping']
            .filter(Boolean).join(', ') || '—'
        } />
        <div style={{ marginTop: 12 }}>
          <button onClick={resetGuideTour} style={{ fontSize: 13, color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer', background: 'none', padding: 0 }}>
            Replay dashboard guide tour
          </button>
        </div>
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection title="Account actions">
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="soft" size="md" onClick={onLogout} icon={<Icon name="logout" size={14} />}>Sign out</Btn>
        </div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: '#FEE2E2', border: '1px solid #FECACA', fontSize: 12, color: '#B91C1C', lineHeight: 1.5 }}>
          <strong>Delete account:</strong> Contact support to permanently delete your store and all associated data.
        </div>
      </SettingsSection>
    </div>
  );
};

const SettingsSection = ({ title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>{title}</div>
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
      {children}
    </div>
  </div>
);

const SettingsRow = ({ label, value, mono, capitalize }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
    <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', fontFamily: mono ? 'monospace' : 'inherit', textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</span>
  </div>
);

const SettingsToggle = ({ label, hint, checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{hint}</div>}
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, padding: 2,
        background: checked ? 'var(--aubergine-600)' : 'var(--cream-200)',
        transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s',
      }} />
    </div>
  </label>
);

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ItemThumb = ({ item, size = { w: 44, h: 54 } }) => (
  <div style={{ width: size.w, height: size.h, borderRadius: 6, background: item.bg || '#EDE8F5', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
    {item.imageUrl
      ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      : <div style={{ position: 'absolute', inset: '10% 15%' }}><GarmentSVG kind={item.kind || 'top'} color={item.color || '#B88468'} accent={item.accent || '#3A2E3A'} /></div>}
  </div>
);

function timeAgo(date) {
  if (!date) return '—';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deriveKind(category = '') {
  const c = category.toLowerCase();
  if (c.includes('dress'))     return 'dress';
  if (c.includes('jeans'))     return 'jeans';
  if (c.includes('jacket') || c.includes('coat') || c.includes('blazer')) return 'jacket';
  if (c.includes('blouse') || c.includes('shirt')) return 'blouse';
  if (c.includes('top') || c.includes('sweater') || c.includes('knit'))   return 'top';
  if (c.includes('skirt'))     return 'skirt';
  if (c.includes('pants') || c.includes('trouser') || c.includes('wide')) return 'pants';
  if (c.includes('boots'))     return 'boots';
  if (c.includes('heels') || c.includes('mules') || c.includes('pump'))   return 'heels';
  if (c.includes('sneaker') || c.includes('shoe')) return 'sneakers';
  if (c.includes('bag') || c.includes('clutch') || c.includes('purse'))   return 'bag';
  if (c.includes('hat') || c.includes('beret') || c.includes('cap'))      return 'hat';
  if (c.includes('scarf'))     return 'scarf';
  if (c.includes('belt'))      return 'belt';
  if (c.includes('sunglasses') || c.includes('glasses')) return 'sunglasses';
  if (c.includes('jewelry') || c.includes('necklace'))   return 'jewelry';
  return 'top';
}

const KIND_COLORS = {
  dress:      { color: '#5B4D7A', bg: '#E2DCEB', accent: '#2A1F3A' },
  jeans:      { color: '#4B6E8E', bg: '#D8E3EC', accent: '#1E2A3A' },
  jacket:     { color: '#8C6B4A', bg: '#E8DCC8', accent: '#3A2A1A' },
  coat:       { color: '#3A2E3A', bg: '#E0D8E0', accent: '#1A0E1A' },
  blouse:     { color: '#D4A5A5', bg: '#F8E8E5', accent: '#6B3A3A' },
  top:        { color: '#A8B79E', bg: '#E8EEE2', accent: '#3A4A2E' },
  skirt:      { color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10' },
  boots:      { color: '#3A2A1A', bg: '#EFE5D8', accent: '#1A0E08' },
  heels:      { color: '#3A2E3A', bg: '#F0D5D2', accent: '#1A0E1A' },
  sneakers:   { color: '#FFFFFF', bg: '#E8EEE2', accent: '#3A4A2E' },
  bag:        { color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A' },
  hat:        { color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10' },
  scarf:      { color: '#A8B79E', bg: '#E8EEE2', accent: '#3A4A2E' },
  belt:       { color: '#B88468', bg: '#EFE5D8', accent: '#3A2A1A' },
  sunglasses: { color: '#3A2E3A', bg: '#F8E8E5', accent: '#1A0E1A' },
  jewelry:    { color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A' },
  pants:      { color: '#6B4A3A', bg: '#EFE5D8', accent: '#2A1A10' },
};
