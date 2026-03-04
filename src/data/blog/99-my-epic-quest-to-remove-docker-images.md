---
author: Qisthi Ramadhani
pubDatetime: 2025-08-09T00:00:00.000Z
title: "My Epic Quest to Remove Docker Images: A Guide to Slaying Digital Clutter (and Common Errors)"
slug: my-epic-quest-to-remove-docker-images
featured: false
draft: false
tags:
  - docker
  - docker-compose
  - devops
  - cli
  - tutorial
  - disk space
  - cleanup
description: "Ever get that dreaded 'No space left on device' error? I did, and it led me on an epic quest to clean up my Docker environment. Follow my hilarious journey from digital hoarder to cleanup master. This guide covers everything from basic `docker rmi` commands to nuking all images, troubleshooting common errors like `zsh command not found`, and demystifying Dockerfiles. Learn how to reclaim gigabytes of disk space and become a Docker hygiene pro!"
---

Alright, let's have a little heart-to-heart. You, me, and that ever-growing, slightly terrifying list of Docker images cluttering up your machine. My name is Rama, and if you're anything like me, your Docker environment sometimes resembles my garage back in Magetan—full of half-finished projects, things I _swear_ I'll use again someday, and a few mysterious items I don't even remember acquiring. 😅

It was a Tuesday. Or maybe a Wednesday? The days blur when you're deep in the code trenches. I was trying to spin up a new container for a slick little Remix project, and my terminal shot back an error that was the digital equivalent of my laptop sighing and shaking its head: `No space left on device`.

I stared at the screen. "No space? Impossible!" I have a top-of-the-line Mac with a terabyte of SSD. What was eating all my precious disk space? I ran `df -h` and my jaw hit the floor. My Docker directory was a behemoth, a digital kaiju greedily consuming hundreds of gigabytes. 😱

That was my wake-up call. I had been a digital hoarder. Every `docker build` without a `--rm`, every experimental image pulled from Docker Hub, every tagged and untagged version of my Laravel projects—they were all there, having a silent, disk-hogging party. That day, I didn't just learn how to `remove docker image`; I went on a full-blown decluttering crusade. I learned the commands, wrestled with the errors, and emerged victorious, with a lean, mean, and clean Docker setup.

So, grab a coffee (or maybe something stronger), and let me be your guide. In this post, I'm going to share everything I learned on my quest. We'll cover not just the simple commands to **delete docker images**, but the whole shebang: how to nuke everything at once, why you can't delete an image that a container is using, and how to troubleshoot those soul-crushing errors that make you question your life choices. This is your ultimate survival guide to Docker cleanup. Let's dive in!

## First Things First: Why Is My Docker Full of Junk Anyway?

Before we start swinging the digital sledgehammer, it helps to understand how we got into this mess. Think of Docker images like cookie cutters. Every time you want to make a cookie (a container), you need the cutter (the image).

- **Building an Image:** When you run `docker build`, you're creating a new cookie cutter based on the recipe in your `Dockerfile`. If you're like me, you might build it, tweak one line in the Dockerfile, and build it again. And again. And again. Each one of those builds, unless you're careful, can create a new image layer or a dangling image.
- **Pulling from Hub:** You see a cool new tool, `postgres:15-alpine` or `redis:latest`. You `docker pull` it to try it out. You use it for five minutes, then forget it exists. The image, however, doesn't forget. It sits there, patiently waiting for a day that will never come.
- **Dangling Images:** These are the ghosts in the machine. They are layers that have no relationship to any tagged images. They're created when you build a new version of an existing image. The old version's layers aren't automatically removed; they just become "dangling." They're useless, but they still take up space.

Over months of development, this digital debris accumulates. Each image might be a few hundred megabytes, but it adds up faster than you can say "It works on my machine." The result? That dreaded `No space left on device` error, a sluggish system, and a general feeling of digital claustrophobia.

## The Basic Toolkit: Your First Steps to a Cleaner Docker

Let's start with the fundamentals. These are the commands you'll use 90% of the time. Think of them as your trusty screwdriver and wrench for everyday Docker maintenance.

### Listing What You've Got: The `docker images` Command

You can't clean a room with your eyes closed. The first step is to see exactly what horrors you're hoarding. Open your terminal and run:

```bash
docker images
```

or the slightly more modern syntax:

```bash
docker image ls
```

You'll get a list that looks something like this:

```
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
my-laravel-app      latest              a1b2c3d4e5f6        2 hours ago         1.2GB
my-remix-app        v1.2                f6e5d4c3b2a1        3 days ago          850MB
<none>              <none>              c3b2a1d4e5f6        4 days ago          780MB
postgres            14-alpine           b2a1c3d4e5f6        2 weeks ago         235MB
redis               latest              a1b2c3d4e5f6        3 months ago        117MB
```

Let's break this down:

- **REPOSITORY:** The name of the image.
- **TAG:** The version or variant of the image (e.g., `latest`, `v1.2`, `14-alpine`).
- **IMAGE ID:** The unique identifier for the image. This is your primary weapon for targeting specific images.
- **CREATED:** When the image was built. This helps you identify old relics.
- **SIZE:** The amount of disk space it's consuming. This is where the shame kicks in. 😳

Notice that `<none>` repository? That's a classic **dangling image**. It's a prime candidate for deletion.

### The Scalpel: How to Remove a Single Docker Image

Alright, you've identified your first target. Let's say it's that old version of your Remix app you no longer need. To **delete a docker image**, you use the `docker rmi` command, which stands for "remove image."

The syntax is simple: `docker rmi [IMAGE_ID_OR_NAME:TAG]`

Using our example list, you could do it in a couple of ways:

1.  **Using the IMAGE ID (The most precise way):**

    ```bash
    docker rmi f6e5d4c3b2a1
    ```

2.  **Using the REPOSITORY and TAG:**

    ```bash
    docker rmi my-remix-app:v1.2
    ```

I personally prefer using the IMAGE ID. Why? Because it's unique. Sometimes you might have multiple tags pointing to the same image ID, and using the name:tag combo can sometimes have unintended consequences if you're not paying attention. But for a simple cleanup, either works fine.

The modern, more verbose (and arguably clearer) syntax is also available:

```bash
docker image rm my-remix-app:v1.2
```

It does the exact same thing as `docker rmi`. It's really a matter of personal preference, like tabs vs. spaces. (It's tabs, by the way. Just kidding... mostly. 😉)

### "Help! It Won't Delete!" – The Dreaded "In Use by a Container" Error

This is the part where everyone gets stuck. You triumphantly type `docker rmi a1b2c3d4e5f6`, hit enter, and Docker slaps you with this:

```
Error response from daemon: conflict: unable to remove repository reference "my-laravel-app:latest" (must force) - container a8b7c6d5e4f3 is using its referenced image a1b2c3d4e5f6
```

**Translation:** "Whoa there, cowboy! You can't sell the car while someone is still driving it."

You cannot **remove a docker image** if a container—even a stopped one—is based on it. Docker does this to protect you from accidentally breaking your running applications. This is where the process becomes a two-step dance.

**Step 1: Find and Stop the Container**

First, you need to see which containers are hanging around. To see currently _running_ containers:

```bash
docker ps
```

or

```bash
docker container ls
```

But the sneaky ones are the _stopped_ containers. They don't show up with `docker ps`. To see all containers, running or stopped, you need to add the `-a` flag:

```bash
docker ps -a
```

You'll see a list of containers. Find the one that's using your image (the error message even gives you the container ID!).

Once you've found the container (let's say its ID is `a8b7c6d5e4f3`), you need to stop it if it's running:

```bash
docker stop a8b7c6d5e4f3
```

This sends a graceful shutdown signal. If the container is being stubborn, you can use the more aggressive `kill` command:

```bash
docker kill a8b7c6d5e4f3
```

Think of `stop` as politely asking someone to leave the party, and `kill` as calling security.

**Step 2: Remove the Container**

A stopped container is still a thing. It exists on your system, holding a reference to the image. You need to remove it.

```bash
docker rm a8b7c6d5e4f3
```

or the modern version:

```bash
docker container rm a8b7c6d5e4f3
```

**Step 3: Try Deleting the Image Again**

Now that the container is gone, the image is no longer in use. You can finally **delete the docker image**:

```bash
docker rmi a1b2c3d4e5f6
```

Success! The terminal will reply with a satisfying list of `Untagged` and `Deleted` SHAs, and you've reclaimed a little piece of your hard drive.

## Level Up: Mass Deletion and Advanced Cleanup

Cleaning up images one by one is fine for a little spring cleaning. But what about after a six-month-long project where you've accumulated hundreds of images? You need bigger weapons. This is where we go from using a scalpel to wielding a chainsaw. metaphorical, of course. Please don't take a chainsaw to your MacBook. 💻

### The Nuclear Option: How to Delete ALL Docker Images

**⚠️ WARNING: This is a destructive command. There is no "undo" button. Use this with extreme caution. It will delete ALL your Docker images—the good, the bad, and the ugly. Only do this if you want a completely fresh start.**

I remember the first time I did this. It was liberating. It was terrifying. It was like deleting your entire photo gallery because a few pictures were blurry. Effective, but you might lose some memories.

The command is a combination of two commands. First, `docker images -q` lists the IDs of all images, and _only_ the IDs (the `-q` stands for "quiet"). Then, we pipe (`|`) that list into the `docker rmi` command.

```bash
docker rmi $(docker images -q)
```

or, for the modernists among us:

```bash
docker image rm $(docker image ls -q)
```

This command says, "Hey Docker, give me a list of every single image ID you have. Now, take that list and remove every single one of them."

Docker will try its best, but it will still fail on any images currently being used by containers. To truly achieve a full reset, you need to stop and remove all containers first.

### The Complete System Prune: The Professional's Way to Clean House

So, how do we do a full reset safely and efficiently? You orchestrate a sequence of commands. This is my go-to "scorched earth" cleanup routine when I want to start fresh.

**Step 1: Stop All Running Containers**

First, we need to politely ask all the party guests to leave.

```bash
docker stop $(docker ps -aq)
```

Let's break that down: `docker ps -a` lists all containers (running and stopped), and the `-q` flag gives us just their IDs. We pass that list to `docker stop`. This is the ultimate **docker stop all containers** command.

**Step 2: Remove All Containers**

Now that the party is over and everyone has left, we need to clean up the empty glasses and pizza boxes (the stopped containers).

```bash
docker rm $(docker ps -aq)
```

or, more explicitly:

```bash
docker container rm $(docker container ls -a -q)
```

This is the most effective way to **delete all docker containers** or **remove all docker containers**. With all containers gone, our images are now vulnerable.

**Step 3: Delete All Docker Images**

Now we can run our nuclear option from before, confident that no containers are protecting any images.

```bash
docker rmi $(docker images -q)
```

**Step 4 (Optional but Recommended): Prune Everything Else**

Even after all that, there can be leftover junk: build caches, unused networks, and those pesky dangling images. Docker has a magical, all-in-one cleanup command for this: `docker system prune`.

```bash
docker system prune -a --volumes
```

- `prune`: The command to clean things up.
- `-a`: This flag tells it to prune not just dangling images, but _all unused_ images (images not associated with a container). This is what makes it so powerful.
- `--volumes`: This is the extra-destructive bit. It will also remove all your Docker volumes. **BE CAREFUL!** Docker volumes are where your persistent data lives (like your PostgreSQL database files). If you run this, you will lose that data. Only use `--volumes` if you are 100% sure you don't need any data stored in your Docker volumes. If you're unsure, just run `docker system prune -a`.

Running this command feels _so good_. It gives you a summary of all the junk it cleaned up and how much space you reclaimed. It's the digital equivalent of a deep-clean detox for your system.

### A Gentler Approach: `docker image prune`

If the "scorched earth" approach feels a bit too much, there's a more civilized command: `docker image prune`.

```bash
docker image prune
```

By default, this command will only remove **dangling images**—those `<none>`:<none>` ones we saw earlier. It's a safe and easy way to get rid of the most obvious waste without touching any of your tagged, potentially useful images.

To be a bit more aggressive, you can add the `-a` flag:

```bash
docker image prune -a
```

This will remove all unused images (images not tied to a container), not just dangling ones. It's essentially a safer, image-focused version of the `docker system prune -a` command. It won't touch your containers, networks, or volumes.

## Docker vs. Docker Compose: A Tale of Two Workflows

A lot of the confusion around cleanup, especially for developers like me working with complex stacks (hello, Laravel + React + Redis + Postgres!), comes from the interplay between `docker` and `docker-compose`. Let's clear this up once and for all.

- **Docker (`docker build`, `docker run`):** This is you, the micro-manager. You are interacting with individual components directly. You build one image. You run one container. You map one port. It's great for simple, one-off tasks or for learning the fundamentals.
- **Docker Compose (`docker-compose up`, `docker-compose down`):** This is you, the orchestra conductor. You don't talk to the individual musicians (containers). You have a sheet of music (the `docker-compose.yml` file) that describes the entire symphony—the web server, the database, the caching layer, how they talk to each other (`networks`), and where they store their stuff (`volumes`). You just wave your baton (`docker-compose up`), and the whole orchestra starts playing in harmony.

When it comes to cleanup, the same logic applies.

If you started your services with `docker-compose up`, you should stop them with `docker-compose down`.

```bash
docker-compose down
```

This command is a beautiful thing. It doesn't just stop the containers defined in your `docker-compose.yml` file; it also **removes the containers** and any networks it created. It's a one-command cleanup for your entire application stack.

To also remove the volumes (again, be careful with your precious data!), you can add the `-v` flag:

```bash
docker-compose down -v
```

**Crucially, `docker-compose down` does NOT remove the images themselves.** It only removes the containers. After you run `docker-compose down`, you still need to use the `docker rmi` or `docker image prune` commands we discussed earlier to actually **delete the docker images** that your Compose file used.

This separation is by design. Your application stack (the containers) is ephemeral, but the blueprints (the images) are meant to be more permanent so you can quickly spin the stack back up again.

## Into the Weeds: Demystifying Dockerfiles and Common Errors

Now let's put on our developer hats and talk about the source of all our images: the `Dockerfile`. A misconfigured `Dockerfile` is often the root cause of bloated images and frustrating errors. I've spent more hours than I care to admit staring at Dockerfile syntax, wondering where I went wrong. Let me save you some of that pain.

### Dockerfile 101: A Recipe for Your App

A `Dockerfile` is just a text file with a set of instructions on how to build your image. Here’s a super simple example for a Laravel application, a world I live in every day at [qisthi.dev](https://qisthi.dev/).

```dockerfile
# Stage 1: Build the frontend assets
FROM node:18-alpine AS assets

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Stage 2: Setup the PHP environment
FROM php:8.2-fpm-alpine AS app

# Install system dependencies & PHP extensions
RUN apk add --no-cache ... # install things like libzip-dev, etc.
RUN docker-php-ext-install pdo pdo_mysql zip ...

# Install Composer
COPY --from=composer/composer:latest-bin /composer /usr/bin/composer

WORKDIR /var/www/html

# Copy vendor files
COPY --from=assets /app/vendor /var/www/html/vendor

# Copy application files
COPY . .

# Copy built assets from the 'assets' stage
COPY --from=assets /app/public/build /var/www/html/public/build

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port
EXPOSE 9000

# Set the entrypoint
CMD ["php-fpm"]
```

This is a multi-stage build, a fantastic technique for keeping final image sizes small. But let's look at some key instructions and common trip-ups:

- **`Dockerfile invalid reference format`**: This dreaded error usually pops up during the `COPY` or `FROM` instruction. It means Docker can't understand the path or image name you provided.

  - **Check your image tags:** In `FROM php:8.2-fpm-alpine`, make sure that tag actually exists on Docker Hub. A typo like `php:8.2-fpm-apline` will trigger this.
  - **Check your paths in `COPY`:** `COPY ./src /app/src` is fine. `COPY /src /app/src` is not, because it's looking for an absolute `/src` directory on your host machine, which probably doesn't exist in the context Docker is running in. It's almost always a relative path (`./...`).
  - **Check for weird characters:** Spaces or special characters in filenames or image tags that aren't properly quoted can cause this. Keep your naming conventions clean!

- **`dockerfile composer install`**: A common step in any PHP project. A classic mistake is to copy your _entire_ application code _before_ running `composer install`.

  - **Bad:**
    ```dockerfile
    COPY . .
    RUN composer install
    ```
  - **Good:**
    ```dockerfile
    COPY composer.json composer.lock ./
    RUN composer install --no-dev --optimize-autoloader
    COPY . .
    ```
  - **Why?** Docker caches layers. If you copy `composer.json` and `composer.lock` first and then install, that `RUN composer install` layer will be cached. As long as those two files don't change, Docker won't re-run the time-consuming install every time you change a single line of your application code. It's a huge time-saver during development.

- **`CMD` vs. `ENTRYPOINT`**: Ah, the classic debate.

  - **`CMD`**: Provides the _default command_ to run when the container starts. It can be easily overridden from the command line. E.g., `docker run my-image ls -la` would run `ls -la` _instead of_ the `CMD` in the Dockerfile.
  - **`ENTRYPOINT`**: Configures the container to run as an executable. You can't easily override it. Anything you pass on the command line is appended as an argument to the `ENTRYPOINT`.
  - **My Rule of Thumb:** Use `ENTRYPOINT` when your container is designed to do one specific thing (like run the `php-fpm` process). Use `CMD` to provide a default argument for that `ENTRYPOINT` or if you want the container's command to be easily changed. For most web apps, `CMD ["php-fpm"]` or `CMD ["npm", "start"]` is perfectly fine.

- **`VOLUME` vs. `docker run -v`**:
  - **`Dockerfile VOLUME ["/var/www/html"]`**: This instruction in a Dockerfile marks a directory as a "volume mount point." It tells Docker that the data in this directory should be persisted outside the container's lifecycle. Docker will manage this volume for you (it's called an "anonymous volume").
  - **`docker run -v /path/on/host:/var/www/html`**: This is a "bind mount." You are explicitly mapping a directory from your host machine into the container.
  - **Which one to use?** For local development, I _always_ use bind mounts (`docker run -v` or its equivalent in `docker-compose.yml`). This lets me edit code on my Mac using my favorite IDE, and the changes are instantly reflected inside the container. It's the magic of local dev with Docker. I use the `VOLUME` instruction in a Dockerfile less frequently, usually for data that should be managed by Docker itself and doesn't need to be directly edited by me on the host (like database files).

### Troubleshooting Your Docker Environment on a Mac

As a Mac user, I've run into my fair share of platform-specific quirks. If you're struggling with the **install docker in mac** process or running into errors, here are the usual suspects.

- **`zsh: command not found: docker`**: Oh, the classic. You've installed Docker Desktop, you see the little whale icon in your menu bar, but your terminal acts like it's never heard of Docker.

  1.  **Is Docker Desktop Running?** This is the #1 reason. Docker on Mac/Windows runs as a desktop application that manages a lightweight Linux VM in the background. If that app isn't running, the Docker daemon isn't running, and the `docker` command-line interface (CLI) tools won't be in your shell's PATH. Click the whale icon and make sure it says "Docker Desktop is running."
  2.  **Is it in your PATH?** The Docker Desktop installer for macOS is supposed to automatically add the Docker tools to your system PATH. But sometimes, things go wrong, especially with custom Zsh (`.zshrc`) or Bash (`.bash_profile`) setups. You can check by running `echo $PATH`. You should see something related to `/usr/local/bin` where Docker symlinks its tools. If not, the easiest fix is often to go into Docker Desktop's settings (`Settings > Advanced`) and click the "Reset to factory defaults" button, which can often fix broken symlinks. The **docker installation on mac** should be seamless, but when it's not, a reset is your best friend.

- **`Cannot connect to the Docker daemon. Is the docker daemon running?`**: This is the cousin of the "command not found" error. The CLI tool is in your path, but it can't talk to the engine.
  - **Again, is Docker Desktop running?** 99% of the time on a Mac, this is the issue. The app has crashed, is stuck starting, or you quit it.
  - **Try Restarting Docker:** Click the whale icon and select "Restart." Give it a minute to reboot its internal VM. This fixes a surprising number of weird issues.
  - **Check the Socket:** The Docker CLI communicates with the daemon via a Unix socket, typically located at `/var/run/docker.sock`. Docker Desktop for Mac cleverly symlinks this to its internal VM's socket. If permissions get messed up or the link is broken, you'll see this error. A "Reset to factory defaults" or a full reinstall of Docker Desktop is the most reliable fix here.

Installing Docker on macOS (`install docker macos`) is generally a breeze these days thanks to the Docker Desktop application. You download the `.dmg` file from the official [Docker website](https://www.docker.com/products/docker-desktop/), drag it to your Applications folder, and run it. It handles all the complex VM and networking setup for you. Gone are the days of `docker-machine` and VirtualBox headaches, and for that, I am eternally grateful. 🙏

## My Final Confession and Your Docker Decluttering Vow

So, how much space did I reclaim on that fateful Tuesday? After stopping and removing all my containers, running `docker system prune -a`, and feeling a mix of terror and glee, I freed up **over 250GB**. Yes, you read that right. It was a digital hoard of epic proportions.

The biggest lesson I learned wasn't just a set of commands. It was about adopting a new mindset: Docker hygiene. Just like you clean up your code, you need to clean up your development environment.

Here’s the vow I now live by, and I encourage you to take it too:

1.  **I will be mindful when I `docker build`.** I'll use multi-stage builds to keep my final images lean. I'll leverage layer caching properly to speed up my builds.
2.  **I will use `docker-compose down` when I'm finished.** When I'm done with a project for the day, I won't just leave the containers running or stopped. I'll tear down the stack to free up resources.
3.  **I will run `docker image prune` regularly.** Once a week, I'll run a quick prune to get rid of any dangling images that have accumulated. It's like taking out the digital trash.
4.  **I will question every `latest` tag.** The `latest` tag is mutable. It can change. For anything important, I'll use a specific version tag (`postgres:15.4-alpine`) to ensure my builds are repeatable and predictable. This is key for good **docker versioning**.
5.  **I will not fear the prune.** I will understand the difference between `docker image prune`, `docker system prune`, and `docker system prune -a --volumes`. I will use the right tool for the job without accidentally nuking my precious database volumes.

Learning to masterfully **remove docker images** and manage your containers is a rite of passage for any developer. It takes you from being a casual Docker user to a true professional who understands and respects their tools and environment.

So go forth! Run `docker images` and take a long, hard look at what you've been hoarding. Start small. **Delete a docker image** you know you don't need. Remove a few stopped containers. Run `docker image prune`. Feel the satisfaction of reclaiming that disk space.

Your laptop, your teammates, and your future self will thank you.
