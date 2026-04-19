const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const STRIPE_SECRET          = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET  = defineSecret("STRIPE_WEBHOOK_SECRET");

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION    = "us-central1";
const MODEL       = "multimodalembedding@001";
const VERTEX_URL  = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

/**
 * Embed an image (or text) using Vertex AI multimodalembedding@001.
 *
 * Call from client:
 *   const fn = httpsCallable(functions, 'embedContent');
 *   const { data } = await fn({ image: { bytesBase64Encoded, mimeType } });
 *   // data.embedding is a number[] of length 1408
 *
 * Or for text-only (cross-modal query):
 *   await fn({ text: "90s corduroy jacket brown oversized" })
 */
exports.embedContent = onCall(
  { region: LOCATION, timeoutSeconds: 30, memory: "256MiB", cors: true },
  async (request) => {
    const { image, text } = request.data;

    if (!image && !text) {
      throw new HttpsError("invalid-argument", "Provide image or text");
    }

    const instance = {};
    if (image?.bytesBase64Encoded) {
      instance.image = {
        bytesBase64Encoded: image.bytesBase64Encoded,
        mimeType: image.mimeType || "image/jpeg",
      };
    }
    if (text) {
      instance.text = String(text).slice(0, 1024); // model limit
    }

    try {
      const client      = await auth.getClient();
      const accessToken = await client.getAccessToken();

      const response = await fetch(VERTEX_URL, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instances: [instance] }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new HttpsError("internal", `Vertex AI error: ${err}`);
      }

      const body       = await response.json();
      const prediction = body.predictions?.[0];
      const embedding  =
        prediction?.imageEmbedding ||
        prediction?.textEmbedding  ||
        prediction?.embedding;

      if (!embedding) {
        throw new HttpsError("internal", "No embedding in Vertex AI response");
      }

      return { embedding };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err.message);
    }
  }
);

/**
 * Create a Stripe Checkout Session for claiming an item.
 *
 * Client call:
 *   const fn = httpsCallable(functions, 'createCheckoutSession');
 *   const { data } = await fn({ itemId, storeId, itemName, price, successUrl, cancelUrl });
 *   window.location.href = data.url;
 */
exports.createCheckoutSession = onCall(
  {
    region: LOCATION,
    timeoutSeconds: 30,
    secrets: [STRIPE_SECRET],
    cors: [
      "https://stylography.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    invoker: "public",
  },
  async (request) => {
    const { itemId, storeId, itemName, price, successUrl, cancelUrl, userId } =
      request.data;

    if (!itemId || !price || !successUrl) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const Stripe = require("stripe");
    const stripe = Stripe(STRIPE_SECRET.value());
    const db = admin.firestore();
    const itemRef = db.collection("items").doc(itemId);
    const { buyerHandle, itemKind } = request.data;
    const claimRef = db.collection("claims").doc();

    try {
      let resolvedStoreId = storeId || "";
      let resolvedItemName = itemName || "";
      let resolvedPrice = Number(price) || 0;

      // Prefer canonical item data from Firestore to avoid mismatched store IDs.
      const itemSnap = await itemRef.get();
      if (itemSnap.exists) {
        const itemData = itemSnap.data() || {};
        resolvedStoreId = itemData.storeId || itemData.store || resolvedStoreId;
        resolvedItemName = itemData.name || resolvedItemName;
        resolvedPrice = Number(itemData.price ?? resolvedPrice) || 0;
      }
      if (!resolvedStoreId) {
        throw new HttpsError("invalid-argument", "Missing storeId for checkout item");
      }
      if (!resolvedPrice || resolvedPrice <= 0) {
        throw new HttpsError("invalid-argument", "Invalid item price");
      }

      // Lock the item before creating checkout session to prevent double claims.
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(itemRef);
        if (!fresh.exists) {
          throw new HttpsError("not-found", "Item not found");
        }
        const current = fresh.data() || {};
        const status = (current.status || "active").toLowerCase();
        const pendingAtMs = current.pendingPaymentAt?.toMillis?.() || 0;
        const pendingExpired = pendingAtMs > 0 && (Date.now() - pendingAtMs) > (20 * 60 * 1000);
        const blockedByActiveCheckout = status === "pending_payment" && !pendingExpired;

        if (status === "sold" || status === "reserved" || status === "deleted" || blockedByActiveCheckout) {
          throw new HttpsError("failed-precondition", "Item is no longer available");
        }

        tx.set(claimRef, {
          itemId,
          storeId: resolvedStoreId,
          itemName: resolvedItemName || "",
          itemKind: itemKind || "",
          shopperId: userId || request.auth?.uid || "anonymous",
          buyerId: userId || request.auth?.uid || "anonymous",
          buyerHandle: buyerHandle || (request.auth?.token?.email || "").split("@")[0] || "shopper",
          method: "pickup",
          status: "pending_payment",
          paymentStatus: "unpaid",
          pickupStatus: "awaiting_payment",
          amount: resolvedPrice,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        tx.set(itemRef, {
          status: "pending_payment",
          pendingClaimId: claimRef.id,
          pendingPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: resolvedItemName || "Thrift item",
                metadata: { itemId, storeId: resolvedStoreId },
              },
              unit_amount: Math.round(resolvedPrice * 100), // cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&claim_id=${claimRef.id}`,
        cancel_url: cancelUrl,
        metadata: { itemId, storeId: resolvedStoreId, claimId: claimRef.id, userId: userId || "" },
      });

      await claimRef.set({
        stripeSessionId: session.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return { url: session.url, claimId: claimRef.id };
    } catch (err) {
      // Best-effort cleanup if Stripe session creation fails after claim/item lock.
      try {
        await db.runTransaction(async (tx) => {
          const lockedItem = await tx.get(itemRef);
          if (lockedItem.exists) {
            const data = lockedItem.data() || {};
            if (data.pendingClaimId === claimRef.id && data.status === "pending_payment") {
              tx.set(itemRef, {
                status: "active",
                pendingClaimId: admin.firestore.FieldValue.delete(),
                pendingPaymentAt: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }, { merge: true });
            }
          }
          const claimSnap = await tx.get(claimRef);
          if (claimSnap.exists) tx.delete(claimRef);
        });
      } catch {
        // Non-blocking: keep original failure reason.
      }
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err.message);
    }
  }
);

/**
 * Demo-safe fallback for environments without webhook setup.
 * Verifies Stripe session is paid, then applies the same DB updates as webhook.
 */
exports.finalizeCheckoutSession = onCall(
  {
    region: LOCATION,
    timeoutSeconds: 30,
    secrets: [STRIPE_SECRET],
    cors: [
      "https://stylography.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    invoker: "public",
  },
  async (request) => {
    const { sessionId, claimId } = request.data || {};
    if (!sessionId || !claimId) {
      throw new HttpsError("invalid-argument", "Missing sessionId or claimId");
    }

    const Stripe = require("stripe");
    const stripe = Stripe(STRIPE_SECRET.value());
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new HttpsError("failed-precondition", "Checkout session is not paid");
    }

    const md = session.metadata || {};
    if (md.claimId && md.claimId !== claimId) {
      throw new HttpsError("permission-denied", "Claim/session mismatch");
    }

    const db = admin.firestore();
    const claimRef = db.collection("claims").doc(claimId);
    const claimSnap = await claimRef.get();
    if (!claimSnap.exists) {
      throw new HttpsError("not-found", "Claim not found");
    }

    const claim = claimSnap.data() || {};
    const alreadyPaid =
      claim.paymentStatus === "paid" ||
      claim.status === "paid" ||
      claim.status === "completed";
    if (alreadyPaid) {
      return { ok: true, status: claim.status, alreadyApplied: true };
    }

    const itemId = md.itemId || claim.itemId || null;
    const storeId = md.storeId || claim.storeId || null;
    const amount = (session.amount_total || 0) / 100;

    const batch = db.batch();
    batch.update(claimRef, {
      status: "paid",
      paymentStatus: "paid",
      pickupStatus: "awaiting_pickup",
      stripeSessionId: session.id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      amount: amount || claim.amount || 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (itemId) {
      batch.set(db.collection("items").doc(itemId), {
        status: "reserved",
        pendingClaimId: admin.firestore.FieldValue.delete(),
        pendingPaymentAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    if (storeId && amount > 0) {
      batch.set(
        db.collection("stores").doc(storeId),
        {
          balance: admin.firestore.FieldValue.increment(amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    return { ok: true, status: "paid", alreadyApplied: false };
  }
);

/**
 * Stripe webhook — marks claim as paid and item as sold.
 * Set webhook endpoint in Stripe dashboard → {function_url}/stripeWebhook
 */
exports.stripeWebhook = onRequest(
  { region: LOCATION, secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const Stripe = require("stripe");
    const stripe = Stripe(STRIPE_SECRET.value());
    const sig    = req.headers["stripe-signature"];

    let event;
    try {
      let whSecret;
      try { whSecret = STRIPE_WEBHOOK_SECRET.value(); } catch {}
      // Firebase provides req.rawBody (Buffer) — required for Stripe signature verification
      event = whSecret
        ? stripe.webhooks.constructEvent(req.rawBody, sig, whSecret)
        : req.body; // already parsed object when no webhook secret configured
    } catch (err) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const db = admin.firestore();
      const md = session.metadata || {};
      const claimId = md.claimId;
      if (!claimId) return res.json({ received: true });

      const claimRef = db.collection("claims").doc(claimId);
      const claimSnap = await claimRef.get();
      if (!claimSnap.exists) return res.json({ received: true });

      const claim = claimSnap.data() || {};
      const alreadyPaid =
        claim.paymentStatus === "paid" ||
        claim.status === "paid" ||
        claim.status === "completed";
      if (alreadyPaid) return res.json({ received: true });

      const itemId = md.itemId || claim.itemId || null;
      const storeId = md.storeId || claim.storeId || null;
      const amount = (session.amount_total || 0) / 100;

      const batch = db.batch();
      batch.update(claimRef, {
        status: "paid",
        paymentStatus: "paid",
        pickupStatus: "awaiting_pickup",
        stripeSessionId: session.id,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        amount: amount || claim.amount || 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (itemId) {
        batch.set(db.collection("items").doc(itemId), {
          status: "reserved",
          pendingClaimId: admin.firestore.FieldValue.delete(),
          pendingPaymentAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      if (storeId && amount > 0) {
        batch.set(db.collection("stores").doc(storeId), {
          balance: admin.firestore.FieldValue.increment(amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
    }

    res.json({ received: true });
  }
);
