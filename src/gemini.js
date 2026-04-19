import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/** Inventory photos carry prints/colors/silhouettes — keep on unless you need text-only renders. Set to "false" to disable. */
const OUTFIT_IMAGE_INCLUDE_REFERENCES =
  import.meta.env.VITE_OUTFIT_IMAGE_INCLUDE_REFERENCES !== "false";

/**
 * Rich text for one inventory item so image gen can match the real SKU.
 * @param {object} item
 * @param {number} index 0-based
 */
function describePieceForOutfitRender(item, index) {
  const tags = item.aiTags || {};
  const lines = [
    `${item.title || item.name || `Item ${index + 1}`}`,
    tags.category && `Category: ${tags.category}`,
    (tags.era || item.era) && `Era: ${tags.era || item.era}`,
    tags.color && `Color: ${tags.color}`,
    tags.style && `Style cluster: ${tags.style}`,
    tags.material && `Material: ${tags.material}`,
    item.size && `Size: ${item.size}`,
    item.condition && `Condition: ${item.condition}`,
    item.visualDescription &&
      `Visual detail (preserve exactly — patterns, cut, trim, graphics): ${item.visualDescription}`,
    item.notes && `Seller notes: ${item.notes}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Tag a clothing item from a base64 image.
 * Returns { category, era, color, style, material, confidence }
 *
 * @param {string} base64Image  — base64-encoded image (no data: prefix)
 * @param {string} mimeType     — e.g. 'image/jpeg'
 */
export async function tagGarment(base64Image, mimeType = "image/jpeg") {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a fashionexpert. Analyze this clothing item photo and return a JSON object with exactly these fields:

{
  "category": "Type · Subtype (e.g. 'Dress · Midi', 'Jacket · Denim', 'Pants · Wide-Leg')",
  "era": "Decade (e.g. '70s', '80s', '90s', '00s', '60s')",
  "color": "Primary color name (e.g. 'Cream', 'Plum', 'Camel', 'Cobalt')",
  "style": "Style cluster (one of: Y2K, Minimalist, Cottagecore, Streetwear, Vintage Classic, Preppy)",
  "material": "Fabric/material (e.g. 'Cotton', 'Silk', 'Corduroy', 'Denim', 'Leather')",
  "confidence": number between 0 and 1
}

Return ONLY valid JSON, no markdown, no explanation.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64Image } },
  ]);

  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  return JSON.parse(clean);
}

/**
 * Generate AI outfit suggestions based on a list of items in the store.
 * Returns an array of { name, mood, itemIds, reason }
 *
 * @param {Array} items  — array of Firestore item objects
 */
export async function suggestOutfits(items) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-image-preview",
  });

  console.log("lo");

  const catalog = items
    .map(
      (i) =>
        `ID:${i.id} | ${i.name} | ${i.aiTags?.category || i.kind} | ${i.aiTags?.style || ""} | ${i.aiTags?.era || i.era} | $${i.price}`,
    )
    .join("\n");

  const prompt = `You are a fashion stylist. Given this store inventory, suggest 3 cohesive outfit boards.

Inventory:
${catalog}

Return a JSON array with exactly 3 objects:
[
  {
    "name": "Outfit board name (e.g. 'Sunday Market', 'Gallery Opening')",
    "mood": "One of: Casual, Date Night, Workwear, Weekend, Festival",
    "itemIds": ["id1", "id2", "id3"],
    "reason": "One sentence explaining why these pieces work together"
  }
]

Rules:
- Each outfit should have 3-4 items (top/bottom/shoes/accessory)
- Make sure you use selected items to generate the outfit board.
- The outfit must include all the selected items. 
- Items in the same outfit must have compatible style clusters and eras
- Use each item ID exactly as provided
- Return ONLY valid JSON, no markdown`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}

/**
 * Generate an AI outfit image from selected pieces.
 * Uses each item's photo (when enabled) plus rich tags + visualDescription so the render matches real SKUs.
 * Set VITE_OUTFIT_IMAGE_INCLUDE_REFERENCES=false for text-only (less faithful).
 *
 * @param {Array} selectedItems — 1–4 Firestore item objects
 * @returns {{ dataUrl: string, mimeType: string, base64: string }}
 */
export async function generateOutfitImage(selectedItems) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-image-preview",
    systemInstruction: `You generate flat-lay product photography only.
Hard rules for every image:
- Show ONLY clothing and accessories as physical objects on a surface. No people, no body parts, no faces, hands, hair, or skin. No mannequins, dress forms, or torsos.
- Reference photos show real inventory SKUs: reproduce each garment's design faithfully (prints, colors, silhouette). Ignore any person, floor, or background in those photos.`,
  });

  const n = selectedItems.length;

  const referenceModeNote = OUTFIT_IMAGE_INCLUDE_REFERENCES
    ? `Each piece below includes its product photo when available — that photo is the ground truth for design detail.`
    : `Product photos are disabled — use only the text descriptions (less accurate vs real inventory).`;

  const preamble = `CRITICAL — OUTPUT FORMAT:
Generate ONE image: pure flat-lay / overhead product shot. Absolutely zero humans, zero mannequins, zero implied bodies.

FIDELITY TO THESE EXACT PRODUCTS (${n} piece${n === 1 ? "" : "s"}):
${referenceModeNote}
- Match each garment to its specifications: same prints, plaids, stripes, graphics, logo art, color blocking, wash, distressing, silhouette, neckline, sleeve length, hem shape, pocket placement, buttons, zippers, and fabric texture.
- Do not substitute generic or "similar" items — these are specific SKUs.
- If a reference photo shows a model or hanger, extract only the garment and render it laid flat; do not copy the human figure or scene.

The sections below walk through Piece 1 … Piece ${n} in order. Each following photo block belongs to that piece number.

LAYOUT INSTRUCTIONS:
- No model or mannequin — items only, laid flat or slightly propped.
- Arrange items as if a person just stepped out of them: top garment at the top, bottoms below, shoes at the bottom, bags and accessories placed naturally to the sides.
- Items should slightly overlap or be spaced closely together to feel like a cohesive styled look, not scattered randomly.
- Small accessories (jewelry, glasses, bag) placed around the outfit naturally.

VISUAL STYLE:
- Pure white seamless background.
- Soft, even flat lay lighting — no harsh shadows, slight natural drop shadow under each piece.
- Photorealistic fabric textures, accurate colors, visible stitching and material detail.
- Editorial mood board / Pinterest flat lay aesthetic.
- Shot from directly overhead (top-down bird's eye view), 8k resolution, hyper-realistic.

FORBIDDEN IN THE FINAL IMAGE (do not render): people, models, faces, limbs, skin, mannequins, ghost mannequins, hangers that suggest a body, dressing rooms, mirrors with reflections, runway, street style photography.`;

  const parts = [{ text: preamble }];

  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    parts.push({
      text: `\n--- Piece ${i + 1} of ${n} — must appear in the flat lay as this exact product ---\n${describePieceForOutfitRender(item, i)}\n`,
    });
    if (OUTFIT_IMAGE_INCLUDE_REFERENCES && item.imageUrl) {
      try {
        const resp = await fetch(item.imageUrl);
        const blob = await resp.blob();
        const b64 = await new Promise((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.readAsDataURL(blob);
        });
        parts.push({
          text: `[Attached image: inventory photo for Piece ${i + 1}. Recreate this garment exactly in the flat lay; ignore people and backgrounds.]`,
        });
        parts.push({
          inlineData: { mimeType: blob.type || "image/jpeg", data: b64 },
        });
      } catch {
        parts.push({
          text: `[Photo for Piece ${i + 1} failed to load — rely on the text description above.]`,
        });
      }
    } else if (!item.imageUrl && OUTFIT_IMAGE_INCLUDE_REFERENCES) {
      parts.push({
        text: `[No inventory photo for Piece ${i + 1} — use only the text description.]`,
      });
    }
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });

  for (const part of result.response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return {
        mimeType: part.inlineData.mimeType,
        base64: part.inlineData.data,
        dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
      };
    }
  }
  throw new Error("Gemini did not return an image");
}

/**
 * Generate one outfit board from a specific set of selected pieces.
 * All selected items will be incorporated into the outfit.
 *
 * @param {Array} selectedItems — 1–4 Firestore item objects the owner chose
 */
export async function generateOutfitFromPieces(selectedItems) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const pieces = selectedItems
    .map(
      (i) =>
        `ID:${i.id} | ${i.name} | ${i.aiTags?.category || i.kind} | ${i.aiTags?.style || ""} | ${i.aiTags?.era || i.era} | $${i.price}`,
    )
    .join("\n");

  const prompt = `You are a fashion stylist. Create ONE cohesive outfit board that incorporates ALL of these pieces:

${pieces}

Return a single JSON object:
{
  "name": "Evocative outfit name, 2-3 words (e.g. 'Sunday Market', 'Gallery Opening', 'Golden Hour')",
  "mood": "One of: Casual, Date Night, Workwear, Weekend, Festival",
  "itemIds": ${JSON.stringify(selectedItems.map((i) => i.id))},
  "reason": "One sentence explaining why these pieces work together",
  "stylingTip": "One concrete styling tip (e.g. 'Tuck the blouse loosely and add a thin belt to define the waist')"
}

Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}

/**
 * Analyze a shopper's uploaded inspiration photo.
 * Returns { description, styleCluster, keyPieces }
 *
 * @param {string} base64Image
 * @param {string} mimeType
 */
export async function analyzeInspirationPhoto(
  base64Image,
  mimeType = "image/jpeg",
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a vintage fashion stylist. Analyze this outfit photo and return JSON:
{
  "description": "2-sentence description of the overall look",
  "styleCluster": "One of: Y2K, Minimalist, Cottagecore, Streetwear, Vintage Classic, Preppy",
  "keyPieces": [
    {
      "piece": "clothing item name (e.g. 'Corduroy Jacket', 'Wide-leg Jeans')",
      "kind": "One of: top, blouse, dress, jacket, coat, pants, jeans, skirt, shorts, shoes, boots, bag, accessory",
      "era": "Decade if identifiable (e.g. '90s', '70s', '00s') or null",
      "color": "Primary color (e.g. 'Brown', 'Black', 'Cream')",
      "searchTerms": ["term1", "term2", "term3"]
    }
  ]
}

Include 3-5 key pieces. Return ONLY valid JSON, no markdown.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64Image } },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}

/**
 * Stitchy's conversational reply during the owner dashboard tour (voice or typed question).
 */
export async function generateTourGuideReply({ stepTitle, stepSpeech, userMessage }) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `You are Stitchy, a warm, slightly witty sewing-spool mascot guiding a vintage or resale store owner through their Stylography seller dashboard.

Current tour step title: "${stepTitle}"
What you're explaining on this step: ${stepSpeech}

The store owner just said: """${userMessage}"""

Reply in 2-4 short sentences, plain text, no markdown or bullet lists. Stay in character. If they ask how something works here, explain briefly. If they're confused or joking, respond naturally. End by reminding them they can tap Next when they're ready to continue the tour.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate a 768-dim text embedding using Gemini text-embedding-004.
 */
export async function generateEmbedding(text) {
  // text-embedding-004 lives in v1, not v1beta (SDK default)
  const model = genAI.getGenerativeModel(
    { model: "text-embedding-004" },
    { apiVersion: "v1" },
  );
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate a rich visual description of a clothing item from its photo.
 * This is embedded instead of the sparse AI tags for much more accurate search.
 *
 * @param {string} base64Image
 * @param {string} mimeType
 * @param {object} aiTags  — already-generated tags to anchor the description
 * @returns {string}  dense visual description ready for embedding
 */
export async function generateVisualDescription(
  base64Image,
  mimeType = "image/jpeg",
  aiTags = {},
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const tagHint = Object.entries(aiTags)
    .filter(([k]) => k !== "confidence")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const prompt = `You are indexing a thrift store clothing item for visual similarity search.
Known tags: ${tagHint || "none"}

Write a single dense paragraph (4-6 sentences) describing ONLY the visual appearance of this clothing item.
Be extremely specific about:
- Exact colors, color combinations, patterns, prints, graphics
- Fabric texture cues (smooth, ribbed, washed, distressed, shiny, matte)
- Silhouette and cut (oversized, fitted, boxy, flared, cropped, longline)
- Distinctive design details: collar type, neckline, sleeve style, buttons, zippers, pockets, embroidery, logos
- How it would look when worn — proportions, drape, weight

Do NOT include brand names, price estimates, or condition notes. Visual details only.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64Image } },
  ]);

  return result.response.text().trim();
}

/**
 * Extract a detailed visual description of ONE specific piece from an outfit photo.
 * Used to build a high-quality search query embedding.
 *
 * @param {string} base64Image       — full inspiration photo
 * @param {string} mimeType
 * @param {object} piece             — { piece, kind, era, color, searchTerms }
 * @returns {string}
 */
export async function describePieceFromPhoto(
  base64Image,
  mimeType = "image/jpeg",
  piece,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are helping match a "${piece.piece}" from an outfit photo to thrift store inventory.

Focus ONLY on the "${piece.piece}" visible in this photo.
Write a dense 3-4 sentence visual description covering:
- Exact colors and any patterns/prints/graphics
- Fabric texture cues
- Silhouette, cut, and fit (oversized, fitted, cropped, etc.)
- Distinctive details: collar, buttons, hem, print, logo, embroidery
- The overall aesthetic and era feel

Be so specific that someone could identify this exact garment type from your description.
Describe only what you can see — do not guess brand or fabric if not visible.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64Image } },
  ]);

  return result.response.text().trim();
}

/**
 * RAG outfit search — single Gemini call that sees the photo AND the full
 * item catalog, then returns direct piece→item matches.
 *
 * No external vector DB or deployed functions required.
 *
 * @param {string} base64Image
 * @param {string} mimeType
 * @param {Array}  items  — Firestore or seed items with name/kind/era/color/aiTags
 * @returns {{ description, styleCluster, keyPieces, matches }}
 */
export async function ragSearchOutfitPieces(
  base64Image,
  mimeType = "image/jpeg",
  items = [],
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build a concise catalog line per item — enough for Gemini to make a good match
  const catalog = items
    .slice(0, 150)
    .map((item, i) => {
      const tags = item.aiTags || {};
      const era = tags.era || item.era || "";
      const color = tags.color || item.color || "";
      const mat = tags.material || "";
      const style =
        tags.style ||
        (Array.isArray(item.style) ? item.style[0] : item.style) ||
        "";
      const base = [item.kind, era, color, mat, style]
        .filter(Boolean)
        .join(", ");
      const desc = item.visualDescription
        ? item.visualDescription.slice(0, 200)
        : base;
      return `[${i}] ${item.name} — ${desc} | size ${item.size} | $${item.price}`;
    })
    .join("\n");

  const prompt = `You are a thrift-store personal stylist. Study the outfit photo carefully.

THRIFT STORE INVENTORY:
${catalog}

For each clothing piece visible in the outfit, find up to 3 matching items from the inventory above (best first).

Rules:
- Only include matches genuinely similar to the piece (score ≥ 0.40)
- Match on garment type first, then color/era/vibe
- Each piece can have 1–3 alternatives; use different matchIndex values for each
- Do NOT reuse the same matchIndex across different pieces
- Quality over quantity — skip weak matches

Return ONLY valid JSON, no markdown:
{
  "description": "2-sentence description of the overall outfit vibe",
  "styleCluster": "one of: Y2K, Minimalist, Cottagecore, Streetwear, Vintage Classic, Preppy, Gorpcore, Dark Academia, Boho, Coastal, Old Money, Indie / Folk",
  "matches": [
    {
      "piece": "e.g. Cable-Knit Sweater",
      "kind": "e.g. top",
      "alternatives": [
        { "matchIndex": 4, "reason": "short reason", "score": 0.78 },
        { "matchIndex": 12, "reason": "short reason", "score": 0.65 }
      ]
    }
  ]
}`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64Image } },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(clean);

  const usedIndices = new Set();
  const matches = [];
  for (const pieceResult of parsed.matches || []) {
    const alts = (pieceResult.alternatives || [])
      .filter(
        (a) =>
          typeof a.matchIndex === "number" &&
          items[a.matchIndex] &&
          Number(a.score) >= 0.4 &&
          !usedIndices.has(a.matchIndex),
      )
      .slice(0, 3);
    for (const alt of alts) {
      usedIndices.add(alt.matchIndex);
      matches.push({
        piece: pieceResult.piece,
        kind: pieceResult.kind,
        item: items[alt.matchIndex],
        score: Math.min(Math.max(Number(alt.score) || 0, 0), 1),
        reason: alt.reason || "",
      });
    }
  }

  return {
    description: parsed.description || "",
    styleCluster: parsed.styleCluster || "",
    keyPieces: matches.map((m) => ({ piece: m.piece, kind: m.kind })),
    matches,
  };
}

/**
 * Visually compare an inspiration piece to a candidate item image.
 * Returns a similarity score 0–1 plus a one-sentence reason.
 *
 * @param {string} inspirationB64    — full inspiration photo base64
 * @param {string} inspirationMime
 * @param {string} pieceName         — e.g. "Corduroy Jacket"
 * @param {string} candidateB64      — candidate item photo base64
 * @param {string} candidateMime
 * @returns {{ score: number, reason: string }}
 */
export async function visualSimilarityScore(
  inspirationB64,
  inspirationMime,
  pieceName,
  candidateB64,
  candidateMime,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a fashion expert matching thrift store inventory to outfit inspiration.

IMAGE 1 is an outfit inspiration photo.
IMAGE 2 is a store's product photo of a "${pieceName}".

Score how well IMAGE 2 matches the "${pieceName}" visible in IMAGE 1.
Consider: garment type match, color/pattern similarity, era/style compatibility, silhouette similarity.
Ignore differences in how the item is worn vs. laid flat.

Return ONLY valid JSON:
{ "score": <number 0.0–1.0>, "reason": "<one sentence>" }`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: inspirationMime, data: inspirationB64 } },
    { inlineData: { mimeType: candidateMime, data: candidateB64 } },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(clean);
}
