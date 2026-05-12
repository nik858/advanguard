/* Advanguard Landing — Admin Editor drawer.
 * Surfaces every editable text/url field in window.AC.content as a form.
 * Persists to localStorage; reset / export.
 */
/* Wrapped in an IIFE so this script's locals don't collide with sections.jsx
 * (Babel in-browser transforms each <script type="text/babel"> but the
 *  emitted code shares the global script scope.)
 */
(function () {
const { useState, useEffect, useRef, Fragment } = React;

/* Slide-out drawer with collapsible sections.
 * Schema lists, for each section of content, which keys to expose and as what type.
 */
const SCHEMA = [
  { id: "meta", label: "Page Meta (SEO)", fields: [
    { k: "title", label: "Page Title", type: "text" },
    { k: "description", label: "Meta Description", type: "textarea" },
    { k: "brand", label: "Brand", type: "text" },
    { k: "productName", label: "Product Name", type: "text" },
    { k: "canonical", label: "Canonical URL", type: "text" },
    { k: "ogImage", label: "OG Image URL", type: "media", accept: "image/*" },
  ]},
  { id: "header", label: "Header & Logo", fields: [
    { k: "logoDark", label: "Logo (dark/header)", type: "media", accept: "image/*" },
    { k: "logoLight", label: "Logo (light/footer)", type: "media", accept: "image/*" },
    { k: "logoText", label: "Logo fallback text", type: "text" },
    { k: "orderByPhone", label: "Order-by-phone copy", type: "text" },
    { k: "needHelp", label: "Need help copy", type: "text" },
  ]},
  { id: "headline", label: "Headline (Hero top)", fields: [
    { k: "eyebrow", label: "Eyebrow", type: "text" },
    { k: "eyebrowDotColor", label: "Eyebrow dot color (CSS)", type: "text" },
    { k: "h1", label: "H1 headline", type: "textarea" },
    { k: "sub", label: "Sub-headline", type: "textarea" },
  ]},
  { id: "hero", label: "Hero Video + What-Is", fields: [
    { k: "videoLabel", label: "Video label", type: "text" },
    { k: "videoUrl", label: "Hero video URL (mp4 / YouTube / Vimeo)", type: "media", accept: "video/*" },
    { k: "videoPoster", label: "Video poster image", type: "media", accept: "image/*" },
    { k: "sectionTitle", label: "What-Is section title", type: "text" },
    { k: "sectionBody", label: "What-Is body", type: "textarea" },
  ]},
  { id: "order", label: "Order Form (sticky)", fields: [
    { k: "badge", label: "Top blue strip", type: "text" },
    { k: "productName", label: "Product display name", type: "text" },
    { k: "productSubtitle", label: "Product subtitle", type: "text" },
    { k: "limitedTime", label: "Limited time line", type: "text" },
    { k: "priceWas", label: "Strikethrough price", type: "text" },
    { k: "priceNow", label: "Current price (big)", type: "text" },
    { k: "priceSubLine", label: "Price sub-line", type: "text" },
    { k: "description", label: "Description", type: "textarea" },
    { k: "ctaTagline", label: "CTA mini tag", type: "text" },
    { k: "ctaLabel", label: "CTA label", type: "text" },
    { k: "secureText", label: "Secure-checkout text", type: "text" },
    { k: "guaranteeText", label: "Guarantee block copy", type: "textarea" },
    { k: "ratingText", label: "Rating text", type: "text" },
  ], list: { k: "miniTestimonials", label: "Mini testimonials", item: [
    { k: "name", label: "Name", type: "text" },
    { k: "role", label: "Role", type: "text" },
    { k: "quote", label: "Quote", type: "textarea" },
    { k: "avatar", label: "Avatar image", type: "media", accept: "image/*" },
  ]}},
  { id: "authority", label: "Authority Logo Strip", fields: [
    { k: "title", label: "Strip title", type: "text" },
  ], simpleList: { k: "logos", label: "Logo names (rendered as text)", item: "text" }},
  { id: "onlySystem", label: "“Only System” section", fields: [
    { k: "eyebrow", label: "Eyebrow", type: "text" },
    { k: "eyebrowDotColor", label: "Eyebrow dot color (CSS)", type: "text" },
    { k: "h2", label: "H2 headline", type: "textarea" },
    { k: "body", label: "Body", type: "textarea" },
    { k: "ctaTagline", label: "CTA tag", type: "text" },
    { k: "ctaLabel", label: "CTA label", type: "text" },
    { k: "ctaSubLink", label: "Sub-link under CTA", type: "text" },
    { k: "guaranteeText", label: "Guarantee text", type: "text" },
  ], lists: [
    { k: "leftFeatures",  label: "Left feature column",  item: [{ k: "title", label: "Title", type: "text" }, { k: "body", label: "Body", type: "textarea" }] },
    { k: "rightFeatures", label: "Right feature column", item: [{ k: "title", label: "Title", type: "text" }, { k: "body", label: "Body", type: "textarea" }] },
    { k: "stats",         label: "Stats row",            item: [{ k: "value", label: "Value", type: "text" }, { k: "label", label: "Label", type: "text" }] },
  ]},
  { id: "demo", label: "Demo Video", fields: [
    { k: "h2", label: "H2", type: "text" },
    { k: "videoUrl", label: "Demo video URL", type: "media", accept: "video/*" },
    { k: "videoPoster", label: "Video poster image", type: "media", accept: "image/*" },
  ]},
  { id: "testimonials", label: "Testimonials", fields: [
    { k: "rating", label: "Rating line", type: "text" },
    { k: "h2", label: "H2", type: "text" },
    { k: "pullQuote", label: "Pull-quote", type: "textarea" },
  ], list: { k: "items", label: "Testimonials list", item: [
    { k: "type", label: "Type (video|text)", type: "text" },
    { k: "name", label: "Name", type: "text" },
    { k: "role", label: "Role", type: "text" },
    { k: "quote", label: "Quote", type: "textarea" },
    { k: "videoUrl", label: "Video URL (if video)", type: "media", accept: "video/*" },
    { k: "videoPoster", label: "Video poster (if video)", type: "media", accept: "image/*" },
    { k: "avatar", label: "Avatar (if text)", type: "media", accept: "image/*" },
  ]}},
  { id: "stack", label: "Product Stack", fields: [
    { k: "h2", label: "H2", type: "text" },
    { k: "bigStackImg", label: "Big stack image", type: "media", accept: "image/*" },
    { k: "ctaTagline", label: "CTA tag", type: "text" },
    { k: "ctaLabel", label: "CTA label", type: "text" },
    { k: "guaranteeText", label: "Guarantee text", type: "text" },
  ], list: { k: "items", label: "Stack items", item: [
    { k: "kind", label: "Kind (book|ipad)", type: "text" },
    { k: "title", label: "Title", type: "text" },
    { k: "sub", label: "Sub", type: "text" },
    { k: "body", label: "Body", type: "textarea" },
    { k: "access", label: "Access label", type: "text" },
    { k: "priceWas", label: "Price (was)", type: "text" },
    { k: "priceNow", label: "Price (now)", type: "text" },
  ]}},
  { id: "guarantee", label: "Guarantee", fields: [
    { k: "h2", label: "H2", type: "text" },
    { k: "body", label: "Body (multiline)", type: "textarea" },
  ]},
  { id: "faq", label: "FAQ", fields: [
    { k: "h2", label: "H2", type: "text" },
    { k: "sub", label: "Sub", type: "text" },
  ], list: { k: "items", label: "Questions", item: [
    { k: "q", label: "Question", type: "text" },
    { k: "a", label: "Answer", type: "textarea" },
  ]}},
  { id: "footer", label: "Footer", fields: [
    { k: "disclaimer", label: "Disclaimer", type: "textarea" },
    { k: "ctaTagline", label: "CTA tag", type: "text" },
    { k: "ctaLabel", label: "CTA label", type: "text" },
    { k: "earnings", label: "Earnings disclaimer", type: "textarea" },
    { k: "logoText", label: "Logo wordmark", type: "text" },
    { k: "copyright", label: "Copyright line", type: "text" },
  ]},
];

function set(content, sectionId, key, value) {
  return { ...content, [sectionId]: { ...content[sectionId], [key]: value } };
}
function setList(content, sectionId, listKey, idx, key, value) {
  const arr = (content[sectionId][listKey] || []).slice();
  arr[idx] = { ...arr[idx], [key]: value };
  return { ...content, [sectionId]: { ...content[sectionId], [listKey]: arr } };
}
function addListItem(content, sectionId, listKey, blank) {
  const arr = (content[sectionId][listKey] || []).slice();
  arr.push(blank);
  return { ...content, [sectionId]: { ...content[sectionId], [listKey]: arr } };
}
function removeListItem(content, sectionId, listKey, idx) {
  const arr = (content[sectionId][listKey] || []).slice();
  arr.splice(idx, 1);
  return { ...content, [sectionId]: { ...content[sectionId], [listKey]: arr } };
}
function moveListItem(content, sectionId, listKey, idx, delta) {
  const arr = (content[sectionId][listKey] || []).slice();
  const j = idx + delta;
  if (j < 0 || j >= arr.length) return content;
  const [item] = arr.splice(idx, 1);
  arr.splice(j, 0, item);
  return { ...content, [sectionId]: { ...content[sectionId], [listKey]: arr } };
}

function MediaField({ value, label, accept, onChange }) {
  const inputRef = useRef(null);
  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  const big = (value || "").startsWith("data:") ? `${(value || "").slice(0, 40)}… (uploaded)` : (value || "");
  return (
    <div className="ac-admin-field">
      <label className="ac-admin-field__label">{label}</label>
      <input type="text" value={big} onChange={(e) => onChange(e.target.value)} placeholder="Paste URL or drop a file"/>
      <div className="ac-admin-field__row">
        <button type="button" className="ac-admin-btn" onClick={() => inputRef.current && inputRef.current.click()}>Upload file…</button>
        {value && <button type="button" className="ac-admin-btn ac-admin-btn--danger" onClick={() => onChange("")}>Clear</button>}
        <input ref={inputRef} type="file" accept={accept || "*/*"} style={{ display: "none" }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
      </div>
    </div>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === "textarea") {
    return (
      <div className="ac-admin-field">
        <label className="ac-admin-field__label">{field.label}</label>
        <textarea rows={4} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  if (field.type === "media") {
    return <MediaField value={value} label={field.label} accept={field.accept} onChange={onChange} />;
  }
  return (
    <div className="ac-admin-field">
      <label className="ac-admin-field__label">{field.label}</label>
      <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ListEditor({ items, schema, label, onUpdate, onAdd, onRemove, onMove }) {
  return (
    <div className="ac-admin-field" style={{ marginTop: 12 }}>
      <label className="ac-admin-field__label">{label}</label>
      <div className="ac-admin-list">
        {(items || []).map((item, i) => (
          <div className="ac-admin-list__item" key={i}>
            <div className="ac-admin-list__row">
              <strong style={{ font: "700 13px/1 var(--font-body)" }}>#{i + 1}</strong>
              <div className="ac-admin-list__btnrow">
                <button className="ac-admin-btn" type="button" onClick={() => onMove(i, -1)} disabled={i === 0}>↑</button>
                <button className="ac-admin-btn" type="button" onClick={() => onMove(i, +1)} disabled={i === items.length - 1}>↓</button>
                <button className="ac-admin-btn ac-admin-btn--danger" type="button" onClick={() => onRemove(i)}>Remove</button>
              </div>
            </div>
            {schema.map((f) => (
              <Field key={f.k} field={f} value={item[f.k]} onChange={(v) => onUpdate(i, f.k, v)} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="ac-admin-btn" type="button" onClick={onAdd}>+ Add</button>
      </div>
    </div>
  );
}

function SimpleListEditor({ items, label, onUpdate, onAdd, onRemove, onMove }) {
  return (
    <div className="ac-admin-field" style={{ marginTop: 12 }}>
      <label className="ac-admin-field__label">{label}</label>
      <div className="ac-admin-list">
        {(items || []).map((v, i) => (
          <div className="ac-admin-list__item" key={i}>
            <div className="ac-admin-list__row">
              <input type="text" value={v} onChange={(e) => onUpdate(i, e.target.value)} style={{ flex: 1, marginRight: 8 }}/>
              <div className="ac-admin-list__btnrow">
                <button className="ac-admin-btn" type="button" onClick={() => onMove(i, -1)} disabled={i === 0}>↑</button>
                <button className="ac-admin-btn" type="button" onClick={() => onMove(i, +1)} disabled={i === items.length - 1}>↓</button>
                <button className="ac-admin-btn ac-admin-btn--danger" type="button" onClick={() => onRemove(i)}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="ac-admin-btn" type="button" onClick={onAdd}>+ Add</button>
      </div>
    </div>
  );
}

function Group({ section, content, save }) {
  const [open, setOpen] = useState(section.id === "headline" || section.id === "header");
  const sec = content[section.id] || {};
  return (
    <div className={`ac-admin-group ${open ? "ac-admin-group--open" : ""}`}>
      <div className="ac-admin-group__head" onClick={() => setOpen((x) => !x)}>
        <div className="ac-admin-group__title">{section.label}</div>
        <div className="ac-admin-group__chev"><Icons.Chevron/></div>
      </div>
      <div className="ac-admin-group__body">
        {section.fields && section.fields.map((f) => (
          <Field key={f.k} field={f} value={sec[f.k]} onChange={(v) => save(set(content, section.id, f.k, v))}/>
        ))}
        {section.list && (
          <ListEditor
            items={sec[section.list.k]}
            schema={section.list.item}
            label={section.list.label}
            onUpdate={(i, k, v) => save(setList(content, section.id, section.list.k, i, k, v))}
            onAdd={() => save(addListItem(content, section.id, section.list.k, makeBlank(section.list.item)))}
            onRemove={(i) => save(removeListItem(content, section.id, section.list.k, i))}
            onMove={(i, d) => save(moveListItem(content, section.id, section.list.k, i, d))}
          />
        )}
        {section.lists && section.lists.map((list) => (
          <ListEditor
            key={list.k}
            items={sec[list.k]}
            schema={list.item}
            label={list.label}
            onUpdate={(i, k, v) => save(setList(content, section.id, list.k, i, k, v))}
            onAdd={() => save(addListItem(content, section.id, list.k, makeBlank(list.item)))}
            onRemove={(i) => save(removeListItem(content, section.id, list.k, i))}
            onMove={(i, d) => save(moveListItem(content, section.id, list.k, i, d))}
          />
        ))}
        {section.simpleList && (
          <SimpleListEditor
            items={sec[section.simpleList.k]}
            label={section.simpleList.label}
            onUpdate={(i, v) => {
              const arr = (sec[section.simpleList.k] || []).slice();
              arr[i] = v;
              save(set(content, section.id, section.simpleList.k, arr));
            }}
            onAdd={() => {
              const arr = (sec[section.simpleList.k] || []).slice();
              arr.push("New item");
              save(set(content, section.id, section.simpleList.k, arr));
            }}
            onRemove={(i) => {
              const arr = (sec[section.simpleList.k] || []).slice();
              arr.splice(i, 1);
              save(set(content, section.id, section.simpleList.k, arr));
            }}
            onMove={(i, d) => {
              const arr = (sec[section.simpleList.k] || []).slice();
              const j = i + d; if (j < 0 || j >= arr.length) return;
              const [v] = arr.splice(i, 1);
              arr.splice(j, 0, v);
              save(set(content, section.id, section.simpleList.k, arr));
            }}
          />
        )}
      </div>
    </div>
  );
}

function makeBlank(schema) {
  if (typeof schema === "string") return "";
  const out = {};
  for (const f of schema) out[f.k] = "";
  return out;
}

function AdminEditor() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(() => window.AC.content);

  useEffect(() => {
    const onChange = (e) => setContent(e.detail);
    window.addEventListener("ac:content", onChange);
    return () => window.removeEventListener("ac:content", onChange);
  }, []);
  // ESC to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const save = (next) => window.AC.save(next);

  const onExport = () => {
    const blob = JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(blob).then(
      () => alert("Content JSON copied to clipboard.\n\nPaste it into ui_kits/landing/data.js (window.AC.defaultContent = …) to commit your changes."),
      () => prompt("Copy this JSON manually:", blob)
    );
  };
  const onReset = () => { if (confirm("Reset all edits to defaults?")) window.AC.reset(); };

  return (
    <div>
      <button className="ac-admin-fab" type="button" onClick={() => setOpen(true)} aria-label="Open Admin Editor">
        <Icons.Edit/>
      </button>
      <aside className={`ac-admin-drawer ${open ? "in" : ""}`} aria-hidden={!open}>
        <div className="ac-admin-drawer__head">
          <div className="ac-admin-drawer__title">Admin Editor</div>
          <div className="ac-admin-drawer__actions">
            <button className="ac-admin-btn" type="button" onClick={onExport}>Export JSON</button>
            <button className="ac-admin-btn ac-admin-btn--danger" type="button" onClick={onReset}>Reset</button>
            <button className="ac-admin-btn ac-admin-btn--primary" type="button" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
        <div className="ac-admin-drawer__body">
          {SCHEMA.map((s) => <Group key={s.id} section={s} content={content} save={save}/>)}
          <div style={{ height: 16 }}/>
          <p style={{ font: "400 12px/1.4 var(--font-body)", color: "var(--color-text-muted)" }}>
            Changes are saved live and persist to this browser. To make them permanent for everyone, click <strong>Export JSON</strong> and paste into <code>data.js</code>.
          </p>
        </div>
      </aside>
    </div>
  );
}

window.AdminEditor = AdminEditor;
})();
