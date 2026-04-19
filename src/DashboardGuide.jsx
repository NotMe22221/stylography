import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

// ─── ElevenLabs Conversational AI Agent Widget ────────────────────────────────
// Embeds the Stitchy guide bot as a floating mascot on the dashboard.
// Uses the ElevenLabs widget embed approach for zero-dependency integration.

const AGENT_ID = 'agent_2901kpj5vqbtegarwpwgqm4newz5';

// ─── Mascot SVG (cute sewing spool character) ─────────────────────────────────

const MascotSVG = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body — thread spool */}
    <ellipse cx="32" cy="36" rx="18" ry="16" fill="#5B4D7A" />
    <ellipse cx="32" cy="36" rx="14" ry="12" fill="#7B6B9E" />
    {/* Thread wraps */}
    <ellipse cx="32" cy="32" rx="12" ry="3" fill="#A896C8" opacity="0.6" />
    <ellipse cx="32" cy="38" rx="12" ry="3" fill="#A896C8" opacity="0.4" />
    {/* Face */}
    <circle cx="26" cy="33" r="2.5" fill="#fff" />
    <circle cx="38" cy="33" r="2.5" fill="#fff" />
    <circle cx="26.5" cy="33.5" r="1.2" fill="#2A1F3A" />
    <circle cx="38.5" cy="33.5" r="1.2" fill="#2A1F3A" />
    {/* Blush */}
    <ellipse cx="22" cy="37" rx="3" ry="1.5" fill="#D4A5A5" opacity="0.5" />
    <ellipse cx="42" cy="37" rx="3" ry="1.5" fill="#D4A5A5" opacity="0.5" />
    {/* Smile */}
    <path d="M28 39 Q32 43 36 39" stroke="#2A1F3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Needle on top (like a hat) */}
    <line x1="32" y1="8" x2="32" y2="22" stroke="#C9A14A" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="32" cy="7" r="3" fill="#C9A14A" />
    <circle cx="32" cy="7" r="1.2" fill="#5B4D7A" />
    {/* Thread trailing */}
    <path d="M50 36 Q56 28 52 20 Q48 14 54 10" stroke="#D4A5A5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="3 3">
      <animate attributeName="stroke-dashoffset" from="0" to="12" dur="2s" repeatCount="indefinite" />
    </path>
  </svg>
);

// ─── Main Guide Component ─────────────────────────────────────────────────────

export default function DashboardGuide({ userId, onDismiss }) {
  const [visible, setVisible]     = useState(true);
  const [expanded, setExpanded]   = useState(false);
  const [fadeIn, setFadeIn]       = useState(false);
  const widgetRef                 = useRef(null);
  const scriptLoaded              = useRef(false);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Load the ElevenLabs widget script when expanded
  useEffect(() => {
    if (!expanded || scriptLoaded.current) return;

    // Inject the elevenlabs-convai widget element
    if (widgetRef.current && !widgetRef.current.querySelector('elevenlabs-convai')) {
      const widget = document.createElement('elevenlabs-convai');
      widget.setAttribute('agent-id', AGENT_ID);
      widgetRef.current.appendChild(widget);
    }

    // Load the widget script if not already loaded
    if (!document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }

    scriptLoaded.current = true;
  }, [expanded]);

  const dismiss = async () => {
    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 300);

    // Persist that the user has seen the guide
    if (userId) {
      try {
        await updateDoc(doc(db, 'stores', userId), {
          guideTourCompleted: true,
          guideTourCompletedAt: serverTimestamp(),
        });
      } catch {
        // Non-critical
      }
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating mascot button (bottom-right) */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 70,
            cursor: 'pointer',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'scale(1)' : 'scale(0.5)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Pulse ring */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: '2px solid var(--aubergine-600)',
            opacity: 0.4,
            animation: 'pulse-ring 2s ease-in-out infinite',
          }} />

          {/* Mascot container */}
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'var(--aubergine-100)',
            border: '3px solid var(--aubergine-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(91,77,122,0.3)',
            animation: 'float-mascot 3s ease-in-out infinite',
          }}>
            <MascotSVG size={44} />
          </div>

          {/* Speech bubble hint */}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 10,
            padding: '8px 14px',
            borderRadius: 12,
            borderBottomRightRadius: 4,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-900)',
            whiteSpace: 'nowrap',
            animation: 'fade-hint 0.5s ease 1s both',
          }}>
            👋 Hi! Need help getting started?
          </div>
        </div>
      )}

      {/* Expanded agent panel */}
      {expanded && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 70,
          width: 380,
          height: 520,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          boxShadow: '0 12px 48px rgba(31,24,32,0.2)',
          display: 'flex',
          flexDirection: 'column',
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--aubergine-100)',
          }}>
            <MascotSVG size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--aubergine-600)' }}>
                Stitchy
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                Your Stylography guide
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--surface)', border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, color: 'var(--ink-500)',
              }}
              title="Minimize"
            >
              −
            </button>
            <button
              onClick={dismiss}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--surface)', border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, color: 'var(--ink-500)',
              }}
              title="Dismiss guide"
            >
              ✕
            </button>
          </div>

          {/* ElevenLabs widget container */}
          <div
            ref={widgetRef}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          />

          {/* Skip / dismiss footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--cream-50)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
              Powered by ElevenLabs
            </span>
            <button
              onClick={dismiss}
              style={{
                padding: '4px 12px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                color: 'var(--ink-500)', cursor: 'pointer',
                background: 'transparent',
              }}
            >
              Skip guide
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes float-mascot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes fade-hint {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Hide the default ElevenLabs widget button since we have our own mascot */
        elevenlabs-convai {
          --elevenlabs-convai-widget-width: 100% !important;
          --elevenlabs-convai-widget-height: 100% !important;
        }
      `}</style>
    </>
  );
}
