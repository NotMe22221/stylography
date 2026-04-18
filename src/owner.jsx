// Store Owner — desktop experience
// Screens: dashboard (analytics), upload (AI auto-tag)

const StoreOwnerApp = ({ initialScreen = 'dashboard' }) => {
  const [screen, setScreen] = React.useState(initialScreen);
  const store = STORES[0]; // Stitching Styles

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--cream-50)' }}>
      <OwnerSidebar screen={screen} setScreen={setScreen} store={store} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {screen === 'dashboard' && <OwnerDashboard store={store} setScreen={setScreen} />}
        {screen === 'upload' && <OwnerUpload store={store} setScreen={setScreen} />}
        {screen === 'inventory' && <OwnerInventory store={store} />}
      </div>
    </div>
  );
};

const OwnerSidebar = ({ screen, setScreen, store }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'trending' },
    { id: 'inventory', label: 'Inventory', icon: 'grid' },
    { id: 'upload', label: 'Upload items', icon: 'plus' },
    { id: 'claims', label: 'Claims', icon: 'tag', badge: 3 },
    { id: 'boards', label: 'Outfit boards', icon: 'bookmark' },
    { id: 'profile', label: 'Store profile', icon: 'shop' },
    { id: 'settings', label: 'Settings', icon: 'user' },
  ];
  return (
    <div style={{ width: 232, borderRight: '1px solid var(--line)', padding: '24px 16px', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '0 8px 20px' }}><Wordmark size={18} /></div>

      {/* Store chip */}
      <div style={{ padding: 10, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: store.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{store.emoji}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{store.type}</div>
        </div>
        <Icon name="chevron-down" size={14} color="var(--ink-500)" />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => {
          const active = screen === it.id;
          return (
            <button key={it.id} onClick={() => setScreen(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 10px', borderRadius: 'var(--r-sm)',
              background: active ? 'var(--aubergine-100)' : 'transparent',
              color: active ? 'var(--aubergine-600)' : 'var(--ink-700)',
              fontWeight: active ? 600 : 500, fontSize: 13, textAlign: 'left',
              cursor: 'pointer', transition: 'all .12s',
            }}>
              <Icon name={it.icon} size={16} color={active ? 'var(--aubergine-600)' : 'var(--ink-500)'} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge && <span style={{ padding: '1px 6px', borderRadius: 10, background: 'var(--blush-500)', color: 'var(--ink-900)', fontSize: 10, fontWeight: 700 }}>{it.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />
      <div style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--blush-100)', fontSize: 12, lineHeight: 1.4, color: 'var(--plum-900)' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Weekly tip</div>
        Uploads before noon get 2× more views than afternoon uploads.
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————————————
// DASHBOARD
// ————————————————————————————————————————————————————————————————————
const OwnerDashboard = ({ store, setScreen }) => {
  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Good morning, Jessica</div>
          <h1 className="display" style={{ fontSize: 38, lineHeight: 1, margin: '4px 0 0', fontWeight: 500 }}>
            Dashboard <span style={{ color: 'var(--ink-400)', fontSize: 22 }}>· last 14 days</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="soft" size="md" icon={<Icon name="calendar" size={14} />}>Last 14 days</Btn>
          <Btn variant="accent" size="md" onClick={() => setScreen('upload')} icon={<Icon name="plus" size={14} color="#fff" />}>Upload items</Btn>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <Kpi label="Shopper views" value="4,218" delta="+28%" color="var(--aubergine-600)" />
        <Kpi label="Items saved" value="312" delta="+14%" color="var(--blush-500)" />
        <Kpi label="Active claims" value="8" delta="3 pending" color="var(--sage-500)" neutral />
        <Kpi label="Pickup conversion" value="82%" delta="+6pts" color="var(--clay-500)" />
      </div>

      {/* Chart + side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 24 }}>
        <Card title="Shopper attention" subtitle="Views + saves, daily">
          <AttentionChart />
        </Card>
        <Card title="Style cluster demand" subtitle="What your shoppers lean toward">
          <StyleDemand />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <Card title="Top saved items" subtitle="Strongest signal of purchase intent">
          <TopSaved />
        </Card>
        <Card title="Dead inventory" subtitle="No views in 14+ days — restyle or reprice" action="Export list">
          <DeadInventory />
        </Card>
      </div>

      <Card title="Recent claims" subtitle="Respond within 2 hours for best shopper experience">
        <RecentClaims />
      </Card>
    </div>
  );
};

const Kpi = ({ label, value, delta, color, neutral }) => (
  <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
    <div className="display" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.05, margin: '10px 0 4px' }}>{value}</div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: neutral ? 'var(--cream-100)' : color + '22', color: neutral ? 'var(--ink-700)' : color, fontSize: 11, fontWeight: 600 }}>
      {!neutral && <Icon name="trending" size={12} color={color} />}
      {delta}
    </div>
  </div>
);

const Card = ({ title, subtitle, children, action }) => (
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

const AttentionChart = () => {
  const viewsData = [120, 148, 132, 180, 220, 195, 240, 268, 255, 298, 310, 342, 380, 418];
  const savesData = [8, 12, 10, 18, 22, 20, 28, 30, 26, 38, 42, 48, 54, 62];
  const maxV = 460;
  const w = 700, h = 220, pad = { l: 30, r: 12, t: 12, b: 24 };
  const cx = (i) => pad.l + (i / (viewsData.length - 1)) * (w - pad.l - pad.r);
  const cy = (v) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b);
  const viewsPath = viewsData.map((v, i) => `${i ? 'L' : 'M'} ${cx(i)} ${cy(v)}`).join(' ');
  const areaPath = viewsPath + ` L ${cx(viewsData.length - 1)} ${h - pad.b} L ${cx(0)} ${h - pad.b} Z`;
  const savesPath = savesData.map((v, i) => `${i ? 'L' : 'M'} ${cx(i)} ${cy(v * 6)}`).join(' ');
  return (
    <div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot color="var(--aubergine-600)" /> Views</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot color="var(--blush-500)" /> Saves (×6 for scale)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + (i / 3) * (h - pad.t - pad.b)} y2={pad.t + (i / 3) * (h - pad.t - pad.b)} stroke="var(--cream-200)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <path d={areaPath} fill="var(--aubergine-100)" opacity="0.6" />
        <path d={viewsPath} fill="none" stroke="var(--aubergine-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={savesPath} fill="none" stroke="var(--blush-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {viewsData.map((v, i) => <circle key={i} cx={cx(i)} cy={cy(v)} r={i === viewsData.length - 1 ? 5 : 0} fill="var(--aubergine-600)" stroke="#fff" strokeWidth="2" />)}
        {['Apr 4','','','Apr 7','','','Apr 10','','','Apr 13','','','','Apr 17'].map((t, i) => t && (
          <text key={i} x={cx(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--ink-500)" fontFamily="Figtree">{t}</text>
        ))}
      </svg>
    </div>
  );
};

const StyleDemand = () => {
  const data = [
    { id: 'y2k', name: 'Y2K', pct: 38, color: '#D4A5A5' },
    { id: 'minimalist', name: 'Minimalist', pct: 26, color: '#5B4D7A' },
    { id: 'cottagecore', name: 'Cottagecore', pct: 18, color: '#A8B79E' },
    { id: 'streetwear', name: 'Streetwear', pct: 12, color: '#3A2E3A' },
    { id: 'other', name: 'Other', pct: 6, color: '#B88468' },
  ];
  return (
    <div>
      {/* stacked bar */}
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 18 }}>
        {data.map(d => <div key={d.id} style={{ width: `${d.pct}%`, background: d.color }} />)}
      </div>
      {data.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Dot color={d.color} size={10} />
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>{d.pct}%</span>
        </div>
      ))}
      <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: 'var(--aubergine-100)', fontSize: 12, color: 'var(--plum-900)', lineHeight: 1.4 }}>
        <strong>Tip:</strong> Your Y2K pieces sell 3× faster than your average. Consider sourcing more.
      </div>
    </div>
  );
};

const TopSaved = () => {
  const rows = ITEMS.slice(0, 5).map((it, i) => ({ ...it, saves: 68 - i * 12, views: 420 - i * 48 }));
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-400)', width: 16, fontWeight: 600 }}>{i + 1}</div>
          <div style={{ width: 44, height: 54, borderRadius: 6, background: r.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={r.kind} color={r.color} accent={r.accent} /></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{r.era} · ${r.price}</div>
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

const DeadInventory = () => {
  const rows = ITEMS.slice(10, 14).map((it, i) => ({ ...it, days: 16 + i * 3 }));
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <div style={{ width: 44, height: 54, borderRadius: 6, background: r.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={r.kind} color={r.color} accent={r.accent} /></div>
          </div>
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

const RecentClaims = () => {
  const rows = [
    { id: 1, item: ITEMS[0], buyer: 'mara_k', type: 'Pickup · 48h', status: 'pending', when: '12m ago' },
    { id: 2, item: ITEMS[1], buyer: 'rhen.w', type: 'Ship · USPS', status: 'confirmed', when: '1h ago' },
    { id: 3, item: ITEMS[2], buyer: 'jules.m', type: 'Pickup · 72h', status: 'pending', when: '3h ago' },
    { id: 4, item: ITEMS[3], buyer: 'cai_sol', type: 'Pickup · 24h', status: 'completed', when: 'Yesterday' },
  ];
  const pill = (s) => {
    const map = {
      pending:   { bg: 'var(--blush-100)', c: 'var(--plum-900)', label: 'Needs response' },
      confirmed: { bg: 'var(--sage-200)', c: '#2E3A2E', label: 'Confirmed' },
      completed: { bg: 'var(--cream-100)', c: 'var(--ink-500)', label: 'Completed' },
    };
    const v = map[s];
    return <span style={{ padding: '3px 10px', borderRadius: 999, background: v.bg, color: v.c, fontSize: 11, fontWeight: 600 }}>{v.label}</span>;
  };
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
        {rows.map(r => (
          <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
            <td style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 46, borderRadius: 5, background: r.item.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={r.item.kind} color={r.item.color} accent={r.item.accent} /></div>
                </div>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{r.item.name}</div><div style={{ fontSize: 11, color: 'var(--ink-500)' }}>${r.item.price}</div></div>
              </div>
            </td>
            <td style={{ fontSize: 13 }}>@{r.buyer}</td>
            <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>{r.type}</td>
            <td>{pill(r.status)}</td>
            <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>{r.when}</td>
            <td style={{ textAlign: 'right' }}>
              {r.status === 'pending' ? <Btn variant="accent" size="sm">Confirm</Btn> : <Btn variant="soft" size="sm">View</Btn>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ————————————————————————————————————————————————————————————————————
// UPLOAD — AI auto-tag
// ————————————————————————————————————————————————————————————————————
const OwnerUpload = ({ store, setScreen }) => {
  const [pieces, setPieces] = React.useState([
    { id: 'u1', kind: 'dress', color: '#5B4D7A', bg: '#E2DCEB', accent: '#2A1F3A', aiTags: { category: 'Dress · Midi', era: '90s', color: 'Plum', style: 'Minimalist', material: 'Corduroy' }, price: '', was: '', size: 'M', condition: 'Excellent', confirmed: false },
    { id: 'u2', kind: 'jacket', color: '#8C6B4A', bg: '#E8DCC8', accent: '#3A2A1A', aiTags: { category: 'Jacket · Suede', era: '70s', color: 'Camel', style: 'Vintage Classic', material: 'Suede + Shearling' }, price: '', was: '', size: 'L', condition: 'Good', confirmed: false },
    { id: 'u3', kind: 'boots', color: '#3A2A1A', bg: '#EFE5D8', accent: '#1A0E08', aiTags: { category: 'Boots · Riding', era: '90s', color: 'Espresso', style: 'Cottagecore', material: 'Leather' }, price: '', was: '', size: '8', condition: 'Excellent', confirmed: false },
    { id: 'u4', kind: 'bag', color: '#C9A14A', bg: '#F4EDE0', accent: '#6B4A1A', aiTags: { category: 'Bag · Shoulder', era: '70s', color: 'Mustard', style: 'Cottagecore', material: 'Rattan' }, price: '', was: '', size: 'OS', condition: 'Excellent', confirmed: false },
    { id: 'u5', kind: 'blouse', color: '#D4A5A5', bg: '#F8E8E5', accent: '#6B3A3A', aiTags: { category: 'Blouse · Floral', era: '90s', color: 'Rose', style: 'Cottagecore', material: 'Silk' }, price: '', was: '', size: 'S', condition: 'Good', confirmed: false },
  ]);
  const [activeId, setActiveId] = React.useState('u1');
  const active = pieces.find(p => p.id === activeId);
  const confirmedCount = pieces.filter(p => p.confirmed).length;

  const update = (id, patch) => setPieces(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <button onClick={() => setScreen('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-500)', cursor: 'pointer', marginBottom: 6 }}>
            <Icon name="arrow-left" size={14} color="var(--ink-500)" /> Dashboard
          </button>
          <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: 0, fontWeight: 500 }}>Upload items</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 6 }}>Batch {pieces.length} of 20 · AI drafts tags — you confirm in seconds</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}><strong style={{ color: 'var(--ink-900)' }}>{confirmedCount}</strong> / {pieces.length} confirmed</div>
          <Btn variant="soft" size="md" icon={<Icon name="plus" size={14} />}>Add more</Btn>
          <Btn variant="accent" size="md" disabled={confirmedCount < pieces.length}>Publish {pieces.length} items</Btn>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: 'var(--cream-200)', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ width: `${(confirmedCount / pieces.length) * 100}%`, height: '100%', background: 'var(--aubergine-600)', transition: 'width .3s' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 360px', gap: 14 }}>
        {/* Sidebar — piece list */}
        <div style={{ padding: 12, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px 10px' }}>Queue</div>
          {pieces.map((p, i) => {
            const activeRow = activeId === p.id;
            return (
              <button key={p.id} onClick={() => setActiveId(p.id)} style={{
                width: '100%', padding: 8, borderRadius: 8, marginBottom: 4,
                background: activeRow ? 'var(--aubergine-100)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ width: 34, height: 42, borderRadius: 5, background: p.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={p.kind} color={p.color} accent={p.accent} /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.aiTags.category}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>#{i + 1} · {p.confirmed ? 'Ready' : 'Needs tags'}</div>
                </div>
                {p.confirmed && <Icon name="check-circle" size={16} color="var(--sage-500)" />}
              </button>
            );
          })}
          <button style={{
            width: '100%', padding: 10, marginTop: 6,
            border: '1px dashed var(--line)', borderRadius: 8,
            color: 'var(--ink-500)', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer',
          }}><Icon name="upload" size={14} /> Drop more photos</button>
        </div>

        {/* Center — photo preview with AI annotations */}
        <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--aubergine-100)', color: 'var(--aubergine-600)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="sparkle" size={12} color="var(--aubergine-600)" /> AI drafted these
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Confirm or correct — avg 22s per item</span>
            </div>
            <button style={{ fontSize: 12, color: 'var(--ink-500)', cursor: 'pointer' }}>Reshoot</button>
          </div>

          <div style={{
            borderRadius: 'var(--r-md)', background: active.bg, height: 380,
            position: 'relative', overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{ position: 'absolute', inset: '6% 20%' }}>
              <GarmentSVG kind={active.kind} color={active.color} accent={active.accent} />
            </div>
            {/* Detection corners */}
            <div style={{ position: 'absolute', inset: '6% 20%' }}>
              {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => (
                <div key={i} style={{
                  position: 'absolute', [x ? 'right' : 'left']: -2, [y ? 'bottom' : 'top']: -2,
                  width: 18, height: 18,
                  borderTop: y ? 'none' : '2px solid var(--aubergine-600)',
                  borderBottom: y ? '2px solid var(--aubergine-600)' : 'none',
                  borderLeft: x ? 'none' : '2px solid var(--aubergine-600)',
                  borderRight: x ? '2px solid var(--aubergine-600)' : 'none',
                }} />
              ))}
            </div>
            <div style={{
              position: 'absolute', top: 12, right: 12,
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(91,77,122,0.95)', color: '#fff',
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="sparkle" size={12} color="#fff" />
              94% match confidence
            </div>
          </div>

          {/* AI tag chips */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>AI tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {Object.entries(active.aiTags).map(([k, v]) => (
              <div key={k} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 5px', borderRadius: 999,
                background: 'var(--aubergine-100)', fontSize: 12,
              }}>
                <Icon name="sparkle" size={10} color="var(--aubergine-600)" />
                <span style={{ color: 'var(--ink-500)', fontSize: 10 }}>{k}:</span>
                <strong style={{ color: 'var(--aubergine-600)' }}>{v}</strong>
              </div>
            ))}
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999,
              border: '1px dashed var(--line)', fontSize: 12,
              color: 'var(--ink-500)', cursor: 'pointer',
            }}><Icon name="plus" size={12} /> Add tag</button>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ padding: 18, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', alignSelf: 'start' }}>
          <Field label="Title">
            <input defaultValue={`${active.aiTags.era} ${active.aiTags.category}`}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, outline: 'none' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Price"><PriceInput value={active.price} onChange={v => update(active.id, { price: v })} placeholder="48" /></Field>
            <Field label="Was (optional)"><PriceInput value={active.was} onChange={v => update(active.id, { was: v })} placeholder="—" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Size">
              <select defaultValue={active.size} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, background: '#fff' }}>
                <option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>OS</option>
              </select>
            </Field>
            <Field label="Condition">
              <select defaultValue={active.condition} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, background: '#fff' }}>
                <option>Excellent</option><option>Good</option><option>Fair</option><option>Loved</option>
              </select>
            </Field>
          </div>
          <Field label="Notes (optional)">
            <textarea placeholder="e.g. slight wear on hem, original buttons" rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, outline: 'none', resize: 'none' }} />
          </Field>

          <div style={{ padding: 10, borderRadius: 8, background: 'var(--cream-100)', fontSize: 11, color: 'var(--ink-700)', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Icon name="eye" size={14} color="var(--ink-500)" />
            <span>Going live to shoppers matching Cottagecore, Y2K within 30mi.</span>
          </div>

          <Btn variant="accent" size="md" fullWidth disabled={active.confirmed}
            onClick={() => {
              update(active.id, { confirmed: true });
              const nextIdx = pieces.findIndex(p => p.id === active.id) + 1;
              if (nextIdx < pieces.length) setActiveId(pieces[nextIdx].id);
            }}
            icon={<Icon name="checkmark" size={14} color="#fff" strokeWidth={2.5} />}>
            {active.confirmed ? 'Confirmed' : 'Confirm & next'}
          </Btn>
          <button style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 12, color: 'var(--ink-500)', cursor: 'pointer' }}>Skip for now</button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    {children}
  </div>
);

const PriceInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)', fontSize: 14 }}>$</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '10px 12px 10px 22px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, outline: 'none' }} />
  </div>
);

const OwnerInventory = ({ store }) => (
  <div style={{ padding: '28px 32px 48px', maxWidth: 1200 }}>
    <h1 className="display" style={{ fontSize: 34, lineHeight: 1, margin: 0, fontWeight: 500 }}>Inventory</h1>
    <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 6, marginBottom: 24 }}>All active items · {ITEMS.filter(i => i.store === store.id).length} pieces</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
      {ITEMS.filter(i => i.store === store.id).concat(ITEMS.slice(0,10)).map(item => (
        <div key={item.id + Math.random()} style={{ padding: 10, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div style={{ aspectRatio: '3/4', borderRadius: 8, background: item.bg, position: 'relative', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{item.era} · Size {item.size}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontWeight: 600 }}>${item.price}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{Math.floor(Math.random() * 80) + 10}👁</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { StoreOwnerApp, OwnerDashboard, OwnerUpload, OwnerSidebar, OwnerInventory });
