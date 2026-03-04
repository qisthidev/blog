---
author: Qisthi Ramadhani
pubDatetime: 2025-09-07T00:00:00.000Z
title: "Building Health Check Endpoints in Modern PHP Frameworks: Hyperf, Hypervel, and Webman"
featured: false
draft: false
tags:
  - php
description: "A comprehensive guide to implementing '/up' health check endpoints in three popular async PHP frameworks: Hyperf, Hypervel, and Webman. Includes code examples and best practices for improving application reliability and observability."
---

Health check endpoints are essential for maintaining the reliability and observability of web applications. They enable automated systems and developers to verify that an application and its dependencies are running as expected. In this comprehensive guide, I’ll break down the implementation of `/up` health check endpoints in three popular async PHP frameworks—Hyperf, Hypervel, and Webman—based on recent commits from my open-source repositories.

---

## Why Health Check Endpoints Matter

A health check endpoint is a lightweight HTTP route (commonly `/up` or `/health`) that returns a status indicating whether the application is operational. These endpoints are widely used by cloud platforms, load balancers, Kubernetes probes, and monitoring tools to automate service health verification. A robust health check can also include checks for database connectivity, cache systems, and other critical dependencies.

---

## 1. Hyperf: Coroutine-Powered Health Checks

**Commit Reference:** [`e09a5d2`](https://github.com/qisthidev/health-check-hyperf/commit/e09a5d2)

Hyperf is a high-performance coroutine framework for PHP, designed for building scalable, cloud-native applications. Here’s how the `/up` endpoint is implemented:

### Controller Implementation

```php
namespace App\Controller;

use Hyperf\View\RenderInterface;

class HealthUpController extends AbstractController
{
    public function __invoke(RenderInterface $render)
    {
        $checks = [];
        $exception = null;

        try {
            // Example: \Hyperf\DbConnection\Db::connection()->select('SELECT 1');
            // $checks['db'] = 'UP';

            // Example: $this->cache->set('health-check', 'up');
            // $checks['cache'] = 'UP';
        } catch (\Throwable $e) {
            $exception = $e->getMessage();
        }

        return $render->render('health-up', compact('checks', 'exception'));
    }
}
```

### Route Registration

Add this to `config/routes.php`:

```php
use App\Controller\HealthUpController;

Router::get('/up', HealthUpController::class);
```

### Blade View

The endpoint renders a Blade template (`health-up.blade.php`) with a status indicator. If `$exception` is set, the indicator turns red and displays an error message; otherwise, it shows the app is up.

**Key Points:**

- Uses Hyperf’s DI and Blade view integration.
- Exception handling ensures errors are surfaced for debugging.
- Easily extendable to check database, cache, or other services.

---

## 2. Hypervel: Laravel-Style Health Checks for Coroutine PHP

**Commit Reference:** [`7c835b6`](https://github.com/qisthidev/health-check-hypervel/commit/7c835b6)

Hypervel brings Laravel-like developer experience to coroutine PHP. The `/up` endpoint implementation closely mirrors Laravel conventions.

### Controller Implementation

```php
namespace App\Http\Controllers;

class HealthUpController
{
    public function __invoke()
    {
        $checks = [];
        $exception = null;

        try {
            // \Hypervel\Support\Facades\DB::connection()->select('SELECT 1');
            // $checks['db'] = 'UP';

            // \Hypervel\Support\Facades\Cache::put('health-check', 'OK', 60);
            // $checks['cache'] = 'UP';
        } catch (\Throwable $e) {
            if (app()->hasDebugModeEnabled()) {
                throw $e;
            }
            report($e);
            $exception = $e->getMessage();
        }

        return view('health-up', compact('checks', 'exception'));
    }
}
```

### Route Registration

In `routes/web.php`:

```php
use App\Http\Controllers\HealthUpController;

Route::get('/up', HealthUpController::class);
```

### Blade View

The view (`health-up.blade.php`) displays a green or red status indicator, with a message reflecting the health of the application.

**Key Points:**

- Follows Laravel’s controller and route patterns.
- Exception handling is debug-aware, reporting errors in production.
- Extensible for additional checks (DB, cache, etc.).

---

## 3. Webman: Fast, Minimalist Health Endpoint

**Commit Reference:** [`c2aaeae`](https://github.com/qisthidev/health-check-webman/commit/c2aaeae)

Webman is a minimalist async PHP framework built on Workerman. The health check implementation here is straightforward and efficient.

### Controller Implementation

```php
namespace app\controller;

class HealthUpController
{
    public function index()
    {
        $exception = null;

        try {
            // Add DB or Redis checks here as needed.
        } catch (\Throwable $e) {
            $exception = $e->getMessage();
        }

        $status = $exception ? 'status-down' : null;
        $message = $exception ? 'experiencing problems' : 'up';

        return <<<HTML
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Webman</title>
                <!-- Fonts and Styles omitted for brevity -->
            </head>
            <body>
                <div>
                    <div class="status-indicator $status"></div>
                    <h2>Application $message</h2>
                    <p>HTTP request received.</p>
                </div>
            </body>
            </html>
        HTML;
    }
}
```

### Route Registration

In `config/route.php`:

```php
use app\controller\HealthUpController;

Route::get('/up', [HealthUpController::class, 'index']);
```

**Key Points:**

- Directly returns HTML from the controller, no template engine required.
- Status and message adapt based on exception presence.
- Easily customizable for deeper health checks.

---

## Common Patterns & Best Practices

- **Exception Handling:** All implementations catch exceptions and reflect errors in the health endpoint, crucial for surfacing problems early.
- **Status Indicators:** Use color and messaging to communicate health visually for human viewers.
- **Extensibility:** Each implementation is ready to be extended for database, cache, or external service checks.
- **Cloud-Ready:** These endpoints are compatible with Kubernetes probes, cloud monitoring, and CI/CD pipelines.

---

## Conclusion

Implementing a `/up` health check endpoint is a best practice for any modern PHP application, especially those running in cloud or containerized environments. Whether you use Hyperf, Hypervel, or Webman, the patterns above provide a solid foundation for observability, reliability, and rapid troubleshooting.

For source code and further exploration, see the referenced commits for each framework. Feel free to extend these endpoints to cover more dependencies as your application grows.
