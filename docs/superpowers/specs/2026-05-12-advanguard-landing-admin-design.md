# Advanguard Landing + Admin — Design Spec

**Date** : 2026-05-12
**Auteur** : TB Dev (Thomas) en collaboration avec Claude
**Client** : Nik, CEO Advanguard
**Statut** : Design validé, prêt pour planification

---

## 1. Contexte et objectifs

### Situation actuelle
- Une première version de la landing Advanguard existe, basée sur le template Front End — Short Free du brand kit du client.
- Implémentation : page statique HTML + React-via-CDN + Babel in-browser. Un admin in-page fonctionne déjà mais ne persiste les modifs **que dans le `localStorage`** du navigateur de Nik. Les vrais visiteurs voient toujours le `data.js` figé.
- Workflow actuel "Export JSON → coller dans `data.js` → push GitHub" non viable pour un utilisateur non-technique.

### Objectifs de la v1
1. Migrer la landing vers une stack production-grade (Next.js sur Vercel) **sans altérer le rendu visuel** (pixel-perfect par rapport à la version actuelle).
2. Fournir à Nik (non-technique) un admin **intuitif** lui permettant d'éditer en autonomie : tous les textes, toutes les images, toutes les vidéos de la landing.
3. Préserver les performances : Lighthouse 100/100/100/100 et SEO existants.
4. Préparer l'architecture pour l'**AI Clinic Audit Tool** (v1.1, brief séparé) sans refactor majeur.
5. Coût opérationnel cible : **0 €/mois** sur Vercel Hobby + GitHub.

### Non-objectifs (out of scope v1)
- Système multi-utilisateurs / rôles. Nik est le seul administrateur.
- Versioning manuel des contenus côté admin (Git remplit ce rôle automatiquement).
- A/B testing, analytics dashboard.
- Base de données pour stocker les leads (les leads remontent sur GoHighLevel).

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                  Repo GitHub                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ content.json │  │ prompts.json │  │  *.tsx    │  │
│  │ (landing)    │  │ (AI v1.1)    │  │  (code)   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────┼─────────────────┼─────────────────┼───────┘
          │  webhook        │                 │
          ▼                 ▼                 ▼
    ┌────────────────────────────────────────────┐
    │            Vercel (Next.js app)            │
    │                                            │
    │  /              → Landing publique (SSG)   │
    │  /admin         → Édition contenu (auth)   │
    │  /api/lead      → Proxy vers GHL webhook   │
    │  /api/audit     → (v1.1) AI Audit tool     │
    │  /api/publish   → Commit GitHub + rebuild  │
    │  /api/upload    → Vercel Blob upload       │
    │  /api/draft     → Sauvegarde draft         │
    │  /api/login     → Auth                     │
    │                                            │
    └─────────┬─────────────────────┬────────────┘
              │                     │
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │  Vercel  │          │   GHL    │
        │   Blob   │          │ webhook  │
        │ (médias) │          │ (leads)  │
        └──────────┘          └──────────┘
```

### Stack technique finale

| Couche | Choix | Justification |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Standard Vercel, SSG natif, API routes, communauté énorme |
| Hosting | Vercel Hobby (free tier) | 100 GB bandwidth, builds illimités, Blob 5 GB inclus |
| Source de vérité contenu | `content/content.json` dans Git | Versionné, rollback gratuit, validation au build |
| Stockage médias (uploads) | Vercel Blob (free 5 GB) | URL CDN, indépendant du repo, pas de gonflement Git |
| Stockage médias (existants) | `public/assets/` dans le repo | Logos, avatars, déjà en place |
| Drafts non publiés | Vercel Blob `drafts/` + localStorage | Persistant cross-device, autosave 5s |
| Auth | Maison (bcrypt + JWT signé HS256, cookie HTTP-only) | Zero dependency, suffisant pour 1 user |
| Validation runtime | Zod (schéma miroir des types TS) | Sécurité + erreurs claires à la publication |
| Intégration CRM | 2 Inbound Webhooks GoHighLevel | Nik contrôle le mapping dans l'UI GHL |
| AI v1.1 | Anthropic API (Claude Haiku/Sonnet) | Brief audit tool séparé |

---

## 3. Structure du projet

```
advanguard/
├── app/
│   ├── layout.tsx                  # <html>, fonts, meta de base, import CSS globaux
│   ├── page.tsx                    # Landing publique (Server Component, SSG)
│   ├── globals.css                 # Re-export colors_and_type.css + landing.css
│   │
│   ├── _sections/                  # Sections landing (Server Components majoritairement)
│   │   ├── Header.tsx
│   │   ├── Headline.tsx
│   │   ├── Hero.tsx
│   │   ├── OrderForm.tsx           # Client Component (form interactif)
│   │   ├── LogoStrip.tsx
│   │   ├── OnlySystem.tsx
│   │   ├── Demo.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Stack.tsx
│   │   ├── GuaranteeSection.tsx
│   │   ├── FAQ.tsx
│   │   └── Footer.tsx
│   │
│   ├── _editor/                    # Composants UI mode édition (overlays)
│   │   ├── EditableText.tsx
│   │   ├── MediaSwapButton.tsx
│   │   ├── RepeatableList.tsx
│   │   ├── PublishBar.tsx
│   │   └── EditorProvider.tsx
│   │
│   ├── admin/
│   │   ├── layout.tsx              # Layout dashboard (sidebar)
│   │   ├── login/page.tsx          # Login
│   │   ├── page.tsx                # Home admin (raccourci landing edit)
│   │   ├── lead-magnet/page.tsx
│   │   ├── audit/page.tsx          # (v1.1)
│   │   ├── media/page.tsx          # Médiathèque
│   │   ├── history/page.tsx        # Historique commits
│   │   └── settings/page.tsx
│   │
│   ├── api/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── publish/route.ts        # POST → commit GitHub
│   │   ├── upload/sign/route.ts    # POST → signed URL Vercel Blob (client upload)
│   │   ├── draft/route.ts          # POST autosave / GET load
│   │   ├── deploy-status/route.ts  # GET status d'un deploy
│   │   ├── history/route.ts        # GET liste commits
│   │   ├── lead/route.ts           # POST → forward GHL
│   │   └── audit/route.ts          # (v1.1)
│   │
│   └── styles/
│       ├── colors_and_type.css     # Repris tel quel du design system
│       └── landing.css             # Repris tel quel
│
├── content/
│   ├── content.json                # Source de vérité landing
│   └── prompts.json                # (v1.1) Prompts AI éditables
│
├── lib/
│   ├── auth.ts                     # Signature/validation JWT, password hash
│   ├── content.ts                  # Lecture + validation Zod
│   ├── github.ts                   # Client API GitHub (commit, sha lookup)
│   ├── blob.ts                     # Helpers Vercel Blob
│   ├── ghl.ts                      # postLeadToGHL + postAuditToGHL (stub)
│   └── ratelimit.ts                # Wrapper Upstash Ratelimit
│
├── types/
│   ├── content.ts                  # Types + schéma Zod du content.json
│   └── prompts.ts                  # (v1.1)
│
├── middleware.ts                   # Protège /admin/* + active mode édition
├── public/
│   └── assets/                     # Logos, avatars, video-thumbnail (existants)
│
├── .env.example
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Variables d'environnement (Vercel)

Toutes côté serveur, jamais exposées au navigateur.

| Nom | Description |
|---|---|
| `ADMIN_PASSWORD_HASH` | bcrypt hash du password de Nik |
| `JWT_SECRET` | Secret 256-bit pour signer les sessions |
| `GITHUB_TOKEN` | PAT GitHub, scope `contents:write` sur le repo |
| `GITHUB_REPO` | ex: `tbdev/advanguard` |
| `GITHUB_BRANCH` | ex: `main` |
| `BLOB_READ_WRITE_TOKEN` | Auto-injecté par Vercel quand Blob activé |
| `GHL_LEAD_WEBHOOK_URL` | URL Inbound Webhook GHL (workflow lead) |
| `GHL_AUDIT_WEBHOOK_URL` | (v1.1) URL Inbound Webhook GHL (workflow audit) |
| `VERCEL_DEPLOY_TOKEN` | (optionnel) Pour query l'API deployments depuis admin |
| `VERCEL_PROJECT_ID` | Pour l'API deployments |
| `KV_REST_API_URL` | Auto-injecté par Vercel KV (rate limit) |
| `KV_REST_API_TOKEN` | Auto-injecté par Vercel KV (rate limit) |

---

## 4. Modèle de contenu

### `content/content.json` — schéma TypeScript

```typescript
// types/content.ts
import { z } from "zod";

export const MediaRefSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
});

export const ContentSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    productName: z.string(),
    canonical: z.string().url(),
    ogImage: MediaRefSchema,
  }),
  header: z.object({
    orderByPhone: z.string(),
    needHelp: z.string(),
    logoLight: MediaRefSchema,
    logoDark: MediaRefSchema,
  }),
  headline: z.object({
    eyebrow: z.string(),
    h1: z.string(),
    sub: z.string(),
  }),
  hero: z.object({
    videoUrl: z.string().nullable(),
    videoPoster: MediaRefSchema,
    sectionTitle: z.string(),
    sectionBody: z.string(),
  }),
  order: z.object({
    badge: z.string(),
    productName: z.string(),
    productSubtitle: z.string(),
    priceWas: z.string(),
    priceNow: z.string(),
    priceSubLine: z.string(),
    description: z.string(),
    ctaLabel: z.string(),
    secureText: z.string(),
    guaranteeText: z.string(),
    ratingText: z.string(),
    miniTestimonials: z.array(z.object({
      avatar: MediaRefSchema,
      name: z.string(),
      role: z.string(),
      quote: z.string(),
    })),
  }),
  logoStrip: z.object({
    items: z.array(z.object({
      label: z.string(),
      logo: MediaRefSchema.nullable(),
    })),
  }),
  onlySystem: z.object({
    title: z.string(),
    body: z.string(),
    bullets: z.array(z.string()),
  }),
  demo: z.object({
    title: z.string(),
    videoUrl: z.string().nullable(),
    videoPoster: MediaRefSchema,
  }),
  testimonials: z.object({
    title: z.string(),
    items: z.array(z.object({
      avatar: MediaRefSchema,
      name: z.string(),
      role: z.string(),
      quote: z.string(),
      rating: z.number().min(1).max(5),
    })),
  }),
  stack: z.object({
    title: z.string(),
    items: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  guarantee: z.object({
    title: z.string(),
    body: z.string(),
    badge: z.string(),
  }),
  faq: z.object({
    title: z.string(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  footer: z.object({
    copyright: z.string(),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
});

export type Content = z.infer<typeof ContentSchema>;
export type MediaRef = z.infer<typeof MediaRefSchema>;
```

### Règles

- **Un seul fichier JSON** pour la landing (mêmes clés que `data.js` actuel, migration 1:1).
- **Validation Zod** systématique : au build (Next.js) et à chaque `publish` côté serveur.
- **MediaRef.url** : peut pointer vers `/assets/...` (repo) ou `https://*.blob.vercel-storage.com/...` (uploads admin). Le rendu ne fait pas la différence.
- **Pas de markdown** dans les champs texte : Nik édite du texte brut. Si on a besoin de retours à la ligne, on les conserve via `white-space: pre-line` côté CSS (déjà le cas dans `landing.css`).

---

## 5. UX admin (in-context + dashboard)

### Mode A — Édition in-context sur la landing

Quand Nik est logué et navigue sur `/`, le composant `EditorProvider` détecte le cookie session et active le mode édition.

**Comportements** :
- **Textes** : tout texte éditable a un contour fin au hover. Click → l'élément devient `contentEditable` avec contour bleu, édition WYSIWYG préservant la mise en forme. `Esc` ou `blur` → sauvegarde dans le draft. La typo, taille, couleur restent identiques au rendu visiteur (Nik voit ce qu'il publie en temps réel).
- **Médias** : bouton flottant `[↻ Changer]` au coin haut-droit du média au hover. Click → modal d'upload :
  - Drag-and-drop ou file picker
  - Pour les vidéos : accepte URL YouTube/Vimeo/.mp4 collée OU upload direct
  - Upload **client-side via signed URL** : `/api/upload/sign` retourne une URL signée Vercel Blob (auth + scope vérifiés), le navigateur upload directement vers Blob (contourne la limite 4.5 MB des bodies API route Vercel)
  - URL retournée injectée dans le draft
  - Preview live dans la modal
  - Limites : 100 MB par fichier (configurable), MIME types autorisés (image/*, video/mp4, video/webm)
- **Listes répétables** (testimonials, FAQ, mini-testimonials, logoStrip items) :
  - `[+ Ajouter]` sous le dernier item (visible au hover)
  - `[×]` à droite de chaque item pour supprimer (avec confirm)
  - Drag handle pour réordonner
- **Bandeau "Publier"** : fixe en haut quand mode édition actif, montre :
  - Indicateur "X modifs non publiées"
  - Bouton `[Publier]` (primary)
  - Bouton `[Annuler tout]` (secondary, avec confirm)
  - Bouton `[Quitter mode édition]` (pour prévisualiser sans les contours)

### Mode B — Dashboard `/admin`

Sidebar gauche + contenu :

| Item | Contenu |
|---|---|
| 📄 Landing Page | Bouton "Aller éditer sur le site" qui ouvre `/` en mode édition |
| 📝 Lead Magnet | Config technique du form de capture (champs, validation regex pour bloquer Gmail/Yahoo, message confirmation, statut webhook GHL) |
| 🤖 AI Audit (v1.1) | Éditeur de `prompts.json`, liste des 20 derniers audits envoyés (lecture logs Vercel), bouton rejouer |
| 🖼 Médiathèque | Grille de tous les uploads Vercel Blob (vignettes, taille, date, URL copiable, supprimer) |
| 🕓 Historique | 30 derniers "Publish" (date, commit message, lien GitHub, bouton Restaurer) |
| ⚙ Réglages | Read-only : URL prod, statut webhooks GHL, dernière build status, version. Lien vers Vercel dashboard pour les env vars |

### Auth flow

1. Accès à `/admin/*` ou détection du cookie session manquant → `middleware.ts` redirect `/admin/login`
2. Page login : email pré-rempli readonly + password input → POST `/api/login`
3. `/api/login` :
   - Vérifie password vs `ADMIN_PASSWORD_HASH` (bcrypt)
   - Rate limit : 5 essais / 15 min / IP via `@upstash/ratelimit` + `@vercel/kv` (free tier, persistant entre invocations serverless)
   - Si OK : génère JWT (HS256, exp 30j, payload `{ sub: "nik", iat }`)
   - Set cookie `__adv_session` : HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=30d
4. Middleware sur `/admin/*` ET sur `/` (pour activer le mode édition) :
   - Décode/valide le JWT
   - Si invalide / absent : sur `/admin/*` redirect, sur `/` continue en mode visiteur
5. Logout = `/api/logout` clear cookie

### Responsive

- **Landing en mode édition** : conserve le responsive de la landing publique. Sur mobile : bandeau Publier fixe top, boutons "Changer" touch-friendly (44px min hit area).
- **Dashboard `/admin`** : desktop-first (Nik éditera depuis desktop). Mobile fonctionnel mais pas optimisé pixel-perfect.

---

## 6. Flux technique "Publish"

### Étape 1 — Édition (côté client)

- Composant `EditorProvider` charge le draft :
  1. D'abord `localStorage` (snappy)
  2. Puis fetch `/api/draft` (Vercel Blob `drafts/nik.json`) → merge si plus récent
- Chaque modification met à jour un store local (Zustand ou simple useState lifted).
- Autosave : debounce 5s → POST `/api/draft` (upload Blob).
- Compteur de modifs non publiées calculé via diff vs `content.json` actuel.

### Étape 2 — POST `/api/publish`

```typescript
// Pseudo-code
export async function POST(req: Request) {
  // 1. Auth
  const session = await verifySession(req);
  if (!session) return new Response("Unauthorized", { status: 401 });

  // 2. Charger draft
  const draft = await loadDraftFromBlob(session.sub);

  // 3. Valider Zod
  const parsed = ContentSchema.safeParse(draft);
  if (!parsed.success) {
    return Response.json({ error: "Invalid content", issues: parsed.error.issues }, { status: 400 });
  }

  // 4. Commit GitHub avec optimistic locking
  const current = await githubGetFile("content/content.json");
  const commitMessage = `content: nik update (${countChangedFields(parsed.data, JSON.parse(current.content))} fields)`;
  const result = await githubPutFile({
    path: "content/content.json",
    content: JSON.stringify(parsed.data, null, 2),
    sha: current.sha,
    message: commitMessage,
  });

  if (result.status === 409) {
    return Response.json({ error: "Conflict: content changed since last load" }, { status: 409 });
  }

  // 5. Cleanup draft
  await deleteDraftFromBlob(session.sub);

  return Response.json({ commit_sha: result.commit.sha });
}
```

### Étape 3 — Rebuild Vercel auto

Le webhook GitHub → Vercel déclenche un rebuild :
- `next build` re-génère `/` (SSG) avec le nouveau `content.json`
- Atomic switch (zero-downtime)
- Durée typique : 30-60s

### Étape 4 — Feedback dans l'admin

- Le client poll `/api/deploy-status?sha={commit_sha}` (interval 3s, max 90s)
- L'API route appelle Vercel REST : `GET /v6/deployments?meta-githubCommitSha={sha}&projectId=...&limit=1`
- Quand `state === "READY"` → toast "✓ Publié !" et `localStorage` du draft wipé
- Si `state === "ERROR"` → toast d'erreur avec lien vers logs Vercel

### Concurrence et rollback

- **Concurrence** : le `sha` GitHub fait office d'optimistic lock. Si Nik publie depuis 2 onglets, le second 409 et un message clair invite à recharger.
- **Rollback** : depuis `/admin/history`, click "Restaurer" sur un commit X → l'API route lit `content.json` à ce commit, le met en draft, redirige vers `/` en mode édition pour vérification + publish.

---

## 7. Intégration GoHighLevel

### Choix : Inbound Webhooks GHL (push only)

**Décision** : pour les besoins v1 et v1.1, on push uniquement vers GHL via leurs Inbound Webhooks. Avantages :
- Nik mappe lui-même les champs dans l'UI GHL (zéro intervention dev pour modifier le mapping)
- Pas de token API à gérer / rotation / rate limits
- Nik garde 100% du contrôle sur les workflows downstream (emails, tags, sequences)

L'API v2 GHL avec Private Integration Token sera ajoutée plus tard **uniquement si** on a besoin de lire des données GHL (ex: vérifier qu'un contact existe avant d'envoyer un audit).

### Webhook 1 — `lead_submitted` (v1)

**Config GHL (côté Nik)** :
1. Workflow "Lead from Landing"
2. Trigger : Inbound Webhook → copier l'URL fournie par GHL
3. Map les fields du payload aux champs contact / custom fields
4. Actions : Create/Update Contact → Send confirm email → Apply tag `audit-pending` → (v1.1) Custom Webhook Action vers `/api/audit`

**Payload émis par `/api/lead`** :
```json
{
  "email": "matt@clinicabc.com",
  "first_name": "Matt",
  "phone": "+1...",
  "submitted_at": "2026-05-12T14:30:00Z",
  "source": "advanguard-landing",
  "vertical": "clinic",
  "domain": "clinicabc.com",
  "user_agent": "...",
  "ip_hash": "..."
}
```

### Webhook 2 — `audit_completed` (v1.1)

**Config GHL** :
1. Workflow "Audit Ready"
2. Trigger : Inbound Webhook
3. Actions : Find contact by email → Set custom fields (`audit_score`, `audit_strengths`, `audit_weaknesses`, `audit_email_1_subject`, `audit_email_1_body`, `audit_diagnosis_tags`) → Remove `audit-pending`, add `audit-completed` → Send Email 1 → Wait → Email 2 → ... (sequence configurée par Nik dans GHL)

**Payload émis par `/api/audit`** :
```json
{
  "email": "matt@clinicabc.com",
  "domain": "clinicabc.com",
  "audit_score": 67,
  "audit_strengths": ["mobile responsive", "SSL valid", "GMB linked"],
  "audit_weaknesses": ["no booking widget", "no FAQ schema", "slow LCP 4.2s"],
  "audit_signals_json": "{ ...full signals object... }",
  "ai_email_1_subject": "...",
  "ai_email_1_body": "...",
  "ai_diagnosis_tags": ["no-booking", "slow-mobile", "weak-cta"],
  "audited_at": "2026-05-12T14:33:12Z"
}
```

### Sécurité et fiabilité

- URLs webhook traitées comme secrets (env vars Vercel)
- HTTPS automatique
- Retry avec exponential backoff (3 tentatives, 1s/3s/9s) sur 5xx
- Log structuré des payloads (consultable via Vercel logs)
- Honeypot field sur le form public + rate limit IP pour bloquer spam

---

## 8. Migration depuis l'existant

### Principe

On conserve l'apparence pixel-perfect en gardant CSS et structure HTML inchangées. Seule la plomberie change.

### Étapes

1. **Scaffold Next.js** : `npx create-next-app@latest advanguard --typescript --app --no-tailwind --no-eslint --import-alias "@/*"`
2. **Migrer les CSS** : `colors_and_type.css` et `landing.css` → `app/styles/`, importés dans `app/layout.tsx`. **Zéro modification.**
3. **Migrer les assets** : `public/assets/` (logos, avatars, video-thumbnail).
4. **Convertir `sections.jsx` → `app/_sections/*.tsx`** : un fichier par section, on supprime les wrappers `window.X`, on passe le contenu par prop, on conserve **toutes les classes CSS et la structure HTML**. Server Components partout sauf `OrderForm`.
5. **Brancher le contenu** : copier `defaultContent` de `data.js` vers `content/content.json` (1:1). `app/page.tsx` lit et valide avec Zod au build.
6. **Vérif visuelle** : `npm run dev` côté à côté de l'ancienne page. Comparer DOM, computed CSS, Lighthouse.
7. **Construire admin + auth + publish** (nouveau code).
8. **Déployer sur Vercel** : `vercel link`, env vars, activer Blob, premier deploy.

### Estimation effort

| Phase | Durée |
|---|---|
| Migration visuelle (étapes 1-5) | 0.5 - 1 jour |
| Admin + auth + publish (étape 7) | 2 - 3 jours |
| Tests + deploy (étapes 6, 8) | 0.5 - 1 jour |
| **Total v1** | **3 - 5 jours** |

L'audit tool v1.1 viendra ensuite, ~3 jours additionnels.

---

## 9. Préparation pour l'audit tool v1.1

### Structure déjà en place dès v1

Pour minimiser l'effort v1.1, on prévoit :
- `content/prompts.json` (vide au début) + `types/prompts.ts`
- `app/admin/audit/page.tsx` placeholder (lien sidebar)
- `app/api/audit/route.ts` stub retournant `501 Not Implemented`
- `lib/ghl.ts` contient déjà `postAuditToGHL` (signature finale, body TODO)

### Architecture audit v1.1 (rappel pour cohérence design)

```
Lead form submit (landing)
    → POST /api/lead → forward GHL webhook lead_submitted
    → GHL workflow: create contact + confirm email + Custom Webhook Action → POST /api/audit
        ↓
    /api/audit (Next.js, runtime nodejs, Fluid Compute max 300s)
        → extract domain from email
        → fetch + parse HTML (cheerio)
        → Google PageSpeed Insights API (gratuit 25k req/jour)
        → fallback Vercel Sandbox / Browserless si JS-heavy
        → compile signals object
        → POST Anthropic API (prompt depuis prompts.json)
        → parse réponse → subject + body + tags
        → POST GHL webhook audit_completed
```

### Pourquoi pas de DB pour audit v1.1

- Leads créés côté GHL, pas chez nous
- Résultats stockés sur le contact GHL (custom fields)
- Les "derniers audits envoyés" lus depuis Vercel Logs API (rétention 1j Hobby / 30j Pro)
- DB ajoutée plus tard *seulement* si besoin réel (queryable history, analytics)

---

## 10. Sécurité

| Risque | Parade |
|---|---|
| Brute-force login | Rate limit 5/15min/IP, bcrypt cost 12+ |
| Token GitHub volé | Env var Vercel uniquement, scope `contents:write` minimal sur 1 repo, rotation manuelle si compromis suspect |
| Session vol | Cookie HttpOnly + Secure + SameSite=Lax, JWT signé HS256 |
| XSS via contenu admin | React échappe par défaut, `dangerouslyInnerHTML` interdit dans les sections, Zod refuse les types non-string |
| Upload malveillant | MIME whitelist (image/*, video/mp4, video/webm), taille max 100 MB, scan basique du magic number |
| Spam form lead | Honeypot field + rate limit IP côté `/api/lead` |
| CSRF | Cookie SameSite=Lax suffit, tokens additionnels non nécessaires pour 1 user |
| Concurrence publish | Optimistic locking via sha GitHub, 409 avec message clair |

---

## 11. Performance et SEO

- **SSG** sur `/` : page entièrement pré-rendue au build, servie depuis CDN Edge Vercel. Pas de JS pour le contenu (Server Components).
- **Mode édition** : composants client uniquement quand cookie session valide, donc **aucun overhead pour les visiteurs**.
- **Images** : `next/image` pour optimisation automatique (WebP/AVIF, responsive srcset, lazy loading natif).
- **Vidéos** : `<video preload="metadata">` côté visiteur, lazy par défaut.
- **Fonts** : `next/font` avec subset minimal, weights 400/500/700/800 (comme aujourd'hui).
- **JSON-LD** : Product + FAQPage schema injectés dans `<head>` depuis `content.json` (déjà présent aujourd'hui, on conserve).
- **Meta** : Open Graph + Twitter Cards générés depuis `content.json` → toujours à jour quand Nik modifie le titre.
- **Lighthouse cible** : 100/100/100/100 (préservation de l'existant).

---

## 12. Coût opérationnel

| Service | Tier | Coût |
|---|---|---|
| GitHub | Free | 0 € |
| Vercel Hobby | Free (1 user, projets perso/non-commercial) | 0 € |
| Vercel Blob | Free 5 GB | 0 € |
| GoHighLevel | Compte existant Nik | (déjà payé) |
| Anthropic API (v1.1) | Pay-as-you-go | ~$0.01-0.08 / audit |
| **Total fixe** | | **0 €/mois** |

**À surveiller** : si Advanguard est un usage commercial (vente à des clients tiers), le ToS Vercel Hobby pourrait imposer un passage à Pro (~20 $/mois). À clarifier avec Nik.

---

## 13. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Vercel Hobby ToS commercial | Forcé en Pro 20$/mois | Vérifier ToS, prévoir migration en ~1 PR si requis |
| GitHub API rate limit (5000 req/h) | Bloque publish | Très peu d'usage, retry simple suffit |
| Vercel Blob quota 5 GB | Bloque uploads | Médiathèque admin pour supprimer anciens fichiers |
| Nik corrompt content.json via bug édition | Site cassé | Validation Zod côté serveur + au build, refus de publier |
| Token GitHub leak | Attaque possible | Scope minimal, rotation immédiate, audit log GitHub |
| GHL webhook URL leak | Spam de leads | Honeypot + rate limit, rotation URL côté GHL si besoin |

---

## 14. Travaux futurs (out of scope v1)

- AI Audit Tool v1.1 (brief séparé) : ~3 jours additionnels
- Analytics dashboard (Vercel Analytics ou Plausible)
- A/B testing variants
- Multi-langue (i18n Next.js)
- Notifications push à Nik (Slack/email) quand un lead arrive
- Migration Vercel Postgres si besoin queryable history

---

## 15. Validation et prochaines étapes

- [x] Design validé en conversation
- [ ] Spec relu par TB Dev
- [ ] Plan d'implémentation détaillé (skill `writing-plans`)
- [ ] Démarrage de l'implémentation
