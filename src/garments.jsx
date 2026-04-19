import React from 'react';

// Garment SVG illustrations — flat, warm-toned, outfit board imagery
export const GarmentSVG = ({ kind, color = '#B88468', accent = '#3A2E3A', style = {} }) => {
  const svgProps = {
    viewBox: '0 0 100 140',
    preserveAspectRatio: 'xMidYMid meet',
    style: { width: '100%', height: '100%', display: 'block', ...style },
  };

  switch (kind) {
    case 'top':
    case 'tee':
      return (
        <svg {...svgProps}>
          <path d="M20 30 L30 22 L40 28 Q50 34 60 28 L70 22 L80 30 L88 50 L76 56 L76 110 Q76 115 71 115 L29 115 Q24 115 24 110 L24 56 L12 50 Z" fill={color} />
          <path d="M40 28 Q50 34 60 28" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.3" />
        </svg>
      );
    case 'blouse':
      return (
        <svg {...svgProps}>
          <path d="M22 32 L32 22 L42 28 Q50 32 58 28 L68 22 L78 32 L84 48 L78 52 L78 115 Q78 120 73 120 L27 120 Q22 120 22 115 L22 52 L16 48 Z" fill={color} />
          <circle cx="50" cy="55" r="1.2" fill={accent} opacity="0.5" />
          <circle cx="50" cy="70" r="1.2" fill={accent} opacity="0.5" />
          <circle cx="50" cy="85" r="1.2" fill={accent} opacity="0.5" />
        </svg>
      );
    case 'dress':
      return (
        <svg {...svgProps}>
          <path d="M28 22 L38 18 Q50 22 62 18 L72 22 L78 42 L72 46 L82 120 Q82 126 76 126 L24 126 Q18 126 18 120 L28 46 L22 42 Z" fill={color} />
          <path d="M38 18 Q50 22 62 18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.3" />
          <path d="M28 70 Q50 75 72 70" fill="none" stroke={accent} strokeWidth="1" opacity="0.2" />
        </svg>
      );
    case 'pants':
      return (
        <svg {...svgProps}>
          <path d="M28 20 L72 20 L74 42 L72 126 L56 126 L52 70 L48 70 L44 126 L28 126 L26 42 Z" fill={color} />
          <line x1="50" y1="22" x2="50" y2="68" stroke={accent} strokeWidth="0.8" opacity="0.3" />
          <rect x="32" y="24" width="10" height="4" fill={accent} opacity="0.2" />
          <rect x="58" y="24" width="10" height="4" fill={accent} opacity="0.2" />
        </svg>
      );
    case 'jeans':
      return (
        <svg {...svgProps}>
          <path d="M26 20 L74 20 L76 44 L74 126 L56 126 L52 72 L48 72 L44 126 L26 126 L24 44 Z" fill={color} />
          <line x1="50" y1="22" x2="50" y2="70" stroke={accent} strokeWidth="0.8" opacity="0.4" />
          <path d="M30 24 L38 30 M42 24 L38 30" stroke={accent} strokeWidth="0.6" opacity="0.3" fill="none" />
          <rect x="30" y="34" width="14" height="16" rx="1" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.3" />
          <rect x="56" y="34" width="14" height="16" rx="1" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.3" />
        </svg>
      );
    case 'skirt':
      return (
        <svg {...svgProps}>
          <path d="M30 30 L70 30 L72 42 L82 116 Q82 122 76 122 L24 122 Q18 122 18 116 L28 42 Z" fill={color} />
          <rect x="30" y="30" width="40" height="6" fill={accent} opacity="0.2" />
        </svg>
      );
    case 'jacket':
    case 'coat':
      return (
        <svg {...svgProps}>
          <path d="M18 28 L30 18 L42 26 L50 32 L58 26 L70 18 L82 28 L90 54 L78 58 L78 118 Q78 124 72 124 L28 124 Q22 124 22 118 L22 58 L10 54 Z" fill={color} />
          <line x1="50" y1="32" x2="50" y2="118" stroke={accent} strokeWidth="1" opacity="0.4" />
          <circle cx="50" cy="50" r="1.8" fill={accent} opacity="0.6" />
          <circle cx="50" cy="70" r="1.8" fill={accent} opacity="0.6" />
          <circle cx="50" cy="90" r="1.8" fill={accent} opacity="0.6" />
        </svg>
      );
    case 'shoes':
    case 'sneakers':
      return (
        <svg {...svgProps}>
          <path d="M12 80 L18 60 Q30 55 45 58 Q62 62 78 68 Q88 72 90 82 L90 92 Q90 96 86 96 L16 96 Q12 96 12 92 Z" fill={color} />
          <rect x="12" y="90" width="78" height="6" rx="2" fill={accent} opacity="0.8" />
          <line x1="40" y1="65" x2="42" y2="85" stroke={accent} strokeWidth="1" opacity="0.4" />
          <line x1="52" y1="66" x2="54" y2="86" stroke={accent} strokeWidth="1" opacity="0.4" />
          <line x1="64" y1="68" x2="66" y2="86" stroke={accent} strokeWidth="1" opacity="0.4" />
        </svg>
      );
    case 'boots':
      return (
        <svg {...svgProps}>
          <path d="M32 20 L62 20 L64 80 L84 82 Q90 82 90 88 L90 100 Q90 104 86 104 L30 104 Q26 104 26 100 L26 82 Q26 80 28 80 L32 80 Z" fill={color} />
          <rect x="26" y="98" width="64" height="6" rx="1" fill={accent} opacity="0.8" />
          <line x1="38" y1="24" x2="38" y2="76" stroke={accent} strokeWidth="0.6" opacity="0.3" />
          <line x1="56" y1="24" x2="56" y2="76" stroke={accent} strokeWidth="0.6" opacity="0.3" />
        </svg>
      );
    case 'heels':
      return (
        <svg {...svgProps}>
          <path d="M20 80 Q28 68 50 66 Q72 66 82 74 Q88 78 88 86 Q88 92 82 94 L70 96 L66 104 Q66 108 62 108 L24 108 Q20 108 20 104 Z" fill={color} />
          <path d="M66 96 L72 104" stroke={accent} strokeWidth="2" fill="none" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...svgProps}>
          <path d="M32 44 Q32 28 50 28 Q68 28 68 44" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.7" />
          <rect x="22" y="44" width="56" height="58" rx="4" fill={color} />
          <rect x="32" y="60" width="36" height="2" fill={accent} opacity="0.3" />
          <circle cx="50" cy="74" r="2" fill={accent} opacity="0.5" />
        </svg>
      );
    case 'hat':
      return (
        <svg {...svgProps}>
          <ellipse cx="50" cy="82" rx="40" ry="6" fill={color} />
          <path d="M30 82 Q30 50 50 50 Q70 50 70 82" fill={color} />
          <rect x="30" y="74" width="40" height="4" fill={accent} opacity="0.3" />
        </svg>
      );
    case 'scarf':
      return (
        <svg {...svgProps}>
          <path d="M30 30 Q50 28 70 30 L74 80 Q74 82 72 82 L64 82 L62 110 L52 110 L50 84 L48 110 L38 110 L36 82 L28 82 Q26 82 26 80 Z" fill={color} />
          <line x1="36" y1="42" x2="64" y2="42" stroke={accent} strokeWidth="1" opacity="0.3" />
          <line x1="36" y1="54" x2="64" y2="54" stroke={accent} strokeWidth="1" opacity="0.3" />
        </svg>
      );
    case 'sunglasses':
    case 'glasses':
      return (
        <svg {...svgProps}>
          <rect x="14" y="54" width="30" height="22" rx="4" fill={color} />
          <rect x="56" y="54" width="30" height="22" rx="4" fill={color} />
          <line x1="44" y1="62" x2="56" y2="62" stroke={color} strokeWidth="3" />
        </svg>
      );
    case 'jewelry':
    case 'necklace':
      return (
        <svg {...svgProps}>
          <path d="M20 40 Q50 90 80 40" fill="none" stroke={color} strokeWidth="2.5" />
          <circle cx="50" cy="80" r="6" fill={color} />
          <circle cx="50" cy="80" r="3" fill={accent} opacity="0.6" />
        </svg>
      );
    case 'belt':
      return (
        <svg {...svgProps}>
          <rect x="8" y="60" width="84" height="18" rx="2" fill={color} />
          <rect x="44" y="58" width="16" height="22" rx="2" fill={accent} opacity="0.8" />
          <rect x="48" y="62" width="8" height="14" rx="1" fill={color} />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <rect x="20" y="20" width="60" height="100" rx="8" fill={color} />
        </svg>
      );
  }
};

// Garment "photo card"
export const GarmentCard = ({ kind, color, bg, accent, label, price, store, size = 'md', onClick, selected, saved, style = {} }) => {
  const sizes = {
    xs:   { w: 80,    h: 100,   fs: 10 },
    sm:   { w: 120,   h: 150,   fs: 11 },
    md:   { w: 160,   h: 200,   fs: 12 },
    lg:   { w: 200,   h: 250,   fs: 13 },
    fill: { w: '100%',h: '100%',fs: 12 },
  };
  const s = sizes[size];
  return (
    <div
      onClick={onClick}
      style={{
        width: s.w, height: s.h,
        borderRadius: 'var(--r-md)',
        background: bg || 'var(--cream-100)',
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        border: selected ? '2px solid var(--aubergine-600)' : '1px solid var(--line)',
        transition: 'transform .2s, box-shadow .2s',
        boxShadow: selected ? 'var(--shadow-md)' : 'none',
        ...style,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ position: 'absolute', inset: '12% 18% 18% 18%' }}>
        <GarmentSVG kind={kind} color={color} accent={accent} />
      </div>
      {saved && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--aubergine-600)">
            <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z" />
          </svg>
        </div>
      )}
      {(label || price) && size !== 'xs' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px', background: 'linear-gradient(transparent, rgba(31,24,32,0.55))', color: '#fff', fontSize: s.fs, lineHeight: 1.3 }}>
          {label && <div style={{ fontWeight: 500 }}>{label}</div>}
          {(price || store) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9, fontSize: s.fs - 1 }}>
              {store && <span>{store}</span>}
              {price && <span style={{ fontWeight: 600 }}>{price}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
