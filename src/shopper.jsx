// Shopper — mobile experience (inside iOS frame)
// Screens: welcome, style-quiz, questionnaire, location, feed-ready, feed, board-detail, shop-pin, store-profile, saved

const ShopperApp = ({ initialScreen = 'welcome', onExit }) => {
  const [screen, setScreen] = React.useState(initialScreen);
  const [quizPicks, setQuizPicks] = React.useState(new Set());
  const [styleScores, setStyleScores] = React.useState({});
  const [budget, setBudget] = React.useState(75);
  const [sizes, setSizes] = React.useState(new Set(['M']));
  const [colors, setColors] = React.useState(new Set());
  const [occasions, setOccasions] = React.useState(new Set());
  const [location, setLocation] = React.useState('');
  const [savedBoards, setSavedBoards] = React.useState(new Set());
  const [savedItems, setSavedItems] = React.useState(new Set());
  const [selectedBoard, setSelectedBoard] = React.useState(null);
  const [selectedStore, setSelectedStore] = React.useState(null);
  const [claimed, setClaimed] = React.useState(null);
  const [feedTab, setFeedTab] = React.useState('foryou');

  // Route
  const push = (s, opts = {}) => {
    if (opts.board) setSelectedBoard(opts.board);
    if (opts.store) setSelectedStore(opts.store);
    setScreen(s);
  };

  const toggleSet = (setter, value) => setter(prev => {
    const next = new Set(prev);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });

  const sharedProps = {
    push, screen,
    quizPicks, setQuizPicks, toggleSet,
    styleScores, setStyleScores,
    budget, setBudget, sizes, setSizes, colors, setColors, occasions, setOccasions,
    location, setLocation,
    savedBoards, setSavedBoards, savedItems, setSavedItems,
    selectedBoard, setSelectedBoard,
    selectedStore, setSelectedStore,
    claimed, setClaimed,
    feedTab, setFeedTab,
  };

  let content;
  if (screen === 'welcome')         content = <Welcome {...sharedProps} />;
  else if (screen === 'style-quiz') content = <StyleQuiz {...sharedProps} />;
  else if (screen === 'questionnaire') content = <Questionnaire {...sharedProps} />;
  else if (screen === 'location')   content = <LocationStep {...sharedProps} />;
  else if (screen === 'feed-ready') content = <FeedReady {...sharedProps} />;
  else if (screen === 'feed')       content = <Feed {...sharedProps} />;
  else if (screen === 'board')      content = <BoardDetail {...sharedProps} />;
  else if (screen === 'shop-pin')   content = <ShopPin {...sharedProps} />;
  else if (screen === 'store')      content = <StoreProfile {...sharedProps} />;
  else if (screen === 'saved')      content = <Saved {...sharedProps} />;

  return content;
};

// ————————————————————————————————————————————————————————————————————
// WELCOME
// ————————————————————————————————————————————————————————————————————
const Welcome = ({ push }) => (
  <div style={{ height: '100%', background: 'var(--cream-50)', position: 'relative', overflow: 'hidden' }}>
    {/* Decorative garment silhouettes in background */}
    <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }}>
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

    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 28px 50px' }}>
      <div>
        <div style={{ marginBottom: 40, animation: 'fadeUp .6s' }}>
          <Wordmark size={28} />
        </div>
        <h1 className="display" style={{ fontSize: 52, lineHeight: 0.95, margin: 0, color: 'var(--ink-900)', fontWeight: 500, animation: 'fadeUp .7s .1s both' }}>
          Your<br/>personal<br/><em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>vintage</em><br/>stylist.
        </h1>
        <p style={{ marginTop: 24, fontSize: 16, lineHeight: 1.5, color: 'var(--ink-500)', maxWidth: 260, animation: 'fadeUp .8s .2s both' }}>
          Outfits curated from real secondhand stores near you. No fast fashion. No algorithm slop.
        </p>
      </div>

      <div style={{ animation: 'fadeUp .8s .3s both' }}>
        <Btn variant="accent" size="lg" fullWidth onClick={() => push('style-quiz')} iconRight={<Icon name="arrow-right" size={18} color="#fff" />}>
          Get started
        </Btn>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-500)' }}>
          Already have an account? <span style={{ color: 'var(--aubergine-600)', fontWeight: 600 }}>Sign in</span>
        </div>
      </div>
    </div>
  </div>
);

// ————————————————————————————————————————————————————————————————————
// STYLE QUIZ — tap outfit images you love
// ————————————————————————————————————————————————————————————————————
// 16 outfit "tiles" across 8 style clusters. Each tile is a mini outfit composition.
const QUIZ_TILES = [
  { id: 'q1', cluster: 'minimalist', top: { kind: 'blouse', color: '#FAF3E8' }, bottom: { kind: 'pants', color: '#3A2E3A' }, bg: '#F4EEE4' },
  { id: 'q2', cluster: 'y2k', top: { kind: 'top', color: '#D4A5A5' }, bottom: { kind: 'jeans', color: '#4B6E8E' }, bg: '#F8E8E5' },
  { id: 'q3', cluster: 'cottagecore', top: { kind: 'dress', color: '#A8B79E' }, bg: '#E8EEE2' },
  { id: 'q4', cluster: 'streetwear', top: { kind: 'jacket', color: '#3A2E3A' }, bottom: { kind: 'jeans', color: '#4B6E8E' }, bg: '#E0D8E0' },
  { id: 'q5', cluster: 'preppy', top: { kind: 'blouse', color: '#FFFFFF' }, bottom: { kind: 'skirt', color: '#6B4A3A' }, bg: '#F4EDE0' },
  { id: 'q6', cluster: 'vintage-classic', top: { kind: 'coat', color: '#B88468' }, bg: '#EFE5D8' },
  { id: 'q7', cluster: 'minimalist', top: { kind: 'dress', color: '#3A2E3A' }, bg: '#E2DCEB' },
  { id: 'q8', cluster: 'y2k', top: { kind: 'dress', color: '#D4A5A5' }, bg: '#F8E8E5' },
  { id: 'q9', cluster: 'cottagecore', top: { kind: 'blouse', color: '#D4A5A5' }, bottom: { kind: 'skirt', color: '#A8B79E' }, bg: '#E8EEE2' },
  { id: 'q10', cluster: 'streetwear', top: { kind: 'top', color: '#C9A14A' }, bottom: { kind: 'pants', color: '#3A2E3A' }, bg: '#F4EDE0' },
  { id: 'q11', cluster: 'preppy', top: { kind: 'jacket', color: '#5B4D7A' }, bottom: { kind: 'pants', color: '#FAF3E8' }, bg: '#E2DCEB' },
  { id: 'q12', cluster: 'vintage-classic', top: { kind: 'dress', color: '#6B4A3A' }, bg: '#EFE5D8' },
  { id: 'q13', cluster: 'minimalist', top: { kind: 'top', color: '#5B4D7A' }, bottom: { kind: 'pants', color: '#FAF3E8' }, bg: '#E2DCEB' },
  { id: 'q14', cluster: 'cottagecore', top: { kind: 'dress', color: '#C9A14A' }, bg: '#F4EDE0' },
  { id: 'q15', cluster: 'streetwear', top: { kind: 'jacket', color: '#A8B79E' }, bottom: { kind: 'jeans', color: '#4B6E8E' }, bg: '#E8EEE2' },
  { id: 'q16', cluster: 'y2k', top: { kind: 'top', color: '#D4A5A5' }, bottom: { kind: 'skirt', color: '#5B4D7A' }, bg: '#F0D5D2' },
];

const StyleQuiz = ({ push, quizPicks, setQuizPicks, toggleSet, setStyleScores }) => {
  const minPicks = 3;
  const canContinue = quizPicks.size >= minPicks;

  const finish = () => {
    // Compute style scores from picks
    const scores = {};
    QUIZ_TILES.forEach(t => {
      if (quizPicks.has(t.id)) scores[t.cluster] = (scores[t.cluster] || 0) + 1;
    });
    setStyleScores(scores);
    push('questionnaire');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      {/* Header */}
      <div style={{ padding: '60px 24px 12px' }}>
        <StepDots step={1} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 6px', fontWeight: 500 }}>Tap the looks that make you <em style={{ color: 'var(--aubergine-600)', fontStyle: 'italic' }}>feel something.</em></h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>Pick at least {minPicks}. We'll learn the rest.</p>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUIZ_TILES.map(t => {
            const active = quizPicks.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleSet(setQuizPicks, t.id)}
                style={{
                  position: 'relative', height: 200, borderRadius: 'var(--r-md)',
                  background: t.bg, overflow: 'hidden',
                  border: active ? '2.5px solid var(--aubergine-600)' : '1px solid var(--line)',
                  padding: 0, cursor: 'pointer', transition: 'all .18s',
                  transform: active ? 'scale(0.97)' : 'scale(1)',
                  boxShadow: active ? '0 8px 24px rgba(91,77,122,0.25)' : 'none',
                }}
              >
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
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--aubergine-600)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn .15s',
                  }}>
                    <Icon name="checkmark" size={16} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '16px 24px 34px',
        background: 'linear-gradient(transparent, var(--cream-50) 30%)',
      }}>
        <Btn variant="accent" size="lg" fullWidth disabled={!canContinue} onClick={finish}>
          Continue {quizPicks.size > 0 && `(${quizPicks.size})`}
        </Btn>
      </div>
    </div>
  );
};

const StepDots = ({ step, total }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        height: 4, flex: 1, borderRadius: 2,
        background: i < step ? 'var(--aubergine-600)' : 'var(--cream-200)',
        transition: 'background .3s',
      }} />
    ))}
  </div>
);

// ————————————————————————————————————————————————————————————————————
// QUESTIONNAIRE
// ————————————————————————————————————————————————————————————————————
const Questionnaire = ({ push, budget, setBudget, sizes, setSizes, toggleSet, colors, setColors, occasions, setOccasions }) => {
  const SIZES = ['XS','S','M','L','XL'];
  const COLORS = [
    { name: 'Cream', c: '#F4EEE4' }, { name: 'Rose', c: '#D4A5A5' }, { name: 'Sage', c: '#A8B79E' },
    { name: 'Plum', c: '#5B4D7A' }, { name: 'Rust', c: '#B88468' }, { name: 'Ink', c: '#3A2E3A' },
    { name: 'Mustard', c: '#C9A14A' }, { name: 'Sky', c: '#7FA0B8' },
  ];
  const OCCASIONS = ['Everyday', 'Workwear', 'Date night', 'Festival', 'Weekend', 'Special event'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '60px 24px 8px' }}>
        <StepDots step={2} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 4px', fontWeight: 500 }}>A few quick things.</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>Helps us skip what you'd scroll past.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 140px' }}>
        {/* Budget slider */}
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
            {SIZES.map(s => (
              <Chip key={s} active={sizes.has(s)} onClick={() => toggleSet(setSizes, s)} color="var(--aubergine-600)">{s}</Chip>
            ))}
          </div>
        </Section>

        <Section label="Colors you gravitate toward">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {COLORS.map(c => {
              const active = colors.has(c.name);
              return (
                <button key={c.name} onClick={() => toggleSet(setColors, c.name)}
                  style={{
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
            {OCCASIONS.map(o => (
              <Chip key={o} active={occasions.has(o)} onClick={() => toggleSet(setOccasions, o)} color="var(--aubergine-600)">{o}</Chip>
            ))}
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

// ————————————————————————————————————————————————————————————————————
// LOCATION
// ————————————————————————————————————————————————————————————————————
const LocationStep = ({ push, location, setLocation }) => {
  const suggestions = ['Minneapolis, MN', 'Brooklyn, NY', 'Portland, OR', 'Austin, TX', 'Asheville, NC'];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <div style={{ padding: '60px 24px 8px' }}>
        <StepDots step={3} total={4} />
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.05, margin: '12px 0 4px', fontWeight: 500 }}>Where should we source from?</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, margin: 0 }}>We'll surface stores nearby first. You can always broaden later.</p>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Icon name="pin" size={18} color="var(--ink-500)" style={{ position: 'absolute', left: 16, top: 18 }} />
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="City or zip code"
            style={{
              width: '100%', padding: '16px 16px 16px 44px',
              borderRadius: 'var(--r-md)', border: '1px solid var(--line)',
              background: 'var(--surface)', fontSize: 16, outline: 'none',
            }}
          />
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="pin" size={18} color="var(--ink-500)" />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Popular right now</div>
          {suggestions.map(s => (
            <button key={s} onClick={() => setLocation(s)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '12px 8px', borderBottom: '1px solid var(--line)',
              cursor: 'pointer', background: 'transparent',
              color: 'var(--ink-900)', fontSize: 15, textAlign: 'left',
            }}>
              <Icon name="pin" size={16} color="var(--ink-500)" />
              {s}
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

// ————————————————————————————————————————————————————————————————————
// FEED READY — reveal
// ————————————————————————————————————————————————————————————————————
const FeedReady = ({ push, styleScores }) => {
  const topStyles = Object.entries(styleScores).sort((a,b) => b[1]-a[1]).slice(0, 3);
  React.useEffect(() => {
    const t = setTimeout(() => push('feed'), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ height: '100%', background: 'var(--cream-50)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, textAlign: 'center' }}>
        {/* Animated circle */}
        <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 32 }}>
          <div style={{ position: 'absolute', inset: 0, border: '2px dashed var(--aubergine-200)', borderRadius: '50%', animation: 'spin 8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 16, background: 'var(--aubergine-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
            <Icon name="sparkle" size={48} color="var(--aubergine-600)" />
          </div>
        </div>
        <h2 className="display" style={{ fontSize: 28, lineHeight: 1.1, margin: '0 0 12px', fontWeight: 500 }}>Building your feed…</h2>
        <p style={{ color: 'var(--ink-500)', fontSize: 14, maxWidth: 260, margin: 0 }}>We matched you with <strong style={{ color: 'var(--aubergine-600)' }}>{topStyles.length || 3} styles</strong> across <strong style={{ color: 'var(--aubergine-600)' }}>5 stores</strong> within 20 miles.</p>

        <div style={{ marginTop: 32, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
          {(topStyles.length ? topStyles : [['minimalist',1],['y2k',1],['cottagecore',1]]).map(([cid]) => {
            const c = STYLE_CLUSTERS.find(s => s.id === cid);
            return c ? <Chip key={cid} active color={c.color}>{c.name}</Chip> : null;
          })}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ————————————————————————————————————————————————————————————————————
// FEED — outfit boards grid
// ————————————————————————————————————————————————————————————————————
const Feed = ({ push, savedBoards, setSavedBoards, toggleSet, feedTab, setFeedTab, savedItems }) => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream-50)' }}>
      <TopBar />
      {/* Tabs */}
      <div style={{ padding: '0 20px', display: 'flex', gap: 18, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'foryou', label: 'For You' },
          { id: 'nearby', label: 'Near Me' },
          { id: 'trending', label: 'Trending' },
        ].map(t => (
          <button key={t.id} onClick={() => setFeedTab(t.id)} style={{
            padding: '14px 0', fontSize: 15, fontWeight: 600,
            color: feedTab === t.id ? 'var(--ink-900)' : 'var(--ink-400)',
            borderBottom: feedTab === t.id ? '2px solid var(--aubergine-600)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* "Shop this Pin" hero card */}
      <div style={{ padding: '16px 20px 8px' }}>
        <button onClick={() => push('shop-pin')} style={{
          width: '100%', padding: 16, borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(135deg, var(--aubergine-100), var(--blush-100))',
          border: '1px solid var(--aubergine-200)',
          display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{
            width: 54, height: 54, borderRadius: 'var(--r-md)',
            background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="sparkle" size={28} color="var(--aubergine-600)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--aubergine-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>New · Shop This Pin</div>
            <div className="display" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.15, marginBottom: 2 }}>Drop any outfit photo.</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>We'll find the pieces at local stores.</div>
          </div>
          <Icon name="arrow-right" size={20} color="var(--aubergine-600)" />
        </button>
      </div>

      {/* Feed grid — masonry-ish */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {OUTFITS.map((o, idx) => (
            <BoardCard
              key={o.id}
              outfit={o}
              saved={savedBoards.has(o.id)}
              onSave={e => { e.stopPropagation(); toggleSet(setSavedBoards, o.id); }}
              onClick={() => push('board', { board: o.id })}
              tall={idx % 3 === 0}
            />
          ))}
        </div>
      </div>

      <BottomNav current="home" push={push} savedCount={savedBoards.size + savedItems.size} />
    </div>
  );
};

const TopBar = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 20px 10px' }}>
    {title ? <h1 className="display" style={{ fontSize: 26, fontWeight: 500, margin: 0 }}>{title}</h1> : <Wordmark size={20} />}
    <div style={{ display: 'flex', gap: 10 }}>
      <IconBtn icon="search" />
      <IconBtn icon="map" />
    </div>
  </div>
);

const IconBtn = ({ icon, onClick, active }) => (
  <button onClick={onClick} style={{
    width: 40, height: 40, borderRadius: '50%',
    background: active ? 'var(--aubergine-600)' : 'var(--cream-100)',
    color: active ? '#fff' : 'var(--ink-900)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all .15s',
  }}><Icon name={icon} size={18} color={active ? '#fff' : 'var(--ink-900)'} /></button>
);

const BoardCard = ({ outfit, saved, onSave, onClick, tall }) => {
  const items = outfit.items.map(byId);
  const h = tall ? 280 : 220;
  return (
    <button onClick={onClick} style={{
      position: 'relative', height: h, borderRadius: 'var(--r-md)',
      background: items[0]?.bg || 'var(--cream-100)',
      overflow: 'hidden', border: '1px solid var(--line)',
      cursor: 'pointer', padding: 0, textAlign: 'left',
      transition: 'transform .18s, box-shadow .18s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      {/* Layered outfit composition */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {items[0] && (
          <div style={{ position: 'absolute', left: '20%', right: '35%', top: '4%', height: '58%', transform: 'rotate(-4deg)' }}>
            <GarmentSVG kind={items[0].kind} color={items[0].color} accent={items[0].accent} />
          </div>
        )}
        {items[1] && (
          <div style={{ position: 'absolute', left: '38%', right: '8%', top: '16%', height: '58%', transform: 'rotate(6deg)' }}>
            <GarmentSVG kind={items[1].kind} color={items[1].color} accent={items[1].accent} />
          </div>
        )}
        {items[2] && (
          <div style={{ position: 'absolute', left: '6%', right: '58%', top: '52%', height: '36%', transform: 'rotate(-3deg)' }}>
            <GarmentSVG kind={items[2].kind} color={items[2].color} accent={items[2].accent} />
          </div>
        )}
        {items[3] && (
          <div style={{ position: 'absolute', left: '50%', right: '10%', top: '58%', height: '34%', transform: 'rotate(8deg)' }}>
            <GarmentSVG kind={items[3].kind} color={items[3].color} accent={items[3].accent} />
          </div>
        )}
      </div>

      {/* Save button */}
      <button onClick={onSave} style={{
        position: 'absolute', top: 10, right: 10,
        width: 32, height: 32, borderRadius: '50%',
        background: saved ? 'var(--aubergine-600)' : 'rgba(255,255,255,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', backdropFilter: 'blur(6px)', transition: 'all .15s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <Icon name={saved ? 'bookmark-fill' : 'bookmark'} size={14} color={saved ? '#fff' : 'var(--ink-900)'} />
      </button>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '24px 12px 10px',
        background: 'linear-gradient(transparent, rgba(31,24,32,0.0) 20%, rgba(31,24,32,0.75))',
        color: '#fff',
      }}>
        <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{outfit.mood}</div>
        <div className="display" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.15, marginBottom: 4 }}>{outfit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.85 }}>
          <Icon name="heart" size={11} color="#fff" strokeWidth={2} />
          {outfit.likes >= 1000 ? `${(outfit.likes / 1000).toFixed(1)}k` : outfit.likes}
          <span style={{ margin: '0 4px' }}>·</span>
          {outfit.curator}
        </div>
      </div>
    </button>
  );
};

const BottomNav = ({ current, push, savedCount = 0 }) => {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Feed', target: 'feed' },
    { id: 'shop-pin', icon: 'sparkle', label: 'Shop Pin', target: 'shop-pin' },
    { id: 'saved', icon: 'bookmark', label: 'Saved', target: 'saved', badge: savedCount || null },
    { id: 'profile', icon: 'user', label: 'You', target: 'feed' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '10px 12px 28px',
      background: 'rgba(251,247,241,0.92)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => push(t.target)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 12px', cursor: 'pointer',
          color: current === t.id ? 'var(--aubergine-600)' : 'var(--ink-400)',
          position: 'relative',
        }}>
          <Icon name={t.icon} size={22} color={current === t.id ? 'var(--aubergine-600)' : 'var(--ink-400)'} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          {t.badge ? <span style={{
            position: 'absolute', top: 2, right: 6,
            minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
            background: 'var(--blush-500)', color: 'var(--ink-900)',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
};

Object.assign(window, { ShopperApp, BoardCard, BottomNav, TopBar, IconBtn });
