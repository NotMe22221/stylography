import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

// Stable per-session ID — no PII, survives page navigation, resets on tab close
const SESSION_ID = Math.random().toString(36).slice(2, 10);

/**
 * Append-only event write. Fire-and-forget — never await this.
 * Schema is stable so rows can be piped to BigQuery with zero changes later.
 *
 * types: item_view | item_save | store_view | outfit_view | claim
 */
export function trackEvent(type, payload = {}) {
  addDoc(collection(db, 'events'), {
    type,
    sessionId:  SESSION_ID,
    storeId:    payload.storeId    ?? null,
    itemId:     payload.itemId     ?? null,
    outfitId:   payload.outfitId   ?? null,
    itemKind:   payload.itemKind   ?? null,
    itemEra:    payload.itemEra    ?? null,
    itemSize:   payload.itemSize   ?? null,
    itemStyle:  payload.itemStyle  ?? null,
    timestamp:  serverTimestamp(),
  }).catch(() => {}); // analytics must never break the app
}
