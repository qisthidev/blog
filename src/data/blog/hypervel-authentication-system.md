---
author: Qisthi Ramadhani
pubDatetime: 2025-06-17T00:00:00.000Z
title: "Step-by-Step Guide: Creating a Web Authentication System in Hypervel"
featured: false
draft: false
tags:
  - hypervel
  - laravel
  - authentication
  - security
  - sessions
  - tutorial
  - laravel-and-php
description: "Learn how to build a secure web authentication system using Hypervel, covering user registration, login, and session management."
---

This guide walks through the process of implementing a complete, session-based authentication system in a Hypervel application. The recent updates to the framework introduce a more robust and Laravel-like approach to handling user registration, login, and protected routes. We will cover the necessary configuration, middleware, controller logic, and Blade views to get your application security up and running.

## **Step 1: Configure Core Authentication & Session Services**

Before writing any logic, the application must be configured to use session-based authentication instead of the token-based default. You also need to enable the necessary middleware.

First, update your `config/auth.php` file to change the default guard from `jwt` to `session`.

```php
// config/auth.php
'defaults' => [
    'guard' => 'session',
    'provider' => 'users',
],
```

Next, in your `app/Http/Kernel.php` file, enable the `StartSession` middleware and register a new `guest` middleware alias. This ensures that sessions are active for web requests and provides a convenient alias for protecting routes that should only be accessible to unauthenticated users.

```php
// app/Http/Kernel.php
protected array $middlewareGroups = [
    'web' => [
        // ...
        \Hypervel\Session\Middleware\StartSession::class,
        // ...
    ],
];

protected array $middlewareAliases = [
    'throttle' => \Hypervel\Router\Middleware\ThrottleRequests::class,
    'bindings' => \Hypervel\Router\Middleware\SubstituteBindings::class,
    'signed' => \App\Http\Middleware\ValidateSignature::class,
    'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
];
```

## **Step 2: Define Authentication Routes**

With the configuration in place, define the routes for registration, login, logout, and the user dashboard in your `routes/web.php` file. Route groups are used to apply the `guest` and `auth` middleware, ensuring that only authenticated users can access the dashboard and only guests can access the login and registration pages.

```php
<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use Hypervel\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Guest routes
Route::group('/', function () {
    Route::get('register', [AuthController::class, 'createRegister'], ['as' => 'register']);
    Route::post('register', [AuthController::class, 'storeRegister']);
    Route::get('login', [AuthController::class, 'createLogin'], ['as' => 'login']);
    Route::post('login', [AuthController::class, 'storeLogin']);
}, ['middleware' => 'guest']);

// Authenticated routes
Route::group('/', function () {
    Route::get('dashboard', [AuthController::class, 'dashboard'], ['as' => 'dashboard']);
    Route::post('logout', [AuthController::class, 'logout'], ['as' => 'logout']);
}, ['middleware' => 'auth']);
```

## **Step 3: Implement Authentication Middleware**

Middleware are crucial for intercepting requests and verifying user authentication status.

**Authenticate Middleware**
Update the `app/Http/Middleware/Authenticate.php` middleware. This middleware will now throw an `AuthenticationException` when an unauthenticated user attempts to access a protected route, properly redirecting them to the login page as defined by the `unauthenticated` method.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Hypervel\Auth\AuthenticationException;
use Hypervel\Auth\Middleware\Authenticate as Middleware;
use Psr\Http\Message\ServerRequestInterface;

class Authenticate extends Middleware
{
    /**
     * Handle an unauthenticated user.
     *
     * @throws AuthenticationException
     */
    protected function unauthenticated(ServerRequestInterface $request, array $guards): void
    {
        throw new AuthenticationException('Unauthenticated.', $guards, route('login'));
    }
}
```

**Guest Middleware**
Create the new `app/Http/Middleware/RedirectIfAuthenticated.php` file. This middleware prevents already logged-in users from accessing the login or registration pages, redirecting them to the dashboard instead.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Hypervel\Support\Facades\Auth;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class RedirectIfAuthenticated
{
    /**
     * Process an incoming server request.
     */
    public function handle(ServerRequestInterface $request, Closure $next, ?string $guard = null): ResponseInterface
    {
        if (Auth::guard($guard)->check()) {
            return redirect(route('dashboard'));
        }

        return $next($request);
    }
}
```

## **Step 4: Build the Authentication Controller**

The new `AuthController` handles the logic for registration, login, and logout. Create this file at `app/Http/Controllers/AuthController.php`.

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Hyperf\ViewEngine\Contract\ViewInterface;
use Hypervel\Http\Request;
use Hypervel\Support\Facades\Auth;
use Hypervel\Support\Facades\Hash;
use Psr\Http\Message\ResponseInterface;

class AuthController extends AbstractController
{
    /**
     * Display the registration view.
     */
    public function createRegister(): ViewInterface
    {
        return view('auth.register');
    }

    /**
     * Handle an incoming registration request.
     */
    public function storeRegister(Request $request): ResponseInterface
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed'],
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        Auth::login($user);

        return redirect('/dashboard');
    }

    /**
     * Display the login view.
     */
    public function createLogin(): ViewInterface
    {
        return view('auth.login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function storeLogin(Request $request): ResponseInterface
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            return redirect('/dashboard');
        }

        return redirect(url()->previous());
    }

    /**
     * Display the authenticated user's dashboard.
     */
    public function dashboard(): ViewInterface
    {
        return view('dashboard');
    }

    /**
     * Log the user out of the application.
     */
    public function logout(Request $request): ResponseInterface
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
```

## **Step 5: Create the User Interface Views**

Finally, create the Blade views that will provide the user interface for registration, login, and the user dashboard.

### **Main Layout**

Create a master layout at `resources/views/layouts/app.blade.php`.

```html
<!DOCTYPE html>
<html lang="{{ App::currentLocale() }}">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Hypervel Auth')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>

<body class="bg-gray-50 text-gray-800">
    <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex">
                    <div class="flex-shrink-0 flex items-center">
                        <a href="{{ route('dashboard') }}" class="font-bold text-xl">Hypervel</a>
                    </div>
                </div>
                <div class="flex items-center">
                    @auth
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button type="submit" class="text-gray-600 hover:text-gray-800">Log Out</button>
                        </form>
                    @else
                        <a href="{{ route('login') }}" class="text-gray-600 hover:text-gray-800 mr-4">Log in</a>
                        <a href="{{ route('register') }}" class="text-gray-600 hover:text-gray-800">Register</a>
                    @endauth
                </div>
            </div>
        </div>
    </nav>

    <main class="py-10">
        @yield('content')
    </main>
</body>

</html>
```

### **Login View**

Create the login form at `resources/views/auth/login.blade.php`.

```html
@extends('layouts.app')

@section('title', 'Login')

@section('content')
    <div class="flex justify-center">
        <div class="w-full max-w-md">
            <div class="bg-white p-8 rounded-2xl shadow-md">
                <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>

                <form method="POST" action="{{ route('login') }}">
                    @csrf

                    <!-- Email Address -->
                    <div class="mb-4">
                        <label for="email" class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input id="email" type="email" name="email" required autofocus
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <!-- Password -->
                    <div class="mb-6">
                        <label for="password" class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input id="password" type="password" name="password" required
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <!-- Remember Me -->
                    <div class="mb-6 flex items-center">
                        <input type="checkbox" name="remember" id="remember"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <label for="remember" class="ml-2 block text-sm text-gray-900">Remember me</label>
                    </div>

                    <div class="flex items-center justify-between">
                        <button type="submit"
                            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg w-full focus:outline-none focus:shadow-outline">
                            Log In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
```

### **Registration View**

Create the registration form at `resources/views/auth/register.blade.php`.

```html
@extends('layouts.app')

@section('title', 'Register')

@section('content')
    <div class="flex justify-center">
        <div class="w-full max-w-md">
            <div class="bg-white p-8 rounded-2xl shadow-md">
                <h1 class="text-2xl font-bold mb-6 text-center">Register</h1>

                <form method="POST" action="{{ route('register') }}">
                    @csrf

                    <!-- Name -->
                    <div class="mb-4">
                        <label for="name" class="block text-gray-700 text-sm font-bold mb-2">Name</label>
                        <input id="name" type="text" name="name" required autofocus
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <!-- Email Address -->
                    <div class="mb-4">
                        <label for="email" class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input id="email" type="email" name="email" required
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <!-- Password -->
                    <div class="mb-4">
                        <label for="password" class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input id="password" type="password" name="password" required
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <!-- Confirm Password -->
                    <div class="mb-6">
                        <label for="password_confirmation" class="block text-gray-700 text-sm font-bold mb-2">Confirm
                            Password</label>
                        <input id="password_confirmation" type="password" name="password_confirmation" required
                            class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>

                    <div class="flex items-center justify-between">
                        <button type="submit"
                            class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg w-full focus:outline-none focus:shadow-outline">
                            Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection
```

### **Dashboard View**

Create a simple welcome page for authenticated users at `resources/views/dashboard.blade.php`.

```html
@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
            <div class="p-6 bg-white border-b border-gray-200">
                You're logged in, {{ Auth::user()->name }}!
            </div>
        </div>
    </div>
@endsection
```

With these files in place, your Hypervel application now has a complete, secure, and modern authentication system ready for use.
