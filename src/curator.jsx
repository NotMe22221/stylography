// Curator — desktop drag-and-drop outfit canvas

const CuratorApp = () => {
  const [canvas, setCanvas] = React.useState([]); // [{itemId, x, y, z, rot}]
  const [filter, setFilter] = React.useState({ cat: 'all', store: 'all', style: 'all' });
  const [boardName, setBoardName] = React.useState('Sunday thrifting, low-key');
  const [mood, setMood] = React.useState('Casual');
  const [dragId, setDragId] = React.useState(null);

  const canvasRef = React.useRef(null);

  const filtered = ITEMS.filter(i => {
    if (filter.store !== 'all' && i.store !== filter.store) return false;
    if (filter.cat !== 'all') {
      const catMap = { top: ['top','blouse','tee'], bottom: ['pants','jeans','skirt'], outer: ['jacket','coat'], shoes: ['shoes','sneakers','boots','heels'], acc: ['bag','hat','jewelry','sunglasses','scarf','belt'] };
      if (!catMap[filter.cat]?.includes(i.kind)) return false;
    }
    if (filter.style !== 'all' && !i.style.includes(filter.style)) return false;
    return true;
  });

  const addToCanvas = (itemId) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const placed = canvas.filter(c => c.itemId === itemId);
    if (placed.length) return; // no dupes
    setCanvas(c => [...c, { itemId, x: 100 + c.length * 30, y: 80 + c.length * 20, z: c.length + 1, rot: (Math.random() * 10 - 5) }]);
  };

  const removeFromCanvas = (itemId) => setCanvas(c => c.filter(x => x.itemId !== itemId));

  const onCanvasDragOver = (e) => { e.preventDefault(); };
  const onCanvasDrop = (e) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const move = e.dataTransfer.getData('move');
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 80;
    const y = e.clientY - rect.top - 100;
    if (move) {
      setCanvas(c => c.map(p => p.itemId === itemId ? { ...p, x, y } : p));
    } else if (itemId && !canvas.find(p => p.itemId === itemId)) {
      setCanvas(c => [...c, { itemId, x, y, z: c.length + 1, rot: (Math.random() * 10 - 5) }]);
    }
  };

  const total = canvas.reduce((s, p) => s + byId(p.itemId).price, 0);
  const uniqueStores = new Set(canvas.map(p => byId(p.itemId).store));

  // AI suggestions based on current canvas
  const suggestions = canvas.length > 0
    ? ITEMS.filter(i => !canvas.find(p => p.itemId === i.id) && i.style.some(s => canvas.map(p => byId(p.itemId).style).flat().includes(s))).slice(0, 6)
    : ITEMS.slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cream-50)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <Wordmark size={17} />
        <div style={{ height: 22, width: 1, background: 'var(--line)', margin: '0 6px' }} />
        <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Curator studio</div>
        <div style={{ flex: 1 }} />
        <input value={boardName} onChange={e => setBoardName(e.target.value)} style={{ fontSize: 15, fontWeight: 600, padding: '6px 10px', border: '1px solid transparent', borderRadius: 6, width: 280, outline: 'none', background: 'var(--cream-50)' }} />
        <select value={mood} onChange={e => setMood(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13, background: '#fff' }}>
          <option>Casual</option><option>Date Night</option><option>Workwear</option><option>Festival</option><option>Weekend</option>
        </select>
        <Btn variant="soft" size="sm">Preview</Btn>
        <Btn variant="accent" size="sm" disabled={canvas.length < 3}>Publish board</Btn>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 300px', overflow: 'hidden' }}>
        {/* LEFT — item library */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 8px' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Icon name="search" size={14} color="var(--ink-500)" />
              <input placeholder="Search inventory..." style={{ position: 'relative', top: -18, width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, outline: 'none' }} />
              <div style={{ position: 'absolute', left: 10, top: 11 }}><Icon name="search" size={14} color="var(--ink-500)" /></div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {[['all','All'],['top','Tops'],['bottom','Bottoms'],['outer','Outer'],['shoes','Shoes'],['acc','Access.']].map(([id,label]) => (
                <button key={id} onClick={() => setFilter(f => ({ ...f, cat: id }))} style={{
                  padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  background: filter.cat === id ? 'var(--ink-900)' : 'transparent',
                  color: filter.cat === id ? '#fff' : 'var(--ink-700)',
                  border: filter.cat === id ? 'none' : '1px solid var(--line)', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
            <select value={filter.store} onChange={e => setFilter(f => ({ ...f, store: e.target.value }))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12, background: '#fff', marginBottom: 6 }}>
              <option value="all">All stores</option>
              {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {filtered.map(item => {
                const used = canvas.find(p => p.itemId === item.id);
                return (
                  <div key={item.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('itemId', item.id); setDragId(item.id); }}
                    onDragEnd={() => setDragId(null)}
                    onDoubleClick={() => addToCanvas(item.id)}
                    style={{
                      position: 'relative', aspectRatio: '3/4', borderRadius: 8,
                      background: item.bg, overflow: 'hidden',
                      border: used ? '1.5px solid var(--aubergine-600)' : '1px solid var(--line)',
                      cursor: 'grab', opacity: dragId === item.id ? 0.4 : 1,
                      transition: 'transform .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ position: 'absolute', inset: '12% 20%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>
                    {used && <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--aubergine-600)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 6px 4px', background: 'linear-gradient(transparent, rgba(31,24,32,0.7))', color: '#fff', fontSize: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeById(item.store).name.split(' ')[0]}</span>
                        <span style={{ fontWeight: 600 }}>${item.price}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER — canvas */}
        <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--cream-100)' }}>
          <div
            ref={canvasRef}
            onDragOver={onCanvasDragOver}
            onDrop={onCanvasDrop}
            style={{
              position: 'absolute', inset: 20, borderRadius: 'var(--r-lg)',
              background: 'var(--cream-50)',
              backgroundImage: 'radial-gradient(rgba(58,46,58,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              border: dragId ? '2px dashed var(--aubergine-600)' : '1px solid var(--line)',
              transition: 'border-color .15s',
              overflow: 'hidden',
            }}
          >
            {canvas.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-400)', pointerEvents: 'none' }}>
                <Icon name="plus" size={32} color="var(--ink-400)" />
                <div className="display" style={{ fontSize: 20, fontWeight: 500 }}>Drag pieces here</div>
                <div style={{ fontSize: 13 }}>Or double-click from the library</div>
              </div>
            )}
            {canvas.map(p => {
              const item = byId(p.itemId);
              return (
                <div key={p.itemId}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('itemId', p.itemId); e.dataTransfer.setData('move', '1'); }}
                  style={{
                    position: 'absolute', left: p.x, top: p.y, width: 160, height: 200,
                    zIndex: p.z, cursor: 'grab', transform: `rotate(${p.rot}deg)`,
                    transition: 'transform .15s',
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <GarmentSVG kind={item.kind} color={item.color} accent={item.accent} />
                    {/* price tag */}
                    <div style={{
                      position: 'absolute', top: -4, right: -8,
                      padding: '3px 9px', borderRadius: 999,
                      background: 'var(--ink-900)', color: '#fff',
                      fontSize: 11, fontWeight: 600,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}>${item.price}</div>
                    {/* remove on hover */}
                    <button onClick={() => removeFromCanvas(p.itemId)} style={{
                      position: 'absolute', top: 8, left: 8,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--surface)', color: 'var(--ink-700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                      opacity: 0.7,
                    }}><Icon name="close" size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas meta bar */}
          <div style={{
            position: 'absolute', bottom: 32, left: 32, right: 32,
            padding: '12px 18px', borderRadius: 'var(--r-pill)',
            background: 'rgba(31,24,32,0.88)', backdropFilter: 'blur(10px)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 18, fontSize: 13,
          }}>
            <span><strong>{canvas.length}</strong> pieces</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span><strong>{uniqueStores.size}</strong> store{uniqueStores.size === 1 ? '' : 's'}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>Total <strong>${total}</strong></span>
            <div style={{ flex: 1 }} />
            <span style={{ opacity: 0.6, fontSize: 11 }}>Drag to reposition · double-click library to add</span>
          </div>
        </div>

        {/* RIGHT — AI suggestions + tags */}
        <div style={{ borderLeft: '1px solid var(--line)', padding: 18, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="sparkle" size={14} color="var(--aubergine-600)" />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI suggestions</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 14 }}>
            {canvas.length > 0 ? 'Complements the pieces on your canvas' : 'Start with one of these favorites'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {suggestions.map(item => (
              <div key={item.id} onClick={() => addToCanvas(item.id)} style={{
                position: 'relative', aspectRatio: '3/4', borderRadius: 8,
                background: item.bg, overflow: 'hidden', cursor: 'pointer',
                border: '1px solid var(--line)', transition: 'transform .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ position: 'absolute', inset: '12% 20%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>
                <div style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, color: 'var(--aubergine-600)' }}>+{Math.floor(Math.random() * 20 + 70)}%</div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 6px 4px', background: 'linear-gradient(transparent, rgba(31,24,32,0.65))', color: '#fff', fontSize: 10, fontWeight: 600 }}>${item.price}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Board tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Casual','Weekend','Thrifted','Under $200','Cozy'].map(t => <Chip key={t} active color="var(--aubergine-600)">{t}</Chip>)}
            <button style={{ padding: '6px 12px', borderRadius: 999, border: '1px dashed var(--line)', fontSize: 13, color: 'var(--ink-500)', cursor: 'pointer' }}>+ Add</button>
          </div>

          <div style={{ marginTop: 24, padding: 12, borderRadius: 8, background: 'var(--sage-200)', fontSize: 12, color: '#2E3A2E', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Curator XP</div>
            Publishing this board earns you <strong>+40 XP</strong> and contributes to your Weekly Top Curator ranking.
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CuratorApp });
