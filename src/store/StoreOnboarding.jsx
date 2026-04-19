import React, { useState, useRef } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase.js";
import { tagGarment } from "../gemini.js";
import {
  Wordmark,
  Btn,
  Icon,
  Chip,
  Field,
  Spinner,
  inputStyle,
} from "../primitives.jsx";
import { GarmentSVG } from "../garments.jsx";

const STORE_TYPES = [
  {
    id: "vintage",
    label: "Vintage Store",
    emoji: "✂️",
    desc: "Curated pieces from past decades",
  },
  {
    id: "resale",
    label: "Resale Shop",
    emoji: "🏷️",
    desc: "Pre-owned clothing and accessories",
  },
  {
    id: "antique",
    label: "Antique Mall",
    emoji: "🕰️",
    desc: "Rare and collectible items",
  },
  {
    id: "thrift",
    label: "Thrift Store",
    emoji: "♻️",
    desc: "Affordable secondhand finds",
  },
  {
    id: "consignment",
    label: "Consignment Boutique",
    emoji: "🤝",
    desc: "Owner-consigned quality pieces",
  },
];

const FULFILLMENT_OPTIONS = [
  {
    id: "pickup",
    label: "In-store pickup",
    desc: "Shoppers come to your store within a pickup window",
    icon: "shop",
  },
  {
    id: "localDelivery",
    label: "Local delivery",
    desc: "You deliver within a set radius",
    icon: "truck",
  },
  {
    id: "shipping",
    label: "Ship anywhere",
    desc: "You package and ship via USPS / UPS",
    icon: "map",
  },
];

const STEPS = [
  { id: "type", label: "Store type" },
  { id: "info", label: "Basic info" },
  { id: "profile", label: "Profile" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "upload", label: "First upload" },
  { id: "live", label: "You're live!" },
];

export default function StoreOnboarding({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step data
  const [storeType, setStoreType] = useState("");
  const [info, setInfo] = useState({
    name: "",
    address: "",
    city: "",
    website: "",
    instagram: "",
    phone: "",
  });
  const [bio, setBio] = useState("");
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState("");
  const [fulfillment, setFulfillment] = useState({
    pickup: true,
    localDelivery: false,
    shipping: false,
  });
  const [uploadItems, setUploadItems] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [liveStore, setLiveStore] = useState(null);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  // ── Step 3: save store to Firestore, upload hero photo ──────────────
  const saveProfileAndContinue = async () => {
    setSaving(true);
    setSaveError('');
    try {
      let heroImageUrl = "";
      if (heroFile) {
        const storageRef = ref(storage, `stores/${user.uid}/hero`);
        await uploadBytes(storageRef, heroFile);
        heroImageUrl = await getDownloadURL(storageRef);
      }
      // setDoc with merge so it works even if signup's background write hasn't landed yet
      await setDoc(doc(db, "stores", user.uid), {
        type: storeType,
        name: info.name,
        address: info.address,
        city: info.city,
        website: info.website,
        instagram: info.instagram,
        phone: info.phone,
        bio,
        heroImageUrl,
        emoji: STORE_TYPES.find((t) => t.id === storeType)?.emoji || "🏪",
        color: "#5B4D7A",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      next();
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 4: save fulfillment prefs ───────────────────────────────────
  const saveFulfillmentAndContinue = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await setDoc(doc(db, "stores", user.uid), {
        fulfillment,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      next();
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 5: publish items to Firestore ───────────────────────────────
  const publishItemsAndFinish = async () => {
    setSaving(true);
    try {
      const confirmed = uploadItems.filter((i) => i.confirmed);
      for (const item of confirmed) {
        let imageUrl = item.imageUrl || "";
        if (item.file) {
          const storageRef = ref(
            storage,
            `stores/${user.uid}/items/${Date.now()}_${item.file.name}`,
          );
          await uploadBytes(storageRef, item.file);
          imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "items"), {
          storeId: user.uid,
          name: item.title,
          kind: item.kind || "top",
          price: Number(item.price) || 0,
          was: Number(item.was) || null,
          size: item.size,
          condition: item.condition,
          notes: item.notes || "",
          aiTags: item.aiTags || {},
          imageUrl,
          status: "active",
          views: 0,
          saves: 0,
          createdAt: serverTimestamp(),
        });
      }
      await updateDoc(doc(db, "stores", user.uid), {
        onboarded: true,
        isLive: true,
        updatedAt: serverTimestamp(),
      });
      // Fetch the completed store data to pass up
      setLiveStore({
        name: info.name,
        type: storeType,
        itemCount: confirmed.length,
      });
      next();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <Wordmark size={20} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      i < step
                        ? "var(--aubergine-600)"
                        : i === step
                          ? "var(--aubergine-100)"
                          : "var(--cream-200)",
                    color:
                      i < step
                        ? "#fff"
                        : i === step
                          ? "var(--aubergine-600)"
                          : "var(--ink-400)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i < step ? (
                    <Icon
                      name="checkmark"
                      size={12}
                      color="#fff"
                      strokeWidth={2.5}
                    />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color:
                      i === step ? "var(--aubergine-600)" : "var(--ink-400)",
                    fontWeight: i === step ? 600 : 400,
                    display:
                      step === 5 || window.innerWidth < 900
                        ? "none"
                        : undefined,
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{ width: 24, height: 1, background: "var(--line)" }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-400)" }}>
          Step {step + 1} of {STEPS.length}
        </div>
      </div>

      {/* Body */}
      {saveError && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', borderRadius: 10, background: '#FEE2E2', color: '#B91C1C', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100 }}>
          {saveError}
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "48px 24px 80px",
        }}
      >
        <div
          style={{ width: "100%", maxWidth: 640 }}
          className="animate-fade-in"
          key={step}
        >
          {/* ── Step 0: Store type ─────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <StepHeader
                title="How do you describe your store?"
                subtitle="We'll use this to tailor your experience and never misrepresent you."
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 32,
                }}
              >
                {STORE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStoreType(t.id)}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "var(--r-md)",
                      textAlign: "left",
                      border: `2px solid ${storeType === t.id ? "var(--aubergine-600)" : "var(--line)"}`,
                      background:
                        storeType === t.id
                          ? "var(--aubergine-100)"
                          : "var(--surface)",
                      cursor: "pointer",
                      transition: "all .15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{t.emoji}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color:
                            storeType === t.id
                              ? "var(--aubergine-600)"
                              : "var(--ink-900)",
                        }}
                      >
                        {t.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-500)",
                          marginTop: 2,
                        }}
                      >
                        {t.desc}
                      </div>
                    </div>
                    {storeType === t.id && (
                      <div style={{ marginLeft: "auto" }}>
                        <Icon
                          name="check-circle"
                          size={20}
                          color="var(--aubergine-600)"
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <Btn
                variant="accent"
                size="lg"
                fullWidth
                disabled={!storeType}
                onClick={next}
                iconRight={<Icon name="arrow-right" size={16} color="#fff" />}
              >
                Continue
              </Btn>
            </>
          )}

          {/* ── Step 1: Basic info ────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <StepHeader
                title="Tell us about your store"
                subtitle="This info appears on your public store profile."
              />
              <Field label="Store name *">
                <input
                  style={inputStyle}
                  value={info.name}
                  onChange={(e) =>
                    setInfo((i) => ({ ...i, name: e.target.value }))
                  }
                  placeholder="e.g. Stitching Styles Vintage"
                  required
                />
              </Field>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field label="Address">
                  <input
                    style={inputStyle}
                    value={info.address}
                    onChange={(e) =>
                      setInfo((i) => ({ ...i, address: e.target.value }))
                    }
                    placeholder="123 Main St"
                  />
                </Field>
                <Field label="City, State">
                  <input
                    style={inputStyle}
                    value={info.city}
                    onChange={(e) =>
                      setInfo((i) => ({ ...i, city: e.target.value }))
                    }
                    placeholder="Minneapolis, MN"
                  />
                </Field>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field label="Website" hint="Optional">
                  <input
                    style={inputStyle}
                    value={info.website}
                    onChange={(e) =>
                      setInfo((i) => ({ ...i, website: e.target.value }))
                    }
                    placeholder="yourstore.com"
                  />
                </Field>
                <Field label="Instagram handle" hint="Optional">
                  <input
                    style={inputStyle}
                    value={info.instagram}
                    onChange={(e) =>
                      setInfo((i) => ({ ...i, instagram: e.target.value }))
                    }
                    placeholder="@yourstore"
                  />
                </Field>
              </div>
              <Field label="Phone" hint="For claim notifications">
                <input
                  style={inputStyle}
                  type="tel"
                  value={info.phone}
                  onChange={(e) =>
                    setInfo((i) => ({ ...i, phone: e.target.value }))
                  }
                  placeholder="+1 (612) 555-0123"
                />
              </Field>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn
                  variant="soft"
                  size="lg"
                  onClick={back}
                  icon={<Icon name="arrow-left" size={16} />}
                >
                  Back
                </Btn>
                <Btn
                  variant="accent"
                  size="lg"
                  fullWidth
                  disabled={!info.name}
                  onClick={next}
                  iconRight={<Icon name="arrow-right" size={16} color="#fff" />}
                >
                  Continue
                </Btn>
              </div>
            </>
          )}

          {/* ── Step 2: Profile photo + bio ───────────────────────────────── */}
          {step === 2 && (
            <>
              <StepHeader
                title="Set up your store profile"
                subtitle="A great profile photo and bio help shoppers feel connected to your store."
              />
              <Field
                label="Store photo"
                hint="A photo of your storefront, interior, or a flat-lay of your vibe"
              >
                <HeroUpload
                  preview={heroPreview}
                  onFile={(f, url) => {
                    setHeroFile(f);
                    setHeroPreview(url);
                  }}
                />
              </Field>
              <Field
                label="Store bio"
                hint="2–3 sentences about your vibe and specialty"
              >
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={`We're a curated vintage shop specializing in 70s and 90s pieces — think suede jackets, slip dresses, and hand-knit sweaters. Everything is hand-selected for quality and style.`}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </Field>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <Btn
                  variant="soft"
                  size="lg"
                  onClick={back}
                  icon={<Icon name="arrow-left" size={16} />}
                >
                  Back
                </Btn>
                <Btn
                  variant="accent"
                  size="lg"
                  fullWidth
                  disabled={saving || !info.name}
                  onClick={saveProfileAndContinue}
                  icon={saving ? <Spinner size={16} /> : null}
                  iconRight={
                    !saving ? (
                      <Icon name="arrow-right" size={16} color="#fff" />
                    ) : null
                  }
                >
                  {saving ? "Saving…" : "Save & continue"}
                </Btn>
              </div>
            </>
          )}

          {/* ── Step 3: Fulfillment ───────────────────────────────────────── */}
          {step === 3 && (
            <>
              <StepHeader
                title="How will you fulfill orders?"
                subtitle="Shoppers reserve items — you confirm. Set what options you offer. You can change this anytime."
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 32,
                }}
              >
                {FULFILLMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setFulfillment((f) => ({ ...f, [opt.id]: !f[opt.id] }))
                    }
                    style={{
                      padding: "16px 20px",
                      borderRadius: "var(--r-md)",
                      textAlign: "left",
                      border: `2px solid ${fulfillment[opt.id] ? "var(--aubergine-600)" : "var(--line)"}`,
                      background: fulfillment[opt.id]
                        ? "var(--aubergine-100)"
                        : "var(--surface)",
                      cursor: "pointer",
                      transition: "all .15s",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: fulfillment[opt.id]
                          ? "var(--aubergine-600)"
                          : "var(--cream-200)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={fulfillment[opt.id] ? "#fff" : "var(--ink-500)"}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: fulfillment[opt.id]
                            ? "var(--aubergine-600)"
                            : "var(--ink-900)",
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-500)",
                          marginTop: 2,
                        }}
                      >
                        {opt.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${fulfillment[opt.id] ? "var(--aubergine-600)" : "var(--line)"}`,
                        background: fulfillment[opt.id]
                          ? "var(--aubergine-600)"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {fulfillment[opt.id] && (
                        <Icon
                          name="checkmark"
                          size={11}
                          color="#fff"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: "var(--cream-100)",
                  fontSize: 12,
                  color: "var(--ink-700)",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                <strong>Tip:</strong> In-store pickup is required for the
                reservation model. Shoppers pay at your store — no payment
                processor needed for MVP.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn
                  variant="soft"
                  size="lg"
                  onClick={back}
                  icon={<Icon name="arrow-left" size={16} />}
                >
                  Back
                </Btn>
                <Btn
                  variant="accent"
                  size="lg"
                  fullWidth
                  disabled={saving || !Object.values(fulfillment).some(Boolean)}
                  onClick={saveFulfillmentAndContinue}
                  icon={saving ? <Spinner size={16} /> : null}
                  iconRight={
                    !saving ? (
                      <Icon name="arrow-right" size={16} color="#fff" />
                    ) : null
                  }
                >
                  {saving ? "Saving…" : "Save & continue"}
                </Btn>
              </div>
            </>
          )}

          {/* ── Step 4: First upload ──────────────────────────────────────── */}
          {step === 4 && (
            <FirstUpload
              storeId={user.uid}
              items={uploadItems}
              setItems={setUploadItems}
              activeId={activeUpload}
              setActiveId={setActiveUpload}
              onBack={back}
              onPublish={publishItemsAndFinish}
              saving={saving}
            />
          )}

          {/* ── Step 5: You're live! ──────────────────────────────────────── */}
          {step === 5 && (
            <LiveScreen store={liveStore} onComplete={onComplete} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 32 }}>
    <h1
      className="display"
      style={{
        fontSize: 32,
        fontWeight: 500,
        lineHeight: 1.1,
        marginBottom: 10,
      }}
    >
      {title}
    </h1>
    {subtitle && (
      <p style={{ fontSize: 15, color: "var(--ink-500)", lineHeight: 1.6 }}>
        {subtitle}
      </p>
    )}
  </div>
);

const HeroUpload = ({ preview, onFile }) => {
  const inputRef = useRef();
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onFile(file, url);
  };
  return (
    <div
      onClick={() => inputRef.current.click()}
      style={{
        height: 180,
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        border: `2px dashed var(--line)`,
        cursor: "pointer",
        background: preview ? "transparent" : "var(--cream-100)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "border-color .15s",
      }}
    >
      {preview ? (
        <img
          src={preview}
          alt="Store"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ textAlign: "center", color: "var(--ink-400)" }}>
          <Icon name="camera" size={32} color="var(--ink-300)" />
          <div style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>
            Click to upload a photo
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG up to 10MB</div>
        </div>
      )}
      {preview && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Change photo
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
};

// ─── First upload step ────────────────────────────────────────────────────────

const KIND_COLORS = {
  dress: { color: "#5B4D7A", bg: "#E2DCEB", accent: "#2A1F3A" },
  jeans: { color: "#4B6E8E", bg: "#D8E3EC", accent: "#1E2A3A" },
  jacket: { color: "#8C6B4A", bg: "#E8DCC8", accent: "#3A2A1A" },
  blouse: { color: "#D4A5A5", bg: "#F8E8E5", accent: "#6B3A3A" },
  top: { color: "#A8B79E", bg: "#E8EEE2", accent: "#3A4A2E" },
  skirt: { color: "#6B4A3A", bg: "#EFE5D8", accent: "#2A1A10" },
  boots: { color: "#3A2A1A", bg: "#EFE5D8", accent: "#1A0E08" },
  bag: { color: "#C9A14A", bg: "#F4EDE0", accent: "#6B4A1A" },
  pants: { color: "#6B4A3A", bg: "#EFE5D8", accent: "#2A1A10" },
  coat: { color: "#3A2E3A", bg: "#E0D8E0", accent: "#1A0E1A" },
};

const DEFAULT_ITEM = () => ({
  id: `u${Date.now()}${Math.random()}`,
  file: null,
  imageUrl: "",
  imagePreview: "",
  kind: "top",
  title: "",
  price: "",
  was: "",
  size: "M",
  condition: "Excellent",
  notes: "",
  aiTags: null,
  tagging: false,
  confirmed: false,
});

function FirstUpload({
  storeId,
  items,
  setItems,
  activeId,
  setActiveId,
  onBack,
  onPublish,
  saving,
}) {
  const fileInputRef = useRef();

  const addItems = async (files) => {
    const newItems = Array.from(files)
      .slice(0, 20 - items.length)
      .map((file) => ({
        ...DEFAULT_ITEM(),
        file,
        imagePreview: URL.createObjectURL(file),
      }));
    setItems((prev) => [...prev, ...newItems]);
    if (!activeId && newItems.length > 0) setActiveId(newItems[0].id);

    // Run Gemini tagging on each new item
    for (const item of newItems) {
      tagItem(item.id, item.file);
    }
  };

  const tagItem = async (itemId, file) => {
    setItems((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, tagging: true } : p)),
    );
    try {
      const base64 = await fileToBase64(file);
      const tags = await tagGarment(base64, file.type);
      // Derive kind from category tag
      const kind = deriveKind(tags.category);
      setItems((prev) =>
        prev.map((p) =>
          p.id === itemId
            ? {
                ...p,
                tagging: false,
                aiTags: tags,
                kind,
                title: `${tags.era} ${tags.category}`,
                ...(KIND_COLORS[kind] || {}),
              }
            : p,
        ),
      );
    } catch (err) {
      console.error("Gemini tagging failed", err);
      setItems((prev) =>
        prev.map((p) => (p.id === itemId ? { ...p, tagging: false } : p)),
      );
    }
  };

  const update = (id, patch) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const active = items.find((i) => i.id === activeId);
  const confirmedCount = items.filter((i) => i.confirmed).length;

  if (items.length === 0) {
    return (
      <>
        <StepHeader
          title="Upload your first items"
          subtitle="Start with 5 items to get your store live. AI will auto-tag everything — you just confirm."
        />
        <div
          onClick={() => fileInputRef.current.click()}
          style={{
            height: 280,
            border: "2px dashed var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--cream-100)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            cursor: "pointer",
            transition: "border-color .15s, background .15s",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addItems(e.dataTransfer.files);
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--aubergine-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="upload" size={28} color="var(--aubergine-600)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-900)" }}
            >
              Drop photos here or click to browse
            </div>
            <div
              style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 4 }}
            >
              Upload up to 20 items · JPG, PNG, HEIC
            </div>
          </div>
          <Btn
            variant="accent"
            size="md"
            icon={<Icon name="camera" size={16} color="#fff" />}
          >
            Select photos
          </Btn>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addItems(e.target.files)}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <Btn
            variant="soft"
            size="lg"
            onClick={onBack}
            icon={<Icon name="arrow-left" size={16} />}
          >
            Back
          </Btn>
          <Btn variant="ghost" size="lg" fullWidth onClick={onPublish}>
            Skip for now — go live
          </Btn>
        </div>
      </>
    );
  }

  return (
    <>
      <StepHeader
        title="Review AI tags"
        subtitle={`${items.length} item${items.length > 1 ? "s" : ""} · confirm tags in seconds, then publish`}
      />

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--cream-200)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: `${items.length ? (confirmedCount / items.length) * 100 : 0}%`,
            height: "100%",
            background: "var(--aubergine-600)",
            transition: "width .3s",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Sidebar queue */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            padding: 10,
            alignSelf: "start",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ink-400)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "2px 4px 8px",
            }}
          >
            Queue
          </div>
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                borderRadius: 8,
                marginBottom: 4,
                cursor: "pointer",
                textAlign: "left",
                background:
                  activeId === item.id ? "var(--aubergine-100)" : "transparent",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 40,
                  borderRadius: 5,
                  background: item.bg || "#E8DCC8",
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {item.imagePreview ? (
                  <img
                    src={item.imagePreview}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt=""
                  />
                ) : (
                  <div style={{ position: "absolute", inset: "10% 15%" }}>
                    <GarmentSVG
                      kind={item.kind}
                      color={item.color}
                      accent={item.accent}
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color:
                      activeId === item.id
                        ? "var(--aubergine-600)"
                        : "var(--ink-700)",
                  }}
                >
                  {item.aiTags?.category || `Item ${idx + 1}`}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-400)",
                    marginTop: 1,
                  }}
                >
                  {item.tagging
                    ? "Tagging…"
                    : item.confirmed
                      ? "Ready ✓"
                      : "Needs review"}
                </div>
              </div>
            </button>
          ))}
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={items.length >= 20}
            style={{
              width: "100%",
              padding: 8,
              marginTop: 6,
              border: "1px dashed var(--line)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--ink-400)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <Icon name="plus" size={12} /> Add more
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addItems(e.target.files)}
          />
        </div>

        {/* Active item panel */}
        {active && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: 16,
            }}
          >
            {/* Photo preview */}
            <div
              style={{
                height: 200,
                borderRadius: 10,
                background: active.bg || "#EDE8F5",
                overflow: "hidden",
                position: "relative",
                marginBottom: 14,
              }}
            >
              {active.imagePreview ? (
                <img
                  src={active.imagePreview}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt=""
                />
              ) : (
                <div style={{ position: "absolute", inset: "8% 22%" }}>
                  <GarmentSVG
                    kind={active.kind}
                    color={active.color}
                    accent={active.accent}
                  />
                </div>
              )}
              {active.tagging && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(91,77,122,0.7)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    color: "#fff",
                  }}
                >
                  <Spinner size={28} color="#fff" />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Gemini is tagging…
                  </div>
                </div>
              )}
              {active.aiTags && !active.tagging && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(91,77,122,0.9)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="sparkle" size={11} color="#fff" />
                  {Math.round((active.aiTags.confidence || 0.9) * 100)}%
                  confidence
                </div>
              )}
            </div>

            {/* AI tag chips */}
            {active.aiTags && !active.tagging && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--ink-400)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  AI Tags
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {Object.entries(active.aiTags)
                    .filter(([k]) => k !== "confidence")
                    .map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          padding: "4px 9px",
                          borderRadius: 999,
                          background: "var(--aubergine-100)",
                          fontSize: 11,
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <Icon
                          name="sparkle"
                          size={9}
                          color="var(--aubergine-600)"
                        />
                        <span style={{ color: "var(--ink-500)" }}>{k}:</span>
                        <strong style={{ color: "var(--aubergine-600)" }}>
                          {String(v)}
                        </strong>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Form fields */}
            <Field label="Title">
              <input
                style={{ ...inputStyle, fontSize: 13 }}
                value={active.title}
                onChange={(e) => update(active.id, { title: e.target.value })}
                placeholder="e.g. 90s Corduroy Midi Dress"
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Field label="Price ($)">
                <input
                  style={{ ...inputStyle, fontSize: 13 }}
                  type="number"
                  min="0"
                  value={active.price}
                  onChange={(e) => update(active.id, { price: e.target.value })}
                  placeholder="48"
                />
              </Field>
              <Field label="Size">
                <select
                  style={{ ...inputStyle, fontSize: 13 }}
                  value={active.size}
                  onChange={(e) => update(active.id, { size: e.target.value })}
                >
                  {[
                    "XS",
                    "S",
                    "M",
                    "L",
                    "XL",
                    "XXL",
                    "OS",
                    "0",
                    "2",
                    "4",
                    "6",
                    "8",
                    "10",
                    "12",
                    "26",
                    "27",
                    "28",
                    "29",
                    "30",
                    "31",
                    "32",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  style={{ ...inputStyle, fontSize: 13 }}
                  value={active.condition}
                  onChange={(e) =>
                    update(active.id, { condition: e.target.value })
                  }
                >
                  {["Excellent", "Good", "Fair", "Loved"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Btn
              variant={active.confirmed ? "soft" : "accent"}
              size="md"
              fullWidth
              disabled={!active.title || active.tagging}
              onClick={() => {
                update(active.id, { confirmed: !active.confirmed });
                if (!active.confirmed) {
                  const idx = items.findIndex((i) => i.id === active.id);
                  const next = items[idx + 1];
                  if (next) setActiveId(next.id);
                }
              }}
              icon={
                active.confirmed ? (
                  <Icon name="check-circle" size={16} color="var(--sage-500)" />
                ) : (
                  <Icon
                    name="checkmark"
                    size={16}
                    color="#fff"
                    strokeWidth={2.5}
                  />
                )
              }
            >
              {active.confirmed
                ? "Confirmed — click to undo"
                : "Confirm & next"}
            </Btn>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="soft"
          size="lg"
          onClick={onBack}
          icon={<Icon name="arrow-left" size={16} />}
        >
          Back
        </Btn>
        <Btn
          variant="accent"
          size="lg"
          fullWidth
          disabled={saving || confirmedCount === 0}
          onClick={onPublish}
          icon={saving ? <Spinner size={16} /> : null}
        >
          {saving
            ? "Publishing…"
            : `Publish ${confirmedCount} item${confirmedCount !== 1 ? "s" : ""} & go live`}
        </Btn>
      </div>
    </>
  );
}

function LiveScreen({ store, onComplete }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--aubergine-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <Icon name="sparkle" size={36} color="var(--aubergine-600)" />
      </div>
      <h1
        className="display"
        style={{ fontSize: 40, fontWeight: 500, marginBottom: 12 }}
      >
        You're live!
      </h1>
      <p
        style={{
          fontSize: 16,
          color: "var(--ink-500)",
          lineHeight: 1.7,
          marginBottom: 32,
          maxWidth: 440,
          margin: "0 auto 32px",
        }}
      >
        {store?.name || "Your store"} is now on Stylography.
        {store?.itemCount
          ? ` Your ${store.itemCount} item${store.itemCount !== 1 ? "s" : ""} will appear in shopper outfit boards.`
          : ""}{" "}
        Shoppers near you can now discover your inventory.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 40,
          maxWidth: 440,
          margin: "0 auto 40px",
        }}
      >
        {[
          {
            icon: "eye",
            label: "Shoppers will see your items in outfit boards",
          },
          { icon: "trending", label: "Your analytics dashboard is ready" },
          {
            icon: "bell",
            label: "You'll get notified when items are claimed",
          },
        ].map((it, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderRadius: "var(--r-md)",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Icon name={it.icon} size={22} color="var(--aubergine-600)" />
            </div>
            <div
              style={{ fontSize: 11, color: "var(--ink-500)", lineHeight: 1.4 }}
            >
              {it.label}
            </div>
          </div>
        ))}
      </div>

      <Btn
        variant="accent"
        size="lg"
        onClick={onComplete}
        iconRight={<Icon name="arrow-right" size={16} color="#fff" />}
      >
        Go to my dashboard
      </Btn>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deriveKind(category = "") {
  const c = category.toLowerCase();
  if (c.includes("dress")) return "dress";
  if (c.includes("jeans")) return "jeans";
  if (c.includes("jacket") || c.includes("coat") || c.includes("blazer"))
    return "jacket";
  if (c.includes("blouse") || c.includes("shirt")) return "blouse";
  if (c.includes("top") || c.includes("sweater") || c.includes("knit"))
    return "top";
  if (c.includes("skirt")) return "skirt";
  if (c.includes("pants") || c.includes("trouser") || c.includes("wide-leg"))
    return "pants";
  if (c.includes("boots")) return "boots";
  if (c.includes("heels") || c.includes("mules") || c.includes("pump"))
    return "heels";
  if (c.includes("sneaker") || c.includes("shoe")) return "sneakers";
  if (c.includes("bag") || c.includes("clutch") || c.includes("purse"))
    return "bag";
  if (c.includes("hat") || c.includes("beret") || c.includes("cap"))
    return "hat";
  if (c.includes("scarf")) return "scarf";
  if (c.includes("belt")) return "belt";
  if (c.includes("sunglasses") || c.includes("glasses")) return "sunglasses";
  if (c.includes("jewelry") || c.includes("necklace") || c.includes("earring"))
    return "jewelry";
  return "top";
}
