---
author: Qisthi Ramadhani
pubDatetime: 2025-09-12T00:00:00.000Z
title: "Kelas Pakar: Why Activists Need Math — Turning Opinions into Impact"
featured: false
draft: false
tags:
  - civic-literacy
  - series-kelas-pakar
description: "Applied mathematician Barry Sianturi (Imperial College London) makes the case that activism becomes sharper and more effective when grounded in mathematical thinking. From defining terms to mapping variables and testing assumptions, he shows how math elevates critique into constructive policy influence."
---

Why do some sharp takes fizzle while others change policy? Often, it’s not passion that’s missing—it’s structure. If you want your critique to persuade decision-makers (and voters), you need more than a loud mic; you need a clear model.

In this Kelas Pakar session, applied mathematician Barry Sianturi (Imperial College London) argues that mathematical thinking is the missing superpower behind effective activism. He shows how to move from “hot takes” to proposals that actually map to how governments tax, measure, and implement.

> “If you want stronger critiques of running policies, you have to learn mathematics.” — Barry Sianturi

---

## 1) Define Before You Debate: The Power of Precise Terms

Policy runs on definitions. Public debates, not so much. Barry starts with a classic slogan: “Tax the rich.” Sounds simple—until you ask “who counts as rich?”

> “Even the term ‘rich’ is highly debatable—income vs. assets, which assets, how do you value them?” — Barry Sianturi

Consider three common misfires:

- “High income = rich.” But many wealthy people report little income while holding large assets.
- “Tax wealth directly.” Which wealth? Liquid vs. illiquid, realized vs. unrealized gains, and with what valuation schedule?
- “Just increase rates.” Increase which rate—income, capital gains, property, inheritance? Each has different incidence and administrative complexity.

Mathematical thinking starts by locking definitions:

- Income: wage, dividends, realized capital gains.
- Wealth: a bundle of assets, each with its own valuation rules and liquidity constraints.
- Thresholds: explicit cutoffs (e.g., top 1% by net worth) tied to data sources.

Without this step, critiques float; with it, they land on actual policy levers.

---

## 2) Break Problems Into Variables: From Slogans to Models

Barry’s core move is decomposition: identify the variables before reaching a conclusion.

> “With math, you dissect the variables involved, combine them, and check for contradictions with your goals.” — Barry Sianturi

For a wealth tax discussion, minimally consider:

- Definition variables: net worth (assets − liabilities), exemptions, valuation frequency.
- Behavioral variables: avoidance, migration, asset reclassification.
- Administrative variables: audit capacity, data sources, cost of enforcement.
- Outcome variables: revenue, inequality indices, investment effects.

This “variables first” approach exposes trade-offs early and keeps debates honest about what’s feasible.

---

## 3) Align Means and Ends: Avoid Policy–Goal Contradictions

The punchline of many online debates is misalignment: the tool can’t produce the stated outcome. Barry’s fix is simple—map means to ends, then test for contradictions.

> “Ask if your chosen definitions and instruments actually achieve your redistribution goal—or create side effects that undermine it.” — Barry Sianturi

Example:

- Goal: redistribute concentrated wealth.
- Instrument A: raise top marginal income tax.
- Problem: catches high earners, not low-income high-wealth households; might miss inheritance or unrealized gains.
- Instrument B: inheritance tax with generous exemptions.
- Effect: targets intergenerational transfers more directly with fewer liquidity issues than an annual wealth tax.

Mathematical thinking doesn’t pick winners for you—it makes mismatches obvious before they become policy failures.

---

## 4) From Opinion to Evidence: Test, Tally, and Iterate

Barry isn’t prescribing heavy math; he’s advocating structured reasoning with basic tools:

- Ratios and comparisons: who bears what share under different thresholds?
- Back-of-the-envelope revenue estimates: orders of magnitude catch wishful thinking.
- Counterexamples: can a simple scenario falsify your claim?
- Sensitivity checks: what changes if a variable shifts (e.g., asset valuation by ±10%)?

> “To raise the quality of critique and push effective change, learn to analyze variables, do the arithmetic, and read the literature.” — Barry Sianturi

This is how you turn a moral intuition into a practical case.

---

## 5) Knowledge + Tools: Math Is Necessary, Not Sufficient

Barry cautions against a common confusion: math skill alone doesn’t guarantee good opinions. You still need domain knowledge—economics, policy design, environmental science, etc.

> “Mathematics is a prerequisite to sharpen critique—but not sufficient. You also need correct premises and domain concepts.” — Barry Sianturi

Practical pairing:

- Learn the policy domain’s core concepts (e.g., tax incidence, elasticity, enforcement).
- Use math thinking to validate whether your premises cohere and are measurable.

Together, they produce critiques that are both principled and implementable.

---

## Personal Take: How I Apply This in Tech and Civic Work

As a full‑stack developer (Laravel/React) who publishes civic content, Barry’s approach mirrors how we build reliable systems.

- Requirements = Definitions. Ambiguous “the system should be fast” is like “tax the rich.” Define SLOs: p95 < 200 ms, throughput N rps, error rate < 0.1%. In policy, define “wealth,” “income,” and thresholds with equal precision.
- Variables and models. In performance, we map variables—DB latency, cache hit rate, network overhead. In activism, map enforcement capacity, avoidance behaviors, valuation frequency. You can’t optimize what you don’t map.
- Guardrails via falsification. We write tests to break our assumptions. In public critique, seek counterexamples that would falsify your claim (e.g., a wealthy-low-income edge case).
- Sensitivity analysis as “what-if” profiles. In infra, we run load tests with variable concurrency. In policy, estimate revenue under conservative, base, and optimistic assumptions; stress with ±10–20% valuation shifts.

A simple four-step framework I use for civic posts and data notes:

1. Define the key terms and units of measure.
2. List the variables and the relationships you’re assuming.
3. Run back-of-the-envelope numbers to bound reality.
4. Invite falsification: “What data would prove this wrong?”

It keeps my arguments honest—and ship‑ready.

---

## Conclusion

Activism moves faster when thinking is tighter. Mathematical reasoning gives you the structure to define terms, map variables, align means to ends, and test claims against reality. That’s how critiques turn into credible proposals—and credible proposals into policy.

> “Dream big—but measure precisely.” — Adapted to Barry’s spirit

What public claim have you seen lately that would change dramatically if we clarified definitions and ran a simple numbers check? Watch the full Kelas Pakar episode [Aktivis Juga Perlu Belajar Matematika](https://youtu.be/5fIwf4pdJp4) and try Barry’s four steps on it today.
