import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, orderBy, limit, increment } from 'firebase/firestore';
import { db, createCheckoutSession } from './firebase.js';
import { Wordmark, Btn, Chip, Icon, Avatar } from './primitives.jsx';
import { GarmentSVG } from './garments.jsx';
import { OUTFITS, ITEMS, STYLE_CLUSTERS, byId, storeById } from './data.jsx';
import { trackEvent } from './events.js';
import StoreMap from './StoreMap.jsx';

// ─── Main shell ───────────────────────────────────────────────────────────────

export default function ShopperApp({ user, initialScreen = 'welcome', onExit, stripeSuccess }) {
  const [screen,        setScreen]        = useState(initialScreen);
  const [paymentBanner, setPaymentBanner] = useState(!!stripeSuccess);
  const [quizPicks,     setQuizPicks]     = useState(new Set());
  const [styleScores,   setStyleScores]   = useState({});
  const [budget,        setBudget]        = useState(75);
  const [sizes,         setSizes]         = useState(new Set(['M']));
  const [colors,        setColors]        = useState(new Set());
  const [occasions,     setOccasions]     = useState(new Set());
  const [location,      setLocation]      = useState('');
  const [savedBoards,   setSavedBoards]   = useState(new Set());
  const [savedItems,    setSavedItems]    = useState(new Set());
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [claimed,       setClaimed]       = useState(null);
  const [feedTab,       setFeedTab]       = useState('foryou');
  const [feedOutfits,   setFeedOutfits]   = useState(OUTFITS);
  const [allItems,      setAllItems]      = useState(ITEMS);
  const [pinPhoto,      setPinPhoto]      = useState(null);
  const [selectedItem,  setSelectedItem]  = useState(null);

  // Load real outfits from Firestore (fall back to seed if empty)
  useEffect(() => {
    getDocs(collection(db, 'outfits')).then(snap => {
      if (!snap.empty) setFeedOutfits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {}); // silently fall back to seed data
  }, []);

  // Load real items from Firestore (fall back to seed if empty)
  useEffect(() => {
    getDocs(query(collection(db, 'items'), where('status', '==', 'active'))).then(snap => {
      if (!snap.empty) setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
  }, []);

  const push = (s, opts = {}) => {
    if (opts.board)       setSelectedBoard(opts.board);
    if (opts.store)       setSelectedStore(opts.store);
    if (opts.photoFile)   setPinPhoto({ file: opts.photoFile, preview: opts.photoPreview });
    if (opts.item)        setSelectedItem(opts.item);
    setScreen(s);
  };

  const toggleSet = (setter, value) => setter(prev => {
    const next = new Set(prev);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });

  // Save taste profile to Firestore after onboarding
  const saveTasteProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        tasteProfile: {
          styleScores,
          budget,
          sizes:    [...sizes],
          colors:   [...colors],
          occasions:[...occasions],
          location,
        },
        onboarded:  true,
        updatedAt:  serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Failed to save taste profile', err);
    }
  };

  // Toggle save a board (persisted to Firestore if logged in)
  const toggleSaveBoard = async (boardId) => {
    toggleSet(setSavedBoards, boardId);
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'saves', `board_${boardId}`);
      if (savedBoards.has(boardId)) {
        await updateDoc(ref, { deletedAt: serverTimestamp() }).catch(() => {});
      } else {
        await setDoc(ref, { type: 'board', refId: boardId, savedAt: serverTimestamp() });
      }
    } catch {}
  };

  // Toggle save an item
  const toggleSaveItem = async (itemId) => {
    const item = allItems.find(i => i.id === itemId);
    const isSaving = !savedItems.has(itemId);
    if (isSaving && item?.storeId) {
      trackEvent('item_save', {
        storeId:   item.storeId,
        itemId:    item.id,
        itemKind:  item.kind,
        itemEra:   item.aiTags?.era || item.era,
        itemSize:  item.size,
        itemStyle: item.aiTags?.style,
      });
      // Increment saves counter on the real Firestore item (not seed data)
      if (item.id && !/^i\d+$/.test(item.id)) {
        updateDoc(doc(db, 'items', item.id), { saves: increment(1) }).catch(() => {});
      }
    }
    toggleSet(setSavedItems, itemId);
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'saves', `item_${itemId}`);
      if (savedItems.has(itemId)) {
        await updateDoc(ref, { deletedAt: serverTimestamp() }).catch(() => {});
      } else {
        await setDoc(ref, { type: 'item', refId: itemId, savedAt: serverTimestamp() });
      }
    } catch {}
  };

  const sharedProps = {
    push, screen, user,
    quizPicks, setQuizPicks, toggleSet,
    styleScores, setStyleScores,
    budget, setBudget, sizes, setSizes, colors, setColors, occasions, setOccasions,
    location, setLocation,
    savedBoards, setSavedBoards, savedItems, setSavedItems,
    selectedBoard, setSelectedBoard,
    selectedStore, setSelectedStore,
    selectedItem, setSelectedItem,
    claimed, setClaimed,
    feedTab, setFeedTab,
    feedOutfits, allItems,
    saveTasteProfile,
    toggleSaveBoard, toggleSaveItem,
    pinPhoto, setPinPhoto,
  };

  // Auto-dismiss payment success banner
  useEffect(() => {
    if (!paymentBanner) return;
    const t = setTimeout(() => setPaymentBanner(false), 6000);
    return () => clearTimeout(t);
  }, [paymentBanner]);

  const screenEl = (() => {
    switch (screen) {
      case 'welcome':       return <Welcome {...sharedProps} />;
      case 'style-quiz':    return <StyleQuiz {...sharedProps} />;
      case 'questionnaire': return <Questionnaire {...sharedProps} />;
      case 'location':      return <LocationStep {...sharedProps} />;
      case 'feed-ready':    return <FeedReady {...sharedProps} />;
      case 'feed':          return <Feed {...sharedProps} />;
      case 'board':         return <BoardDetail {...sharedProps} />;
      case 'shop-pin':      return <ShopPin {...sharedProps} />;
      case 'item':          return <ItemDetail {...sharedProps} />;
      case 'store':         return <StoreProfile {...sharedProps} />;
      case 'store-map':     return <StoreMap {...sharedProps} />;
      case 'saved':         return <Saved {...sharedProps} />;
      default:              return <Welcome {...sharedProps} />;
    }
  })();

  return (
    <>
      {paymentBanner && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '12px 22px', borderRadius: 999, background: '#2E4A2E', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => setPaymentBanner(false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ACA7A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Payment confirmed · Check your claims for pickup details
        </div>
      )}
      {screenEl}
    </>
  );
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

const Welcome = ({ push }) => {
  const fileRef = React.useRef();

  const handleFile = (f) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    push('shop-pin', { photoFile: f, photoPreview: url });
  };

  return (
    <div style={{ height: '100%', background: 'var(--cream-50)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 80, left: -20, width: 160, height: 200, transform: 'rotate(-8deg)' }}>
          <GarmentSVG kind="dress" color="#5B4D7A" accent="#3A2E3A" />
        </div>
        <div style={{ position: 'absolute', top: 60, right: -30, width: 140, height: 180, transform: 'rotate(12deg)' }}>
          <GarmentSVG kind="jacket" color="#B88468" accent="#3A2E3A" />
        </div>
        <div style={{ position: 'absolute', bottom: 180, left: 30, width: 120, height: 150, transform: 'rotate(-4deg)' }}>
          <GarmentSVG kind="bag" color="#A8B79E" accent="#3A4A2E" />
        </div>
        <div style={{ position: 'absolute', bottom: 140, right: 20, width: 130, height: 170, transform: 'rotate(6deg)' }}>
          <GarmentSVG kind="boots" color="#3A2E3A" accent="#1A0E1A" />
        </div>
      </div>

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 28px 50px' }}>
        <div>
          <div style={{ marginBottom: 32 }}>
            <Wordmark size={28} />
          </div>
          <h1 className="display" style={{ fontSize: 48, lineHeight: 0.95, margin: 0, color: 'var(--ink-900)', fontWeight: 500 }}>
            Spot a look.<br/><em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>Find it</em><br/>at local thrift.
          </h1>
          <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-500)', maxWidth: 260 }}>
            Drop any outfit photo. Gemini identifies the pieces and matches them to real items at secondhand stores near you.
          </p>
        </div>

        <div>
          {/* Primary CTA: photo upload */}
          <button
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={{ width: '100%', padding: '20px 24px', borderRadius: 'var(--r-md)', background: 'var(--aubergine-600)', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="camera" size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Drop an outfit photo</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Find the pieces at local thrift stores</div>
            </div>
            <Icon name="arrow-right" size={20} color="rgba(255,255,255,0.8)" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <Btn variant="soft" size="lg" fullWidth onClick={() => push('style-quiz')} iconRight={<Icon name="arrow-right" size={18} />}>
            Browse curated outfits
          </Btn>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--ink-500)' }}>
            Already have an account? <button onClick={() => push('feed')} style={{ color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Style quiz ───────────────────────────────────────────────────────────────

const QUIZ_TILES = [
  { id: 'q1',  cluster: 'minimalist',      top: { kind: 'blouse', color: '#FAF3E8' }, bottom: { kind: 'pants',  color: '#3A2E3A' }, bg: '#F4EEE4' },
  { id: 'q2',  cluster: 'y2k',             top: { kind: 'top',    color: '#D4A5A5' }, bottom: { kind: 'jeans',  color: '#4B6E8E' }, bg: '#F8E8E5' },
  { id: 'q3',  cluster: 'cottagecore',     top: { kind: 'dress',  color: '#A8B79E' }, bg: '#E8EEE2' },
  { id: 'q4',  cluster: 'streetwear',      top: { kind: 'jacket', color: '#3A2E3A' }, bottom: { kind: 'jeans',  color: '#4B6E8E' }, bg: '#E0D8E0' },
  { id: 'q5',  cluster: 'preppy',          top: { kind: 'blouse', color: '#FFFFFF' }, bottom: { kind: 'skirt',  color: '#6B4A3A' }, bg: '#F4EDE0' },
  { id: 'q6',  cluster: 'vintage-classic', top: { kind: 'coat',   color: '#B88468' }, bg: '#EFE5D8' },
  { id: 'q7',  cluster: 'minimalist',      top: { kind: 'dress',  color: '#3A2E3A' }, bg: '#E2DCEB' },
  { id: 'q8',  cluster: 'y2k',             top: { kind: 'dress',  color: '#D4A5A5' }, bg: '#F8E8E5' },
  { id: 'q9',  cluster: 'cottagecore',     top: { kind: 'blouse', color: '#D4A5A5' }, bottom: { kind: 'skirt',  color: '#A8B79E' }, bg: '#E8EEE2' },
  { id: 'q10', cluster: 'streetwear',      top: { kind: 'top',    color: '#C9A14A' }, bottom: { kind: 'pants',  color: '#3A2E3A' }, bg: '#F4EDE0' },
  { id: 'q11', cluster: 'preppy',          top: { kind: 'jacket', color: '#5B4D7A' }, bottom: { kind: 'pants',  color: '#FAF3E8' }, bg: '#E2DCEB' },
  { id: 'q12', cluster: 'vintage-classic', top: { kind: 'dress',  color: '#6B4A3A' }, bg: '#EFE5D8' },
  { id: 'q13', cluster: 'minimalist',      top: { kind: 'top',    color: '#5B4D7A' }, bottom: { kind: 'pants',  color: '#FAF3E8' }, bg: '#E2DCEB' },
  { id: 'q14', cluster: 'cottagecore',     top: { kind: 'dress',  color: '#C9A14A' }, bg: '#F4EDE0' },
  { id: 'q15', cluster: 'streetwear',      top: { kind: 'jacket', color: '#A8B79E' }, bottom: { kind: 'jeans',  color: '#4B6E8E' }, bg: '#E8EEE2' },
  { id: 'q16', cluster: 'y2k',             top: { kind: 'top',    color: '#D4A5A5' }, bottom: { kind: 'skirt',  color: '#5B4D7A' }, bg: '#F0D5D2' },
];

const StyleQuiz = ({ push, quizPicks, setQuizPicks, toggleSet, setStyleScores }) => {
  const finish = () => {
    const scores = {};
    QUIZ_TILES.forEach(t => { if (quizPicks.has(t.id)) scores[t.cluster] = (scores[t.cluster] || 0) + 1; });
    setStyleScores(scores);
    push('questionnaire');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '60px 24px 12px' }}>
        <StepDots step={1} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 6px', fontWeight: 500 }}>
          Tap the looks that make you <em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>feel something.</em>
        </h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>Pick at least 3. We'll learn the rest.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUIZ_TILES.map(t => {
            const active = quizPicks.has(t.id);
            return (
              <button key={t.id} onClick={() => toggleSet(setQuizPicks, t.id)} style={{
                position: 'relative', height: 200, borderRadius: 'var(--r-md)',
                background: t.bg, overflow: 'hidden',
                border: active ? '2.5px solid var(--aubergine-600)' : '1px solid var(--line)',
                padding: 0, cursor: 'pointer', transition: 'all .18s',
                transform: active ? 'scale(0.97)' : 'scale(1)',
                boxShadow: active ? '0 8px 24px rgba(91,77,122,0.25)' : 'none',
              }}>
                <div style={{ position: 'absolute', inset: 0, padding: '10% 18%' }}>
                  {t.top && t.bottom ? (
                    <>
                      <div style={{ position: 'absolute', left: '18%', right: '18%', top: '6%', height: '52%' }}>
                        <GarmentSVG kind={t.top.kind} color={t.top.color} accent="#3A2E3A" />
                      </div>
                      <div style={{ position: 'absolute', left: '24%', right: '24%', top: '46%', height: '56%' }}>
                        <GarmentSVG kind={t.bottom.kind} color={t.bottom.color} accent="#3A2E3A" />
                      </div>
                    </>
                  ) : (
                    <div style={{ position: 'absolute', inset: '4% 14%' }}>
                      <GarmentSVG kind={t.top.kind} color={t.top.color} accent="#3A2E3A" />
                    </div>
                  )}
                </div>
                {active && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'var(--aubergine-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="checkmark" size={16} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 24px 34px', background: 'linear-gradient(transparent, var(--cream-50) 30%)' }}>
        <Btn variant="accent" size="lg" fullWidth disabled={quizPicks.size < 3} onClick={finish}>
          Continue {quizPicks.size > 0 && `(${quizPicks.size})`}
        </Btn>
      </div>
    </div>
  );
};

const StepDots = ({ step, total }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < step ? 'var(--aubergine-600)' : 'var(--cream-200)', transition: 'background .3s' }} />
    ))}
  </div>
);

// ─── Questionnaire ────────────────────────────────────────────────────────────

const Questionnaire = ({ push, budget, setBudget, sizes, setSizes, toggleSet, colors, setColors, occasions, setOccasions }) => {
  const SIZES    = ['XS','S','M','L','XL'];
  const COLORS   = [
    { name: 'Cream', c: '#F4EEE4' }, { name: 'Rose',    c: '#D4A5A5' },
    { name: 'Sage',  c: '#A8B79E' }, { name: 'Plum',    c: '#5B4D7A' },
    { name: 'Rust',  c: '#B88468' }, { name: 'Ink',     c: '#3A2E3A' },
    { name: 'Mustard',c:'#C9A14A'}, { name: 'Sky',     c: '#7FA0B8' },
  ];
  const OCCASIONS = ['Everyday','Workwear','Date night','Festival','Weekend','Special event'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '60px 24px 8px' }}>
        <StepDots step={2} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 4px', fontWeight: 500 }}>A few quick things.</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>Helps us skip what you'd scroll past.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 140px' }}>
        <Section label="Typical spend per piece">
          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>under $20</span>
              <span className="display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--aubergine-600)' }}>${budget}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>$200+</span>
            </div>
            <input type="range" min="15" max="200" step="5" value={budget} onChange={e => setBudget(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--aubergine-600)' }} />
          </div>
        </Section>

        <Section label="Your sizes">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SIZES.map(s => <Chip key={s} active={sizes.has(s)} onClick={() => toggleSet(setSizes, s)} color="var(--aubergine-600)">{s}</Chip>)}
          </div>
        </Section>

        <Section label="Colors you gravitate toward">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {COLORS.map(c => {
              const active = colors.has(c.name);
              return (
                <button key={c.name} onClick={() => toggleSet(setColors, c.name)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 4px', borderRadius: 'var(--r-md)',
                  background: active ? 'var(--aubergine-100)' : 'transparent',
                  border: active ? '1px solid var(--aubergine-600)' : '1px solid var(--line)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.c, border: '1px solid rgba(0,0,0,0.08)' }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'var(--aubergine-600)' : 'var(--ink-700)' }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section label="What do you shop for?">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {OCCASIONS.map(o => <Chip key={o} active={occasions.has(o)} onClick={() => toggleSet(setOccasions, o)} color="var(--aubergine-600)">{o}</Chip>)}
          </div>
        </Section>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 24px 34px', background: 'linear-gradient(transparent, var(--cream-50) 30%)' }}>
        <Btn variant="accent" size="lg" fullWidth onClick={() => push('location')}>Continue</Btn>
      </div>
    </div>
  );
};

const Section = ({ label, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    {children}
  </div>
);

// ─── Location ─────────────────────────────────────────────────────────────────

const LocationStep = ({ push, location, setLocation }) => {
  const suggestions = ['Minneapolis, MN','Brooklyn, NY','Portland, OR','Austin, TX','Asheville, NC'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '60px 24px 8px' }}>
        <StepDots step={3} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 4px', fontWeight: 500 }}>Where should we source from?</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>We'll surface stores nearby first.</p>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="pin" size={18} color="var(--ink-500)" />
          </div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or zip code"
            style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 16, outline: 'none' }} />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Popular right now</div>
          {suggestions.map(s => (
            <button key={s} onClick={() => setLocation(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 8px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: 'transparent', color: 'var(--ink-900)', fontSize: 15, textAlign: 'left' }}>
              <Icon name="pin" size={16} color="var(--ink-500)" /> {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 24px 34px' }}>
        <Btn variant="accent" size="lg" fullWidth disabled={!location} onClick={() => push('feed-ready')}>Use this location</Btn>
      </div>
    </div>
  );
};

// ─── Feed ready ───────────────────────────────────────────────────────────────

const FeedReady = ({ push, styleScores, saveTasteProfile }) => {
  const topStyles = Object.entries(styleScores).sort((a, b) => b[1] - a[1]).slice(0, 3);

  useEffect(() => {
    saveTasteProfile();
    const t = setTimeout(() => push('feed'), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ height: '100%', background: 'var(--cream-50)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 32px' }}>
          <div style={{ position: 'absolute', inset: 0, border: '2px dashed var(--aubergine-100)', borderRadius: '50%', animation: 'spin 8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 16, background: 'var(--aubergine-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
            <Icon name="sparkle" size={48} color="var(--aubergine-600)" />
          </div>
        </div>
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.1, margin: '0 0 12px', fontWeight: 500 }}>Building your feed…</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, maxWidth: 260, margin: '0 auto' }}>
          We matched you with <strong style={{ color: 'var(--aubergine-600)' }}>{topStyles.length || 3} styles</strong> across <strong style={{ color: 'var(--aubergine-600)' }}>5 stores</strong> nearby.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280, margin: '24px auto 0' }}>
          {(topStyles.length ? topStyles : [['minimalist',1],['y2k',1],['cottagecore',1]]).map(([cid]) => {
            const c = STYLE_CLUSTERS.find(s => s.id === cid);
            return c ? <Chip key={cid} active color={c.color}>{c.name}</Chip> : null;
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const Feed = ({ push, savedBoards, savedItems, toggleSaveBoard, toggleSaveItem, feedTab, setFeedTab, feedOutfits, allItems, styleScores }) => {
  // Derive top 2 style clusters from quiz
  const topClusters = Object.entries(styleScores || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);

  // Gather unique stores from allItems
  const storeIds = [...new Set(allItems.map(i => i.storeId || i.store).filter(Boolean))];

  // Items sorted newest first
  const byNewest = [...allItems].sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });

  // Items per style cluster (aiTags.style match, case-insensitive)
  const byCluster = (clusterId) =>
    allItems.filter(i => {
      const s = (i.aiTags?.style || '').toLowerCase().replace(/[^a-z]/g, '');
      const c = clusterId.toLowerCase().replace(/[^a-z]/g, '');
      return s.includes(c) || c.includes(s);
    });

  // Outfit boards that overlap with saved items
  const savedSet   = new Set(savedItems);
  const savedStyle = allItems.find(i => savedSet.has(i.id))?.aiTags?.style || '';
  const relatedBoards = feedOutfits.filter(o =>
    (o.items || []).some(id => savedSet.has(id)) ||
    (savedStyle && (o.mood || '').toLowerCase().includes(savedStyle.toLowerCase()))
  );
  const otherBoards = feedOutfits.filter(o => !relatedBoards.includes(o));

  const CLUSTER_LABELS = {
    minimalist:       'Minimalist pieces',
    y2k:              'Y2K finds',
    cottagecore:      'Cottagecore',
    streetwear:       'Streetwear',
    preppy:           'Preppy picks',
    'vintage-classic':'Vintage Classic',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <TopBar push={push} />

      <div style={{ padding: '0 20px', display: 'flex', gap: 18, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        {[{ id: 'foryou', label: 'For You' }, { id: 'nearby', label: 'Near Me' }, { id: 'trending', label: 'Trending' }].map(t => (
          <button key={t.id} onClick={() => setFeedTab(t.id)} style={{ padding: '14px 0', fontSize: 15, fontWeight: 600, color: feedTab === t.id ? 'var(--ink-900)' : 'var(--ink-400)', borderBottom: feedTab === t.id ? '2px solid var(--aubergine-600)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* ── Shop This Pin banner ── */}
        <div style={{ padding: '14px 16px 4px' }}>
          <button onClick={() => push('shop-pin')} style={{ width: '100%', padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, var(--aubergine-600), #8B6BAE)', border: 'none', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="camera" size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Drop an outfit photo</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Find the pieces at local thrift stores</div>
            </div>
            <Icon name="arrow-right" size={18} color="rgba(255,255,255,0.8)" />
          </button>
        </div>

        {/* ── New from stores you follow ── */}
        {byNewest.length > 0 && (
          <FeedRow
            label="New arrivals"
            sublabel="latest from stores near you"
            items={byNewest.slice(0, 12)}
            savedItems={savedItems}
            toggleSaveItem={toggleSaveItem}
            push={push}
          />
        )}

        {/* ── Style cluster rows (top 2 from quiz) ── */}
        {topClusters.map(clusterId => {
          const clusterItems = byCluster(clusterId);
          if (clusterItems.length === 0) return null;
          return (
            <FeedRow
              key={clusterId}
              label={CLUSTER_LABELS[clusterId] || clusterId}
              sublabel="near you · matched to your style"
              items={clusterItems.slice(0, 12)}
              savedItems={savedItems}
              toggleSaveItem={toggleSaveItem}
              push={push}
              accent
            />
          );
        })}

        {/* ── Style discovery rows — all clusters with inventory ── */}
        {STYLE_CLUSTERS.filter(c => !topClusters.includes(c.id)).map(cluster => {
          const clusterItems = byCluster(cluster.id);
          if (clusterItems.length === 0) return null;
          return (
            <FeedRow
              key={cluster.id}
              label={cluster.name}
              sublabel={cluster.desc}
              items={clusterItems.slice(0, 12)}
              savedItems={savedItems}
              toggleSaveItem={toggleSaveItem}
              push={push}
            />
          );
        })}

        {allItems.length === 0 && feedOutfits.length === 0 && (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
            <div className="display" style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>No stores near you yet</div>
            <div style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.5 }}>We're onboarding stores in your area. Drop an outfit photo to search what's available now.</div>
            <Btn variant="accent" size="md" style={{ marginTop: 20 }} onClick={() => push('shop-pin')}>Search by photo</Btn>
          </div>
        )}
      </div>

      <BottomNav current="home" push={push} savedCount={savedBoards.size + savedItems.size} />
    </div>
  );
};

// ─── Feed row (horizontal scroll of item cards) ───────────────────────────────

const FeedRow = ({ label, sublabel, items, savedItems, toggleSaveItem, push, accent }) => (
  <div style={{ padding: '20px 0 0' }}>
    <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--aubergine-600)', cursor: 'pointer' }}>See all</button>
    </div>
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
      {items.map(item => (
        <ItemCard key={item.id} item={item} saved={savedItems.has(item.id)}
          onSave={e => { e.stopPropagation(); toggleSaveItem(item.id); }}
          onClick={() => push('item', { item })}
          accent={accent} />
      ))}
    </div>
  </div>
);

// ─── Item card (used in horizontal feed rows) ─────────────────────────────────

const ItemCard = ({ item, saved, onSave, accent, onClick }) => {
  const store = storeById(item.store || item.storeId);
  return (
    <div onClick={onClick} style={{ flexShrink: 0, width: 140, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)', overflow: 'hidden', position: 'relative', cursor: onClick ? 'pointer' : 'default' }}>
      {/* Photo */}
      <div style={{ height: 168, background: item.bg || (accent ? 'var(--aubergine-100)' : 'var(--cream-100)'), position: 'relative', overflow: 'hidden' }}>
        {item.imageUrl
          ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind || 'top'} color={item.color || '#B88468'} accent={item.accent || '#3A2E3A'} /></div>}
        <button onClick={onSave} style={{ position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: '50%', background: saved ? 'var(--blush-500)' : 'rgba(255,255,255,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', border: 'none' }}>
          <Icon name={saved ? 'heart-fill' : 'heart'} size={13} color={saved ? '#fff' : 'var(--ink-700)'} />
        </button>
        {item.aiTags?.era && (
          <div style={{ position: 'absolute', bottom: 7, left: 7, padding: '2px 7px', borderRadius: 999, background: 'rgba(31,24,32,0.75)', color: '#fff', fontSize: 10, fontWeight: 600 }}>{item.aiTags.era}</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        {store && (
          <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: store.color || 'var(--aubergine-600)', flexShrink: 0 }} />
            {store.name}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span className="display" style={{ fontSize: 15, fontWeight: 700 }}>${item.price}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-400)' }}>Size {item.size}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Board detail ─────────────────────────────────────────────────────────────

const BoardDetail = ({ push, selectedBoard, savedBoards, toggleSaveBoard, savedItems, toggleSaveItem, setClaimed, user, feedOutfits, allItems }) => {
  const outfit = feedOutfits.find(o => o.id === selectedBoard) || feedOutfits[0] || OUTFITS[0];
  const items  = (outfit.items || []).map(id => allItems.find(i => i.id === id) || byId(id)).filter(Boolean);
  const saved  = savedBoards.has(outfit.id);
  const [claimOpen, setClaimOpen] = useState(null);

  useEffect(() => {
    trackEvent('outfit_view', { outfitId: outfit.id });
    items.forEach(item => {
      if (item?.storeId) {
        trackEvent('item_view', {
          storeId:   item.storeId,
          itemId:    item.id,
          outfitId:  outfit.id,
          itemKind:  item.kind,
          itemEra:   item.aiTags?.era || item.era,
          itemSize:  item.size,
          itemStyle: item.aiTags?.style,
        });
      }
    });
  }, [outfit.id]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '52px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => push('feed')} />
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn icon="share" />
          <IconBtn icon={saved ? 'bookmark-fill' : 'bookmark'} onClick={() => toggleSaveBoard(outfit.id)} active={saved} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 120px' }}>
        {/* Hero */}
        <div style={{ margin: '0 16px', height: 380, borderRadius: 'var(--r-md)', background: items[0]?.bg || 'var(--cream-100)', position: 'relative', overflow: 'hidden' }}>
          {items[0] && <div style={{ position: 'absolute', left: '14%', right: '42%', top: '4%', height: '60%', transform: 'rotate(-5deg)' }}><GarmentSVG kind={items[0].kind} color={items[0].color} accent={items[0].accent} /></div>}
          {items[1] && <div style={{ position: 'absolute', left: '42%', right: '6%', top: '12%', height: '62%', transform: 'rotate(6deg)' }}><GarmentSVG kind={items[1].kind} color={items[1].color} accent={items[1].accent} /></div>}
          {items[2] && <div style={{ position: 'absolute', left: '4%', right: '62%', top: '56%', height: '40%', transform: 'rotate(-4deg)' }}><GarmentSVG kind={items[2].kind} color={items[2].color} accent={items[2].accent} /></div>}
          {items[3] && <div style={{ position: 'absolute', left: '54%', right: '10%', top: '60%', height: '38%', transform: 'rotate(8deg)' }}><GarmentSVG kind={items[3].kind} color={items[3].color} accent={items[3].accent} /></div>}
        </div>

        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{outfit.mood}</div>
          <h1 className="display" style={{ fontSize: 32, lineHeight: 1.05, margin: 0, fontWeight: 500 }}>{outfit.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Avatar name={outfit.curator || 'AI'} size={32} color="var(--aubergine-500)" />
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{outfit.curator}</div>
              <div style={{ color: 'var(--ink-500)' }}>{(outfit.likes || 0).toLocaleString()} loves · {outfit.saves || 0} saves</div>
            </div>
            <div style={{ flex: 1 }} />
            <Btn variant="ghost" size="sm">Follow</Btn>
          </div>
        </div>

        {/* Shop the look */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Shop the look</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>${items.reduce((s, i) => s + (i.price || 0), 0)} total</div>
          </div>
          {items.map(item => {
            const store = storeById(item.store) || { name: 'Local Store', city: '', color: '#5B4D7A' };
            const isSaved = savedItems.has(item.id);
            return (
              <div key={item.id} style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 8, borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div style={{ width: 68, height: 84, borderRadius: 10, background: item.bg || '#EDE8F5', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind} color={item.color} accent={item.accent} /></div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{item.aiTags?.era || item.era} · Size {item.size}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--ink-500)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: store.color }} />
                    <span>{store.name}</span>
                    {store.city && <span>· {store.city.split(',')[0]}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>${item.price}</div>
                  <button onClick={() => toggleSaveItem(item.id)} style={{ width: 30, height: 30, borderRadius: '50%', background: isSaved ? 'var(--blush-500)' : 'var(--cream-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Icon name={isSaved ? 'heart-fill' : 'heart'} size={14} color={isSaved ? '#fff' : 'var(--ink-900)'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '20px' }}>
          <Btn variant="accent" size="lg" fullWidth onClick={() => setClaimOpen(items[0]?.id)} icon={<Icon name="tag" size={18} color="#fff" />}>
            Claim entire outfit · ${items.reduce((s, i) => s + (i.price || 0), 0)}
          </Btn>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--ink-500)' }}>
            Reserve for 72h pickup · No charge until confirmed
          </div>
        </div>
      </div>

      {claimOpen && (
        <ClaimSheet
          item={allItems.find(i => i.id === claimOpen) || byId(claimOpen)}
          user={user}
          onClose={() => setClaimOpen(null)}
          onConfirm={(win) => { setClaimed({ itemId: claimOpen, window: win }); setClaimOpen(null); }}
        />
      )}
    </div>
  );
};

// ─── Claim sheet ──────────────────────────────────────────────────────────────

export const ClaimSheet = ({ item, user, onClose, onConfirm, resolvedStore }) => {
  const [method,   setMethod]   = useState('pickup');
  const [win,      setWin]      = useState('48');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [store,    setStore]    = useState(
    resolvedStore || storeById(item?.store) || storeById(item?.storeId) || { name: 'The Store', city: '', color: '#5B4D7A' }
  );

  // Fetch real store from Firestore if we only have a storeId and no seed match
  useEffect(() => {
    if (resolvedStore || !item?.storeId || store.name !== 'The Store') return;
    import('firebase/firestore').then(({ doc: d, getDoc }) =>
      getDoc(d(db, 'stores', item.storeId))
        .then(snap => { if (snap.exists()) setStore({ id: snap.id, ...snap.data() }); })
        .catch(() => {})
    );
  }, [item?.storeId]);

  const sendClaim = async () => {
    if (!user) {
      // Require authentication to claim
      alert('Please sign in to claim an item.');
      return;
    }
    setLoading(true);
    try {
      if (method === 'pickup') {
        try {
          const { data } = await createCheckoutSession({
            itemId: item.id,
            storeId: item.storeId || item.store,
            itemName: item.name,
            price: item.price,
            successUrl: `${window.location.origin}${window.location.pathname}`,
            cancelUrl: `${window.location.origin}${window.location.pathname}`,
            userId: user.uid,
            buyerHandle: user.email?.split('@')[0] || 'shopper',
            itemKind: item.kind,
          });
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
          throw new Error('Checkout did not return a redirect URL');
        } catch (stripeErr) {
          console.error('Stripe checkout failed:', stripeErr.message);
          alert('Checkout is unavailable right now. Please try again in a moment.');
          return;
        }
      }

      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'claims'), {
        storeId:     item.storeId || item.store,
        itemId:      item.id,
        buyerId:     user.uid,      // used by Firestore rule
        shopperId:   user.uid,      // kept for rule compatibility
        buyerHandle: user.email?.split('@')[0] || 'shopper',
        method,
        window:      method === 'pickup' ? win : null,
        status:      'pending',
        amount:      item.price || 0,
        itemKind:    item.kind,
        itemName:    item.name,
        createdAt:   serverTimestamp(),
      });
      // Track in analytics so store dashboard picks it up
      trackEvent('claim', {
        storeId:   item.storeId || item.store,
        itemId:    item.id,
        itemKind:  item.kind,
        itemEra:   item.aiTags?.era || item.era,
        itemSize:  item.size,
        itemStyle: item.aiTags?.style,
      });
      // Note: item status ('reserved') is set by the store owner when they confirm,
      // not by the shopper — this avoids a permission error (only store owner can update items).
      setSuccess(true);
      setTimeout(() => { onConfirm(win); }, 1200);
    } catch (err) {
      console.error('sendClaim error:', err.message);
      onConfirm(win);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'flex-end', background: 'rgba(31,24,32,0.5)' }}>
        <div style={{ width: '100%', background: 'var(--cream-50)', borderRadius: '28px 28px 0 0', padding: '24px 24px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sage-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="checkmark" size={28} color="var(--sage-500)" strokeWidth={2.5} />
          </div>
          <div className="display" style={{ fontSize: 22, fontWeight: 500 }}>Claim sent!</div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 8 }}>{store.name} will confirm within 2 hours.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'flex-end', background: 'rgba(31,24,32,0.5)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--cream-50)', borderRadius: '28px 28px 0 0', padding: '12px 24px 36px' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--cream-200)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Claim item</div>
        <h2 className="display" style={{ fontSize: 24, lineHeight: 1.1, margin: '6px 0 4px', fontWeight: 500 }}>{item?.name}</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{store.name}{store.city ? ` · ${store.city}` : ''}</div>

        <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-700)', marginBottom: 10 }}>Fulfillment</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'pickup', label: 'In-store pickup', icon: 'shop' },{ id: 'ship', label: 'Ship to me', icon: 'truck' }].map(o => (
            <button key={o.id} onClick={() => setMethod(o.id)} style={{ flex: 1, padding: '14px 12px', borderRadius: 'var(--r-md)', background: method === o.id ? 'var(--aubergine-100)' : 'var(--surface)', border: method === o.id ? '1.5px solid var(--aubergine-600)' : '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', cursor: 'pointer' }}>
              <Icon name={o.icon} size={18} color={method === o.id ? 'var(--aubergine-600)' : 'var(--ink-700)'} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{o.label}</span>
            </button>
          ))}
        </div>

        {method === 'pickup' && (
          <>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-700)', marginBottom: 10 }}>Pickup window</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['24','48','72'].map(h => (
                <button key={h} onClick={() => setWin(h)} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-md)', background: win === h ? 'var(--aubergine-600)' : 'var(--surface)', border: win === h ? 'none' : '1px solid var(--line)', color: win === h ? '#fff' : 'var(--ink-900)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{h} hrs</button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 20, padding: 14, borderRadius: 'var(--r-md)', background: 'var(--blush-100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="clock" size={18} color="var(--plum-900)" />
          <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--plum-900)' }}>
            {method === 'pickup'
              ? <><strong>Secure checkout now.</strong> You will pay via Stripe, then {store.owner || store.name || 'the store'} confirms pickup details.</>
              : <><strong>No payment now.</strong> {store.owner || store.name || 'The store'} confirms availability before fulfillment.</>}
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Subtotal</div>
          <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>${item?.price}</div>
        </div>

        <Btn variant="accent" size="lg" fullWidth style={{ marginTop: 14 }} disabled={loading} onClick={sendClaim}
          icon={loading ? <Spin /> : null}>
          {loading ? (method === 'pickup' ? 'Opening checkout…' : 'Sending claim…') : (method === 'pickup' ? `Checkout · $${item?.price}` : 'Send claim request')}
        </Btn>
      </div>
    </div>
  );
};

// ─── Photo consent sheet ──────────────────────────────────────────────────────

const CONSENT_KEY = 'sty_photo_consent_v1';

const PhotoConsentSheet = ({ onAllow, onDeny }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(31,24,32,0.55)' }}>
    <div style={{ width: '100%', background: 'var(--cream-50)', borderRadius: '28px 28px 0 0', padding: '20px 24px 44px' }}>
      <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--cream-200)', margin: '0 auto 20px' }} />

      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="sparkle" size={26} color="var(--aubergine-600)" />
      </div>

      <h2 className="display" style={{ fontSize: 22, lineHeight: 1.15, margin: '0 0 6px', fontWeight: 500 }}>
        Allow detailed photo analysis?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5, margin: '0 0 18px' }}>
        To find the best matches, Stylography will send your photo to Google Gemini AI to:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[
          { icon: 'tag',      text: 'Identify each clothing piece (type, era, color, style)' },
          { icon: 'sparkle',  text: 'Generate a semantic fingerprint to match against store inventory' },
          { icon: 'shop',     text: 'Rank items from local thrift stores by similarity' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={icon} size={14} color="var(--aubergine-600)" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.4, paddingTop: 5 }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--cream-100)', fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.5, marginBottom: 20 }}>
        Your photo is processed in real time and <strong>not permanently stored</strong> on Stylography servers. Gemini's data handling is governed by Google's privacy policy.
      </div>

      <Btn variant="accent" size="lg" fullWidth onClick={onAllow}>
        Allow &amp; search
      </Btn>
      <button onClick={onDeny} style={{ width: '100%', marginTop: 10, padding: 10, fontSize: 13, color: 'var(--ink-500)', cursor: 'pointer', textAlign: 'center' }}>
        Cancel
      </button>
    </div>
  </div>
);

// ─── Shop This Pin ────────────────────────────────────────────────────────────

function scoreItemAgainstPiece(item, piece) {
  let score = 0;
  const terms    = (piece.searchTerms || []).map(t => t.toLowerCase());
  const pKind    = (piece.kind  || '').toLowerCase();
  const pEra     = (piece.era   || '').toLowerCase();
  const pColor   = (piece.color || '').toLowerCase();
  const iName    = (item.name   || '').toLowerCase();
  const iKind    = (item.kind   || '').toLowerCase();
  const iCat     = (item.aiTags?.category || '').toLowerCase();
  const iEra     = (item.aiTags?.era  || item.era  || '').toLowerCase();
  const iColor   = (item.aiTags?.color || item.color || '').toLowerCase();

  if (pKind && (iKind.includes(pKind) || pKind.includes(iKind))) score += 40;
  terms.forEach(t => {
    if (iName.includes(t)) score += 28;
    if (iKind.includes(t)) score += 22;
    if (iCat.includes(t))  score += 18;
  });
  if (pEra   && iEra.includes(pEra.replace(/[^0-9]/g, '')))   score += 18;
  if (pColor && iColor.includes(pColor.split(' ')[0]))         score += 12;
  return score;
}

const ShopPin = ({ push, savedItems, toggleSaveItem, allItems, user, setClaimed, pinPhoto, setPinPhoto }) => {
  const ANALYZE_STEPS = [
    'Detecting key pieces',
    'Reading colors and textures',
    'Matching nearby inventory',
    'Ranking best-fit looks',
  ];
  const [stage,      setStage]      = useState(() => {
    const consented = typeof localStorage !== 'undefined' && localStorage.getItem(CONSENT_KEY);
    if (pinPhoto && consented) return 'analyzing';
    if (pinPhoto && !consented) return 'consent';
    return 'drop';
  });
  const [analysis,   setAnalysis]   = useState(null);
  const [matches,    setMatches]    = useState([]);
  const [storeMap,   setStoreMap]   = useState({});
  const [preview,    setPreview]    = useState(pinPhoto?.preview || null);
  const [claimItem,  setClaimItem]  = useState(null);
  const [searchMode, setSearchMode] = useState('vector'); // 'vector' | 'keyword'
  const [analyzeStepIdx, setAnalyzeStepIdx] = useState(0);
  const fileRef = React.useRef();

  // Auto-start if photo was passed in and consent already given
  useEffect(() => {
    if (pinPhoto?.file && stage === 'analyzing') {
      runAnalysis(pinPhoto.file);
    }
  }, []);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    setAnalyzeStepIdx(0);
    const timer = setInterval(() => {
      setAnalyzeStepIdx((prev) => (prev + 1) % ANALYZE_STEPS.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [stage]);

  const grantConsent = () => {
    localStorage.setItem(CONSENT_KEY, '1');
    setStage('analyzing');
    if (pinPhoto?.file) runAnalysis(pinPhoto.file);
  };

  const runAnalysis = async (imgFile) => {
    setStage('analyzing');
    try {
      let base64 = '', mimeType = 'image/jpeg';
      if (imgFile instanceof File || imgFile instanceof Blob) {
        base64   = await fileToBase64(imgFile);
        mimeType = imgFile.type || 'image/jpeg';
      }

      // 1. Fetch inventory — prefer live Firestore, fall back to seed data
      let inventory = allItems.length > 0 ? [...allItems] : [];
      try {
        const { collection: col, query: q, where: w, getDocs: gd } = await import('firebase/firestore');
        const snap = await gd(q(col(db, 'items'), w('status', '==', 'active')));
        if (!snap.empty) inventory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {}
      if (inventory.length === 0) {
        const { ITEMS } = await import('./data.jsx');
        inventory = ITEMS;
      }

      let pieceMatches = [];
      let analysisResult = { description: '', styleCluster: '', keyPieces: [] };

      if (base64) {
        // ── RAG path ─────────────────────────────────────────────────────────
        // Single Gemini call: sees the photo + full inventory → returns matches
        const { ragSearchOutfitPieces } = await import('./gemini.js');
        const rag = await ragSearchOutfitPieces(base64, mimeType, inventory);
        analysisResult = { description: rag.description, styleCluster: rag.styleCluster, keyPieces: rag.keyPieces };
        pieceMatches   = rag.matches;
        setSearchMode('rag');
      } else {
        // ── Demo / no-photo path ──────────────────────────────────────────────
        analysisResult = {
          description:  'A curated vintage look with 90s-era pieces.',
          styleCluster: 'Vintage Classic',
          keyPieces: [
            { piece: 'Corduroy Jacket', kind: 'jacket', era: '90s', color: 'Brown', searchTerms: ['jacket','corduroy'] },
            { piece: 'Wide-leg Jeans',  kind: 'jeans',  era: '90s', color: 'Blue',  searchTerms: ['jeans','denim'] },
            { piece: 'Leather Boots',   kind: 'boots',  era: '90s', color: 'Black', searchTerms: ['boots','leather'] },
          ],
        };
        const KEYWORD_MIN = 55, KEYWORD_MAX = 120;
        const usedIds = new Set();
        pieceMatches = analysisResult.keyPieces.flatMap(piece => {
          const scored = inventory
            .map(i => ({ item: i, score: scoreItemAgainstPiece(i, piece) }))
            .filter(s => s.score >= KEYWORD_MIN && !usedIds.has(s.item.id))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          scored.forEach(s => usedIds.add(s.item.id));
          return scored.map(s => ({
            piece: piece.piece, kind: piece.kind,
            item: s.item, score: Math.min(s.score / KEYWORD_MAX, 0.99),
          }));
        });
        setSearchMode('keyword');
      }

      setAnalysis(analysisResult);
      setMatches(pieceMatches);

      // 2. Fetch Firestore store docs for any real items in the results
      const { doc: docRef, getDoc } = await import('firebase/firestore');
      const storeIds = [...new Set(pieceMatches.map(m => m.item?.storeId).filter(Boolean))];
      const storeData = {};
      await Promise.all(storeIds.map(async sid => {
        try {
          const snap = await getDoc(docRef(db, 'stores', sid));
          if (snap.exists()) storeData[sid] = { id: sid, ...snap.data() };
        } catch {}
      }));
      setStoreMap(storeData);
      setStage('results');
    } catch (err) {
      console.error('ShopPin analysis failed:', err);
      setStage('drop');
    }
  };

  const handleFile = (f) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    setPinPhoto({ file: f, preview: url });
    const consented = typeof localStorage !== 'undefined' && localStorage.getItem(CONSENT_KEY);
    if (consented) {
      runAnalysis(f);
    } else {
      setStage('consent');
    }
  };

  // Group matches by store
  const storeGroups = React.useMemo(() => {
    const groups = {};
    matches.forEach(m => {
      const sid = m.item.storeId || m.item.store || 'unknown';
      if (!groups[sid]) groups[sid] = { storeId: sid, items: [] };
      groups[sid].items.push(m);
    });
    return Object.values(groups);
  }, [matches]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '52px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => { setPinPhoto(null); push('feed'); }} />
        <div className="display" style={{ fontSize: 16, fontWeight: 600 }}>Shop This Pin</div>
        {stage === 'results'
          ? <IconBtn icon="upload" onClick={() => { setPinPhoto(null); setPreview(null); setStage('drop'); }} />
          : <div style={{ width: 40 }} />}
      </div>

      {stage === 'drop' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 120px' }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: 1.05, margin: '8px 0 10px', fontWeight: 500 }}>
            Spot an outfit you love.<br/><em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>We'll find its pieces.</em>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-500)', lineHeight: 1.5 }}>
            Drop a Pinterest screenshot or any outfit photo. Gemini identifies each piece and matches it to real items at local stores.
          </p>

          <button
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={{ width: '100%', marginTop: 20, padding: '40px 24px', borderRadius: 'var(--r-md)', background: 'var(--cream-100)', border: '2px dashed var(--aubergine-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--aubergine-600)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--aubergine-100)'}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={28} color="var(--aubergine-600)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Drop a photo here</div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>or tap to upload · JPG, PNG</div>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          <div style={{ marginTop: 28, padding: 16, borderRadius: 'var(--r-md)', background: 'var(--blush-100)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--plum-900)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example</div>
            <div style={{ fontSize: 13, color: 'var(--plum-900)', marginTop: 4, lineHeight: 1.4 }}>
              A shopper dropped a '90s grunge Pinterest pin. We matched her with a corduroy jacket at Fernwood, Levi's at Stitching Styles, and leather boots nearby — all under $200.
            </div>
          </div>

          <Btn variant="accent" size="lg" fullWidth style={{ marginTop: 24 }} onClick={() => runAnalysis(null)}>
            Try with a demo photo
          </Btn>
        </div>
      )}

      {stage === 'analyzing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 }}>
          {preview && (
            <div style={{ width: '100%', maxHeight: 320, borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', boxShadow: '0 14px 40px rgba(31,24,32,0.2)' }}>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'shopPinSlowZoom 7s ease-in-out infinite' }} alt="" />

              {/* Scan overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(91,77,122,0.28)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0))' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'rgba(255,255,255,0.85)', boxShadow: '0 0 12px rgba(255,255,255,0.9)', animation: 'shopPinScanLine 2.1s ease-in-out infinite' }} />

              {/* Floating finder dots */}
              <div style={{ position: 'absolute', top: '24%', left: '18%', width: 10, height: 10, borderRadius: '50%', background: '#fff', opacity: 0.75, animation: 'shopPinPulseDot 1.4s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: '48%', right: '20%', width: 9, height: 9, borderRadius: '50%', background: '#fff', opacity: 0.75, animation: 'shopPinPulseDot 1.4s ease-in-out 0.3s infinite' }} />
              <div style={{ position: 'absolute', bottom: '22%', left: '37%', width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.75, animation: 'shopPinPulseDot 1.4s ease-in-out 0.55s infinite' }} />

              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ padding: '12px 20px', borderRadius: 999, background: 'rgba(31,24,32,0.86)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <Spin />
                  Looking for fits...
                </div>
              </div>
            </div>
          )}
          {!preview && (
            <>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--aubergine-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={32} color="var(--aubergine-600)" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Analyzing outfit...</div>
                <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 6 }}>Gemini is identifying pieces and finding matches</div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
            <Icon name="sparkle" size={14} color="var(--aubergine-600)" />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--aubergine-600)' }}>
              {ANALYZE_STEPS[analyzeStepIdx]}
            </div>
          </div>
          <div style={{ width: 'min(360px, 100%)', height: 6, borderRadius: 999, background: 'var(--cream-200)', overflow: 'hidden' }}>
            <div style={{ width: '38%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--aubergine-600), #8B6BAE)', animation: 'shopPinLoadingBar 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {stage === 'results' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 120px' }}>
          {/* Photo + analysis header */}
          <div style={{ margin: '0 16px', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--cream-100)' }}>
            {preview
              ? <img src={preview} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} alt="" />
              : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--aubergine-100), var(--blush-100))' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 24, opacity: 0.7 }}>
                    <GarmentSVG kind="jacket" color="#B88468" accent="#3A2E3A" />
                    <GarmentSVG kind="jeans"  color="#4B6E8E" accent="#3A2E3A" />
                    <GarmentSVG kind="boots"  color="#3A2E3A" accent="#1A0E1A" />
                    <GarmentSVG kind="bag"    color="#C9A14A" accent="#3A2E3A" />
                  </div>
                </div>
              )}
            <div style={{ position: 'absolute', top: 10, left: 10, padding: '5px 10px', borderRadius: 999, background: 'rgba(31,24,32,0.85)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="sparkle" size={11} color="#fff" /> {matches.length} pieces found
            </div>
            {analysis?.styleCluster && (
              <div style={{ position: 'absolute', top: 10, right: 10, padding: '5px 10px', borderRadius: 999, background: 'var(--aubergine-600)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
                {analysis.styleCluster}
              </div>
            )}
          </div>

          {analysis?.description && (
            <div style={{ margin: '12px 16px 0', padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--cream-100)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5, fontStyle: 'italic' }}>
              {analysis.description}
            </div>
          )}

          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>Matches at local stores</div>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999,
                background: searchMode === 'rag' ? 'var(--aubergine-600)' : searchMode === 'vector' ? '#4A6B4A' : 'var(--cream-200)',
                color: (searchMode === 'rag' || searchMode === 'vector') ? '#fff' : 'var(--ink-500)',
                fontWeight: 700, letterSpacing: '0.04em' }}>
                {searchMode === 'rag' ? '✦ Gemini' : searchMode === 'vector' ? '⚡ Vector' : 'Keyword'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{storeGroups.length} store{storeGroups.length !== 1 ? 's' : ''} · {matches.length} pieces</div>
          </div>

          {/* Store-grouped results — only groups with qualifying items */}
          {storeGroups.filter(g => g.items.length > 0).map(group => {
            const storeDoc = storeMap[group.storeId];
            const seedStore = storeById(group.storeId);
            const storeName = storeDoc?.name || seedStore?.name || 'Local Thrift Store';
            const storeCity = storeDoc?.city || seedStore?.city || '';
            const storeEmoji = storeDoc?.emoji || seedStore?.emoji || '🏪';
            const storeColor = storeDoc?.color || seedStore?.color || '#5B4D7A';
            const fulfillment = storeDoc?.fulfillment || {};

            return (
              <div key={group.storeId} style={{ margin: '16px 16px 0', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', overflow: 'hidden', background: 'var(--surface)' }}>
                {/* Store header */}
                <div style={{ padding: '12px 14px', background: 'var(--cream-100)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: storeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{storeEmoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{storeName}</div>
                    {storeCity && <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 1 }}>{storeCity}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {fulfillment.pickup !== false && <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 999, background: 'var(--sage-200)', color: '#4A6B4A', fontWeight: 600 }}>Pickup</span>}
                    {fulfillment.ship && <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 999, background: 'var(--aubergine-100)', color: 'var(--aubergine-600)', fontWeight: 600 }}>Ships</span>}
                  </div>
                </div>

                {/* Items at this store */}
                {group.items.map((m, i) => {
                  const item    = m.item;
                  const isSaved = savedItems.has(item.id);
                  // score is already normalized 0–1 from both vector and keyword paths
                  const pct = Math.round(m.score * 100);
                  return (
                    <div key={item.id} onClick={() => push('item', { item })} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: i < group.items.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
                      <div style={{ position: 'relative', width: 72, height: 88, borderRadius: 10, background: item.bg || '#EDE8F5', overflow: 'hidden', flexShrink: 0 }}>
                        {item.imageUrl
                          ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={item.kind || 'top'} color={item.color || '#B88468'} accent={item.accent || '#3A2E3A'} /></div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--aubergine-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.piece}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 3 }}>
                          {item.aiTags?.era || item.era ? `${item.aiTags?.era || item.era} · ` : ''}Size {item.size}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--cream-200)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', transition: 'width 0.6s ease',
                              background: pct >= 75 ? '#5B9A6A' : pct >= 55 ? 'var(--aubergine-600)' : '#C9A14A' }} />
                          </div>
                          <span style={{ fontSize: 10, whiteSpace: 'nowrap', fontWeight: 600,
                            color: pct >= 75 ? '#5B9A6A' : pct >= 55 ? 'var(--aubergine-600)' : '#C9A14A' }}>{pct}% match</span>
                        </div>
                        {m.reason && (
                          <div style={{ fontSize: 10, color: 'var(--ink-400)', lineHeight: 1.35, marginTop: 2, fontStyle: 'italic' }}>{m.reason}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <div className="display" style={{ fontSize: 17, fontWeight: 600 }}>${item.price}</div>
                        <button onClick={(e) => { e.stopPropagation(); toggleSaveItem(item.id); }} style={{ width: 28, height: 28, borderRadius: '50%', background: isSaved ? 'var(--blush-500)' : 'var(--cream-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--line)' }}>
                          <Icon name={isSaved ? 'heart-fill' : 'heart'} size={12} color={isSaved ? '#fff' : 'var(--ink-900)'} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setClaimItem(item); }} style={{ padding: '5px 10px', borderRadius: 999, background: 'var(--aubergine-600)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}>
                          Claim
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {storeGroups.filter(g => g.items.length > 0).length === 0 && matches.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--cream-100)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkle" size={24} color="var(--ink-400)" />
              </div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No close matches yet</div>
              <div style={{ fontSize: 13, color: 'var(--ink-500)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
                The stores in your area don't have items similar enough to this look right now. Check back as inventory updates.
              </div>
            </div>
          )}
        </div>
      )}

      {claimItem && (
        <ClaimSheet
          item={claimItem}
          resolvedStore={storeMap[claimItem?.storeId]}
          user={user}
          onClose={() => setClaimItem(null)}
          onConfirm={() => { setClaimed({ itemId: claimItem.id }); setClaimItem(null); }}
        />
      )}

      {stage === 'consent' && (
        <PhotoConsentSheet
          onAllow={grantConsent}
          onDeny={() => { setPinPhoto(null); setPreview(null); setStage('drop'); }}
        />
      )}
      <style>{`
        @keyframes shopPinScanLine {
          0% { transform: translateY(0); opacity: 0.7; }
          50% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0.7; }
        }
        @keyframes shopPinPulseDot {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.35); opacity: 0.95; }
        }
        @keyframes shopPinLoadingBar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
        @keyframes shopPinSlowZoom {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
};

// ─── Item Detail ─────────────────────────────────────────────────────────────

const ItemDetail = ({ push, selectedItem, savedItems, toggleSaveItem, user, setClaimed }) => {
  const item = selectedItem;
  const [loading,   setLoading]   = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [liveStore, setLiveStore] = useState(null);

  // Fetch real store doc from Firestore (seed data storeById only works for demo items)
  useEffect(() => {
    const sid = item?.storeId || item?.store;
    if (!sid) return;
    const seed = storeById(sid);
    if (seed) { setLiveStore(seed); return; }
    import('firebase/firestore').then(({ doc: d, getDoc }) =>
      getDoc(d(db, 'stores', sid))
        .then(snap => { if (snap.exists()) setLiveStore({ id: snap.id, ...snap.data() }); })
        .catch(() => {})
    );
  }, [item?.storeId, item?.store]);

  // Track item view and increment counter
  useEffect(() => {
    if (!item?.id || !item?.storeId) return;
    trackEvent('item_view', {
      storeId:   item.storeId,
      itemId:    item.id,
      itemKind:  item.kind,
      itemEra:   item.aiTags?.era || item.era,
      itemSize:  item.size,
      itemStyle: item.aiTags?.style,
    });
    if (!/^i\d+$/.test(item.id)) {
      updateDoc(doc(db, 'items', item.id), { views: increment(1) }).catch(() => {});
    }
  }, [item?.id]);

  if (!item) return null;

  const store = liveStore || storeById(item.store || item.storeId) || {};
  const isSaved = savedItems.has(item.id);
  const tags    = [
    item.aiTags?.style    && { label: 'Style',     value: item.aiTags.style     },
    item.aiTags?.era      && { label: 'Era',        value: item.aiTags.era       },
    item.aiTags?.material && { label: 'Material',   value: item.aiTags.material  },
    item.condition        && { label: 'Condition',  value: item.condition        },
    item.aiTags?.color    && { label: 'Color',      value: item.aiTags.color     },
  ].filter(Boolean);

  const handleClaim = async () => {
    if (!user) {
      alert('Please sign in to claim an item.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await createCheckoutSession({
        itemId:      item.id,
        storeId:     item.storeId || item.store,
        itemName:    item.name,
        price:       item.price,
        successUrl:  `${window.location.origin}${window.location.pathname}`,
        cancelUrl:   `${window.location.origin}${window.location.pathname}`,
        userId:      user?.uid || '',
        buyerHandle: user?.email?.split('@')[0] || 'guest',
        itemKind:    item.kind,
      });
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Checkout did not return a redirect URL');
    } catch (err) {
      console.error('Stripe checkout failed:', err.message);
      alert('Checkout is unavailable right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)', position: 'relative' }}>
      {/* Hero image */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ height: 380, background: item.bg || '#EDE8F5', overflow: 'hidden', position: 'relative' }}>
          {item.imageUrl
            ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <div style={{ position: 'absolute', inset: '6% 22%' }}><GarmentSVG kind={item.kind || 'top'} color={item.color || '#B88468'} accent={item.accent || '#3A2E3A'} /></div>}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(31,24,32,0.35) 0%, transparent 35%, transparent 60%, rgba(31,24,32,0.45) 100%)' }} />
        </div>
        {/* Controls overlay */}
        <div style={{ position: 'absolute', top: 52, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <IconBtn icon="arrow-left" onClick={() => push('feed')} />
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn icon="share" />
            <IconBtn icon={isSaved ? 'heart-fill' : 'heart'} onClick={() => toggleSaveItem(item.id)} active={isSaved} />
          </div>
        </div>
        {(item.aiTags?.era || item.era) && (
          <div style={{ position: 'absolute', bottom: 14, left: 16, padding: '4px 10px', borderRadius: 999, background: 'rgba(31,24,32,0.85)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {item.aiTags?.era || item.era}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 130px' }}>
        {/* Store badge */}
        <div style={{ margin: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: store.color || 'var(--aubergine-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
            {store.emoji || '🏪'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{store.name || 'Local Thrift Store'}</div>
            {store.city && <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{store.city}</div>}
          </div>
          {(item.storeId || item.store) && (
            <button onClick={() => push('store', { store: item.storeId || item.store })}
              style={{ fontSize: 12, color: 'var(--aubergine-600)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              View store →
            </button>
          )}
        </div>

        {/* Name + category */}
        <div style={{ padding: '14px 20px 0' }}>
          {item.aiTags?.category && (
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {item.aiTags.category}
            </div>
          )}
          <h1 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: 0, fontWeight: 500 }}>{item.name}</h1>
        </div>

        {/* Price + Size */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="display" style={{ fontSize: 40, fontWeight: 700, color: 'var(--ink-900)', lineHeight: 1 }}>${item.price}</span>
          {item.was && item.was > item.price && (
            <span style={{ fontSize: 20, color: 'var(--ink-400)', textDecoration: 'line-through' }}>${item.was}</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, background: 'var(--cream-100)', border: '1px solid var(--line)', color: 'var(--ink-700)' }}>
            Size {item.size}
          </span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ padding: '16px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(t => (
              <div key={t.label} style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--cream-100)', border: '1px solid var(--line)', fontSize: 12 }}>
                <span style={{ color: 'var(--ink-500)', fontWeight: 500 }}>{t.label}: </span>
                <span style={{ color: 'var(--ink-900)', fontWeight: 600 }}>{t.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div style={{ margin: '14px 20px 0', padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--cream-100)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5, fontStyle: 'italic' }}>
            {item.notes}
          </div>
        )}

        {/* Fulfillment info */}
        <div style={{ margin: '16px 20px 0', padding: 14, borderRadius: 'var(--r-md)', background: 'var(--blush-100)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="clock" size={18} color="var(--plum-900)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--plum-900)', lineHeight: 1.5 }}>
            <strong>Reserve now, pay at pickup.</strong> Claiming holds this item for 72 hours. The store confirms availability before any payment is taken.
          </div>
        </div>
      </div>

      {/* Sticky claim CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px 34px', background: 'rgba(251,247,241,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--line)' }}>
        <Btn variant="accent" size="lg" fullWidth onClick={handleClaim} disabled={loading}
          icon={loading ? <Spin /> : <Icon name="tag" size={18} color="#fff" />}>
          {loading ? 'Opening checkout…' : `Claim · $${item.price}`}
        </Btn>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--ink-500)' }}>
          Secure checkout via Stripe · Free cancellation within 1 hour
        </div>
      </div>

      {claimOpen && (
        <ClaimSheet
          item={item}
          user={user}
          onClose={() => setClaimOpen(false)}
          onConfirm={() => { setClaimed({ itemId: item.id }); setClaimOpen(false); }}
        />
      )}
    </div>
  );
};

// ─── Store Profile ────────────────────────────────────────────────────────────

const StoreProfile = ({ push, selectedStore, feedOutfits, allItems }) => {
  // selectedStore can be a string ID (from seed data) or a full store object (from Firestore/map)
  const store = typeof selectedStore === 'object' && selectedStore !== null
    ? selectedStore
    : storeById(selectedStore) || { name: 'Store', city: '', type: '', emoji: '🏪', color: '#5B4D7A', established: '' };

  const storeId = store.id || selectedStore;

  useEffect(() => {
    if (storeId) trackEvent('store_view', { storeId });
  }, [storeId]);
  const items = allItems.filter(i => i.store === storeId || i.storeId === storeId);
  const outfits = feedOutfits.filter(o => (o.items || []).some(id => {
    const item = allItems.find(i => i.id === id) || byId(id);
    return item?.store === storeId || item?.storeId === storeId;
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '52px 16px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <IconBtn icon="arrow-left" onClick={() => push('feed')} />
        <IconBtn icon="share" onClick={() => {
          const text = `Check out ${store.name || 'this store'} on Stylography!`;
          const url = window.location.href;
          if (navigator.share) {
            navigator.share({ title: store.name, text, url }).catch(() => {});
          } else {
            navigator.clipboard.writeText(`${text} ${url}`).then(() => alert('Link copied!')).catch(() => {});
          }
        }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>
        <div style={{ padding: '8px 20px' }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', background: store.color || '#5B4D7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, overflow: 'hidden' }}>
            {store.heroImageUrl
              ? <img src={store.heroImageUrl} style={{ width: 72, height: 72, objectFit: 'cover' }} alt="" />
              : store.emoji || '🏪'}
          </div>
          <h1 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '14px 0 4px', fontWeight: 500 }}>{store.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{store.type}{store.city ? ` · ${store.city}` : ''}{store.established ? ` · Est. ${store.established}` : ''}</div>
          {store.bio && (
            <p style={{ fontSize: 14, color: 'var(--ink-600)', lineHeight: 1.5, marginTop: 8, maxWidth: 400 }}>{store.bio}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn variant="accent" size="md">Follow</Btn>
            <Btn variant="soft" size="md" icon={<Icon name="pin" size={14} />} onClick={() => {
              const q = store.address
                ? `${store.address}, ${store.city || ''}`
                : store.city || store.name || 'store';
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
            }}>Directions</Btn>
          </div>
        </div>

        {outfits.length > 0 && (
          <div style={{ padding: '20px 20px 0' }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Curated looks</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 8px' }}>
              {outfits.map(o => (
                <div key={o.id} style={{ flexShrink: 0, width: 140 }}>
                  <BoardCard outfit={o} onClick={() => push('board', { board: o.id })} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '20px' }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Available now ({items.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {items.map(i => (
              <div key={i.id} style={{ height: 180, borderRadius: 'var(--r-md)', background: i.bg || '#EDE8F5', position: 'relative', overflow: 'hidden', border: '1px solid var(--line)' }}>
                {i.imageUrl
                  ? <img src={i.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <div style={{ position: 'absolute', inset: '12% 18%' }}><GarmentSVG kind={i.kind} color={i.color} accent={i.accent} /></div>}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 10px 8px', background: 'linear-gradient(transparent, rgba(31,24,32,0.65))', color: '#fff', fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{i.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, opacity: 0.9 }}>
                    <span>{i.aiTags?.era || i.era}</span><span style={{ fontWeight: 600 }}>${i.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Saved ────────────────────────────────────────────────────────────────────

const Saved = ({ push, savedBoards, savedItems, toggleSaveBoard, toggleSaveItem, feedOutfits, allItems }) => {
  const [tab, setTab] = useState('boards');
  const boards = feedOutfits.filter(o => savedBoards.has(o.id));
  const items  = allItems.filter(i => savedItems.has(i.id));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <TopBar title="Saved" />
      <div style={{ padding: '0 20px', display: 'flex', gap: 18, borderBottom: '1px solid var(--line)' }}>
        {[{ id: 'boards', label: `Boards (${boards.length})` },{ id: 'items', label: `Items (${items.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 0', fontSize: 15, fontWeight: 600, color: tab === t.id ? 'var(--ink-900)' : 'var(--ink-400)', borderBottom: tab === t.id ? '2px solid var(--aubergine-600)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 100px' }}>
        {tab === 'boards' && (
          boards.length === 0
            ? <EmptyState icon="bookmark" title="No boards saved yet" hint="Tap the bookmark on any outfit you like." />
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {boards.map(o => <BoardCard key={o.id} outfit={o} saved onSave={e => { e.stopPropagation(); toggleSaveBoard(o.id); }} onClick={() => push('board', { board: o.id })} />)}
              </div>
        )}
        {tab === 'items' && (
          items.length === 0
            ? <EmptyState icon="heart" title="No items saved yet" hint="Tap the heart on any piece to save it." />
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {items.map(i => (
                  <div key={i.id} style={{ height: 200, borderRadius: 'var(--r-md)', background: i.bg || '#EDE8F5', position: 'relative', overflow: 'hidden', border: '1px solid var(--line)' }}>
                    {i.imageUrl
                      ? <img src={i.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ position: 'absolute', inset: '10% 18%' }}><GarmentSVG kind={i.kind} color={i.color} accent={i.accent} /></div>}
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 10px 10px', background: 'linear-gradient(transparent, rgba(31,24,32,0.65))', color: '#fff', fontSize: 11 }}>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span>{storeById(i.store || i.storeId)?.name || 'Store'}</span>
                        <span style={{ fontWeight: 600 }}>${i.price}</span>
                      </div>
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

// ─── Shared UI ────────────────────────────────────────────────────────────────

export const BoardCard = ({ outfit, saved, onSave, onClick, tall }) => {
  const items = (outfit.items || []).map(id => byId(id)).filter(Boolean);
  const h     = tall ? 280 : 220;
  return (
    <button onClick={onClick} style={{ position: 'relative', height: h, borderRadius: 'var(--r-md)', background: items[0]?.bg || 'var(--cream-100)', overflow: 'hidden', border: '1px solid var(--line)', cursor: 'pointer', padding: 0, textAlign: 'left', transition: 'transform .18s, box-shadow .18s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {items[0] && <div style={{ position: 'absolute', left: '20%', right: '35%', top: '4%', height: '58%', transform: 'rotate(-4deg)' }}><GarmentSVG kind={items[0].kind} color={items[0].color} accent={items[0].accent} /></div>}
        {items[1] && <div style={{ position: 'absolute', left: '38%', right: '8%', top: '16%', height: '58%', transform: 'rotate(6deg)' }}><GarmentSVG kind={items[1].kind} color={items[1].color} accent={items[1].accent} /></div>}
        {items[2] && <div style={{ position: 'absolute', left: '6%', right: '58%', top: '52%', height: '36%', transform: 'rotate(-3deg)' }}><GarmentSVG kind={items[2].kind} color={items[2].color} accent={items[2].accent} /></div>}
        {items[3] && <div style={{ position: 'absolute', left: '50%', right: '10%', top: '58%', height: '34%', transform: 'rotate(8deg)' }}><GarmentSVG kind={items[3].kind} color={items[3].color} accent={items[3].accent} /></div>}
      </div>
      {onSave && (
        <button onClick={onSave} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: saved ? 'var(--aubergine-600)' : 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Icon name={saved ? 'bookmark-fill' : 'bookmark'} size={14} color={saved ? '#fff' : 'var(--ink-900)'} />
        </button>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '24px 12px 10px', background: 'linear-gradient(transparent, rgba(31,24,32,0.75))', color: '#fff' }}>
        <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{outfit.mood}</div>
        <div className="display" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.15, marginBottom: 4 }}>{outfit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.85 }}>
          <Icon name="heart" size={11} color="#fff" strokeWidth={2} />
          {(outfit.likes || 0) >= 1000 ? `${((outfit.likes || 0) / 1000).toFixed(1)}k` : (outfit.likes || 0)}
          <span style={{ margin: '0 4px' }}>·</span>
          {outfit.curator}
        </div>
      </div>
    </button>
  );
};

export const TopBar = ({ title, push }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 20px 10px' }}>
    {title ? <h1 className="display" style={{ fontSize: 26, fontWeight: 500, margin: 0 }}>{title}</h1> : <Wordmark size={20} />}
    <div style={{ display: 'flex', gap: 10 }}>
      <IconBtn icon="search" onClick={() => push?.('shop-pin')} />
      <IconBtn icon="map" onClick={() => push?.('store-map')} />
    </div>
  </div>
);

export const IconBtn = ({ icon, onClick, active }) => (
  <button onClick={onClick} style={{ width: 40, height: 40, borderRadius: '50%', background: active ? 'var(--aubergine-600)' : 'var(--cream-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}>
    <Icon name={icon} size={18} color={active ? '#fff' : 'var(--ink-900)'} />
  </button>
);

export const BottomNav = ({ current, push, savedCount = 0 }) => {
  const tabs = [
    { id: 'home',     icon: 'home',     label: 'Feed',     target: 'feed' },
    { id: 'shop-pin', icon: 'sparkle',  label: 'Shop Pin', target: 'shop-pin' },
    { id: 'saved',    icon: 'bookmark', label: 'Saved',    target: 'saved', badge: savedCount || null },
    { id: 'profile',  icon: 'user',     label: 'You',      target: 'feed' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px 28px', background: 'rgba(251,247,241,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-around' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => push(t.target)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', cursor: 'pointer', color: current === t.id ? 'var(--aubergine-600)' : 'var(--ink-400)', position: 'relative' }}>
          <Icon name={t.icon} size={22} color={current === t.id ? 'var(--aubergine-600)' : 'var(--ink-400)'} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          {t.badge ? <span style={{ position: 'absolute', top: 2, right: 6, minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px', background: 'var(--blush-500)', color: 'var(--ink-900)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span> : null}
        </button>
      ))}
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

const Spin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.3" />
    <path d="M12 2a10 10 0 0110 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
