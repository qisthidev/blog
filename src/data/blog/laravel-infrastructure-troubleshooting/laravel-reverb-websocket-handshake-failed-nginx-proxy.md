---
author: Qisthi Ramadhani
pubDatetime: 2026-03-18T22:24:07.779Z
title: "Laravel Reverb WebSocket Handshake Failed Behind Nginx: How to Fix"
featured: false
draft: false
tags:
  - laravel
  - production
  - debugging
  - devops-and-infrastructure
  - infrastructure
  - reverb
  - nginx
  - websockets
description: "This handshake failure happens when Nginx proxies the Reverb endpoint as a normal HTTP request instead of upgrading it to a WebSocket connection. The most..."
faqs:
  - question: "Why does Laravel Reverb work locally but fail behind Nginx in production?"
    answer: "Local environments often connect directly to the Reverb process or use a much simpler proxy chain. Production adds SSL termination, reverse proxies, header forwarding, and public-vs-internal host separation. If Nginx or an upstream proxy fails to preserve the WebSocket upgrade request, the handshake will fail even though Reverb is healthy. That is why production failures often come from infrastructure, not broadcasting code."
  - question: "What HTTP status should I expect from a successful Reverb WebSocket handshake?"
    answer: "A successful WebSocket upgrade should return `101 Switching Protocols`. If you keep seeing 200, 400, 404, or 500 responses on the `/app` endpoint, the request is being handled incorrectly before the upgrade finishes. Checking for status 101 in browser devtools or proxy logs is one of the fastest ways to confirm your Nginx and Reverb configuration is finally correct."
---

## TL;DR

This handshake failure happens when Nginx proxies the Reverb endpoint as a normal HTTP request instead of upgrading it to a WebSocket connection. The most common reasons are missing `Upgrade` and `Connection` headers, putting the `/app` location behind a broader catch-all block, incorrect `REVERB_HOST` and `VITE_REVERB_HOST` separation, or a multi-proxy architecture where only one layer forwards the upgrade headers. This guide walks you through identifying the symptoms, understanding the root cause, and implementing a production-tested fix with real code examples.

---

## Symptoms

If you're experiencing this issue, you'll likely notice one or more of these signs in your application:

- Browser devtools show failed WebSocket handshake or repeated reconnect attempts
- Realtime features stop working even though `php artisan reverb:start` appears healthy
- Nginx access logs show `/app` requests returning 400, 404, or 500 instead of status 101
- The problem appears only in production behind Nginx and not in local direct connections
- Double-proxy setups fail while single-server tests sometimes work

If any of these symptoms look familiar, you're dealing with **laravel reverb websocket handshake failed behind nginx**. Read on to understand why it happens and how to fix it properly.

---

## Root Cause

This handshake failure happens when Nginx proxies the Reverb endpoint as a normal HTTP request instead of upgrading it to a WebSocket connection. The most common reasons are missing `Upgrade` and `Connection` headers, putting the `/app` location behind a broader catch-all block, incorrect `REVERB_HOST` and `VITE_REVERB_HOST` separation, or a multi-proxy architecture where only one layer forwards the upgrade headers. Laravel Reverb itself may be running fine, but the browser never completes the protocol switch, so the app experiences connection failures that look like broadcasting bugs. Treat it as a reverse-proxy and environment-variable problem first, not as a queue or event broadcasting problem.

Understanding the root cause is critical before applying a fix — treating only the symptoms often leads to the problem resurfacing in a different form, especially under production load.

---

## How to Fix

Follow these steps in order. Each step builds on the previous one, and skipping steps may result in an incomplete fix.

### Step 1: Verify that the `/app` location block is defined before broader application routes so Nginx does not route WebSocket traffic through normal Laravel handling.

Verify that the `/app` location block is defined before broader application routes so Nginx does not route WebSocket traffic through normal Laravel handling.

### Step 2: Set the required proxy headers including `Upgrade` and `Connection` and ensure every proxy layer in front of Reverb forwards them, not just the innermost one.

Set the required proxy headers including `Upgrade` and `Connection` and ensure every proxy layer in front of Reverb forwards them, not just the innermost one.

### Step 3: Keep `REVERB_HOST` as the internal bind address such as `0.0.0.0` and use `VITE_REVERB_HOST` for the public browser-facing domain, because mixing them commonly breaks production handshakes.

Keep `REVERB_HOST` as the internal bind address such as `0.0.0.0` and use `VITE_REVERB_HOST` for the public browser-facing domain, because mixing them commonly breaks production handshakes.

### Step 4: Confirm the browser connects to the expected scheme and port, typically `wss` on `443`, while Reverb listens internally on its private port such as `8081`.

Confirm the browser connects to the expected scheme and port, typically `wss` on `443`, while Reverb listens internally on its private port such as `8081`.

### Step 5: Check Reverb and Nginx logs together for the failing request so you can distinguish handshake rejection from an upstream connectivity problem.

Check Reverb and Nginx logs together for the failing request so you can distinguish handshake rejection from an upstream connectivity problem.

### Step 6: After configuration changes, reload Nginx, restart Reverb, and test a real browser connection until you see a successful `101 Switching Protocols` response.

After configuration changes, reload Nginx, restart Reverb, and test a real browser connection until you see a successful `101 Switching Protocols` response.

---

## Code Example

The following before/after comparison shows the core pattern you need to change. Pay attention to the comments explaining why each change matters.

### Before (Broken)

```nginx
location /app {\n    proxy_pass http://127.0.0.1:8081;\n}\n\n# .env\nREVERB_HOST=your-domain.com\nVITE_REVERB_HOST=your-domain.com
```

### After (Fixed)

```nginx
location /app {\n    proxy_http_version 1.1;\n    proxy_set_header Host $http_host;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection "Upgrade";\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_pass http://127.0.0.1:8081;\n}\n\n# .env\nREVERB_HOST=0.0.0.0\nREVERB_PORT=8081\nVITE_REVERB_HOST=your-domain.com\nVITE_REVERB_PORT=443
```

---

## Key Takeaways

- **Identify before you fix**: Use the symptoms checklist above to confirm you're dealing with this specific issue, not a different problem with similar error messages
- **Test under load**: Many of these issues only surface under concurrent access — always verify your fix with load testing before deploying to production
- **Monitor after deployment**: Set up alerting for the symptoms listed above so you catch regressions early

---

## Difficulty Level

**Intermediate**

This guide assumes familiarity with the framework and its core tooling. You should understand basic database concepts, configuration patterns, and be comfortable reading framework source code when needed. Prior experience with similar issues will help but is not required.

---

## Frequently Asked Questions

### Why does Laravel Reverb work locally but fail behind Nginx in production?

Local environments often connect directly to the Reverb process or use a much simpler proxy chain. Production adds SSL termination, reverse proxies, header forwarding, and public-vs-internal host separation. If Nginx or an upstream proxy fails to preserve the WebSocket upgrade request, the handshake will fail even though Reverb is healthy. That is why production failures often come from infrastructure, not broadcasting code.

### What HTTP status should I expect from a successful Reverb WebSocket handshake?

A successful WebSocket upgrade should return `101 Switching Protocols`. If you keep seeing 200, 400, 404, or 500 responses on the `/app` endpoint, the request is being handled incorrectly before the upgrade finishes. Checking for status 101 in browser devtools or proxy logs is one of the fastest ways to confirm your Nginx and Reverb configuration is finally correct.
