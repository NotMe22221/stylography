import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { speak } from './elevenlabs.js';
import { Btn, Icon } from './primitives.jsx';

// ─── Tour steps: what the mascot points at and says ───────────────────────────

const TOUR_STEPS = [
  {
    id: 'welcome',
    target: null, // centered on screen
    position: { top: '30%', left: '50%', transform: 'translate(-50%, -50%)' },
    title: 'Welcome to your dashboard!',
    speech: "Hey there! I'm Stitchy, your Stylography guide. Let me show you around your new dashboard. It'll only take a minute, and you can skip ahead anytime.",
    pointer: null,
  },
  {
    id: 'sidebar',
    target: '[data-guide="sidebar"]',
    position: { top: 120, left: 250 },
    title: 'Navigation',
    speech: "This is your sidebar. From here you can jump to your inventory, upload new items, manage claims, create outfit boards, and view your store profile. Everything you need is one click away.",
    pointer: 'left',
  },
  {
    id: 'kpis',
    target: '[data-guide="kpis"]',
    position: { top: -60, left: '50%', transform: 'translateX(-50%)' },
    title: 'Your key metrics',
    speech: "These cards show your key numbers at a glance. Item views, saves, store visits, active claims, revenue, and your store balance. They update in real time as shoppers engage with your items.",
    pointer: 'down',
  },
  {
    id: 'attention-chart',
    target: '[data-guide="attention-chart"]',
    position: { top: -60, left: '30%' },
    title: 'Shopper attention',
    speech: "This chart tracks how many shoppers are viewing and saving your items each day over the last two weeks. It's the best way to see if your uploads are getting traction.",
    pointer: 'down',
  },
  {
    id: 'style-demand',
    target: '[data-guide="style-demand"]',
    position: { top: -60, left: '30%' },
    title: 'Style demand',
    speech: "Style cluster demand shows you what aesthetics your shoppers love most. If Y2K is trending, that's a signal to source more pieces in that style. This data helps you buy smarter.",
    pointer: 'down',
  },
  {
    id: 'top-saved',
    target: '[data-guide="top-saved"]',
    position: { top: -60, left: '30%' },
    title: 'Top saved items',
    speech: "Saves are the strongest signal of purchase intent. These are the items shoppers are bookmarking. If something has lots of saves but no claims, consider adjusting the price.",
    pointer: 'down',
  },
  {
    id: 'claims',
    target: '[data-guide="recent-claims"]',
    position: { top: -60, left: '40%' },
    title: 'Claims & reservations',
    speech: "When a shopper reserves one of your items, it shows up here. You can confirm, decline, or mark items as picked up. Try to respond within two hours for the best experience.",
    pointer: 'down',
  },
  {
    id: 'upload-cta',
    target: '[data-guide="upload-btn"]',
    position: { top: 50, left: -20 },
    title: 'Ready to upload!',
    speech: "That's the tour! Your next step is uploading your first items. Just click Upload Items, drop some photos, and our AI will auto-tag everything. It takes about 30 seconds per item. You've got this!",
    pointer: 'right',
  },
];

// ─── Mascot SVG (cute sewing needle character) ────────────────────────────────

const MascotSVG = ({ speaking, size = 56 }) => (
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
    {/* Mouth — opens when speaking */}
    {speaking ? (
      <ellipse cx="32" cy="40" rx="4" ry="3" fill="#2A1F3A" />
    ) : (
      <path d="M28 39 Q32 43 36 39" stroke="#2A1F3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    )}
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

// ─── Pointer arrow ────────────────────────────────────────────────────────────

const Pointer = ({ direction }) => {
  const arrows = {
    down:  { bottom: -10, left: '50%', transform: 'translateX(-50%)', borderTop: '10px solid var(--aubergine-600)' },
    up:    { top: -10, left: '50%', transform: 'translateX(-50%)', borderBottom: '10px solid var(--aubergine-600)' },
    left:  { left: -10, top: '50%', transform: 'translateY(-50%)', borderRight: '10px solid var(--aubergine-600)' },
    right: { right: -10, top: '50%', transform: 'translateY(-50%)', borderLeft: '10px solid var(--aubergine-600)' },
  };
  const base = { position: 'absolute', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' };
  return <div style={{ ...base, ...arrows[direction] }} />;
};

// ─── Main Guide Component ─────────────────────────────────────────────────────

export default function DashboardGuide({ userId, onDismiss }) {
  const [stepIndex, setStepIndex]   = useState(0);
  const [speaking, setSpeaking]     = useState(false);
  const [visible, setVisible]       = useState(true);
  const [mascotPos, setMascotPos]   = useState({ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' });
  const [fadeIn, setFadeIn]         = useState(false);
  const playbackRef                 = useRef(null);
  const stepRef                     = useRef(0);

  const step = TOUR_STEPS[stepIndex];

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Position mascot near the target element
  useEffect(() => {
    if (!step) return;

    if (!step.target) {
      setMascotPos(step.position);
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setMascotPos(step.position);
      return;
    }

    const rect = el.getBoundingClientRect();

    // Scroll the element into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Recalculate after scroll
    const timer = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pos = {};

      if (step.pointer === 'down') {
        pos.top = r.top - 140;
        pos.left = r.left + r.width / 2;
        pos.transform = 'translateX(-50%)';
      } else if (step.pointer === 'left') {
        pos.top = r.top + r.height / 2 - 60;
        pos.left = r.right + 16;
      } else if (step.pointer === 'right') {
        pos.top = r.top + r.height / 2 - 60;
        pos.left = r.left - 320;
      } else {
        pos.top = r.bottom + 16;
        pos.left = r.left + r.width / 2;
        pos.transform = 'translateX(-50%)';
      }

      // Clamp to viewport
      pos.top = Math.max(16, Math.min(window.innerHeight - 200, pos.top));
      pos.left = Math.max(16, Math.min(window.innerWidth - 340, pos.left));

      setMascotPos(pos);
    }, 400);

    return () => clearTimeout(timer);
  }, [stepIndex, step]);

  // Highlight the target element
  useEffect(() => {
    if (!step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;

    el.style.position = el.style.position || 'relative';
    el.style.zIndex = '60';
    el.style.boxShadow = '0 0 0 4px var(--aubergine-600), 0 0 24px rgba(91,77,122,0.3)';
    el.style.borderRadius = el.style.borderRadius || 'var(--r-md)';
    el.style.transition = 'box-shadow 0.3s ease';

    return () => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.transition = '';
    };
  }, [stepIndex, step]);

  // Speak the current step
  useEffect(() => {
    if (!step || !visible) return;
    stepRef.current = stepIndex;

    const timer = setTimeout(async () => {
      // Don't speak if user already moved on
      if (stepRef.current !== stepIndex) return;

      setSpeaking(true);
      try {
        const playback = await speak(step.speech);
        playbackRef.current = playback;
        await playback.finished;
      } catch (err) {
        console.warn('TTS playback failed:', err.message);
      } finally {
        if (stepRef.current === stepIndex) {
          setSpeaking(false);
        }
      }
    }, stepIndex === 0 ? 800 : 500);

    return () => {
      clearTimeout(timer);
      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
      }
      setSpeaking(false);
    };
  }, [stepIndex, visible, step]);

  const stopSpeech = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const goNext = useCallback(() => {
    stopSpeech();
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      dismiss();
    }
  }, [stepIndex, stopSpeech]);

  const goBack = useCallback(() => {
    stopSpeech();
    if (stepIndex > 0) setStepIndex(s => s - 1);
  }, [stepIndex, stopSpeech]);

  const dismiss = useCallback(async () => {
    stopSpeech();
    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 300);

    // Persist that the user has seen the tour
    if (userId) {
      try {
        await updateDoc(doc(db, 'stores', userId), {
          guideTourCompleted: true,
          guideTourCompletedAt: serverTimestamp(),
        });
      } catch {
        // Non-critical — don't block dismissal
      }
    }
  }, [userId, onDismiss, stopSpeech]);

  if (!visible || !step) return null;

  const isLast  = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: 'rgba(31, 24, 32, 0.35)',
          backdropFilter: 'blur(2px)',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.3s ease',
          cursor: 'pointer',
        }}
      />

      {/* Mascot + speech bubble */}
      <div
        style={{
          position: 'fixed',
          zIndex: 65,
          ...mascotPos,
          opacity: fadeIn ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Speech bubble */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(31,24,32,0.2), 0 0 0 1px var(--line)',
          maxWidth: 300,
          minWidth: 240,
          position: 'relative',
        }}>
          {step.pointer && <Pointer direction={step.pointer} />}

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{
              padding: '2px 8px', borderRadius: 999,
              background: 'var(--aubergine-100)', color: 'var(--aubergine-600)',
              fontSize: 10, fontWeight: 700,
            }}>
              {stepIndex + 1} / {TOUR_STEPS.length}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>
              {step.title}
            </div>
          </div>

          {/* Narration text */}
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-600)', marginBottom: 14 }}>
            {step.speech}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={goBack}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--ink-500)', cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                ← Back
              </button>
            )}
            <div style={{ flex: 1 }} />

            {/* Skip tour */}
            {!isLast && (
              <button
                onClick={dismiss}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--ink-400)', cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                Skip tour
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={goNext}
              style={{
                padding: '6px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 700,
                color: '#fff', cursor: 'pointer',
                background: 'var(--aubergine-600)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {isLast ? 'Get started!' : 'Next →'}
            </button>
          </div>

          {/* Speaking indicator */}
          {speaking && (
            <div style={{
              position: 'absolute', top: -8, right: 12,
              padding: '2px 8px', borderRadius: 999,
              background: 'var(--blush-500)', color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
              animation: 'pulse-guide 1.5s ease-in-out infinite',
            }}>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
              Speaking…
            </div>
          )}
        </div>

        {/* Mascot character */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginTop: -4,
          animation: speaking ? 'bounce-mascot 0.6s ease-in-out infinite' : 'float-mascot 3s ease-in-out infinite',
        }}>
          <MascotSVG speaking={speaking} size={52} />
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float-mascot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes bounce-mascot {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes pulse-guide {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}
