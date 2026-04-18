// Shared UI primitives

// Brand wordmark — Fraunces serif + small logo dot
const Wordmark = ({ size = 22, color = 'var(--ink-900)', dotColor = 'var(--aubergine-600)' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color, fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 500, letterSpacing: '-0.02em' }}>
    <svg width={size * 0.85} height={size * 0.85} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="13" fill="none" stroke={dotColor} strokeWidth="1.5" />
      <circle cx="14" cy="14" r="7" fill={dotColor} />
      <circle cx="14" cy="14" r="2.5" fill="var(--cream-50)" />
    </svg>
    <span>Stylography</span>
  </div>
);

// Pill button
const Btn = ({ children, variant = 'primary', size = 'md', onClick, disabled, icon, iconRight, style = {}, fullWidth }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 'var(--r-pill)',
    fontWeight: 600, letterSpacing: '-0.01em',
    transition: 'transform .12s, background .12s, box-shadow .12s',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13, height: 32 },
    md: { padding: '10px 18px', fontSize: 14, height: 42 },
    lg: { padding: '14px 24px', fontSize: 16, height: 52 },
  };
  const variants = {
    primary: { background: 'var(--ink-900)', color: 'var(--cream-50)' },
    accent: { background: 'var(--aubergine-600)', color: '#fff' },
    blush: { background: 'var(--blush-500)', color: 'var(--ink-900)' },
    ghost: { background: 'transparent', color: 'var(--ink-900)', border: '1px solid var(--ink-900)' },
    soft: { background: 'var(--cream-100)', color: 'var(--ink-900)' },
    softAccent: { background: 'var(--aubergine-100)', color: 'var(--aubergine-600)' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}{children}{iconRight}
    </button>
  );
};

// Chip / tag
const Chip = ({ children, active, onClick, color, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 'var(--r-pill)',
      fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
      background: active ? (color || 'var(--ink-900)') : 'transparent',
      color: active ? '#fff' : 'var(--ink-700)',
      border: active ? 'none' : '1px solid var(--line)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .15s',
      ...style,
    }}
  >{children}</button>
);

// Icon set — line icons, sized to taste
const Icon = ({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'heart':    return <svg {...p}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>;
    case 'heart-fill': return <svg {...p} fill={color}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></svg>;
    case 'bookmark': return <svg {...p}><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>;
    case 'bookmark-fill': return <svg {...p} fill={color}><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>;
    case 'share': return <svg {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></svg>;
    case 'search':   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'home':     return <svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z"/></svg>;
    case 'map':      return <svg {...p}><path d="M9 4l6 2 5-2v14l-5 2-6-2-5 2V6l5-2z"/><path d="M9 4v16M15 6v16"/></svg>;
    case 'user':     return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0114 0v1"/></svg>;
    case 'plus':     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'close':    return <svg {...p}><path d="M6 6l12 12M6 18L18 6"/></svg>;
    case 'chevron':  return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chevron-down':  return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case 'arrow-right': return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-left': return <svg {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>;
    case 'upload':   return <svg {...p}><path d="M12 3v12M6 9l6-6 6 6M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>;
    case 'image':    return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>;
    case 'sparkle':  return <svg {...p}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6zM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zM5 4l.8 2.2L8 7l-2.2.8L5 10l-.8-2.2L2 7l2.2-.8L5 4z"/></svg>;
    case 'shop':     return <svg {...p}><path d="M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M9 13a3 3 0 006 0"/></svg>;
    case 'checkmark':return <svg {...p}><path d="M5 12l5 5L20 7"/></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'pin':      return <svg {...p}><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13s-7-8-7-13a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'star':     return <svg {...p}><path d="M12 3l2.6 6.2 6.4.6-4.9 4.4 1.5 6.4L12 17l-5.6 3.6 1.5-6.4L3 9.8l6.4-.6z"/></svg>;
    case 'clock':    return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'tag':      return <svg {...p}><path d="M3 3h9l9 9-9 9-9-9V3z"/><circle cx="8" cy="8" r="1.5" fill={color} stroke="none"/></svg>;
    case 'grid':     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'filter':   return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'eye':      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'trending': return <svg {...p}><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>;
    case 'truck':    return <svg {...p}><rect x="1" y="6" width="14" height="10" rx="1"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
    case 'menu':     return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'dots':     return <svg {...p}><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></svg>;
    case 'camera':   return <svg {...p}><rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 6l1.5-2h3L15 6"/></svg>;
    case 'link':     return <svg {...p}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>;
    case 'check-circle': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>;
    default: return null;
  }
};

// Little colored dot
const Dot = ({ color, size = 8 }) => (
  <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color }} />
);

// Avatar (initial circle)
const Avatar = ({ name = '?', size = 36, color = 'var(--aubergine-500)' }) => {
  const initial = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.38, letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>{initial}</div>
  );
};

Object.assign(window, { Wordmark, Btn, Chip, Icon, Dot, Avatar });
