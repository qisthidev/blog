# Hub-and-Spoke Architecture Plan

Based on the highly specific queries discovered in the [AI Semantic Mapping](_semantic-mapping.md), we have grouped the topics into interconnected Hub-and-Spoke content clusters. Each Hub represents a core Pillar Page, while the Spokes cover deep-dive, zero-click-proof technical queries. Each spoke is categorized by format (Tutorial, Comparison, Cheatsheet).

## 1. Hub: High-Performance Laravel (Octane & Queues)
**Path:** `/src/content/blog/high-performance-laravel/index.md` (Hub Pillar)

**Spokes:**
- `/src/content/blog/high-performance-laravel/race-condition-fix-cache-lock-vs-database.md`
  - **Format:** Comparison
  - **Query:** *Laravel race condition fix with Cache::lock vs database locks*
- `/src/content/blog/high-performance-laravel/queue-deadlock-redis-vs-database.md`
  - **Format:** Comparison
  - **Query:** *Laravel queue deadlock Redis vs database driver*
- `/src/content/blog/high-performance-laravel/swoole-octane-memory-leak-debugging.md`
  - **Format:** Tutorial
  - **Query:** *Laravel Octane Swoole memory leak debugging production*
- `/src/content/blog/high-performance-laravel/horizon-redis-cluster-queue-best-practices.md`
  - **Format:** Cheatsheet
  - **Query:** *Laravel Horizon Redis Cluster queue management best practices*

## 2. Hub: Mastering Astro.js Front-end
**Path:** `/src/content/blog/mastering-astro-js/index.md` (Hub Pillar)

**Spokes:**
- `/src/content/blog/mastering-astro-js/astro-vs-nextjs-performance-benchmark-2026.md`
  - **Format:** Comparison
  - **Query:** *Astro vs Next.js performance benchmark static blog 2026*
- `/src/content/blog/mastering-astro-js/content-collections-v5-migration-404-fix.md`
  - **Format:** Tutorial
  - **Query:** *Astro content collections v5 migration 404 fix slug to id*
- `/src/content/blog/mastering-astro-js/csp-nonce-configuration-inline-scripts.md`
  - **Format:** Cheatsheet
  - **Query:** *CSP nonce configuration for inline scripts in Astro*
- `/src/content/blog/mastering-astro-js/view-transitions-react-rehydration-state-persist.md`
  - **Format:** Tutorial
  - **Query:** *Astro view transitions React component re-hydration persist state*

## 3. Hub: From Laravel to Go
**Path:** `/src/content/blog/from-laravel-to-go/index.md` (Hub Pillar)

**Spokes:**
- `/src/content/blog/from-laravel-to-go/clean-architecture-dependency-injection.md`
  - **Format:** Comparison
  - **Query:** *From Laravel to Go clean architecture dependency injection*
- `/src/content/blog/from-laravel-to-go/goroutine-leak-detection-production-pprof.md`
  - **Format:** Tutorial
  - **Query:** *Go goroutine leak detection production pprof profiling guide*
- `/src/content/blog/from-laravel-to-go/error-handling-best-practices.md`
  - **Format:** Cheatsheet
  - **Query:** *Go error handling best practices wrapping vs sentinel errors*
- `/src/content/blog/from-laravel-to-go/http-middleware-chain-pattern-api-auth.md`
  - **Format:** Tutorial
  - **Query:** *Go HTTP middleware chain pattern for API authentication*
- `/src/content/blog/from-laravel-to-go/struct-embedding-vs-interfaces.md`
  - **Format:** Comparison
  - **Query:** *Go struct embedding vs interfaces when to use each pattern*

## 4. Hub: Advanced PostgreSQL for Laravel
**Path:** `/src/content/blog/advanced-postgresql-laravel/index.md` (Hub Pillar)

**Spokes:**
- `/src/content/blog/advanced-postgresql-laravel/slow-query-debugging-explain-analyze.md`
  - **Format:** Tutorial
  - **Query:** *PostgreSQL slow query debugging EXPLAIN ANALYZE step by step*
- `/src/content/blog/advanced-postgresql-laravel/index-bloat-detection-pg-repack.md`
  - **Format:** Tutorial
  - **Query:** *PostgreSQL index bloat detection and pg_repack fix without downtime*
- `/src/content/blog/advanced-postgresql-laravel/database-indexing-sql-traps-boolean.md`
  - **Format:** Cheatsheet
  - **Query:** *Laravel database indexing common SQL traps boolean columns*
- `/src/content/blog/advanced-postgresql-laravel/n-plus-1-detection-eloquent.md`
  - **Format:** Tutorial
  - **Query:** *PostgreSQL N+1 detection and fix with Laravel Eloquent*
- `/src/content/blog/advanced-postgresql-laravel/pgbouncer-connection-pooling-modes.md`
  - **Format:** Comparison
  - **Query:** *PgBouncer connection pooling transaction vs session mode guide*

## 5. Hub: Modern DevOps & GitHub Actions
**Path:** `/src/content/blog/modern-devops-ci-cd/index.md` (Hub Pillar)

**Spokes:**
- `/src/content/blog/modern-devops-ci-cd/docker-alpine-php-laravel-optimization.md`
  - **Format:** Tutorial
  - **Query:** *Docker multi-stage build Alpine Linux PHP Laravel optimization*
- `/src/content/blog/modern-devops-ci-cd/github-actions-cache-strategy-pnpm-docker.md`
  - **Format:** Cheatsheet
  - **Query:** *GitHub Actions cache strategy pnpm node_modules Docker layers*
- `/src/content/blog/modern-devops-ci-cd/lighthouse-ci-astro-seo-audit.md`
  - **Format:** Tutorial
  - **Query:** *GitHub Actions Lighthouse CI Astro blog automated SEO audit*
- `/src/content/blog/modern-devops-ci-cd/github-actions-self-hosted-vs-hosted.md`
  - **Format:** Comparison
  - **Query:** *GitHub Actions self-hosted runner vs hosted cost performance tradeoff*
- `/src/content/blog/modern-devops-ci-cd/git-commit-squash-revert-undo-interactive-rebase.md`
  - **Format:** Cheatsheet
  - **Query:** *Git commit squash revert undo interactive rebase cheatsheet*
