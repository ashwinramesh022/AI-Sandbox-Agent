# Cinema Portfolio Codebase Documentation

This document is a structured, comprehensive reference for understanding and modifying the portfolio safely.

## 1. Project Structure

### Root
- [.git/](.git/) — git metadata (do not edit).
- [.next/](.next/) — Next.js build output (generated).
- [node_modules/](node_modules/) — dependencies (generated).
- [agent/](agent/)
  - [agent/index.js](agent/index.js) — portfolio maintenance agent loop.
  - [agent/llm.js](agent/llm.js) — OpenAI chat API wrapper + system prompt.
  - [agent/state.js](agent/state.js) — in-memory state tracking.
- [content/](content/)
  - [content/journal/](content/journal/) — MDX journal posts.
    - [content/journal/building-educational-vr-experiences.mdx](content/journal/building-educational-vr-experiences.mdx)
    - [content/journal/building-production-rag-systems.mdx](content/journal/building-production-rag-systems.mdx)
    - [content/journal/building-reposmith-agentic-development.mdx](content/journal/building-reposmith-agentic-development.mdx)
    - [content/journal/building-with-ai-assistants.mdx](content/journal/building-with-ai-assistants.mdx)
    - [content/journal/go-rest-apis-blogging-platform.mdx](content/journal/go-rest-apis-blogging-platform.mdx)
    - [content/journal/lessons-from-aws-internship.mdx](content/journal/lessons-from-aws-internship.mdx)
    - [content/journal/theater-to-tech-leadership-lessons.mdx](content/journal/theater-to-tech-leadership-lessons.mdx)
- [public/](public/)
  - [public/og-default.png](public/og-default.png) — Open Graph image.
  - [public/og-default.svg](public/og-default.svg) — Open Graph image (SVG).
  - [public/resume.pdf](public/resume.pdf) — public resume download.
- [src/](src/)
  - [src/app/](src/app/) — Next.js app router pages and global styles.
    - [src/app/globals.css](src/app/globals.css) — design tokens, Tailwind base, utilities.
    - [src/app/layout.tsx](src/app/layout.tsx) — root layout + metadata.
    - [src/app/page.tsx](src/app/page.tsx) — homepage (Story).
    - [src/app/not-found.tsx](src/app/not-found.tsx) — 404 page.
    - [src/app/robots.ts](src/app/robots.ts) — robots metadata.
    - [src/app/sitemap.ts](src/app/sitemap.ts) — sitemap generation.
    - [src/app/favicon.ico](src/app/favicon.ico) — site favicon.
    - [src/app/about/page.tsx](src/app/about/page.tsx) — About page.
    - [src/app/chapters/page.tsx](src/app/chapters/page.tsx) — Chapters listing.
    - [src/app/chapters/[slug]/page.tsx](src/app/chapters/[slug]/page.tsx) — Chapter detail.
    - [src/app/journal/page.tsx](src/app/journal/page.tsx) — Journal index.
    - [src/app/journal/[slug]/page.tsx](src/app/journal/[slug]/page.tsx) — Journal post detail.
    - [src/app/journal/feed.xml/route.ts](src/app/journal/feed.xml/route.ts) — RSS feed.
    - [src/app/resume/page.tsx](src/app/resume/page.tsx) — Resume page.
  - [src/components/](src/components/) — reusable UI and section components.
    - [src/components/about/AboutContent.tsx](src/components/about/AboutContent.tsx)
    - [src/components/about/index.ts](src/components/about/index.ts)
    - [src/components/chapters/ChapterContent.tsx](src/components/chapters/ChapterContent.tsx)
    - [src/components/chapters/ChapterHeader.tsx](src/components/chapters/ChapterHeader.tsx)
    - [src/components/chapters/index.ts](src/components/chapters/index.ts)
    - [src/components/cursor/CursorFollower.tsx](src/components/cursor/CursorFollower.tsx)
    - [src/components/cursor/index.ts](src/components/cursor/index.ts)
    - [src/components/home/FeaturedChapters.tsx](src/components/home/FeaturedChapters.tsx)
    - [src/components/home/HeroSection.tsx](src/components/home/HeroSection.tsx)
    - [src/components/home/ProofStrip.tsx](src/components/home/ProofStrip.tsx)
    - [src/components/home/SecondaryCTA.tsx](src/components/home/SecondaryCTA.tsx)
    - [src/components/home/index.ts](src/components/home/index.ts)
    - [src/components/journal/JournalList.tsx](src/components/journal/JournalList.tsx)
    - [src/components/journal/JournalPostHeader.tsx](src/components/journal/JournalPostHeader.tsx)
    - [src/components/journal/index.ts](src/components/journal/index.ts)
    - [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx)
    - [src/components/layout/Navigation.tsx](src/components/layout/Navigation.tsx)
    - [src/components/layout/PageTransition.tsx](src/components/layout/PageTransition.tsx)
    - [src/components/layout/SmoothScroll.tsx](src/components/layout/SmoothScroll.tsx)
    - [src/components/layout/index.ts](src/components/layout/index.ts)
    - [src/components/mdx/MDXComponents.tsx](src/components/mdx/MDXComponents.tsx)
    - [src/components/mdx/index.ts](src/components/mdx/index.ts)
    - [src/components/resume/ResumeContent.tsx](src/components/resume/ResumeContent.tsx)
    - [src/components/resume/index.ts](src/components/resume/index.ts)
    - [src/components/shared/PageHeader.tsx](src/components/shared/PageHeader.tsx)
    - [src/components/shared/index.ts](src/components/shared/index.ts)
    - [src/components/ui/Button.tsx](src/components/ui/Button.tsx)
    - [src/components/ui/Card.tsx](src/components/ui/Card.tsx)
    - [src/components/ui/LightRays.tsx](src/components/ui/LightRays.tsx) — empty placeholder.
    - [src/components/ui/Tag.tsx](src/components/ui/Tag.tsx)
    - [src/components/ui/index.ts](src/components/ui/index.ts)
  - [src/lib/](src/lib/) — shared data, types, utilities.
    - [src/lib/chapters.ts](src/lib/chapters.ts) — projects data + `Chapter` type.
    - [src/lib/constants.ts](src/lib/constants.ts) — site config, nav, tags, proof items.
    - [src/lib/fonts.ts](src/lib/fonts.ts) — Geist font setup.
    - [src/lib/mdx.ts](src/lib/mdx.ts) — MDX loading + frontmatter types.
    - [src/lib/motion.ts](src/lib/motion.ts) — motion presets.
    - [src/lib/seo.ts](src/lib/seo.ts) — SEO metadata helpers.
    - [src/lib/utils.ts](src/lib/utils.ts) — helpers + tag/color utilities.
- [tools/](tools/) — automation utilities used by the agent.
  - [tools/index.js](tools/index.js) — tool registry and schema.
  - [tools/browser.js](tools/browser.js) — puppeteer-based verification tools.
  - [tools/build.js](tools/build.js) — build/dev server helpers.
  - [tools/command.js](tools/command.js) — command allowlist runner.
  - [tools/filesystem.js](tools/filesystem.js) — safe filesystem operations.
  - [tools/git.js](tools/git.js) — safe git wrapper.
- [eslint.config.mjs](eslint.config.mjs) — ESLint config.
- [goal.txt](goal.txt) — agent input file.
- [next.config.ts](next.config.ts) — Next.js config.
- [next-env.d.ts](next-env.d.ts) — Next.js TypeScript types.
- [package.json](package.json) — scripts + dependencies.
- [package-lock.json](package-lock.json) — lockfile.
- [postcss.config.mjs](postcss.config.mjs) — PostCSS/Tailwind config.
- [README.md](README.md) — starter documentation.
- [tsconfig.json](tsconfig.json) — TypeScript config.
- [AshwinRameshKannan_Resume.pdf](AshwinRameshKannan_Resume.pdf) — local resume asset.
- [Resume_Ashwin.pdf](Resume_Ashwin.pdf) — local resume asset.

## 2. Tech Stack

- **Framework**: Next.js 16 app router with React 19 and TypeScript.
  - Core pages: [src/app/layout.tsx](src/app/layout.tsx), [src/app/page.tsx](src/app/page.tsx), [src/app/chapters/[slug]/page.tsx](src/app/chapters/[slug]/page.tsx), [src/app/journal/[slug]/page.tsx](src/app/journal/[slug]/page.tsx).
- **Styling**: Tailwind CSS v4 + custom CSS tokens in [src/app/globals.css](src/app/globals.css).
- **Content system**: MDX in [content/journal/](content/journal/), parsed by gray-matter and rendered via `next-mdx-remote`.
- **Animation**: `framer-motion` and `lenis`.

**Major dependencies**
- `clsx` — className composition in [src/lib/utils.ts](src/lib/utils.ts).
- `feed` — RSS generation in [src/app/journal/feed.xml/route.ts](src/app/journal/feed.xml/route.ts).
- `reading-time` — post metadata in [src/lib/mdx.ts](src/lib/mdx.ts).
- `rehype-highlight`, `rehype-slug`, `remark-gfm` — MDX rendering plugins in [src/app/journal/[slug]/page.tsx](src/app/journal/[slug]/page.tsx).
- `next/font` — Geist fonts in [src/lib/fonts.ts](src/lib/fonts.ts).

## 3. Data Structures

### Chapter (Project) Type
Defined in [src/lib/chapters.ts](src/lib/chapters.ts#L5-L27):

```ts
export interface Chapter {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  tags: string[];
  coverImage?: string;
  featured?: boolean;
  context: string;
  whatIBuilt: string;
  keyDecisions: string[];
  challenges: string[];
  outcomes: string[];
  techStack: string[];
  links?: {
    live?: string;
    github?: string;
    demo?: string;
  };
}
```

### Where the data is stored
- Chapters array in [src/lib/chapters.ts](src/lib/chapters.ts#L32).
- Journal posts in MDX files in [content/journal/](content/journal/).

### Example Chapter Entry
From [src/lib/chapters.ts](src/lib/chapters.ts#L64):

```ts
{
  slug: "ww-rag-platform",
  title: "Client-Safe RAG Platform",
  subtitle: "AI Knowledge System for Creative Agencies",
  description:
    "Built a production-grade RAG platform enabling creative teams to search 2,000+ client documents with hybrid retrieval, strict client isolation, and full audit logging.",
  date: "2026-02",
  tags: ["ai", "backend", "full-stack", "python"],
  featured: true,
  context:
    "W&W, a branding agency managing assets for 50+ clients, struggled with knowledge fragmentation across Google Drive. Teams wasted hours hunting for brand guidelines, past work, and client docs. There was real risk of cross-client data leakage with no audit trail of who accessed what.",
  whatIBuilt:
    "A production-grade RAG platform that ingests 2,000+ documents from Google Drive, chunks them with structure awareness, and enables semantic search, grounded Q&A with citations, and on-brand draft generation. Built strict multi-tenant isolation ensuring users only access their assigned clients' data, with comprehensive audit logging of every query and retrieved chunk.",
  keyDecisions: [
    "Chose pgvector over Pinecone for simpler ops and no vendor lock-in",
    "Implemented RRF (Reciprocal Rank Fusion) for hybrid search without score normalization",
    "Used two-stage retrieval: fast recall with hybrid search, then Cohere reranking for precision",
    "Built structure-aware chunking preserving heading context for better citations",
    "Denormalized client_id on chunks table for query-level isolation performance",
    "Designed explicit refusal behavior with pattern matching for out-of-scope questions",
  ],
  challenges: [
    "Ensuring zero data leakage between clients while maintaining query performance at scale",
    "Combining vector and keyword search scores without normalization (solved with RRF)",
    "Maintaining citation accuracy when LLM might hallucinate source references",
    "Building incremental sync to avoid re-embedding unchanged documents",
    "Balancing reranking latency (~500ms) against improved relevance",
  ],
  outcomes: [
    "363 tests covering auth, retrieval, RAG, client isolation, and audit",
    "Hybrid search achieving 95%+ recall with sub-second latency",
    "Strict client isolation at database query level with full audit trails",
    "Production-ready system serving 50+ clients with zero cross-client data access",
    "Reusable internal knowledge platform replacing ad-hoc prompts",
  ],
  techStack: [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "pgvector",
    "OpenAI",
    "Cohere",
    "SQLAlchemy",
    "Next.js",
    "TypeScript",
    "Docker",
  ],
  links: {
    github: "https://github.com/ashwinramesh022/ww-rag",
  },
}
```

## 4. Component Architecture

### About
- [src/components/about/AboutContent.tsx](src/components/about/AboutContent.tsx) — renders About narrative sections. Props: none.

### Chapters
- [src/components/chapters/ChapterHeader.tsx](src/components/chapters/ChapterHeader.tsx) — chapter hero header. Props: `{ chapter: Chapter }`.
- [src/components/chapters/ChapterContent.tsx](src/components/chapters/ChapterContent.tsx) — sectioned chapter body. Props: `{ chapter: Chapter }`.

### Cursor
- [src/components/cursor/CursorFollower.tsx](src/components/cursor/CursorFollower.tsx) — custom cursor. Props: none.

### Home
- [src/components/home/HeroSection.tsx](src/components/home/HeroSection.tsx) — homepage hero. Props: none.
- [src/components/home/ProofStrip.tsx](src/components/home/ProofStrip.tsx) — “Highlights” strip. Props: `{ items: readonly { label: string; icon: string }[] }`.
- [src/components/home/FeaturedChapters.tsx](src/components/home/FeaturedChapters.tsx) — featured projects list. Props: `{ chapters: Chapter[] }`.
- [src/components/home/SecondaryCTA.tsx](src/components/home/SecondaryCTA.tsx) — CTA cards for Journal/About. Props: none.

### Journal
- [src/components/journal/JournalList.tsx](src/components/journal/JournalList.tsx) — filterable list. Props: `{ posts: PostMeta[]; tags: { tag: string; count: number }[] }`.
- [src/components/journal/JournalPostHeader.tsx](src/components/journal/JournalPostHeader.tsx) — post header. Props: `{ post: Post }`.

### Layout
- [src/components/layout/Navigation.tsx](src/components/layout/Navigation.tsx) — top nav. Props: none.
- [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) — site footer. Props: none.
- [src/components/layout/PageTransition.tsx](src/components/layout/PageTransition.tsx) — page fade transitions. Props: `{ children: React.ReactNode }`.
- [src/components/layout/SmoothScroll.tsx](src/components/layout/SmoothScroll.tsx) — Lenis wrapper. Props: `{ children: React.ReactNode }`.

### MDX
- [src/components/mdx/MDXComponents.tsx](src/components/mdx/MDXComponents.tsx) — MDX component mapping.
  - `mdxComponents`: headings, links, images, lists, code, tables.
  - `Callout`: `{ type?: "info" | "warning" | "tip"; title?: string; children: React.ReactNode }`.

### Resume
- [src/components/resume/ResumeContent.tsx](src/components/resume/ResumeContent.tsx) — resume sections. Props: none.

### Shared
- [src/components/shared/PageHeader.tsx](src/components/shared/PageHeader.tsx) — page header. Props: `{ overline?: string; title: string; description?: string }`.

### UI
- [src/components/ui/Button.tsx](src/components/ui/Button.tsx) — buttons/links. Props: `variant`, `size`, `href`, `cursorLabel`, `target`, `rel`, plus button props.
- [src/components/ui/Card.tsx](src/components/ui/Card.tsx) — card container + subcomponents.
- [src/components/ui/Tag.tsx](src/components/ui/Tag.tsx) — styled tags. Props: `{ children; href?; active?; onClick?; className? }`.
- [src/components/ui/LightRays.tsx](src/components/ui/LightRays.tsx) — empty placeholder.

## 5. Styling Patterns

- **Approach**: Tailwind CSS v4 + CSS custom properties.
  - Global tokens and utilities in [src/app/globals.css](src/app/globals.css).
  - Tailwind theme bridge uses `@theme inline`.
- **Color system**
  - Core palette (dark default): `--color-bg`, `--color-text-primary`, `--color-border`, `--color-highlight` in [src/app/globals.css](src/app/globals.css#L29-L90).
  - Accent palette: teal/pink/purple/emerald/coral in [src/app/globals.css](src/app/globals.css#L64-L115).
  - Tag classes: `.tag-ai`, `.tag-vr`, `.tag-web`, `.tag-backend`, `.tag-creative`, `.tag-default` in [src/app/globals.css](src/app/globals.css#L546-L596).
- **Theme**: Dark mode only. No light mode or theme switcher.
- **Layout utilities**: `.container-narrow`, `.container-wide` in [src/app/globals.css](src/app/globals.css#L510-L537).

## 6. Content System

### Journal Flow
- MDX files in [content/journal/](content/journal/).
- Parsed by gray-matter + reading-time in [src/lib/mdx.ts](src/lib/mdx.ts).
- Rendered by `next-mdx-remote` with `remark-gfm`, `rehype-slug`, `rehype-highlight` in [src/app/journal/[slug]/page.tsx](src/app/journal/[slug]/page.tsx).
- RSS feed in [src/app/journal/feed.xml/route.ts](src/app/journal/feed.xml/route.ts).

### MDX Frontmatter Structure
Defined in [src/lib/mdx.ts](src/lib/mdx.ts#L10-L18):

```ts
export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft?: boolean;
  coverImage?: string;
}
```

### Example Frontmatter
From [content/journal/building-with-ai-assistants.mdx](content/journal/building-with-ai-assistants.mdx#L1-L9):

```md
---
title: "Building With AI Assistants: A Developer's Perspective"
description: "How I've integrated AI tools into my development workflow, what works, what doesn't, and why the future isn't about replacement—it's about amplification."
date: "2026-01-15"
tags: ["ai", "productivity", "engineering"]
draft: false
---
```

### Add a New Post
1. Add a `.mdx` file in [content/journal/](content/journal/).
2. Provide frontmatter per `PostFrontmatter`.
3. Write MDX content. `Callout` is available via [src/components/mdx/MDXComponents.tsx](src/components/mdx/MDXComponents.tsx).
4. Use `draft: true` to hide in production.

## 7. Layout Structure

- Root layout: [src/app/layout.tsx](src/app/layout.tsx)
  - `CursorFollower`
  - `SmoothScroll`
  - `Navigation`
  - `<main>` with `PageTransition` around `{children}`
  - `Footer`
- Footer is already wired in [src/app/layout.tsx](src/app/layout.tsx#L61-L78). Modify [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx).

## 8. Key File Locations

- Add a new project (Chapter): [src/lib/chapters.ts](src/lib/chapters.ts)
- Edit homepage hero: [src/components/home/HeroSection.tsx](src/components/home/HeroSection.tsx)
- Edit homepage proof strip: [src/components/home/ProofStrip.tsx](src/components/home/ProofStrip.tsx) and `proofItems` in [src/lib/constants.ts](src/lib/constants.ts#L28-L32)
- Edit homepage featured projects: [src/components/home/FeaturedChapters.tsx](src/components/home/FeaturedChapters.tsx)
- Edit About content: [src/components/about/AboutContent.tsx](src/components/about/AboutContent.tsx)
- Modify navigation items: `navItems` in [src/lib/constants.ts](src/lib/constants.ts#L16-L21) and layout in [src/components/layout/Navigation.tsx](src/components/layout/Navigation.tsx)
- Modify footer: [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) and `footerLinks` in [src/lib/constants.ts](src/lib/constants.ts#L23-L33)

## 9. Build & Deploy

### Scripts
From [package.json](package.json#L5-L12):
- `npm run dev` — local dev server.
- `npm run build` — production build.
- `npm run start` — production server.
- `npm run lint` — ESLint.

### Next.js Config
From [next.config.ts](next.config.ts):
- `output: "standalone"` for deployment.
- Image formats: AVIF + WebP.
- `remotePatterns` allow any HTTPS host.
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- Cache headers for static assets.
- Experimental `optimizePackageImports` for `framer-motion` and `date-fns`.
