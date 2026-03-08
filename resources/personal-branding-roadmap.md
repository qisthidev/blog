# Personal Branding Roadmap — qisthi.dev

A comprehensive, prioritized roadmap for strengthening the personal brand of **qisthi.dev**, based on David Airey's *Identity Designed* principles and current site audit.

> **Legend:** ✅ Done · 🔲 To Do · ⏳ In Progress

---

## Status Overview

| Area | Status | Impact |
|------|--------|--------|
| Logo & Wordmark | ✅ Done | High |
| Favicon | ✅ Done | High |
| Brand Colors | ✅ Done | High |
| OG Image Templates | ✅ Done | High |
| About Page Avatar | ✅ Done | Medium |
| Homepage Hero | ✅ Done | Medium |
| Typography System | 🔲 To Do | High |
| 404 Page | 🔲 To Do | Medium |
| Footer Branding | 🔲 To Do | Medium |
| Author Bio Card | 🔲 To Do | High |
| Reading Experience | 🔲 To Do | High |
| Stale Config Cleanup | 🔲 To Do | Low |
| Page Transitions | 🔲 To Do | Medium |
| Tag/Category Styling | 🔲 To Do | Medium |
| Social Media Consistency | 🔲 To Do | Medium |
| Newsletter/CTA | 🔲 To Do | High |
| Analytics Setup | 🔲 To Do | Medium |

---

## Phase 3 — Typography & Reading Experience

### 3A. Dual Typeface System
**Current:** Single monospace font (`--font-google-sans-code`) for everything.
**Problem:** Monospace is great for code, but poor for long-form reading. Headings lack visual punch.

**Implement:**
- Add a **display font** for headings (e.g., **Inter**, **Outfit**, or **Plus Jakarta Sans**)
- Keep monospace for code blocks, inline code, and technical context
- Create clear typographic scale: H1 (2.5rem bold) → H2 (2rem semibold) → H3 (1.5rem medium italic) → body (1rem regular)
- Add font loading via Google Fonts or self-hosted WOFF2

**Files to modify:**
- `src/styles/global.css` — add heading font variable
- `src/styles/typography.css` — override heading styles
- `src/layouts/Layout.astro` — add Google Fonts preconnect/link

| Impact | Effort | Priority |
|--------|--------|----------|
| 🔥 High | Low | ⭐ #1 |

---

### 3B. Styled Blockquotes
**Current:** Plain left-border blockquotes with reduced opacity.

**Implement:**
- Large pull-quote style for important quotes (bigger font, accent border, subtle bg tint)
- Consistent with brand colors via `border-s-accent` and `bg-accent/5`

**File:** `src/styles/typography.css`

| Impact | Effort | Priority |
|--------|--------|----------|
| Low | Low | #8 |

---

## Phase 4 — Author Identity & Trust

### 4A. Author Bio Card (Post Footer)
**Current:** Posts end with tags and prev/next navigation. No author context.
**Problem:** Readers landing from search/social have no context about who wrote the article.

**Implement:**
- Insert an **author bio card** between the article content and the prev/next navigation
- Include: avatar, name, one-line tagline ("Full-Stack Developer writing about Laravel, Go, and DevOps"), link to About page
- Use brand colors: subtle `bg-accent/5` background, accent ring around avatar

**Files to modify:**
- `src/components/AuthorBio.astro` — new component
- `src/layouts/PostDetails.astro` — insert before prev/next nav

| Impact | Effort | Priority |
|--------|--------|----------|
| 🔥 High | Low | ⭐ #2 |

---

### 4B. Newsletter / Email CTA
**Current:** No email capture anywhere on the site.
**Problem:** Losing potential subscribers and repeat readers every day.

**Implement:**
- Add a lightweight email subscription CTA at the end of each post (after author bio)
- Could integrate with Buttondown, ConvertKit, or even a simple Mailchimp form
- Design: minimal form with "Get notified about new posts" headline + email input + subscribe button
- Optional: add to footer as a secondary placement

**Files to modify:**
- `src/components/NewsletterCTA.astro` — new component
- `src/layouts/PostDetails.astro` — insert after author bio
- `src/components/Footer.astro` — optional secondary CTA

| Impact | Effort | Priority |
|--------|--------|----------|
| 🔥 High | Medium | ⭐ #3 |

---

## Phase 5 — Brand Touchpoints

### 5A. Branded 404 Page
**Current:** Generic `404` with `¯\_(ツ)_/¯` and "Halaman Tidak Ditemukan" (Indonesian).
**Problem:** Missing an opportunity to show personality. Also language inconsistency (rest of site is English).

**Implement:**
- Redesign with brand personality: large ramageek logo, witty message, suggested links
- Consistent language (English like rest of site)
- Possible: animated SVG illustration or creative use of brand colors
- Include search bar or popular posts suggestions

**File:** `src/pages/404.astro`

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Low | #4 |

---

### 5B. Branded Footer
**Current:** Plain "Copyright © 2026 | All rights reserved." with social icons.
**Problem:** Footer is a high-visibility touchpoint used on every page but has no brand presence.

**Implement:**
- Add ramageek logo mark (small, subdued)
- Add tagline ("Deep dives into backend engineering")
- Reorganize: logo + tagline left, social icons right, copyright below
- Optional: add quick links (About, Blog, RSS)

**File:** `src/components/Footer.astro`

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Low | #5 |

---

### 5C. Page Transitions
**Current:** Astro View Transitions enabled but default/unstyled.
**Problem:** Page changes feel abrupt; branded transitions add polish.

**Implement:**
- Add subtle fade or slide transition animations
- Consider a branded loading indicator (accent color progress bar — already exists on post pages, extend to all pages)
- Ensure view transition names are consistent

**File:** `src/layouts/Layout.astro`

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Low | #7 |

---

## Phase 6 — Visual Polish

### 6A. Tag / Category Color Coding
**Current:** All tags use the same accent color styling.
**Problem:** No visual differentiation between technologies.

**Implement:**
- Map technology tags to brand-compatible colors:
  - `laravel` / `php` → crimson red (brand primary)
  - `go` / `golang` → cyan/teal
  - `postgresql` / `database` → blue
  - `devops` / `nginx` → orange
  - `astro` / `frontend` → purple
- Apply as subtle pill backgrounds on tag pages and blog cards

**Files to modify:**
- `src/components/Tag.astro` — add color mapping
- `src/styles/global.css` — define tag color variables

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Medium | #6 |

---

### 6B. Code Block Enhancements
**Current:** Standard Shiki syntax highlighting with copy button.

**Implement:**
- Add **filename/language label** above code blocks (e.g., `nginx.conf`, `app.php`)
- Brand the copy button (accent color on hover)
- Add line numbers for longer code blocks

**Files to modify:**
- `src/styles/typography.css` — code block header styles
- `src/layouts/PostDetails.astro` — code block script enhancements

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Medium | #9 |

---

### 6C. Post Reading Time & Progress
**Current:** Reading progress bar exists (PostDetails inline script) but unstyled.

**Implement:**
- Style progress bar with brand accent gradient
- Add **estimated reading time** next to the date on post cards and post headers
- Consider adding a "reading time" indicator in the Datetime component

**Files to modify:**
- `src/components/Datetime.astro` — add reading time display
- `src/layouts/PostDetails.astro` — style progress bar

| Impact | Effort | Priority |
|--------|--------|----------|
| Low | Low | #10 |

---

## Phase 7 — Config & Housekeeping

### 7A. Stale Config Cleanup
**Current issues in `src/config.ts`:**
- `ogImage: "astropaper-og.jpg"` → should reference the new dynamic OG or remove
- Analytics IDs are all empty (Umami, Plausible, GA) → set up at least one
- `SITE.title` is "Qisthi Ramadhani" not "qisthi.dev" — consider alignment

**File:** `src/config.ts`

| Impact | Effort | Priority |
|--------|--------|----------|
| Low | Low | Housekeeping |

---

### 7B. Social Media Visual Consistency
**Current:** GitHub, X, LinkedIn profiles may not match the blog branding.

**Implement:**
- Use the same OG template colors/style for social profile banners
- Export branded profile picture (avatar with accent ring) for all platforms
- Ensure bio text and links are consistent across platforms

**Tools:** Image editor or Satori script reuse

| Impact | Effort | Priority |
|--------|--------|----------|
| Medium | Medium | #11 |

---

## Implementation Priority Order

### Quick Wins (< 1 hour each)
1. **Typography system** — add heading font, update typographic scale
2. **Author bio card** — insert at end of every post
3. **Branded 404** — redesign with logo + personality
4. **Footer branding** — add logo, tagline, reorganize
5. **Config cleanup** — fix stale `ogImage`, analytics

### Medium Effort (2-4 hours each)
6. **Newsletter CTA** — email capture after posts
7. **Tag color coding** — per-technology colors
8. **Page transitions** — branded animations
9. **Code block enhancements** — filename labels, line numbers

### Long Term
10. **Reading time** — estimated time on cards and posts
11. **Social media consistency** — unified banners and bios
12. **Brand style guide** — formal documentation of all brand decisions

---

## Brand Assets Reference

| Asset | File | Usage |
|-------|------|-------|
| Logo mark | `public/ramageek.png` | Header, OG images, footer |
| Avatar | `public/avatar.png` | Homepage hero, About page, author bio |
| Favicon ICO | `public/favicon.ico` | Browser tab |
| Favicon PNG | `public/favicon-16x16.png`, `favicon-32x32.png` | Browser tab |
| Brand Red | `#C83B54` (light) / `#E05A73` (dark) | Accent color |
| Background | `#fdfdfd` (light) / `#212737` (dark) | Page bg |
| Foreground | `#282728` (light) / `#eaedf3` (dark) | Text color |
