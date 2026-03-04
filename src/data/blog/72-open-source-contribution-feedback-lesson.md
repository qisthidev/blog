---
author: Qisthi Ramadhani
pubDatetime: 2025-09-07T00:00:00.000Z
title: "More Than Code: The Humbling Lesson from My Second Open Source Contribution"
slug: open-source-contribution-feedback-lesson
featured: false
draft: true
tags:
  - open-source
description: "This post reflects on the learning experience from a second open-source contribution that initially required revision. It highlights how constructive feedback and discovering existing code patterns are invaluable parts of the developer growth process."
---

A maintainer reviewed my pull request and left a comment that stopped me in my tracks:

> There are already a ctrl+tab implementation, if the ctrl+shift+[] is needed we can hook it up with the existing implementation which also has some ui.
>
> Your PR is also messing with the current ctrl+tab stuff.

I paused and re-read the comment. Embarrassingly, I had no idea a `Ctrl+Tab` switcher even existed in the browser. I had been so focused on implementing _my_ solution that I failed to fully explore the application's existing features.

I immediately tried it, and sure enough, pressing `Ctrl+Tab` brought up a neat UI for cycling through tabs. My implementation was not only redundant, but it also interfered with this established system.

---

## The Real Value of Contributing

This experience was a powerful "Today I Learned" moment for me. But the lesson wasn't just about a keyboard shortcut. It was a stark reminder that **contributing to open source is a dialogue, not a monologue.**

My first contribution was a clean win, but this second attempt taught me something far more critical: the importance of understanding the existing landscape of a project before adding to it. It drove home the point that open source isn't just about writing code and pushing it into the world. It's about:

- **Learning the Ecosystem:** You're stepping into a world with its own history, conventions, and hidden corners. Taking the time to explore and understand the work that has come before is crucial.
- **Boosting Your Knowledge:** By getting that feedback, my knowledge of the application grew. I discovered a feature I would have otherwise missed, simply by trying to contribute.
- **Collaboration Over Code:** The goal is to improve the project _together_. The maintainer's feedback wasn't a rejection; it was an invitation to integrate my idea into the existing, better system.

This journey is solidifying my belief that open source is one of the most effective ways to grow as a developer. You're exposed to different perspectives, forced to read and understand unfamiliar code, and you learn things about the world of software you simply wouldn't know otherwise.

My pull request may not have been merged as-is, but the knowledge I gained from the experience was worth so much more. Now, I'm closing my [pull request](https://github.com/the-ora/browser/pull/13).
