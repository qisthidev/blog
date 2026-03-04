---
author: Qisthi Ramadhani
pubDatetime: 2025-07-09T00:00:00.000Z
title: "Rebuilding Laravel's `old()` and `@error` Magic in Hypervel — The Real Way It Works"
featured: false
draft: false
tags:
  - hypervel
  - laravel
  - forms
  - validation
  - sessions
  - blade
  - laravel-and-php
description: "Learn how to recreate Laravel's form error and old input behavior in Hypervel, a coroutine-native PHP framework. This guide walks through validation, session flashing, and displaying errors in Blade views without hidden magic."
---

Laravel developers are used to things “just working” — form validation, error messages, and input retention all feel seamless. But when you start building with [**Hypervel**](https://hypervel.dev) — a Laravel-inspired, coroutine-native PHP framework — you'll quickly realize that **this magic needs a manual touch**.

In this guide, I'll show you how I **fully recreated Laravel's form UX in Hypervel**, with working validation, session flashing, and Blade rendering — and zero Laravel internals.

---

## 🧩 What Laravel Does Silently

In Laravel, when you do:

```php
$request->validate([
    'email' => 'required|email',
]);
```

It:

- Validates the input
- On failure, redirects back automatically
- Flashes old input + error messages
- Injects them into Blade as `old('email')` and `@error('email')`

In Hypervel, **you get control, not magic** — so we'll build it all step-by-step.

---

## ✅ Final Working Hypervel Setup

### 📂 `LoginController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use Hypervel\Http\Request;
use Hypervel\Support\Facades\Auth;
use Hypervel\Support\Facades\Validator;
use Psr\Http\Message\ResponseInterface;
use Hypervel\Support\MessageBag;

class LoginController
{
    public function show(): ResponseInterface
    {
        $errors = $this->errors();
        $old = $this->old();

        return view('auth.login', compact('errors', 'old'));
    }

    public function store(Request $request): ResponseInterface
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'exists:users,email'],
            'password' => ['required', 'min:2'],
        ]);

        if ($validator->fails()) {
            session()->flash('_errors', $validator->errors());
            session()->flash('_old_input', $request->all());

            return response()->redirect(url()->previous());
        }

        if (Auth::attempt($validator->validated())) {
            $request->session()->regenerate();
            return response()->redirect('/dashboard');
        }

        session()->flash('_errors', ['email' => ['Invalid credentials.']]);
        session()->flash('_old_input', $request->all());

        return response()->redirect(url()->previous());
    }

    private function errors(): MessageBag
    {
        $errors = session()->get('_errors', []);
        return $errors instanceof MessageBag ? $errors : new MessageBag($errors);
    }

    private function old(): array
    {
        return session()->get('_old_input', []);
    }
}
```

---

### 🧾 Blade View Snippet

```blade
<input type="email" name="email" value="{{ $old['email'] ?? '' }}">
@if ($errors->has('email'))
    <p class="text-red-500">{{ implode(', ', $errors->get('email')) }}</p>
@endif
```

You can build rich Tailwind layouts, password visibility toggles, and dynamic validations — all while still manually controlling the state via `$old` and `$errors`.

---

## 🧠 Key Takeaways

| Feature      | Laravel                     | Hypervel                               |
| ------------ | --------------------------- | -------------------------------------- |
| `old()`      | Helper with session binding | Manual: `session()->get('_old_input')` |
| `@error()`   | Blade directive             | Use `$errors->has()` and `get()`       |
| `validate()` | Auto-redirects on failure   | Use `Validator::make()` and flash      |
| `MessageBag` | Auto-injected               | Must be constructed manually           |

---

## 🛠 Tips for Further Optimization

- Create a `FormState` helper to wrap `errors()` and `old()`.
- Add macros like `response()->withValidation()` for consistency.
- Build a `BaseController` that handles all of this once.
