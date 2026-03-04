---
author: Qisthi Ramadhani
pubDatetime: 2025-11-09T00:00:00.000Z
title: "🧩 From Laravel to Go (Part 2): Thinking Clean in a Statically Typed World"
slug: flg-02-from-laravel-to-go-part-2-thinking-clean-in-a-statically-typed-world
featured: false
draft: false
tags:
  - go
  - typing
  - clean-code
  - laravel
  - craftsmanship
  - go-and-craftsmanship
  - series-from-laravel-to-go-writing-clean-craftsmanship-grade-code-in-golang
description: "Discover how Go’s static typing system enforces Clean Code principles — from self-documenting functions to safe refactoring — tailored for Laravel developers learning Golang."
---

As Laravel developers, we’ve enjoyed the flexibility of PHP’s dynamic nature.
You can pass almost anything into a function and rely on conventions, not strict contracts, to make things work.

```php
function getFullName($user) {
    return $user->first_name . ' ' . $user->last_name;
}
```

This freedom feels great — until you pass the wrong kind of data, and something explodes three layers deep in your code.
You’ve probably seen the infamous:

```text
Trying to get property 'first_name' of non-object
```

Go eliminates that category of error entirely.
In Go, **the compiler won’t even let you run code that’s not type-safe**.
That’s not just convenience — that’s *Clean Code’s* “Make it right before you make it fast” in action.

---

## 1. Go’s Type System as a Clean Code Enforcer

Uncle Bob emphasizes that **code should clearly express intent** — no surprises, no hidden behavior.
Go’s static typing is a built-in enforcer of that rule.

Every variable, function, and struct has a declared, visible type.
The compiler acts like a partner in craftsmanship, catching mistakes early — not in production.

Let’s compare a simple example:

### 🧪 Example: Function Return Types

### Laravel / PHP Example

```php
function calculateDiscount($amount, $rate) {
    return $amount * $rate;
}
```

This works fine — until someone passes strings:

```php
calculateDiscount("ten", "0.2");
```

Boom. Silent failure or weird type coercion.

### Go Example

```go
func CalculateDiscount(amount float64, rate float64) float64 {
    return amount * rate
}
```

Try passing a string?
Go stops you before you even run it.

```text
cannot use "ten" (type string) as type float64
```

That’s the compiler saying: *“This isn’t clean code yet — fix it first.”*

---

## 2. Types Communicate Intent (Better Than Comments)

In *Clean Code*, Martin warns against redundant or misleading comments.
He suggests code should be *self-documenting*.

Go’s strong, explicit types make that natural.
Take a Laravel-style helper:

```php
// Laravel/PHP
function sendNotification($data) { ... }
```

Without context, you can’t tell what `$data` should be — a string, an array, or an object?
You’d need comments or to read the implementation.

In Go:

```go
func SendNotification(message string, userID int)
```

The function signature **tells you everything you need**.
Types are documentation.
You don’t need to write:

```go
// SendNotification sends a message to a user
```

Because the code already says that.

💡 *Clean Code alignment:*

> “The code should explain itself. Comments only compensate for bad code.”

---

## 3. Small, Well-Typed Functions: The Go Way

Dynamic languages often tempt us to write **generic** functions — “one helper to rule them all.”
But in Go, explicit typing encourages smaller, more focused functions.

### Laravel/PHP Approach

```php
function getUserData($input) {
    if (is_array($input)) return $input;
    if (is_int($input)) return User::find($input);
    if ($input instanceof User) return $input->toArray();
}
```

### Go Implementation

```go
func GetUserByID(id int) (*User, error) {
    // Query user from DB
}

func GetUserData(u *User) map[string]string {
    // Convert to key-value
}
```

Each function is predictable, testable, and single-purpose.
That’s *SRP (Single Responsibility Principle)* enforced by typing.

---

## 4. No Hidden Nulls: Go Makes Failure Explicit

In PHP, `null` can sneak up on you.
You might think you’re handling a User object, but you’re really juggling ghosts.

Go takes the *Clean Code* route: **no hidden failures.**
Instead of nulls or exceptions, Go returns **values and errors** explicitly.

```go
user, err := GetUserByID(42)
if err != nil {
    log.Println("User not found:", err)
    return
}
fmt.Println("User:", user.Name)
```

Compare that to Laravel:

```php
$user = User::find(42);
if (!$user) {
    Log::info('User not found');
    return;
}
```

In Laravel, forgetting to check `$user` is easy — and dangerous.
Go’s compiler forces you to handle the `err`.
That’s *Clean Code’s* “clear boundaries” in motion — no hidden consequences.

---

## 5. Type-Driven Refactoring Feels Safe

Refactoring in dynamic PHP is often a leap of faith.
You rename a parameter or change a return type, and something silently breaks.

In Go, refactoring feels almost fearless.
The compiler won’t let you proceed until everything aligns again.

```go
func CreateInvoice(customerID int, total float64) Invoice
```

Change the signature?
Every call site that doesn’t match gets flagged. Instantly.

This is *Clean Code’s* “Make the change easy, then make the easy change.”
Static typing transforms fear-driven maintenance into craftsmanship.

---

## 6. From Loose Contracts to Real Interfaces

Laravel developers love **interfaces and dependency injection**.
But PHP interfaces are only enforced at runtime — not compile time.

In Go, interfaces are implicit.
If a type implements the methods required by an interface, it *automatically satisfies it*.
No ceremony, no inheritance chain.

Example:

```go
type Notifier interface {
    Notify(message string) error
}

type EmailService struct{}

func (e EmailService) Notify(message string) error {
    fmt.Println("Sending email:", message)
    return nil
}
```

You never need to say `implements Notifier`.
Go just *knows*.
This enforces the **Liskov Substitution Principle (LSP)** — one of Clean Code’s core object design tenets — naturally and safely.

---

## 7. Thinking Clean in Types: A Mapping Table

| Concept             | Laravel/PHP                 | Go Equivalent               | Clean Code Principle     |
| ------------------- | --------------------------- | --------------------------- | ------------------------ |
| Dynamic Variables   | `$user = ['name' => '...']` | `user := User{Name: "..."}` | Express intent clearly   |
| Duck Typing         | `if (method_exists(...))`   | Explicit interface          | Program to contracts     |
| Nullable Everything | `$user ?? null`             | `(value, error)`            | Make failures visible    |
| Loose Arrays        | Associative arrays          | Structs                     | Data has structure       |
| Casting/Coercion    | `(int) $input`              | Compiler validation         | Eliminate ambiguity      |
| Doc Comments        | `@param array $user`        | Strong types                | Code is self-documenting |

---

## 8. Clean Code Lesson: Explicit Is Kindness

Static typing might feel restrictive at first — like wearing gloves while coding.
But over time, you’ll realize it’s not restriction — it’s **guidance**.

Every Go function becomes a contract: *“Here’s what I expect, and here’s what I’ll give you.”*
That’s the highest form of Clean Code — readable, predictable, and testable by design.

> “Code should be written to minimize the chance of misunderstanding.”
> — Robert C. Martin

Go’s compiler is your first code reviewer.
It ensures your code is **honest** — that what it says, it does.

---

## Key Takeaways

* Go’s static typing makes “Clean Code” not just a philosophy, but a habit.
* Function signatures replace verbose comments — types become self-documenting.
* Errors are handled explicitly, eliminating hidden surprises.
* Refactoring becomes safe and fearless.
* Interfaces in Go express true behavioral contracts, not optional hints.

---

## Conclusion — Learning to Trust the Compiler

As Laravel developers, we’re used to flexible tools that “just work.”
Go flips the mindset — it makes you “just right.”

Static typing, clear contracts, and compiler-enforced discipline might feel rigid at first,
but they’re the building blocks of clean, maintainable software.

In the next part of this series, we’ll explore how Go’s **structs and methods** bring the *Single Responsibility Principle* (SRP) to life — the clean way.
