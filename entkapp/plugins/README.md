# 🔌 entkapp Plugins (v5.3.0)

Dieses Verzeichnis dient für deine benutzerdefinierten Plugins. entkapp lädt automatisch alle `.js` oder `.mjs` Dateien aus diesem Ordner, wenn `useCustomPlugins` in deiner `config.json` auf `true` gesetzt ist.

## 📦 Integrierte Framework- & Tool-Plugins (98 Gesamt)

entkapp verfügt über eine massive Bibliothek von 98 integrierten Plugins, die automatisch die Architektur deiner Codebase erkennen und analysieren.

### 🖼️ Frontend Frameworks & Meta-Frameworks
- **Next.js** (App Router, Pages Router)
- **React**, **Preact**, **Solid**, **Qwik**, **Lit**, **Angular**, **Vue**, **Svelte**
- **Nuxt**, **Remix**, **SvelteKit**, **Astro**, **Vitepress**, **Gatsby**, **RedwoodJS**

### 🌐 State Management & Routing
- **Redux**, **Zustand**, **Jotai**, **Recoil**, **MobX**, **Pinia**, **TanStack Query**
- **React Router**, **TanStack Router**, **Vue Router**

### 🛠️ Build Tools & Monorepo
- **Vite**, **Esbuild**, **Rollup**, **Webpack**, **Parcel**, **TypeScript**, **Babel**, **SWC**
- **Turbo**, **Nx**, **Lerna**, **Rush**, **Moon**, **Bazel**

### 🎨 Styling & UI Components
- **Tailwind CSS**, **PostCSS**, **UnoCSS**, **Stylelint**, **RTLCSS**
- **Ant Design (Antd)**, **Material UI (Mui)**, **Shadcn/UI**, **Radix UI**, **Chakra UI**
- **Framer Motion**, **GSAP**

### 🧪 Testing & Quality
- **Jest**, **Vitest**, **Playwright**, **Cypress**, **Storybook**, **MSW**
- **ESLint**, **Prettier**, **Biome**, **Oxlint**, **Husky**, **Lint-Staged**, **Commitlint**, **Changesets**

### ☁️ Backend, API & Database
- **Express**, **Fastify**, **NestJS**, **Hono**, **Koa**, **Elysia**, **Hapi**, **Grammy**
- **GraphQL**, **Apollo**, **TRPC**, **Socket.io**
- **Prisma**, **Drizzle**, **Mongoose**, **TypeORM**, **Supabase**, **Firebase**, **Clerk**

### 🔧 Infrastructure & Dev Tools
- **GitHub Actions**, **Docker**, **Terraform**, **EditorConfig**, **Dotenv**
- **Nvm**, **Volta**, **Pnpm**, **Yarn**, **Bun**
- **Swiper**, **Quill**, **Envelop**, **Nitro Modules**, **CKEditor Engine**

---

## 🛠️ Eigene Plugins erstellen

Du kannst die Funktionalität von entkapp erweitern, indem du eine Plugin-Klasse erstellst:

```javascript
export default class MyCustomPlugin {
  name = 'my-custom-plugin';
  
  async onAnalyze(context) {
    // Deine Logik hier
  }
}
```

## 📜 Dokumentation

Für eine detaillierte Anleitung zur Plugin-Entwicklung besuche bitte den [Plugin Development Guide](https://dreamlongyt.github.io/entkapp/).
