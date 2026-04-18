// Shopper screens pt 2: board detail, shop-pin, store profile, saved

const BoardDetail = ({ push, selectedBoard, savedBoards, setSavedBoards, toggleSet, savedItems, setSavedItems, setClaimed }) => {
  const outfit = OUTFITS.find(o => o.id === selectedBoard) || OUTFITS[0];
  const items = outfit.items.map(byId);
  const saved = savedBoards.has(outfit.id);
  const [claimOpen, setClaimOpen] = React.useState(null); // item id

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      {/* Top */}
      <div style={{ padding: '52px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => push('feed')} />
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn icon="share" />
          <IconBtn icon={saved ? 'bookmark-fill' : 'bookmark'} onClick={() => toggleSet(setSavedBoards, outfit.id)} active={saved} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 120px' }}>
        {/* Hero composition */}
        <div style={{ margin: '0 16px', height: 380, borderRadius: 'var(--r-lg)', background: items[0]?.bg || 'var(--cream-100)', position: 'relative', overflow: 'hidden' }}>
          {items[0] && <div style={{ position: 'absolute', left: '14%', right: '42%', top: '4%', height: '60%', transform: 'rotate(-5deg)' }}><GarmentSVG kind={items[0].kind} color={items[0].color} accent={items[0].accent} /></div>}
          {items[1] && <div style={{ position: 'absolute', left: '42%', right: '6%', top: '12%', height: '62%', transform: 'rotate(6deg)' }}><GarmentSVG kind={items[1].kind} color={items[1].color} accent={items[1].accent} /></div>}
          {items[2] && <div style={{ position: 'absolute', left: '4%', right: '62%', top: '56%', height: '40%', transform: 'rotate(-4deg)' }}><GarmentSVG kind={items[2].kind} color={items[2].color} accent={items[2].accent} /></div>}
          {items[3] && <div style={{ position: 'absolute', left: '54%', right: '10%', top: '60%', height: '38%', transform: 'rotate(8deg)' }}><GarmentSVG kind={items[3].kind} color={items[3].color} accent={items[3].accent} /></div>}
        </div>

        {/* Title row */}
        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{outfit.mood}</div>
          <h1 className="display" style={{ fontSize: 32, lineHeight: 1.05, margin: 0, fontWeight: 500 }}>{outfit.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Avatar name={outfit.curator} size={32} color="var(--aubergine-500)" />
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{outfit.curator}</div>
              <div style={{ color: 'var(--ink-500)' }}>{outfit.likes.toLocaleString()} loves · {outfit.saves} saves</div>
            </div>
            <div style={{ flex: 1 }} />
            <Btn variant="ghost" size="sm">Follow</Btn>
          </div>
        </div>

        {/* Item list — shop the look */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Shop the look</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>${items.reduce((s,i) => s + i.price, 0)} total</div>
          </div>
          {items.map(item => {
            const store = storeById(item.store);
            const isSaved = savedItems.has(item.id);
            return (
              <div key={item.id} style={{
                display: 'flex', gap: 12, padding: 12, marginBottom: 8,
                borderRadius: 'var(--r-md)', background: 'var(--surface)',
                border: '1px solid var(--line)',
              }}>
                <div style={{ width: 68, height: 84, borderRadius: 10, background: item.bg, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{item.era} · Size {item.size}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--ink-500)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: store.color }} />
                    <span>{store.name}</span>
                    <span>· {store.city.split(',')[0]}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>${item.price}</div>
                  <button onClick={() => toggleSet(setSavedItems, item.id)} style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: isSaved ? 'var(--blush-500)' : 'var(--cream-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <Icon name={isSaved ? 'heart-fill' : 'heart'} size={14} color={isSaved ? '#fff' : 'var(--ink-900)'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Claim whole look */}
        <div style={{ padding: '20px' }}>
          <Btn variant="accent" size="lg" fullWidth onClick={() => setClaimOpen(items[0].id)} icon={<Icon name="tag" size={18} color="#fff" />}>
            Claim entire outfit · ${items.reduce((s,i) => s + i.price, 0)}
          </Btn>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--ink-500)' }}>
            Reserve items for 72h pickup · No charge until confirmed
          </div>
        </div>
      </div>

      {claimOpen && <ClaimSheet item={byId(claimOpen)} onClose={() => setClaimOpen(null)} onConfirm={(win) => { setClaimed({ itemId: claimOpen, window: win }); setClaimOpen(null); }} />}
    </div>
  );
};

const ClaimSheet = ({ item, onClose, onConfirm }) => {
  const [method, setMethod] = React.useState('pickup');
  const [win, setWin] = React.useState('48');
  const store = storeById(item.store);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'flex-end', background: 'rgba(31,24,32,0.5)', animation: 'fadeIn .2s' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--cream-50)',
        borderRadius: '28px 28px 0 0', padding: '12px 24px 36px',
        animation: 'fadeUp .25s',
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--cream-300)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Claim item</div>
        <h2 className="display" style={{ fontSize: 24, lineHeight: 1.1, margin: '6px 0 4px', fontWeight: 500 }}>{item.name}</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{store.name} · {store.city}</div>

        <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-700)', marginBottom: 10 }}>Fulfillment</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'pickup', label: 'In-store pickup', icon: 'shop' }, { id: 'ship', label: 'Ship to me', icon: 'truck' }].map(o => (
            <button key={o.id} onClick={() => setMethod(o.id)} style={{
              flex: 1, padding: '14px 12px', borderRadius: 'var(--r-md)',
              background: method === o.id ? 'var(--aubergine-100)' : 'var(--surface)',
              border: method === o.id ? '1.5px solid var(--aubergine-600)' : '1px solid var(--line)',
              display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
              cursor: 'pointer',
            }}>
              <Icon name={o.icon} size={18} color={method === o.id ? 'var(--aubergine-600)' : 'var(--ink-700)'} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{o.label}</span>
            </button>
          ))}
        </div>

        {method === 'pickup' && (
          <>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-700)', marginBottom: 10 }}>Pickup window</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['24', '48', '72'].map(h => (
                <button key={h} onClick={() => setWin(h)} style={{
                  flex: 1, padding: 12, borderRadius: 'var(--r-md)',
                  background: win === h ? 'var(--aubergine-600)' : 'var(--surface)',
                  border: win === h ? 'none' : '1px solid var(--line)',
                  color: win === h ? '#fff' : 'var(--ink-900)',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>{h} hrs</button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 20, padding: 14, borderRadius: 'var(--r-md)', background: 'var(--blush-100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="clock" size={18} color="var(--plum-900)" />
          <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--plum-900)' }}>
            <strong>No payment now.</strong> {store.owner} confirms availability, then you pay at pickup.
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Subtotal</div>
          <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>${item.price}</div>
        </div>

        <Btn variant="accent" size="lg" fullWidth style={{ marginTop: 14 }} onClick={() => onConfirm(win)}>
          Send claim request
        </Btn>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————————————
// SHOP THIS PIN — drop an outfit photo, get shoppable map
// ————————————————————————————————————————————————————————————————————
const ShopPin = ({ push, savedItems, setSavedItems, toggleSet }) => {
  const [stage, setStage] = React.useState('drop'); // drop -> analyzing -> results
  const [dots, setDots] = React.useState([]); // hotspots: {x, y, itemId}
  const [active, setActive] = React.useState(null);

  const startAnalyze = () => {
    setStage('analyzing');
    setTimeout(() => {
      // Fake hotspots — roughly: top, bottom, bag, shoes on a portrait image
      setDots([
        { x: 50, y: 28, itemId: 'i4', label: 'Top' },
        { x: 48, y: 58, itemId: 'i17', label: 'Pants' },
        { x: 70, y: 52, itemId: 'i8', label: 'Bag' },
        { x: 52, y: 88, itemId: 'i7', label: 'Boots' },
      ]);
      setStage('results');
      setActive('i4');
    }, 2000);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '52px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => push('feed')} />
        <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>Shop This Pin</div>
        <div style={{ width: 40 }} />
      </div>

      {stage === 'drop' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 120px' }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: 1.05, margin: '8px 0 10px', fontWeight: 500 }}>
            Spot an outfit you love.<br/>
            <em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>We'll find its pieces.</em>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.5 }}>
            Drop a Pinterest screenshot or any outfit photo. Our AI identifies each piece and matches it to real items in local vintage stores.
          </p>

          {/* Drop zone */}
          <button onClick={startAnalyze} style={{
            width: '100%', marginTop: 20, padding: '40px 24px',
            borderRadius: 'var(--r-lg)',
            background: 'repeating-linear-gradient(135deg, var(--cream-100) 0 12px, var(--cream-50) 12px 24px)',
            border: '2px dashed var(--aubergine-200)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--aubergine-600)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--aubergine-200)'}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="upload" size={28} color="var(--aubergine-600)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Drop a photo here</div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>or tap to upload · JPG, PNG, up to 10MB</div>
            </div>
          </button>

          <div style={{ textAlign: 'center', margin: '16px 0', fontSize: 12, color: 'var(--ink-400)' }}>or</div>

          <div style={{ position: 'relative' }}>
            <input placeholder="Paste Pinterest or Instagram link" style={{
              width: '100%', padding: '14px 46px 14px 44px',
              borderRadius: 'var(--r-md)', border: '1px solid var(--line)',
              background: 'var(--surface)', fontSize: 14, outline: 'none',
            }} />
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon name="link" size={18} color="var(--ink-500)" />
            </div>
          </div>

          <Btn variant="soft" size="md" fullWidth style={{ marginTop: 10 }} icon={<Icon name="camera" size={16} />}>
            Take a photo
          </Btn>

          {/* Example */}
          <div style={{ marginTop: 28, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--blush-100)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum-900)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example</div>
            <div style={{ fontSize: 13, color: 'var(--plum-900)', marginTop: 4, lineHeight: 1.4 }}>
              A shopper dropped a Pinterest pin of a '90s grunge fit. We matched her with a corduroy jacket at Fernwood, Levi's at Stitching Styles, and leather boots 4 miles away — all under $200.
            </div>
          </div>

          <Btn variant="accent" size="lg" fullWidth style={{ marginTop: 24 }} onClick={startAnalyze}>
            Try with a demo photo
          </Btn>
        </div>
      )}

      {(stage === 'analyzing' || stage === 'results') && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
          {/* Analyzed image */}
          <div style={{
            position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden',
            background: 'linear-gradient(160deg, #E8DFD0, #D4C6B0)', aspectRatio: '3 / 4',
          }}>
            {/* Placeholder person-ish silhouette */}
            <div style={{ position: 'absolute', inset: 0 }}>
              <svg viewBox="0 0 300 400" style={{ width: '100%', height: '100%' }}>
                <ellipse cx="150" cy="70" rx="36" ry="42" fill="#B0A090" opacity="0.9" />
                {/* Top */}
                <path d="M100 115 L130 105 Q150 112 170 105 L200 115 L212 180 L195 185 L195 230 L105 230 L105 185 L88 180 Z" fill="#D4A5A5" />
                {/* Pants */}
                <path d="M108 230 L192 230 L196 260 L194 380 L160 380 L152 290 L148 290 L140 380 L106 380 L104 260 Z" fill="#6B4A3A" />
                {/* Bag */}
                <rect x="210" y="200" width="48" height="52" rx="6" fill="#C9A14A" />
                <path d="M218 200 Q218 188 234 188 Q250 188 250 200" stroke="#6B4A1A" strokeWidth="2.5" fill="none" />
                {/* Boots */}
                <rect x="110" y="360" width="40" height="30" rx="3" fill="#3A2A1A" />
                <rect x="150" y="360" width="40" height="30" rx="3" fill="#3A2A1A" />
              </svg>
            </div>

            {/* Scanning line */}
            {stage === 'analyzing' && (
              <>
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, transparent, var(--aubergine-600), transparent)',
                  boxShadow: '0 0 20px var(--aubergine-600)',
                  animation: 'scan 1.8s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'absolute', bottom: 16, left: 16, right: 16,
                  padding: '10px 14px', borderRadius: 'var(--r-pill)',
                  background: 'rgba(31,24,32,0.85)', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                  backdropFilter: 'blur(8px)',
                }}>
                  <Icon name="sparkle" size={16} color="#fff" />
                  Identifying pieces…
                </div>
                <style>{`@keyframes scan { 0% { top: 5%; } 50% { top: 95%; } 100% { top: 5%; } }`}</style>
              </>
            )}

            {/* Hotspots */}
            {stage === 'results' && dots.map((d, i) => (
              <button key={i} onClick={() => setActive(d.itemId)} style={{
                position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
                transform: 'translate(-50%, -50%)', width: 32, height: 32, borderRadius: '50%',
                background: active === d.itemId ? 'var(--aubergine-600)' : 'rgba(255,255,255,0.95)',
                color: active === d.itemId ? '#fff' : 'var(--aubergine-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)', border: '2px solid #fff',
                animation: `pinFall .4s ${i * 0.08}s both`,
              }}>{i + 1}</button>
            ))}

            {stage === 'results' && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                padding: '6px 10px', borderRadius: 'var(--r-pill)',
                background: 'rgba(31,24,32,0.85)', color: '#fff',
                fontSize: 11, fontWeight: 600, backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Icon name="sparkle" size={12} color="#fff" />
                {dots.length} pieces found
              </div>
            )}
          </div>

          {/* Matches */}
          {stage === 'results' && (
            <>
              <div style={{ marginTop: 24 }}>
                <div className="display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Local matches</div>
                <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Tap a number above to see that piece</div>
              </div>
              <div style={{ marginTop: 14 }}>
                {dots.map((d, i) => {
                  const item = byId(d.itemId);
                  const store = storeById(item.store);
                  const isActive = active === d.itemId;
                  const isSaved = savedItems.has(item.id);
                  return (
                    <div key={d.itemId} onClick={() => setActive(d.itemId)} style={{
                      display: 'flex', gap: 12, padding: 12, marginBottom: 10,
                      borderRadius: 'var(--r-md)',
                      background: isActive ? 'var(--aubergine-100)' : 'var(--surface)',
                      border: isActive ? '1.5px solid var(--aubergine-600)' : '1px solid var(--line)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      <div style={{ position: 'relative', width: 68, height: 84, borderRadius: 10, background: item.bg, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>
                        <div style={{
                          position: 'absolute', top: 4, left: 4,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--aubergine-600)', color: '#fff',
                          fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--aubergine-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.label} match</div>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: store.color }} />
                          {store.name} · {(Math.random() * 5 + 1).toFixed(1)}mi away
                        </div>
                        {/* Match confidence */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--cream-200)', overflow: 'hidden' }}>
                            <div style={{ width: `${85 - i * 7}%`, height: '100%', background: 'var(--aubergine-600)' }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--ink-500)' }}>{85 - i * 7}%</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>${item.price}</div>
                        <button onClick={(e) => { e.stopPropagation(); toggleSet(setSavedItems, item.id); }} style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isSaved ? 'var(--blush-500)' : 'var(--cream-100)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                          <Icon name={isSaved ? 'heart-fill' : 'heart'} size={12} color={isSaved ? '#fff' : 'var(--ink-900)'} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px 32px', background: 'linear-gradient(transparent, var(--cream-50) 30%)' }}>
                <Btn variant="accent" size="lg" fullWidth icon={<Icon name="bookmark" size={16} color="#fff" />}>
                  Save as outfit board
                </Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ————————————————————————————————————————————————————————————————————
// STORE PROFILE (mini)
// ————————————————————————————————————————————————————————————————————
const StoreProfile = ({ push, selectedStore }) => {
  const store = storeById(selectedStore) || STORES[0];
  const items = ITEMS.filter(i => i.store === store.id);
  const outfits = OUTFITS.filter(o => o.items.some(id => byId(id).store === store.id));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '52px 16px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => push('feed')} />
        <IconBtn icon="share" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>
        <div style={{ padding: '8px 20px' }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: store.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{store.emoji}</div>
          <h1 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '14px 0 4px', fontWeight: 500 }}>{store.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{store.type} · {store.city} · Est. {store.established}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn variant="accent" size="md">Follow</Btn>
            <Btn variant="soft" size="md" icon={<Icon name="pin" size={14} />}>Directions</Btn>
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Curated looks</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, margin: '0 -20px', padding: '0 20px 8px' }}>
            {outfits.map(o => (
              <div key={o.id} style={{ flexShrink: 0, width: 140 }}>
                <BoardCard outfit={o} onClick={() => push('board', { board: o.id })} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Available now ({items.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {items.map(i => (
              <div key={i.id} style={{ height: 180, borderRadius: 'var(--r-md)', background: i.bg, position: 'relative', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div style={{ position: 'absolute', inset: '12% 18%' }}><GarmentSVG kind={i.kind} color={i.color} accent={i.accent} /></div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 10px 8px', background: 'linear-gradient(transparent, rgba(31,24,32,0.65))', color: '#fff', fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, opacity: 0.9 }}><span>{i.era}</span><span style={{ fontWeight: 600 }}>${i.price}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————————————
// SAVED
// ————————————————————————————————————————————————————————————————————
const Saved = ({ push, savedBoards, savedItems, setSavedBoards, setSavedItems, toggleSet }) => {
  const [tab, setTab] = React.useState('boards');
  const boards = OUTFITS.filter(o => savedBoards.has(o.id));
  const items = ITEMS.filter(i => savedItems.has(i.id));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <TopBar title="Saved" />
      <div style={{ padding: '0 20px', display: 'flex', gap: 18, borderBottom: '1px solid var(--line)' }}>
        {[{id:'boards',label:`Boards (${boards.length})`},{id:'items',label:`Items (${items.length})`}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 0', fontSize: 15, fontWeight: 600,
            color: tab === t.id ? 'var(--ink-900)' : 'var(--ink-400)',
            borderBottom: tab === t.id ? '2px solid var(--aubergine-600)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 100px' }}>
        {tab === 'boards' && (
          boards.length === 0 ? <EmptyState icon="bookmark" title="No boards saved yet" hint="Tap the bookmark on any outfit you like." />
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {boards.map(o => <BoardCard key={o.id} outfit={o} saved onSave={e => {e.stopPropagation(); toggleSet(setSavedBoards, o.id);}} onClick={() => push('board', { board: o.id })} />)}
            </div>
        )}
        {tab === 'items' && (
          items.length === 0 ? <EmptyState icon="heart" title="No items saved yet" hint="Tap the heart on any piece to save it." />
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {items.map(i => (
                <div key={i.id} style={{ height: 200, borderRadius: 'var(--r-md)', background: i.bg, position: 'relative', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={i.kind} color={i.color} accent={i.accent} /></div>
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 10px 10px', background: 'linear-gradient(transparent, rgba(31,24,32,0.65))', color: '#fff', fontSize: 11 }}>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span>{storeById(i.store).name}</span><span style={{ fontWeight: 600 }}>${i.price}</span></div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
      <BottomNav current="saved" push={push} savedCount={boards.length + items.length} />
    </div>
  );
};

const EmptyState = ({ icon, title, hint }) => (
  <div style={{ padding: '80px 40px', textAlign: 'center' }}>
    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--cream-100)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={26} color="var(--ink-400)" />
    </div>
    <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{hint}</div>
  </div>
);

Object.assign(window, { BoardDetail, ShopPin, StoreProfile, Saved, ClaimSheet, EmptyState });
