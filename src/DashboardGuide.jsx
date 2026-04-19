import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { speak } from './elevenlabs.js';

// ─── Tour steps ───────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  { id: 'welcome', target: null, title: 'Welcome to your dashboard!', speech: "Hey there! I'm Stitchy, your Stylography guide. Let me show you around your new dashboard. It'll only take a minute, and you can skip ahead anytime.", pointer: null },
  { id: 'sidebar', target: '[data-guide="sidebar"]', title: 'Navigation', speech: "This is your sidebar. From here you can jump to your inventory, upload new items, manage claims, create outfit boards, and view your store profile. Everything you need is one click away.", pointer: 'left' },
  { id: 'kpis', target: '[data-guide="kpis"]', title: 'Your key metrics', speech: "These cards show your key numbers at a glance. Item views, saves, store visits, active claims, revenue, and your store balance. They update in real time as shoppers engage with your items.", pointer: 'down' },
  { id: 'attention-chart', target: '[data-guide="attention-chart"]', title: 'Shopper attention', speech: "This chart tracks how many shoppers are viewing and saving your items each day. It's the best way to see if your uploads are getting traction.", pointer: 'down' },
  { id: 'style-demand', target: '[data-guide="style-demand"]', title: 'Style demand', speech: "Style cluster demand shows you what aesthetics your shoppers love most. If Y2K is trending, that's a signal to source more pieces in that style.", pointer: 'down' },
  { id: 'top-saved', target: '[data-guide="top-saved"]', title: 'Top saved items', speech: "Saves are the strongest signal of purchase intent. If something has lots of saves but no claims, consider adjusting the price.", pointer: 'down' },
  { id: 'claims', target: '[data-guide="recent-claims"]', title: 'Claims & reservations', speech: "When a shopper reserves one of your items, it shows up here. Try to respond within two hours for the best experience.", pointer: 'down' },
  { id: 'upload-cta', target: '[data-guide="upload-btn"]', title: 'Ready to upload!', speech: "That's the tour! Your next step is uploading your first items. Click Upload Items, drop some photos, and our AI will auto-tag everything. You've got this!", pointer: 'right' },
];

// ─── Gemini chat for Stitchy ──────────────────────────────────────────────────

const STITCHY_SYSTEM = `You are Stitchy, a friendly and knowledgeable assistant for Stylography — a platform that connects vintage and resale store owners with shoppers through personalized outfit curation.

You help store owners understand and use their dashboard. You know about:
- Uploading items (drag-drop photos, AI auto-tags with Gemini, confirm tags, publish)
- Dashboard metrics (item views, saves, store visits, claims, revenue, store balance)
- Claims (shoppers reserve items, owner confirms, pickup window)
- Outfit boards (select 1-4 items, Gemini generates styled flat-lay images)
- Style clusters (Y2K, Minimalist, Cottagecore, Streetwear, Vintage Classic, Preppy)
- Store profile (how shoppers see the store)
- Settings (notifications, account)
- Fulfillment (in-store pickup, local delivery, shipping)

Keep answers short (2-4 sentences), friendly, and practical. Use emoji sparingly. If you don't know something, say so honestly. Never use the term "thrift store" — say "vintage store", "resale shop", or "secondhand store" instead.`;

async function askStitchy(messages) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: STITCHY_SYSTEM });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const chat = model.startChat({ history });
  const last = messages[messages.length - 1];
  const result = await chat.sendMessage(last.text);
  return result.response.text();
}

// ─── Mascot SVG ───────────────────────────────────────────────────────────────

const MascotSVG = ({ speaking, size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="36" rx="18" ry="16" fill="#5B4D7A" />
    <ellipse cx="32" cy="36" rx="14" ry="12" fill="#7B6B9E" />
    <ellipse cx="32" cy="32" rx="12" ry="3" fill="#A896C8" opacity="0.6" />
    <ellipse cx="32" cy="38" rx="12" ry="3" fill="#A896C8" opacity="0.4" />
    <circle cx="26" cy="33" r="2.5" fill="#fff" /><circle cx="38" cy="33" r="2.5" fill="#fff" />
    <circle cx="26.5" cy="33.5" r="1.2" fill="#2A1F3A" /><circle cx="38.5" cy="33.5" r="1.2" fill="#2A1F3A" />
    <ellipse cx="22" cy="37" rx="3" ry="1.5" fill="#D4A5A5" opacity="0.5" />
    <ellipse cx="42" cy="37" rx="3" ry="1.5" fill="#D4A5A5" opacity="0.5" />
    {speaking ? <ellipse cx="32" cy="40" rx="4" ry="3" fill="#2A1F3A" /> : <path d="M28 39 Q32 43 36 39" stroke="#2A1F3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
    <line x1="32" y1="8" x2="32" y2="22" stroke="#C9A14A" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="32" cy="7" r="3" fill="#C9A14A" /><circle cx="32" cy="7" r="1.2" fill="#5B4D7A" />
    <path d="M50 36 Q56 28 52 20 Q48 14 54 10" stroke="#D4A5A5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="3 3">
      <animate attributeName="stroke-dashoffset" from="0" to="12" dur="2s" repeatCount="indefinite" />
    </path>
  </svg>
);

const Pointer = ({ direction }) => {
  const s = {
    down: { bottom: -10, left: '50%', transform: 'translateX(-50%)', border: '8px solid transparent', borderTopColor: 'var(--aubergine-600)' },
    left: { left: -10, top: '50%', transform: 'translateY(-50%)', border: '8px solid transparent', borderRightColor: 'var(--aubergine-600)' },
    right: { right: -10, top: '50%', transform: 'translateY(-50%)', border: '8px solid transparent', borderLeftColor: 'var(--aubergine-600)' },
  };
  return <div style={{ position: 'absolute', width: 0, height: 0, ...s[direction] }} />;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardGuide({ userId, onDismiss }) {
  const [mode, setMode] = useState('tour'); // 'tour' | 'chat' | 'minimized'
  const [stepIndex, setStepIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mascotPos, setMascotPos] = useState({});
  const [fadeIn, setFadeIn] = useState(false);
  const playbackRef = useRef(null);
  const stepRef = useRef(0);

  // Chat state
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Tour's done! 🧵 I'm still here if you have questions about your dashboard, uploading items, claims, or anything else. Just type away!" }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef(null);

  const step = TOUR_STEPS[stepIndex];

  useEffect(() => { const t = setTimeout(() => setFadeIn(true), 100); return () => clearTimeout(t); }, []);

  // ── Tour: position mascot ───────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'tour' || !step) return;
    if (!step.target) { setMascotPos({ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }); return; }
    const el = document.querySelector(step.target);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pos = {};
      if (step.pointer === 'down') { pos.top = r.top - 160; pos.left = r.left + r.width / 2; pos.transform = 'translateX(-50%)'; }
      else if (step.pointer === 'left') { pos.top = r.top + r.height / 2 - 70; pos.left = r.right + 20; }
      else if (step.pointer === 'right') { pos.top = r.top + r.height / 2 - 70; pos.left = r.left - 340; }
      else { pos.top = r.bottom + 20; pos.left = r.left + r.width / 2; pos.transform = 'translateX(-50%)'; }
      pos.top = Math.max(16, Math.min(window.innerHeight - 220, pos.top));
      pos.left = Math.max(16, Math.min(window.innerWidth - 360, pos.left));
      setMascotPos(pos);
    }, 400);
    return () => clearTimeout(timer);
  }, [stepIndex, step, mode]);

  // ── Tour: highlight target ──────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'tour' || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const prev = { position: el.style.position, zIndex: el.style.zIndex, boxShadow: el.style.boxShadow, borderRadius: el.style.borderRadius, transition: el.style.transition };
    el.style.position = el.style.position || 'relative';
    el.style.zIndex = '60';
    el.style.boxShadow = '0 0 0 4px var(--aubergine-600), 0 0 24px rgba(91,77,122,0.3)';
    el.style.borderRadius = el.style.borderRadius || 'var(--r-md)';
    el.style.transition = 'box-shadow 0.3s ease';
    return () => { el.style.position = prev.position; el.style.zIndex = prev.zIndex; el.style.boxShadow = prev.boxShadow; el.style.borderRadius = prev.borderRadius; el.style.transition = prev.transition; };
  }, [stepIndex, step, mode]);

  // ── Tour: TTS ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'tour' || !step || !visible) return;
    stepRef.current = stepIndex;
    const timer = setTimeout(async () => {
      if (stepRef.current !== stepIndex) return;
      setSpeaking(true);
      try { const p = await speak(step.speech); playbackRef.current = p; await p.finished; }
      catch (err) { console.warn('TTS failed:', err.message); }
      finally { if (stepRef.current === stepIndex) setSpeaking(false); }
    }, stepIndex === 0 ? 800 : 500);
    return () => { clearTimeout(timer); if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null; } setSpeaking(false); };
  }, [stepIndex, visible, step, mode]);

  // ── Chat: scroll to bottom ──────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const stopSpeech = useCallback(() => { if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null; } setSpeaking(false); }, []);

  const goNext = useCallback(() => {
    stopSpeech();
    if (stepIndex < TOUR_STEPS.length - 1) setStepIndex(s => s + 1);
    else setMode('chat'); // Tour done → switch to chat
  }, [stepIndex, stopSpeech]);

  const goBack = useCallback(() => { stopSpeech(); if (stepIndex > 0) setStepIndex(s => s - 1); }, [stepIndex, stopSpeech]);

  const dismiss = useCallback(async () => {
    stopSpeech(); setFadeIn(false);
    setTimeout(() => { setVisible(false); onDismiss?.(); }, 300);
  }, [onDismiss, stopSpeech]);

  const skipToChat = useCallback(() => { stopSpeech(); setMode('chat'); }, [stopSpeech]);

  // ── Chat: send message ──────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setThinking(true);
    try {
      const reply = await askStitchy(newMessages);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      // Speak the reply
      try { const p = await speak(reply); playbackRef.current = p; } catch {}
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Hmm, I couldn't process that. Try asking again!" }]);
    } finally {
      setThinking(false);
    }
  };

  if (!visible) return null;

  // ── Minimized bubble ────────────────────────────────────────────────
  if (mode === 'minimized') {
    return (
      <>
        <div onClick={() => setMode('chat')} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 70, cursor: 'pointer', opacity: fadeIn ? 1 : 0, transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid var(--aubergine-600)', opacity: 0.4, animation: 'pulse-ring 2s ease-in-out infinite' }} />
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--aubergine-100)', border: '3px solid var(--aubergine-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,77,122,0.3)', animation: 'float-mascot 3s ease-in-out infinite' }}>
            <MascotSVG speaking={false} size={44} />
          </div>
          <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 10, padding: '8px 14px', borderRadius: 12, borderBottomRightRadius: 4, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>
            💬 Ask me anything!
          </div>
        </div>
        <style>{guideStyles}</style>
      </>
    );
  }

  // ── Chat mode ───────────────────────────────────────────────────────
  if (mode === 'chat') {
    return (
      <>
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 70,
          width: 360, height: 480, borderRadius: 16, overflow: 'hidden',
          background: 'var(--surface)', border: '1px solid var(--line)',
          boxShadow: '0 12px 48px rgba(31,24,32,0.2)',
          display: 'flex', flexDirection: 'column',
          opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--aubergine-100)', flexShrink: 0 }}>
            <MascotSVG speaking={thinking} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--aubergine-600)' }}>Stitchy</div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)' }}>{thinking ? 'Thinking…' : 'Ask me anything about your dashboard'}</div>
            </div>
            <button onClick={() => setMode('minimized')} style={hdrBtn} title="Minimize">−</button>
            <button onClick={dismiss} style={hdrBtn} title="Close">✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                  background: m.role === 'user' ? 'var(--aubergine-600)' : 'var(--cream-100)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink-900)',
                  fontSize: 13, lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-300)', animation: 'dot-bounce 1.2s ease-in-out infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-300)', animation: 'dot-bounce 1.2s ease-in-out 0.2s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-300)', animation: 'dot-bounce 1.2s ease-in-out 0.4s infinite' }} />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--cream-50)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Stitchy anything…"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--surface)',
                fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || thinking}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: input.trim() ? 'var(--aubergine-600)' : 'var(--cream-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : 'var(--ink-400)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
        <style>{guideStyles}</style>
      </>
    );
  }

  // ── Tour mode ───────────────────────────────────────────────────────
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFirst = stepIndex === 0;

  return (
    <>
      <div onClick={dismiss} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(31,24,32,0.35)', backdropFilter: 'blur(2px)', opacity: fadeIn ? 1 : 0, transition: 'opacity 0.3s ease', cursor: 'pointer' }} />

      <div style={{ position: 'fixed', zIndex: 65, ...mascotPos, opacity: fadeIn ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 8px 32px rgba(31,24,32,0.2), 0 0 0 1px var(--line)', maxWidth: 300, minWidth: 240, position: 'relative' }}>
          {step.pointer && <Pointer direction={step.pointer} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--aubergine-100)', color: 'var(--aubergine-600)', fontSize: 10, fontWeight: 700 }}>{stepIndex + 1} / {TOUR_STEPS.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{step.title}</div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-600)', marginBottom: 14 }}>{step.speech}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isFirst && <button onClick={goBack} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--ink-500)', cursor: 'pointer', background: 'transparent' }}>← Back</button>}
            <div style={{ flex: 1 }} />
            {!isLast && <button onClick={skipToChat} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'var(--ink-400)', cursor: 'pointer', background: 'transparent' }}>Skip tour</button>}
            <button onClick={goNext} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', background: 'var(--aubergine-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isLast ? 'Get started!' : 'Next →'}
            </button>
          </div>
          {speaking && (
            <div style={{ position: 'absolute', top: -8, right: 12, padding: '2px 8px', borderRadius: 999, background: 'var(--blush-500)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, animation: 'pulse-guide 1.5s ease-in-out infinite' }}>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#fff' }} /> Speaking…
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -4, animation: speaking ? 'bounce-mascot 0.6s ease-in-out infinite' : 'float-mascot 3s ease-in-out infinite' }}>
          <MascotSVG speaking={speaking} size={52} />
        </div>
      </div>
      <style>{guideStyles}</style>
    </>
  );
}

const hdrBtn = { width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: 'var(--ink-500)' };

const guideStyles = `
  @keyframes float-mascot { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes bounce-mascot { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-4px) scale(1.05); } }
  @keyframes pulse-guide { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  @keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.15); opacity: 0; } }
  @keyframes dot-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
`;
