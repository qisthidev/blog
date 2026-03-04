---
author: Qisthi Ramadhani
pubDatetime: 2025-07-26T00:00:00.000Z
title: "How to Start a Laravel Project for Maximum Speed & Maintainability?"
featured: false
draft: false
tags:
  - laravel
  - laravolt
  - introduction
  - laravel-and-php
  - series-the-laravolt-way
description: "Learn the Laravolt way to kickstart your Laravel projects with enterprise-grade quality standards. This beginner-friendly guide covers everything from installation to database design, model relationships, and testing—all designed to help you build robust applications quickly and efficiently."
faqs:
  - question: "Why should I use Laravolt instead of raw Laravel?"
    answer: "Laravolt provides an enterprise-ready foundation with pre-configured ACL, UI components, and strict quality standards (PHPStan, Pint), saving you hours of initial setup time."
  - question: "What are ULIDs and why use them?"
    answer: "ULIDs are Universally Unique Lexicographically Sortable Identifiers. Unlike auto-incrementing integers, they are secure, sortable by time, and safe for distributed systems without ID collisions."
---

Building a Laravel application can feel overwhelming when you're starting out. Where do you begin? What tools should you use? How do you ensure your code is maintainable as your project grows?

As the primary maintainer of Laravolt, I've helped countless developers build robust applications quickly and efficiently. In this beginner-friendly guide, I'll walk you through the exact process I use to start new projects—a proven approach that saves time and ensures quality from day one.

Whether you're new to Laravel or some of these concepts, I'll explain everything step by step, including the "why" behind each decision. By the end of this article, you'll have a solid foundation for your news portal project and understand the principles that make applications both fast to build and easy to maintain.

This is the Laravolt way—designed for developers at any level who want to build something great.

## Step 1: The Foundation - Installing Laravel and Laravolt

Every great project starts with a clean slate. We'll begin with the familiar command to create a new Laravel application.

```bash
laravel new news-portal
cd news-portal
```

{/*
screencast note:
1. Setup default editor with `IGNITION_EDITOR` and `DEBUGBAR_EDITOR`
*/}

Now, here is the first and most crucial step in the Laravolt way. Before we write a single line of application code, we install the platform. This ensures that the foundational, enterprise-ready components are in place from the very beginning.

```bash
composer require laravolt/laravolt
```

With the package downloaded, we run the **Laravolt** installation command:

```bash
php artisan laravolt:install
```

This command is more than just a setup script; it's the first step in layering a proven, opinionated structure onto your application. It publishes essential configuration files, registers service providers, and prepares your project for the robust features we'll be using later, such as the integrated Access Control List (ACL) and UI components.

Finally, let's run our initial migration (with `fresh` because there are incompatible changes) and create the first administrative user so we can log in and see our progress immediately.

```bash
php artisan migrate:fresh
php artisan laravolt:admin Administrator admin@laravolt.dev secret
```

{/*
screencast note:
1. Run `php artisan icons:cache` for better performance on local, boost response time to 50 - 70%
2. Show current code coverage, it's important for maintaining code quality, should be 100%.
   1. Run `composer test`
   2. Examine `phpunit.xml`
   3. Check `build` folder
   4. Tell about `phpunit-*-result.xml` for integration with code quality tools such as SonarQube
*/}

The admin user will be created with a ULID (you'll see something like `01k0xzbnaz198vk7pfxbmh0xfc`), and you can immediately log in at `/auth/login`.

If you start your local server (`composer dev` or `php artisan serve`) and navigate to `/auth/login`, you'll find a fully functional login screen ready to go. You've already saved hours of work.

## Step 2: The Blueprint - Defining Our Data Structure

With the platform installed, our next step is to define the data structure for our news portal. Think of this as creating the blueprint for our database tables.

We'll need four main pieces of data:

- **User:** People who can log in (Admin, Writer, Member) - already set up by Laravolt
- **Topic:** Categories for news articles (like "Technology," "Business," "Sports")
- **Post:** The news articles themselves
- **Comment:** Comments that users leave on articles

### Creating Models, Migrations, and Factories (The Smart Way)

Instead of creating each file separately, Laravel gives us a shortcut. We can create the model, migration, and factory all at once using the `-mf` flags:

- `-m` creates a migration file (defines the database table structure)
- `-f` creates a factory file (helps us generate test data later)

```bash
php artisan make:model Topic -mf
php artisan make:model Post -mf
php artisan make:model Comment -mf
```

**What just happened?** Each command created three files for us:

- A model file (like `app/Models/Topic.php`) - this represents our data
- A migration file (like `database/migrations/create_topics_table.php`) - this creates the database table
- A factory file (like `database/factories/TopicFactory.php`) - this helps create fake data for testing

### Understanding Key Decisions (Beginner-Friendly Explanations)

Before we write our migration code, let's understand two important concepts that will help you make good decisions in your own projects.

**Primary Keys: Using ULIDs for Modern Applications**

Every database table needs a unique identifier for each row. While Laravel uses simple numbers (1, 2, 3, 4...) by default, Laravolt uses ULIDs (Universally Unique Lexicographically Sortable Identifiers) for our project.

**Why ULIDs?**

- **Unique everywhere:** No risk of ID conflicts when merging data
- **Sortable:** They contain timestamps, so newer records have "larger" IDs
- **Secure:** Users can't guess URLs or determine your database size
- **Future-proof:** Perfect for APIs and distributed systems

Laravolt has already configured ULIDs in the User model, making this easy to implement across our application!

**Soft Deletes: The "Undo" Button for Data**

Sometimes users accidentally delete important data. Instead of permanently removing it from the database, Laravel can mark it as "deleted" while keeping it around. Think of it like moving a file to your computer's trash—it's gone from view but can be restored if needed.

For our news portal, we'll use soft deletes on articles because losing a published article would be a big problem. Comments and topics can be permanently deleted since they're less critical.

**The Beginner's Rule:** Start simple, add complexity only when you need it.

### Writing Our Migration Code

Now let's fill in our migration files. These tell Laravel exactly how to structure our database tables.

**Topics Migration** (the simplest one):

```php
// database/migrations/xxxx_xx_xx_xxxxxx_create_topics_table.php
public function up(): void
{
    Schema::create('topics', function (Blueprint $table) {
        $table->ulid('id')->primary();   // ULID primary key
        $table->string('name');          // Topic name (e.g., "Technology")
        $table->timestamps();            // created_at and updated_at
        $table->softDeletes();           // Safe deletion
    });
}
```

**Posts Migration** (our main content):

```php
// database/migrations/xxxx_xx_xx_xxxxxx_create_posts_table.php
public function up(): void
{
    Schema::create('posts', function (Blueprint $table) {
        $table->ulid('id')->primary();             // ULID primary key
        $table->foreignUlid('author_id')->constrained('users');    // Who wrote it
        $table->foreignUlid('topic_id')->constrained('topics');    // What category
        $table->string('title');                    // Article title
        $table->text('body');                       // Article content
        $table->timestamps();                       // When created/updated
        $table->softDeletes();                      // Safe deletion
    });
}
```

**Comments Migration**:

```php
// database/migrations/xxxx_xx_xx_xxxxxx_create_comments_table.php
public function up(): void
{
    Schema::create('comments', function (Blueprint $table) {
        $table->ulid('id')->primary();                          // ULID primary key
        $table->foreignUlid('post_id')->constrained('posts');   // Which article
        $table->foreignUlid('author_id')->constrained('users'); // Who commented
        $table->text('body');                                   // Comment text
        $table->timestamps();                                   // When posted
        $table->softDeletes();                                  // Safe deletion
    });
}
```

**Understanding ULIDs and Foreign Keys:**

- `ulid('id')->primary()` creates a ULID primary key (looks like: 01ARZ3NDEKTSV4RRFFQ69G5FAV)
- `foreignUlid()` creates foreign key relationships that work with ULID primary keys
- ULIDs are 26 characters long and are always unique, even across different databases

## Step 3: Setting Up Our Models and Relationships

Great news! Since we used the `-mf` flags earlier, our model files are already created. Now we just need to add the relationships and any special features.

**Understanding Relationships:** Think of relationships like connections between data. A post belongs to a topic, a comment belongs to a post, etc. Laravel makes these connections easy to define and use.

### Setting Up the Post Model

Let's start with our most important model—the Post. This needs ULIDs, soft deletes, and relationships:

```php
// app/Models/Post.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, HasUlids, SoftDeletes;

    // What fields can be mass-assigned (filled all at once)
    protected $fillable = [
        'title',
        'body',
        'author_id',
        'topic_id',
    ];

    // Relationships: How this model connects to others
    public function topic(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function author(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function comments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
```

### Setting Up the Topic Model

```php
// app/Models/Topic.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Topic extends Model
{
    use HasFactory, HasUlids, SoftDeletes;

    protected $fillable = ['name'];

    // A topic can have many posts
    public function posts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Post::class);
    }
}
```

### Setting Up the Comment Model

```php
// app/Models/Comment.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use HasFactory, HasUlids, SoftDeletes;

    protected $fillable = [
        'body',
        'post_id',
        'author_id',
    ];

    // A comment belongs to a post and has an author
    public function post(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function author(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
```

### Updating the User Model

Add relationships to your existing User model. Since Laravolt extends the base User model, we just need to add our custom relationships:

```php
// Update your app/Models/User.php
// Add these relationship methods
public function posts(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(Post::class, 'author_id');
}

public function comments(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(Comment::class, 'author_id');
}
```

**Note:** Laravolt has already configured the User model with `HasUlids`, so you don't need to add that trait.

### Running the Migrations

Now let's create these tables in your database:

```bash
php artisan migrate
```

**Congratulations!** You now have a fully functioning database structure for your news portal.

## Testing Your Code: A Non-Negotiable Practice

Testing isn't optional—it's mandatory for high-quality applications. Laravolt starts with comprehensive test coverage, and we must maintain this standard as we add new features. Every line of code we write should be tested to ensure reliability and prevent regressions.

**Why Testing Matters:**

- **Confidence:** Deploy changes without fear of breaking existing features
- **Documentation:** Tests serve as living documentation of how your code works
- **Refactoring Safety:** Change implementation details while keeping functionality intact
- **Team Collaboration:** New team members can understand expected behavior through tests

### Setting Up Your Testing Environment

Laravolt has already configured your testing environment, but let's ensure everything is ready:

```bash
# Create .env.testing if it doesn't exist
cp .env .env.testing
```

Update your `.env.testing` file:

```env
APP_ENV=testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

### Writing Tests for Our Models

Let's create comprehensive tests for our new models. We'll start with feature tests that cover the full functionality:

```bash
php artisan make:test TopicTest
php artisan make:test PostTest
php artisan make:test CommentTest
```

**Topic Test Example:**

```php
// tests/Feature/TopicTest.php
<?php

namespace Tests\Feature;

use App\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TopicTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_topic_with_ulid()
    {
        $topic = Topic::create(['name' => 'Technology']);

        $this->assertNotNull($topic->id);
        $this->assertEquals(26, strlen($topic->id)); // ULID length
        $this->assertEquals('Technology', $topic->name);
    }

    public function test_topic_has_posts_relationship()
    {
        $topic = Topic::factory()->create();

        $this->assertInstanceOf(
            \Illuminate\Database\Eloquent\Relations\HasMany::class,
            $topic->posts()
        );
    }

    public function test_topic_name_is_required()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);
        Topic::create([]);
    }
}
```

### Updating Your Factories for ULID

Since we're using ULIDs, we need to update our model factories. Let's create proper factories for testing:

```php
// database/factories/TopicFactory.php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class TopicFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
        ];
    }
}
```

```php
// database/factories/PostFactory.php
<?php

namespace Database\Factories;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence,
            'body' => $this->faker->paragraphs(3, true),
            'author_id' => User::factory(),
            'topic_id' => Topic::factory(),
        ];
    }
}
```

```php
// database/factories/CommentFactory.php
<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'body' => $this->faker->paragraph,
            'post_id' => Post::factory(),
            'author_id' => User::factory(),
        ];
    }
}
```

### Running Your Tests

Now let's run our tests to ensure everything works:

```bash
# Run all tests
php artisan test

# Run with coverage (requires Xdebug or PCOV)
php artisan test --coverage

# Run specific test
php artisan test --filter TopicTest
```

### Testing Your Setup (Interactive Verification)

Want to see if everything works? Let's create some test data and see ULIDs in action:

```bash
# Create a new topic using Tinker
echo '$topic = App\Models\Topic::create(["name" => "Technology"]); echo "Created topic with ULID: " . $topic->id; exit;' | php artisan tinker
```

You'll see output like:

```
Created topic with ULID: 01k0y0a0yxv58qyyytm4jjmq9g
```

Notice how the ID is a 26-character string instead of a number! This is your ULID.

## Setting Up Static Analysis for Code Quality

High-quality applications require more than just tests—they need static analysis to catch potential issues before they become problems. We'll set up tools that analyze our code without running it.

### Installing Essential Analysis Tools

Laravolt automatically includes PHPStan (via Larastan) when you install it, and Laravel Pint is included with Laravel by default. Let's configure them properly:

### Configuring PHPStan

Create a `phpstan.neon` file in your project root:

```neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    paths:
        - app/
        - database/factories/
        - database/seeders/

    # Rule level (0-9, higher is stricter)
    level: 3
```

### Configuring Laravel Pint (Optional)

Laravel Pint works perfectly out of the box with zero configuration, following Laravel's coding standards. However, if you need to customize it, create a `pint.json` file in your project root:

```json
{
  "preset": "laravel",
  "exclude": ["build", "node_modules", "storage"]
}
```

**Pro Tip:** Stick with the default Laravel preset unless you have a specific reason to change it. The Laravel team has carefully crafted these standards for consistency across all Laravel projects.

### Creating a Quality Assurance Script

Add these scripts to your `composer.json` for easy execution:

```json
{
  "scripts": {
    "test": ["@php artisan config:clear --ansi", "@php artisan test"],
    "test-coverage": "@php artisan test --coverage --min=80",
    "analyse": "./vendor/bin/phpstan analyse",
    "style-check": "./vendor/bin/pint --test",
    "style-fix": "./vendor/bin/pint",
    "quality": ["@style-check", "@analyse", "@test-coverage"]
  }
}
```

### The Laravolt Quality Standard

Now you can run comprehensive quality checks with a single command:

```bash
# Check everything: style, analysis, and tests
composer quality

# Individual commands
composer test           # Run tests
composer analyse        # Static analysis
composer style-check    # Check Laravel code style with Pint
composer style-fix      # Fix code style issues with Pint
```

**The Quality Promise:** Every feature we add must pass all these checks. This ensures:

- ✅ Code follows Laravel coding standards (via Pint)
- ✅ No static analysis errors (via PHPStan)
- ✅ Comprehensive test coverage maintained
- ✅ All tests pass

**Why Laravel Pint?** Pint is Laravel's official code style fixer, built on top of PHP CS Fixer but specifically opinionated for Laravel projects. It ensures your code follows Laravel's exact coding conventions without any configuration needed.

## What You've Accomplished

In this article, you've learned several important concepts and established professional development practices:

- ✅ **How to start a Laravel project with Laravolt** - giving you a professional foundation from day one
- ✅ **Using artisan shortcuts** - the `-mf` flags save time and prevent mistakes
- ✅ **Modern primary keys with ULIDs** - secure, unique, and sortable identifiers
- ✅ **Database design basics** - understanding tables, relationships, and foreign keys
- ✅ **Model relationships** - how to connect your data in meaningful ways
- ✅ **Soft deletes** - protecting important data from accidental loss
- ✅ **Comprehensive testing strategy** - maintaining excellent code coverage from day one
- ✅ **Static analysis setup** - catching bugs before they reach production
- ✅ **Code quality automation** - ensuring consistent, maintainable code

Most importantly, you now have a solid foundation that's ready for rapid development with **enterprise-grade quality standards**. Every decision we made—from using ULIDs for security and uniqueness to implementing comprehensive testing—was chosen to balance modern best practices with real-world maintainability.

**Bonus Benefits:**

- Your application is ready for distributed systems, APIs, and advanced features
- You have a complete quality assurance pipeline
- Future team members will thank you for the solid testing foundation
- You can refactor and add features with confidence

### Your Quality Workflow Going Forward

For every new feature you add:

1. **Write the test first** (Test-Driven Development)
2. **Implement the feature** to make the test pass
3. **Run quality checks** with `composer quality`
4. **Fix any issues** before committing code

This workflow ensures you maintain the high standards that Laravolt provides out of the box.

## What's Next?

In the next article, you'll see the real payoff of this rock-solid foundation. I'll show you **"The Laravolt Killer Feature: Build a Full Admin CRUD in 5 Minutes,"** where you'll create a complete admin interface for managing your news portal with just a few lines of code.

But here's the best part: everything we build will automatically inherit the quality standards we've established—comprehensive test coverage, static analysis, and modern architecture patterns. You'll be amazed at how fast you can move when you have confidence in your foundation.

**The Laravolt Promise:** Quality doesn't slow you down—it accelerates you.

The groundwork is done. The quality pipeline is ready. Now let's build something amazing on top of it!

---

**Technical Note:** This article has been validated with Laravel 12.21.0, PHP 8.4.10, and Laravolt 6.11.4. All code examples have been tested and verified to work as described.
