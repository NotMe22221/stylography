import { collection, doc, updateDoc, getDocs, query, where, serverTimestamp, vector } from 'firebase/firestore';
import { db, embedContent } from './firebase.js';
import { generateEmbedding } from './gemini.js';

export const IMAGE_EMBEDDING_DIM = 1408; // Vertex AI multimodalembedding@001
export const TEXT_EMBEDDING_DIM  = 768;  // Gemini text-embedding-004

// Only show results above this cosine similarity — below this is noise
export const MIN_SIMILARITY = 0.45;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function toFloatArray(embedding) {
  if (!embedding) return null;
  if (typeof embedding.toArray === 'function') return embedding.toArray();
  if (Array.isArray(embedding)) return embedding;
  if (embedding._values) return Array.from(embedding._values);
  return null;
}

// ─── Embedding calls ──────────────────────────────────────────────────────────

/**
 * Embed a raw image using Vertex AI multimodalembedding@001 (via Firebase Function).
 * Returns a 1408-dim float array.
 * Falls back to Gemini text embedding if the function is unavailable.
 */
export async function embedImage(base64Image, mimeType = 'image/jpeg') {
  try {
    const result = await embedContent({
      image: { bytesBase64Encoded: base64Image, mimeType },
    });
    return result.data.embedding;
  } catch (err) {
    console.warn('Image embedding function unavailable, using text fallback:', err.message);
    return null; // caller decides what to do
  }
}

/**
 * Embed a text description using Vertex AI multimodalembedding@001 (same space as images).
 * Falls back to Gemini text-embedding-004 if the function is unavailable.
 */
export async function embedText(text) {
  try {
    const result = await embedContent({ text });
    return result.data.embedding;
  } catch {
    // Fall back to Gemini text embeddings (different space — less accurate cross-modal)
    return generateEmbedding(text);
  }
}

// ─── Text builders (used for text fallback path) ──────────────────────────────

export function buildItemText(item) {
  if (item.visualDescription) return item.visualDescription;
  return [
    item.name,
    item.aiTags?.category,
    item.aiTags?.style,
    item.aiTags?.era  || item.era,
    item.aiTags?.color,
    item.aiTags?.material,
    item.kind,
    item.size ? `size ${item.size}` : null,
  ].filter(Boolean).join(' · ');
}

export function buildPieceText(piece) {
  return [
    piece.piece,
    piece.kind,
    piece.era,
    piece.color,
    ...(piece.searchTerms || []),
  ].filter(Boolean).join(' ');
}

// ─── Indexing ─────────────────────────────────────────────────────────────────

/**
 * Generate and store an embedding for one item.
 * Uses image embedding if the item has a base64 image, otherwise falls back to text.
 *
 * @param {string} itemId
 * @param {object} item          — Firestore item data
 * @param {string} [base64Image] — raw base64 of the uploaded image (available at upload time)
 * @param {string} [mimeType]
 */
export async function indexItem(itemId, item, base64Image = null, mimeType = 'image/jpeg') {
  let values = null;
  let embeddingType = 'text';

  if (base64Image) {
    values = await embedImage(base64Image, mimeType);
    if (values) embeddingType = 'image';
  }

  if (!values) {
    // Text fallback: embed rich description
    values = await embedText(buildItemText(item));
    embeddingType = 'text';
  }

  await updateDoc(doc(db, 'items', itemId), {
    embedding:     vector(values),
    embeddingType,
    embeddedAt:    serverTimestamp(),
  });

  return { values, embeddingType };
}

/**
 * Backfill items that have no embedding.
 * NOTE: base64 images are not available post-upload, so this uses text embeddings.
 */
export async function backfillEmbeddings(items) {
  const missing = items.filter(i => !i.embeddedAt && i.id);
  for (const item of missing) {
    try { await indexItem(item.id, item); }
    catch (err) { console.warn(`Embed failed for ${item.id}:`, err.message); }
  }
  return missing.length;
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Client-side nearest-neighbor search over all embedded items.
 *
 * @param {number[]} queryVector
 * @param {number}   limit
 */
export async function vectorSearchByVector(queryVector, limit = 15) {
  const snap = await getDocs(
    query(collection(db, 'items'), where('status', '==', 'active')),
  );

  const scored = [];
  snap.forEach(d => {
    const item = { id: d.id, ...d.data() };
    const vec  = toFloatArray(item.embedding);
    if (!vec) return;
    // Only compare if dimensions are compatible (both image or both text embeddings)
    if (Math.abs(vec.length - queryVector.length) > 10) return;
    scored.push({ ...item, _similarity: cosineSimilarity(queryVector, vec) });
  });

  scored.sort((a, b) => b._similarity - a._similarity);
  return scored.slice(0, limit);
}

/**
 * Full pipeline: for each identified piece, embed its visual description as text
 * (using Vertex AI multimodal — same space as image embeddings), then find
 * the nearest item image embeddings via cosine similarity.
 *
 * This is cross-modal: text query → image index.
 *
 * @param {Array}  pieces          — keyPieces from analyzeInspirationPhoto
 * @param {string} [inspirationB64] — if provided, also tries embedding the full photo
 *                                    and uses that as a style signal
 */
export async function vectorSearchByPieces(pieces, inspirationB64 = null, inspirationMime = 'image/jpeg') {
  const usedIds = new Set();
  const results = [];

  for (const piece of pieces) {
    // Use AI-generated visual description if available, otherwise build from structured fields
    const queryText = piece.description || [
      piece.piece,
      piece.kind,
      piece.era   ? `${piece.era} era` : '',
      piece.color ? `${piece.color} color` : '',
      ...(piece.searchTerms || []),
    ].filter(Boolean).join(', ');

    // Embed the piece description as text (Vertex cross-modal: text queries image index)
    let queryVector = await embedText(queryText);

    const candidates = await vectorSearchByVector(queryVector, 10);
    const best = candidates.find(c => !usedIds.has(c.id) && c._similarity >= MIN_SIMILARITY);

    if (best) {
      usedIds.add(best.id);
      results.push({
        piece:       piece.piece,
        kind:        piece.kind,
        item:        best,
        score:       best._similarity,
        queryVector,
      });
    }
  }

  return results;
}
