import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { speak, textToSpeech, playAudioBlob } from './elevenlabs.js';
import { generateTourGuideReply } from './gemini.js';

function speechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

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

<<<<<<< HEAD
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
=======
// ─── Main Guide Component (voice optional + optional conversational Q&A) ─────

export default function DashboardGuide({ userId, onDismiss }) {
  /** null until owner picks a mode */
  const [prefs, setPrefs]           = useState(null);
  const [stepIndex, setStepIndex]   = useState(0);
  const [speaking, setSpeaking]     = useState(false);
  const [visible, setVisible]       = useState(true);
  const [mascotPos, setMascotPos]   = useState({});
  const [fadeIn, setFadeIn]         = useState(false);
  const playbackRef                 = useRef(null);
  const stepRef                     = useRef(0);
  const recognizerRef               = useRef(null);
  /** 'idle' | 'button' | 'ctrl-ptt' — who started speech recognition */
  const voiceInputModeRef           = useRef('idle');
  const pttTranscriptRef            = useRef('');
  const ctrlPttHeldRef              = useRef(false);
  /** Bumped when canceling recognition so stale onend handlers never submit */
  const recognizerGenRef            = useRef(0);

  const [chatReady, setChatReady]   = useState(false);
  const [listening, setListening]   = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError]   = useState(null);
  const [userLine, setUserLine]     = useState('');
  const [stitchyLine, setStitchyLine] = useState('');
  const [questionText, setQuestionText] = useState('');
  /** True while Control push-to-talk session is capturing */
  const [ctrlPttUi, setCtrlPttUi]       = useState(false);

  const step = TOUR_STEPS[stepIndex];

  useEffect(() => {
    setUserLine('');
    setStitchyLine('');
    setChatError(null);
    setChatReady(false);
    setQuestionText('');
  }, [stepIndex]);

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Position mascot near the target element
  useEffect(() => {
    if (!prefs || !step) return;

    if (!step.target) {
      setMascotPos({ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

>>>>>>> 365bc3a (good stuff)
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
<<<<<<< HEAD
  }, [stepIndex, step, mode]);
=======
  }, [stepIndex, step, prefs]);
>>>>>>> 365bc3a (good stuff)

  // ── Tour: highlight target ──────────────────────────────────────────
  useEffect(() => {
<<<<<<< HEAD
    if (mode !== 'tour' || !step?.target) return;
=======
    if (!prefs || !step?.target) return;
>>>>>>> 365bc3a (good stuff)
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

<<<<<<< HEAD
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
=======
    return () => {
      el.style.position = prev.position;
      el.style.zIndex = prev.zIndex;
      el.style.boxShadow = prev.boxShadow;
      el.style.borderRadius = prev.borderRadius;
      el.style.transition = prev.transition;
    };
  }, [stepIndex, step, prefs]);

  // Speak the current step using ElevenLabs TTS when narration is enabled.
  // Fetch MP3 first, then check we're still on this step before playing — avoids
  // the previous step's audio starting after clicking Next during network delay.
  useEffect(() => {
    if (!step || !visible || !prefs?.narration) return;

    const runForStep = stepIndex;
    stepRef.current = stepIndex;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (cancelled || stepRef.current !== runForStep) return;

          setSpeaking(true);
          const blob = await textToSpeech(step.speech);
          if (cancelled || stepRef.current !== runForStep) {
            setSpeaking(false);
            return;
          }

          const playback = playAudioBlob(blob);
          playbackRef.current = playback;
          await playback.audio.play();

          if (cancelled || stepRef.current !== runForStep) {
            playback.stop();
            playbackRef.current = null;
            setSpeaking(false);
            return;
          }

          await playback.finished;
        } catch (err) {
          if (!cancelled) console.warn('TTS playback failed:', err.message);
        } finally {
          if (!cancelled && stepRef.current === runForStep) {
            setSpeaking(false);
            if (prefs.conversation) setChatReady(true);
          }
        }
      })();
>>>>>>> 365bc3a (good stuff)
    }, stepIndex === 0 ? 800 : 500);
    return () => { clearTimeout(timer); if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null; } setSpeaking(false); };
  }, [stepIndex, visible, step, mode]);

<<<<<<< HEAD
  // ── Chat: scroll to bottom ──────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const stopSpeech = useCallback(() => { if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null; } setSpeaking(false); }, []);
=======
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
      }
      setSpeaking(false);
    };
  }, [stepIndex, visible, step, prefs]);

  const stopSpeech = useCallback(() => {
    if (recognizerRef.current) {
      recognizerGenRef.current += 1;
      try {
        recognizerRef.current.stop();
      } catch { /* */ }
    }
    ctrlPttHeldRef.current = false;
    setCtrlPttUi(false);
    setListening(false);
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    setSpeaking(false);
  }, []);
>>>>>>> 365bc3a (good stuff)

  const sendQuestion = useCallback(async (text) => {
    const q = text.trim();
    if (!q || !prefs?.conversation || !step) return;
    stopSpeech();
    setListening(false);
    setChatLoading(true);
    setChatError(null);
    setUserLine(q);
    setStitchyLine('');
    try {
      const reply = await generateTourGuideReply({
        stepTitle: step.title,
        stepSpeech: step.speech,
        userMessage: q,
      });
      setStitchyLine(reply);
      if (prefs.narration) {
        setSpeaking(true);
        const playback = await speak(reply);
        playbackRef.current = playback;
        await playback.finished;
      }
    } catch (err) {
      setChatError(err.message || 'Could not reach Stitchy. Check your connection and API key.');
    } finally {
      setSpeaking(false);
      setChatLoading(false);
      if (playbackRef.current) {
        playbackRef.current = null;
      }
    }
  }, [prefs, step, stopSpeech]);

  const startListening = useCallback(() => {
    if (chatLoading) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setChatError('Voice input works best in Chrome, Edge, or Safari. You can type your question below.');
      return;
    }
    stopSpeech();
    setChatError(null);
    const gen = ++recognizerGenRef.current;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    voiceInputModeRef.current = 'button';
    setCtrlPttUi(false);
    r.onresult = (e) => {
      if (gen !== recognizerGenRef.current) return;
      const t = e.results[0][0].transcript;
      setListening(false);
      voiceInputModeRef.current = 'idle';
      sendQuestion(t);
    };
    r.onerror = () => {
      if (gen !== recognizerGenRef.current) return;
      setListening(false);
      voiceInputModeRef.current = 'idle';
    };
    r.onend = () => {
      if (gen !== recognizerGenRef.current) return;
      setListening(false);
      recognizerRef.current = null;
      voiceInputModeRef.current = 'idle';
    };
    recognizerRef.current = r;
    setListening(true);
    r.start();
  }, [chatLoading, sendQuestion, stopSpeech]);

  /** Hold Control: interrupt Stitchy, talk until you release Control (push-to-talk). */
  const beginCtrlPushToTalk = useCallback(() => {
    if (!prefs?.conversation || !chatReady || chatLoading) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSpeech();
    setChatError(null);
    const gen = ++recognizerGenRef.current;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    voiceInputModeRef.current = 'ctrl-ptt';
    setCtrlPttUi(true);
    pttTranscriptRef.current = '';
    r.onresult = (event) => {
      if (gen !== recognizerGenRef.current) return;
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      pttTranscriptRef.current = text;
    };
    r.onerror = () => {
      if (gen !== recognizerGenRef.current) return;
      setListening(false);
      setCtrlPttUi(false);
      ctrlPttHeldRef.current = false;
      voiceInputModeRef.current = 'idle';
      recognizerRef.current = null;
    };
    r.onend = () => {
      if (gen !== recognizerGenRef.current) return;
      setListening(false);
      setCtrlPttUi(false);
      recognizerRef.current = null;
      ctrlPttHeldRef.current = false;
      voiceInputModeRef.current = 'idle';
      const t = pttTranscriptRef.current.trim();
      pttTranscriptRef.current = '';
      if (t) sendQuestion(t);
    };
    recognizerRef.current = r;
    ctrlPttHeldRef.current = true;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setCtrlPttUi(false);
      ctrlPttHeldRef.current = false;
      voiceInputModeRef.current = 'idle';
      recognizerRef.current = null;
    }
  }, [prefs, chatReady, chatLoading, sendQuestion, stopSpeech]);

  /** Release Control — finalize utterance and send */
  const endCtrlPushToTalk = useCallback(() => {
    if (!ctrlPttHeldRef.current || voiceInputModeRef.current !== 'ctrl-ptt') return;
    try {
      recognizerRef.current?.stop();
    } catch {
      setListening(false);
      ctrlPttHeldRef.current = false;
    }
  }, []);

  /** Ctrl plus another key (e.g. copy) — cancel talk, do not send */
  const abortCtrlPushToTalk = useCallback(() => {
    if (!ctrlPttHeldRef.current || voiceInputModeRef.current !== 'ctrl-ptt') return;
    recognizerGenRef.current += 1;
    try {
      recognizerRef.current?.stop();
    } catch { /* */ }
  }, []);

  // ⌃ Push-to-talk (global): keydown Control = start + interrupt TTS; keyup = send
  useEffect(() => {
    if (!prefs?.conversation || !visible || !prefs) return;

    const typingTarget = () => {
      const el = document.activeElement;
      const tag = el?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable;
    };

    const onCtrlDown = (e) => {
      if (e.repeat) return;
      if (e.code !== 'ControlLeft' && e.code !== 'ControlRight') return;
      if (ctrlPttHeldRef.current) return;
      if (typingTarget()) return;
      if (!chatReady || chatLoading) return;
      beginCtrlPushToTalk();
    };

    const onCtrlUp = (e) => {
      if (e.code !== 'ControlLeft' && e.code !== 'ControlRight') return;
      endCtrlPushToTalk();
    };

    const onComboDuringPtt = (e) => {
      if (!ctrlPttHeldRef.current || voiceInputModeRef.current !== 'ctrl-ptt') return;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') return;
      abortCtrlPushToTalk();
    };

    window.addEventListener('keydown', onCtrlDown);
    window.addEventListener('keyup', onCtrlUp);
    window.addEventListener('keydown', onComboDuringPtt, true);

    return () => {
      window.removeEventListener('keydown', onCtrlDown);
      window.removeEventListener('keyup', onCtrlUp);
      window.removeEventListener('keydown', onComboDuringPtt, true);
    };
  }, [prefs, visible, chatReady, chatLoading, beginCtrlPushToTalk, endCtrlPushToTalk, abortCtrlPushToTalk]);

  useEffect(() => () => {
    try {
      if (recognizerRef.current) {
        recognizerGenRef.current += 1;
        recognizerRef.current.stop();
      }
    } catch { /* */ }
  }, []);

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

<<<<<<< HEAD
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
=======
    if (userId) {
      try {
        await updateDoc(doc(db, 'stores', userId), {
          guideTourCompleted: true,
          guideTourCompletedAt: serverTimestamp(),
        });
      } catch {
        /* non-critical */
      }
>>>>>>> 365bc3a (good stuff)
    }
  };

  if (!visible) return null;
<<<<<<< HEAD
=======

  // ── Choose walkthrough mode (quiet / voice / conversational) ───────────────
  if (!prefs) {
    return (
      <>
        <div
          onClick={dismiss}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(31, 24, 32, 0.4)',
            backdropFilter: 'blur(3px)',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.3s ease',
            cursor: 'pointer',
          }}
        />
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', zIndex: 65, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(440px, calc(100vw - 32px))',
            background: 'var(--surface)',
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: '0 20px 60px rgba(31,24,32,0.25), 0 0 0 1px var(--line)',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <MascotSVG speaking={false} size={44} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>Hi! I&apos;m Stitchy.</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-600)', lineHeight: 1.55, margin: '0 0 18px' }}>
            Want a conversational walkthrough of your dashboard, or prefer to read it yourself?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => setPrefs({ narration: false, conversation: false })}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--line)', background: 'var(--cream-50)', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              }}
            >
              <span style={{ display: 'block', marginBottom: 4 }}>On-screen only</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-500)' }}>Read each step — no audio</span>
            </button>
            <button
              type="button"
              onClick={() => setPrefs({ narration: true, conversation: false })}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--line)', background: 'var(--cream-50)', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
              }}
            >
              <span style={{ display: 'block', marginBottom: 4 }}>Voice narration</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-500)' }}>I&apos;ll read each step aloud (listen-only)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrefs({ narration: true, conversation: true })}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                border: '2px solid var(--aubergine-600)', background: 'var(--aubergine-100)', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: 'var(--aubergine-600)',
              }}
            >
              <span style={{ display: 'block', marginBottom: 4 }}>Conversational tour</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-700)' }}>Voice + ask me questions by mic or typing on each step</span>
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            style={{
              marginTop: 16, width: '100%', padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: 'var(--ink-400)', background: 'transparent', cursor: 'pointer', border: 'none',
            }}
          >
            Skip tour entirely
          </button>
        </div>
      </>
    );
  }

  if (!step) return null;
>>>>>>> 365bc3a (good stuff)

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
  const conv    = prefs.conversation;

  return (
    <>
      <div onClick={dismiss} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(31,24,32,0.35)', backdropFilter: 'blur(2px)', opacity: fadeIn ? 1 : 0, transition: 'opacity 0.3s ease', cursor: 'pointer' }} />

<<<<<<< HEAD
      <div style={{ position: 'fixed', zIndex: 65, ...mascotPos, opacity: fadeIn ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 8px 32px rgba(31,24,32,0.2), 0 0 0 1px var(--line)', maxWidth: 300, minWidth: 240, position: 'relative' }}>
=======
      {/* Mascot + speech bubble */}
      <div
        style={{
          position: 'fixed', zIndex: 65,
          ...mascotPos,
          opacity: fadeIn ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Speech bubble */}
        <div style={{
          background: 'var(--surface)', borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(31,24,32,0.2), 0 0 0 1px var(--line)',
          maxWidth: conv ? 340 : 300, minWidth: 240, position: 'relative',
        }}>
>>>>>>> 365bc3a (good stuff)
          {step.pointer && <Pointer direction={step.pointer} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--aubergine-100)', color: 'var(--aubergine-600)', fontSize: 10, fontWeight: 700 }}>{stepIndex + 1} / {TOUR_STEPS.length}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{step.title}</div>
          </div>
<<<<<<< HEAD
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-600)', marginBottom: 14 }}>{step.speech}</div>
=======

          {/* Narration text */}
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-600)', marginBottom: conv ? 10 : 14 }}>
            {step.speech}
          </div>

          {conv && (
            <div style={{
              marginBottom: 12, paddingTop: 10, borderTop: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--aubergine-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Chat with Stitchy
              </div>
              {!chatReady ? (
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 8 }}>
                  Hang on — finishing this step…
                </div>
              ) : (
                <>
                  {userLine && (
                    <div style={{ fontSize: 11, color: 'var(--ink-600)', marginBottom: 6, lineHeight: 1.45 }}>
                      <strong style={{ color: 'var(--ink-900)' }}>You:</strong> {userLine}
                    </div>
                  )}
                  {stitchyLine && (
                    <div style={{ fontSize: 11, color: 'var(--ink-700)', marginBottom: 10, lineHeight: 1.45 }}>
                      <strong style={{ color: 'var(--aubergine-600)' }}>Stitchy:</strong> {stitchyLine}
                    </div>
                  )}
                  {chatError && (
                    <div style={{ fontSize: 11, color: '#b54a6a', marginBottom: 8 }}>{chatError}</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={startListening}
                      disabled={chatLoading || listening}
                      style={{
                        padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--line)', background: listening ? 'var(--aubergine-100)' : 'var(--surface)',
                        color: 'var(--ink-900)', cursor: chatLoading || listening ? 'wait' : 'pointer',
                      }}
                    >
                      {listening ? (ctrlPttUi ? '⌃ Talk…' : 'Listening…') : '🎤 Speak'}
                    </button>
                    <input
                      type="text"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          sendQuestion(questionText);
                          setQuestionText('');
                        }
                      }}
                      placeholder="Or type a question…"
                      disabled={chatLoading}
                      style={{
                        flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 10,
                        border: '1px solid var(--line)', fontSize: 12, background: 'var(--cream-50)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { sendQuestion(questionText); setQuestionText(''); }}
                      disabled={chatLoading || !questionText.trim()}
                      style={{
                        padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        background: 'var(--aubergine-600)', color: '#fff',
                        cursor: chatLoading || !questionText.trim() ? 'not-allowed' : 'pointer',
                        opacity: chatLoading || !questionText.trim() ? 0.5 : 1,
                      }}
                    >
                      Send
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4, lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--ink-600)' }}>Push-to-talk:</strong> hold{' '}
                    <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'var(--cream-200)', fontSize: 10 }}>Control</kbd>{' '}
                    to interrupt Stitchy and speak — release to send.
                    {!speechRecognitionSupported() && ' Voice isn’t available in this browser; use the text box.'}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Controls */}
>>>>>>> 365bc3a (good stuff)
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
