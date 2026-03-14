---
author: Qisthi Ramadhani
pubDatetime: 2026-03-12T07:00:00Z
modDatetime:
title: "Laravel Pulse: Production Monitoring Done Right"
featured: true
draft: true
tags:
  - laravel
  - laravel-and-php
  - devops-and-infrastructure
  - performance
  - monitoring
description: "A practical guide to setting up Laravel Pulse for production monitoring -- from installation to custom recorders, Supervisor configuration, security gates, and performance tuning. Stop flying blind in production."
faqs:
  - question: "Is Laravel Pulse safe to run in production?"
    answer: "Yes. Pulse is designed for production use with minimal overhead. Laravel Forge runs it for 2 million requests/day without sampling. Use the Redis ingest driver and enable sampling for very high-traffic apps."
  - question: "What's the difference between Pulse, Telescope, and Horizon?"
    answer: "Pulse is for lightweight production monitoring (aggregated metrics). Telescope is for detailed development debugging (individual requests/queries). Horizon is specifically for Redis queue management. Use all three together: Telescope locally, Pulse and Horizon in production."
  - question: "Does Laravel Pulse support PostgreSQL?"
    answer: "Yes. Pulse supports MySQL, MariaDB, and PostgreSQL for storage. You can use a dedicated database connection to keep Pulse data separate from your application database."
  - question: "How do I monitor multiple servers with Pulse?"
    answer: "Run the pulse:check daemon on each server via Supervisor. Each server reports its own CPU, memory, and disk metrics to the shared Pulse database. All data aggregates into a single dashboard."
  - question: "Can I create custom metrics in Laravel Pulse?"
    answer: "Yes. Create custom recorders that listen to application events or SharedBeat intervals, then build Livewire card components to display the data on your dashboard."
---

You've spent weeks optimizing queries, tuning your queue workers, and deploying behind Nginx with all the right headers. Everything looks great in staging. Then production happens.

A user reports the dashboard is "slow." Your queue jobs are silently timing out. Memory usage creeps up on server 2, but you don't notice until OOM killer does. You're flying blind -- and by the time you check the logs, the damage is done.

This is the monitoring gap that **Laravel Pulse** fills.

> **TL;DR:** Pulse gives you a real-time production dashboard with slow queries, exception trends, queue throughput, server health, and user activity -- all without the overhead of Telescope. This guide covers installation, production hardening, custom recorders, and the gotchas nobody talks about.

---

## Table of Contents

## 1. What Pulse Is (and What It's Not)

Let's get this out of the way: Pulse is **not** a replacement for Telescope, and it's **not** a queue dashboard like Horizon. They solve different problems.

| Tool | Purpose | Environment | Storage | Granularity |
|------|---------|-------------|---------|-------------|
| **Pulse** | Performance monitoring | Production | Redis + DB | Aggregated metrics |
| **Telescope** | Request-level debugging | Development | Database | Individual events |
| **Horizon** | Queue worker management | Production | Redis | Queue-specific |

**Pulse** answers questions like:
- Which routes are consistently slow this week?
- How many exceptions are trending upward?
- Is server 3's memory climbing?
- Which users are hammering the API?

**Telescope** answers: "What exact SQL query did request #48291 execute, and what was the full stack trace?"

**Horizon** answers: "How many jobs are pending on the `notifications` queue, and should I auto-scale workers?"

The sweet spot? **Use all three.** Telescope in local/staging, Pulse and Horizon in production. They complement each other perfectly.

---

## 2. Installation & First Boot

Pulse requires **MySQL, MariaDB, or PostgreSQL** for storage. If you're on SQLite (looking at you, Laravel 11 defaults), you'll need a separate database connection.

```bash
composer require laravel/pulse

php artisan vendor:publish --provider="Laravel\Pulse\PulseServiceProvider"

php artisan migrate
```

That's it. Hit `/pulse` in your browser and you'll see... a blank dashboard with some cards. Not very exciting yet. Let's fix that.

### The Three Tables

Pulse creates three tables, and understanding them matters for production:

```
pulse_entries    -- Individual events (requests, exceptions, jobs)
pulse_aggregates -- Pre-computed rollups (count, avg, max per period)
pulse_values     -- Point-in-time snapshots (server metrics, custom data)
```

The `pulse_aggregates` table is the performance trick. Instead of querying millions of raw entries, the dashboard reads pre-computed summaries. This is why Pulse stays fast even on high-traffic apps.

> **Pro Tip:** If you're running PostgreSQL (like I do for most projects), consider using a **dedicated database connection** for Pulse. This keeps your application's connection pool clean and lets you tune Pulse storage independently.

```php
// config/pulse.php
'storage' => [
    'driver' => 'database',
    'connection' => env('PULSE_DB_CONNECTION', 'pulse'),
],
```

```php
// config/database.php
'pulse' => [
    'driver' => 'pgsql',
    'host' => env('PULSE_DB_HOST', '127.0.0.1'),
    'port' => env('PULSE_DB_PORT', '5432'),
    'database' => env('PULSE_DB_DATABASE', 'pulse'),
    'username' => env('PULSE_DB_USERNAME', 'pulse_user'),
    'password' => env('PULSE_DB_PASSWORD', ''),
],
```

---

## 3. The Cards That Matter

Out of the box, Pulse ships with these cards:

### Servers Card
CPU, memory, and disk usage across all your servers. **This requires the `pulse:check` daemon** -- without it, the card stays empty.

### Slow Requests
Routes exceeding a configurable threshold (default: 1,000ms). In my experience, **lower this to 500ms** for API endpoints:

```php
// config/pulse.php
Recorders\SlowRequests::class => [
    'enabled' => env('PULSE_SLOW_REQUESTS_ENABLED', true),
    'sample_rate' => env('PULSE_SLOW_REQUESTS_SAMPLE_RATE', 1),
    'threshold' => env('PULSE_SLOW_REQUESTS_THRESHOLD', 500),
    'ignore' => [
        '#^/pulse$#',   // Don't monitor the monitor
        '#^/horizon#',  // Horizon has its own dashboard
    ],
],
```

### Slow Queries
Database queries exceeding the threshold. **This is where Pulse really shines** -- it surfaces the exact queries dragging your app down, aggregated by frequency.

```php
Recorders\SlowQueries::class => [
    'enabled' => env('PULSE_SLOW_QUERIES_ENABLED', true),
    'threshold' => env('PULSE_SLOW_QUERIES_THRESHOLD', 500),
    'highlight' => env('PULSE_SLOW_QUERIES_HIGHLIGHT', true), // Syntax highlighting
    'ignore' => [
        '/^select \* from `pulse_/i', // Ignore Pulse's own queries
    ],
],
```

> **Pro Tip:** Enable `highlight` for syntax-highlighted SQL on the dashboard. It makes slow queries much easier to read at a glance, especially when you have complex joins or CTEs.

### Slow Jobs
Queued jobs exceeding the threshold. Pair this with Horizon for the full picture -- Pulse shows *which* jobs are slow, Horizon shows *why* (pending count, throughput, failures).

### Exceptions
Trending exceptions with frequency tracking. This card alone has saved me hours of log-diving. When an exception count spikes, you see it immediately instead of waiting for user complaints.

### Application Usage
Top 10 users by request count, slow requests, and dispatched jobs. Great for identifying API abusers or power users who need optimization love.

### Queues
Overall queue throughput -- jobs processed, failed, and pending. A high-level view that complements Horizon's granular queue management.

### Cache
Hit/miss ratios globally and per-key. If your cache hit rate drops below 90%, something changed -- a deployment cleared the cache, a new feature isn't caching properly, or keys are expiring too fast.

---

## 4. Production Hardening

This is where most tutorials stop. Don't stop here.

### 4.1 Authorization Gate

By default, Pulse is **only accessible in `local` environment**. In production, you need an explicit gate:

```php
// app/Providers/AppServiceProvider.php
use App\Models\User;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::define('viewPulse', function (User $user) {
        return $user->hasRole('super-admin');
        // Or: return in_array($user->email, ['you@example.com']);
    });
}
```

Don't skip this. I've seen staging dashboards accidentally exposed because someone deployed with `APP_ENV=production` but forgot the gate.

### 4.2 The `pulse:check` Daemon

The Servers card won't show data without this daemon running. Use **Supervisor** to keep it alive:

```ini
; /etc/supervisor/conf.d/pulse.conf
[program:pulse]
process_name=%(program_name)s
command=php /var/www/html/artisan pulse:check
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/pulse.log
stopwaitsecs=3600
```

Then reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start pulse
```

> **Pro Tip:** If you're running multiple servers, deploy this Supervisor config to **every server** you want to monitor. Each instance of `pulse:check` reports its own host metrics to the shared database.

### 4.3 Graceful Restarts on Deploy

Add this to your deployment script (Envoy, Deployer, or CI/CD pipeline):

```bash
php artisan pulse:restart
```

This signals the daemon to pick up new code changes after deployment. Pulse stores the restart signal in cache, so make sure your cache driver is configured correctly.

A typical deploy script addition:

```bash
# deploy.sh
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan pulse:restart    # <-- Don't forget this
php artisan queue:restart
php artisan horizon:terminate
```

### 4.4 Redis Ingest Driver

The default `storage` ingest driver writes directly to the database after each response. For high-traffic apps, switch to Redis:

```php
// config/pulse.php
'ingest' => [
    'driver' => env('PULSE_INGEST_DRIVER', 'redis'),
    'redis' => [
        'connection' => env('PULSE_REDIS_CONNECTION', 'default'),
        'chunk' => env('PULSE_REDIS_CHUNK', 1000),
    ],
],
```

With Redis ingest, data flows: **Request -> Redis stream -> `pulse:work` daemon -> Database**.

This means you need *another* Supervisor process:

```ini
; /etc/supervisor/conf.d/pulse-worker.conf
[program:pulse-worker]
process_name=%(program_name)s
command=php /var/www/html/artisan pulse:work
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/pulse-worker.log
stopwaitsecs=3600
```

**Important:** Only run **one** `pulse:work` process. Multiple workers on the same Redis stream will cause duplicate entries. This is different from queue workers where you *want* concurrency.

### 4.5 Sampling for High Traffic

If you're processing millions of requests daily, you don't need to record every single one. Enable sampling:

```php
// config/pulse.php
Recorders\UserRequests::class => [
    'enabled' => true,
    'sample_rate' => env('PULSE_USER_REQUESTS_SAMPLE_RATE', 0.1), // 10%
],

Recorders\SlowRequests::class => [
    'enabled' => true,
    'sample_rate' => env('PULSE_SLOW_REQUESTS_SAMPLE_RATE', 1), // Keep 100% for slow ones
    'threshold' => 500,
],
```

Notice the strategy: sample aggressively on high-volume metrics (user requests) but keep 100% recording on things that matter most (slow requests, exceptions). You want to catch *every* slow query, even if you only sample 10% of total traffic.

> **Pro Tip:** Laravel Forge runs Pulse with 2 million requests/day and **no sampling**. Don't prematurely optimize -- only enable sampling when you actually see performance degradation from Pulse itself.

---

## 5. Custom Recorders: Track What Matters to You

The built-in cards cover the basics, but your application has domain-specific metrics that matter. Here's how to build custom recorders.

### Example: Tracking API Response Times by Client

Say you have multiple API clients (mobile app, partner integrations, internal tools) and you want to know which client experiences the worst latency.

**Step 1: Create the Recorder**

```php
// app/Pulse/Recorders/ApiClientLatency.php
namespace App\Pulse\Recorders;

use Illuminate\Http\Client\Events\ResponseReceived;
use Laravel\Pulse\Facades\Pulse;

class ApiClientLatency
{
    public string $listen = \Illuminate\Foundation\Http\Events\RequestHandled::class;

    public function record(\Illuminate\Foundation\Http\Events\RequestHandled $event): void
    {
        $request = $event->request;
        $response = $event->response;

        // Identify the client from API key or header
        $clientName = $request->header('X-Client-Name', 'unknown');

        if ($clientName === 'unknown') {
            return;
        }

        $duration = defined('LARAVEL_START')
            ? (microtime(true) - LARAVEL_START) * 1000
            : 0;

        Pulse::record(
            type: 'api_client_latency',
            key: $clientName,
            value: (int) $duration,
        )->avg()->max()->count();
    }
}
```

**Step 2: Register It**

```php
// config/pulse.php
'recorders' => [
    // ... existing recorders
    \App\Pulse\Recorders\ApiClientLatency::class => [
        'enabled' => env('PULSE_API_CLIENT_LATENCY_ENABLED', true),
    ],
],
```

**Step 3: Create the Dashboard Card**

```php
// app/Livewire/Pulse/ApiClientLatencyCard.php
namespace App\Livewire\Pulse;

use Illuminate\Contracts\Support\Renderable;
use Laravel\Pulse\Livewire\Card;
use Livewire\Attributes\Lazy;
use Laravel\Pulse\Facades\Pulse;

#[Lazy]
class ApiClientLatencyCard extends Card
{
    public function render(): Renderable
    {
        [$clients, $time, $runAt] = $this->remember(fn () => [
            Pulse::aggregate('api_client_latency', ['avg', 'max', 'count'], $this->periodAsInterval()),
        ]);

        return view('livewire.pulse.api-client-latency', [
            'clients' => $clients,
            'time' => $time,
            'runAt' => $runAt,
        ]);
    }
}
```

```blade
{{-- resources/views/livewire/pulse/api-client-latency.blade.php --}}
<x-pulse::card :cols="$cols" :rows="$rows" :class="$class" wire:poll.5s="">
    <x-pulse::card-header name="API Client Latency" title="Response times by API client">
        <x-slot:icon>
            <x-pulse::icons.signal />
        </x-slot:icon>
    </x-pulse::card-header>

    <x-pulse::scroll :expand="$expand">
        @if ($clients->isEmpty())
            <x-pulse::no-results />
        @else
            <x-pulse::table>
                <colgroup>
                    <col width="100%" />
                    <col width="0%" />
                    <col width="0%" />
                    <col width="0%" />
                </colgroup>
                <x-pulse::thead>
                    <tr>
                        <x-pulse::th>Client</x-pulse::th>
                        <x-pulse::th class="text-right">Count</x-pulse::th>
                        <x-pulse::th class="text-right">Avg</x-pulse::th>
                        <x-pulse::th class="text-right">Max</x-pulse::th>
                    </tr>
                </x-pulse::thead>
                <tbody>
                    @foreach ($clients as $client)
                        <tr wire:key="{{ $client->key }}">
                            <x-pulse::td>{{ $client->key }}</x-pulse::td>
                            <x-pulse::td class="text-right text-gray-700 dark:text-gray-300">
                                {{ number_format($client->count) }}
                            </x-pulse::td>
                            <x-pulse::td class="text-right text-gray-700 dark:text-gray-300">
                                {{ number_format($client->avg) }}ms
                            </x-pulse::td>
                            <x-pulse::td class="text-right text-gray-700 dark:text-gray-300">
                                {{ number_format($client->max) }}ms
                            </x-pulse::td>
                        </tr>
                    @endforeach
                </tbody>
            </x-pulse::table>
        @endif
    </x-pulse::scroll>
</x-pulse::card>
```

**Step 4: Add to Dashboard**

```bash
php artisan vendor:publish --tag=pulse-dashboard
```

```blade
{{-- resources/views/vendor/pulse/dashboard.blade.php --}}
<x-pulse>
    <livewire:pulse.servers cols="full" />

    <livewire:pulse.usage cols="4" rows="2" />
    <livewire:pulse.queues cols="4" />
    <livewire:pulse.cache cols="4" />

    <livewire:pulse.slow-requests cols="6" />
    <livewire:pulse.slow-queries cols="6" />

    <livewire:pulse.exceptions cols="6" />
    <livewire:pulse.api-client-latency cols="6" rows="2" />

    <livewire:pulse.slow-jobs cols="6" />
    <livewire:pulse.slow-outgoing-requests cols="6" />
</x-pulse>
```

### Example: Daily Dependency Check

This recorder runs once per day and records how many outdated Composer packages you have:

```php
// app/Pulse/Recorders/OutdatedDependencies.php
namespace App\Pulse\Recorders;

use Illuminate\Events\SharedBeat;
use Laravel\Pulse\Facades\Pulse;

class OutdatedDependencies
{
    public string $listen = SharedBeat::class;

    public function record(SharedBeat $event): void
    {
        // Only run once per day
        if ($event->time->second !== 0 || $event->time->minute !== 0 || $event->time->hour !== 2) {
            return;
        }

        $output = shell_exec('cd ' . base_path() . ' && composer outdated -D -f json 2>/dev/null');
        $packages = json_decode($output, true)['installed'] ?? [];

        Pulse::set('outdated_deps', 'count', count($packages));
        Pulse::set('outdated_deps', 'packages', json_encode(
            collect($packages)->map(fn ($p) => [
                'name' => $p['name'],
                'current' => $p['version'],
                'latest' => $p['latest'],
            ])->take(20)->toArray()
        ));
    }
}
```

Now you'll know when dependencies drift without running `composer outdated` manually.

---

## 6. User Resolution: Show Names, Not IDs

By default, Pulse shows user IDs in the Application Usage card. Fix that:

```php
// app/Providers/AppServiceProvider.php
use Laravel\Pulse\Facades\Pulse;

public function boot(): void
{
    Pulse::user(fn ($user) => [
        'name' => $user->name,
        'extra' => $user->email,
        'avatar' => $user->avatar_url ?? 'https://ui-avatars.com/api/?name=' . urlencode($user->name),
    ]);
}
```

This transforms the dashboard from a wall of UUIDs into something you can actually read.

---

## 7. Data Retention & Cleanup

Pulse retains 7 days of data by default. For production, schedule cleanup:

```php
// app/Console/Kernel.php (or routes/console.php in Laravel 11+)
use Illuminate\Support\Facades\Schedule;

Schedule::command('pulse:clear --type=all --force')
    ->weeklyOn(1, '03:00')  // Every Monday at 3 AM
    ->withoutOverlapping();
```

Or if you want more granular control:

```php
// Keep entries for 7 days, but keep aggregates for 30 days
Schedule::command('pulse:clear --type=entries --force')->daily();
Schedule::command('pulse:clear --type=aggregates --force')->monthly();
```

For PostgreSQL users, consider partitioning the `pulse_entries` table by date if your data volume is high. This makes cleanup near-instant (drop partition vs. DELETE query).

---

## 8. Docker & Container Deployments

If you're running containers (and you should be -- I've written about [Docker Alpine for Laravel](/posts/deploy-laravel-octane-alpine-linux) before), you need to handle the `pulse:check` and `pulse:work` daemons differently.

### Option A: Sidecar Container

```yaml
# docker-compose.yml
services:
  app:
    build: .
    command: php artisan octane:start --host=0.0.0.0 --port=8000

  pulse-check:
    build: .
    command: php artisan pulse:check
    restart: unless-stopped

  pulse-worker:
    build: .
    command: php artisan pulse:work
    restart: unless-stopped
```

### Option B: Supervisor Inside Container

```ini
; supervisord.conf
[supervisord]
nodaemon=true

[program:octane]
command=php /var/www/html/artisan octane:start --host=0.0.0.0 --port=8000
autorestart=true

[program:pulse-check]
command=php /var/www/html/artisan pulse:check
autorestart=true

[program:pulse-worker]
command=php /var/www/html/artisan pulse:work
autorestart=true
```

I prefer Option A (sidecar) because each process gets its own resource limits and health checks. If `pulse:check` crashes, it doesn't take your web server down with it.

---

## 9. Gotchas Nobody Tells You

### 9.1 Octane + Storage Ingest = Trouble

If you're using Laravel Octane with the default `storage` ingest driver, you might see **worse performance as you add CPU cores**. This is counterintuitive and caused by lock contention on the database writes.

**Fix:** Switch to the Redis ingest driver. Always. If you're running Octane, there's no reason not to use Redis ingest.

### 9.2 One `pulse:work` Process Only

Unlike queue workers where more processes = more throughput, running multiple `pulse:work` processes causes **duplicate entries**. Pulse doesn't use Redis consumer groups (yet). Stick to one.

### 9.3 Cache Driver Matters for Restarts

The `pulse:restart` command stores a signal in cache. If you're using the `array` cache driver (or if your cache is misconfigured), restarts silently fail. The daemon keeps running old code.

**Fix:** Use Redis, Memcached, or database cache driver in production. You should already be doing this, but it catches people during "quick" deployments.

### 9.4 Don't Monitor the Monitor

Add Pulse's own routes to the ignore list. Otherwise, every dashboard refresh generates slow request entries, creating a feedback loop:

```php
Recorders\SlowRequests::class => [
    'ignore' => [
        '#^/pulse$#',
        '#^/livewire#',
    ],
],
```

### 9.5 Time Zone Awareness

Pulse stores timestamps in UTC. If your dashboard shows spikes at unexpected times, remember to mentally convert. Your 2 AM maintenance window looks like a 7 PM spike in UTC (for WIB/Asia Jakarta).

---

## 10. The Complete Production Checklist

Before you go live with Pulse, run through this:

- [ ] **Authorization gate** configured in `AppServiceProvider`
- [ ] **Dedicated database connection** (optional but recommended for PostgreSQL users)
- [ ] **Redis ingest driver** enabled (mandatory for Octane, recommended for all)
- [ ] **Supervisor configs** deployed for `pulse:check` and `pulse:work`
- [ ] **Deploy script** includes `php artisan pulse:restart`
- [ ] **Sampling** configured for high-volume recorders (if needed)
- [ ] **Ignore patterns** set to exclude Pulse/Horizon/health-check routes
- [ ] **Slow request threshold** lowered to 500ms (or your SLA target)
- [ ] **User resolution** configured to show names and avatars
- [ ] **Data retention** scheduled via `pulse:clear`
- [ ] **Dashboard layout** customized with the cards you actually need

---

## Wrapping Up

Pulse isn't glamorous. It doesn't have the deep debugging power of Telescope or the queue intelligence of Horizon. What it does is give you **always-on visibility** into your production application with minimal overhead.

The best monitoring setup is one you actually look at. Pulse's dashboard is clean enough that you'll check it daily -- and that habit alone will catch problems before your users do.

If you're already running Horizon for queues, adding Pulse takes 15 minutes. If you're running nothing... well, you just read the guide. No more excuses.

---

*Running Pulse alongside Octane and PostgreSQL? I've covered both extensively -- check out the [Laravel Octane Mastery](/posts/hp-octane-swole-01-introduction-to-laravel-octane-swoole) series and the [Supercharging Laravel with PostgreSQL](/posts/laravel-postgres-1-beyond-eloquent-think-like-a-database) series for the full production stack.*
