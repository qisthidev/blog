---
author: Qisthi Ramadhani
pubDatetime: 2025-07-21T00:00:00.000Z
title: "Migrating Our Dockerized Infrastructure to Alpine Linux on DigitalOcean: Inspired by Lewis Campbell"
slug: docker-alpine-migration
featured: false
draft: false
tags:
  - docker
  - alpine-linux
  - digitalocean
  - migration
  - infrastructure
  - simplicity
  - devops-and-infrastructure
description: "A detailed account of our migration from a complex Docker setup to a streamlined Alpine Linux environment on DigitalOcean, inspired by Lewis Campbell's insights on dependencies and simplicity."
---

Inspired by Lewis Campbell's insightful post on [the real costs of dependencies and the value of simplicity](https://lewiscampbell.tech/blog/250718.html), we recently migrated our Docker-based application infrastructure to an Alpine Linux droplet on DigitalOcean. This migration was not just a technical upgrade, but also a step toward a more maintainable, efficient, and resilient system architecture. Here is a detailed walkthrough of our process, the rationale behind our choices, and the lessons we learned along the way.

> **🔗 Related Infrastructure Guides:**
> - [Creating Custom Alpine Linux Images on DigitalOcean](/posts/_99-custom-alpine-linux-images-digitalocean)
> - [Deploy Laravel Octane on Alpine Linux](/posts/_98-deploy-laravel-octane-alpine-linux)
> - [Laravel Octane Infrastructure Setup on DigitalOcean](/posts/04-laravel-octane-infrastructure-setup-digitalocean)

---

## Why Alpine Linux and DigitalOcean?

Our previous environment had grown increasingly complex, weighed down by unnecessary dependencies and resource overhead. Campbell's argument for minimizing dependencies resonated with us: every additional layer can introduce risk, complexity, and maintenance burden. Alpine Linux, with its minimal footprint and security-focused design, offered an ideal foundation for our Docker workloads. DigitalOcean provided reliable, affordable infrastructure that matched our needs for scalability and simplicity.

---

## Why Alpine Linux and DigitalOcean?

Our previous environment had grown increasingly complex, weighed down by unnecessary dependencies and resource overhead. Campbell’s argument for minimizing dependencies resonated with us: every additional layer can introduce risk, complexity, and maintenance burden. Alpine Linux, with its minimal footprint and security-focused design, offered an ideal foundation for our Docker workloads. DigitalOcean provided reliable, affordable infrastructure that matched our needs for scalability and simplicity.

For details on how we created custom Alpine Linux images for DigitalOcean, check out our comprehensive guide on [creating and deploying custom Alpine Linux images on DigitalOcean](/posts/_99-custom-alpine-linux-images-digitalocean).

---

## Planning the Migration

The migration began with a thorough audit of our current stack and dependencies. We identified all required services, configurations, and data volumes. Our plan included:

- Provisioning a new Alpine Linux droplet on DigitalOcean’s Basic plan (1 vCPU, 1GB RAM).
- Preparing for Docker and Docker Compose installation.
- Setting up Tailscale for secure, private remote access.
- Coordinating downtime using Cloudflare’s Development Mode to minimize user impact.

---

## Backing Up and Preparing for Transfer

To ensure a safe transition, we stopped all running containers to avoid data inconsistency:

```sh
docker compose down
```

We then archived our project directory, which included `docker-compose.yml`, environment files, and persistent volumes:

```sh
tar czvf project-backup.tar.gz .
```

This backup was securely transferred to the new Alpine droplet using `scp`.

---

## Deploying on Alpine Linux

After extracting our backup on the new server, we installed Docker and Docker Compose:

```sh
apk update
apk add docker docker-cli-compose
rc-update add docker default
service docker start
```

With Docker running, we restored our services:

```sh
docker compose up -d
```

---

## Managing Application Dependencies

For PHP-based services, we needed to regenerate dependencies. We spun up a temporary PHP container with the project directory mounted and ran `composer install` to rebuild the `vendor` directory, ensuring all dependencies were correctly installed for the new environment.

---

## Networking and Security Configuration

Tailscale was configured for secure access, with special attention to Alpine’s use of OpenRC instead of systemd. We wrote an idempotent setup script to guarantee Tailscale would start on every boot. Firewall rules were reviewed on both the OS and DigitalOcean’s Cloud Firewalls, ensuring ports 80, 81, and 443 were open for HTTP/HTTPS traffic.

---

## Testing and Launch

We conducted thorough testing of each service, leveraging Cloudflare’s Development Mode to bypass cache and verify changes in real time. Once everything passed validation, we updated DNS records and took the new stack live.

---

## Key Takeaways

- **Simplicity pays off:** Minimizing dependencies, as advocated by Campbell, led to a leaner, easier-to-maintain system.
- **Preparation prevents problems:** Stopping containers before backup and auditing dependencies reduced migration risks.
- **Know your distro:** Alpine Linux uses OpenRC, not systemd—adjust service management accordingly.
- **Layered security:** Verify both OS-level and provider-level firewall rules.
- **Automation helps:** Idempotent scripts make future deployments and disaster recovery much easier.

---

## Conclusion

Migrating to Alpine Linux on DigitalOcean has dramatically improved our infrastructure’s efficiency, security, and maintainability. This project underscored the wisdom of questioning every dependency and striving for simplicity wherever possible—a lesson well-illustrated by Lewis Campbell’s original blog post.

If you’re considering a similar migration or want to discuss infrastructure best practices, feel free to reach out. Happy deploying!
