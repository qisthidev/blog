---
author: Qisthi Ramadhani
pubDatetime: 2025-07-30T00:00:00.000Z
title: "From Laravel to Spring Boot 02: Setting Up Your Java Development Environment with SDKMAN, IntelliJ, and VSCode"
featured: false
draft: false
tags:
  - java-development
  - series-spring-boot-for-laravel-developers
description: "A practical guide to setting up a professional Java development environment optimized for Spring Boot development. Learn SDKMAN for Java version management and choose between IntelliJ IDEA or VSCode configuration."
---

If you're coming from the Laravel world, you're probably used to a straightforward setup: install PHP, install Composer, run `composer install`, and you're coding. The Java ecosystem requires a bit more initial setup, but the payoff is a more robust development environment that scales from small projects to enterprise applications.

> **📚 Series Navigation:** This is Part 2 of the [Spring Boot for Laravel Developers](/tags/series-spring-boot-for-laravel-developers) series.
>
> **Previous:** [The Fundamental Mindset Shift](/blog/msb-01-from-laravel-to-spring-boot-the-fundamental-mindset-shift)
>
> **Next:** [Building Your First REST API](/blog/msb-03-building-your-first-spring-boot-rest-api)

In this article, we'll set up a professional Java development environment that will serve you throughout this series and beyond. By the end, you'll have:

1. **Java 21 LTS** managed through SDKMAN
2. **Your choice of IDE**: IntelliJ IDEA or VSCode configured for Spring Boot development
3. **Maven** for project management
4. **Your first Spring Boot project** up and running

## The Laravel Developer's Environment Mental Model

Before we dive in, let's map this to your Laravel experience:

| Laravel Tool        | Java/Spring Boot Equivalent | Purpose                      |
| ------------------- | --------------------------- | ---------------------------- |
| PHP                 | Java JDK                    | Runtime environment          |
| Composer            | Maven/Gradle                | Dependency management        |
| `php artisan serve` | Spring Boot embedded Tomcat | Development server           |
| Laravel Mix/Vite    | Maven/Gradle build process  | Asset compilation & building |
| PHPStorm/VS Code    | IntelliJ IDEA / VS Code     | IDE                          |

## Step 1: Installing SDKMAN! - Your Java Version Manager

SDKMAN is like `nvm` for Node.js or `rbenv` for Ruby, but for the entire Java ecosystem. It manages not just Java versions, but also Maven, Gradle, and dozens of other JVM-based tools.

### Installing SDKMAN

On macOS or Linux, run:

```bash
curl -s "https://get.sdkman.io" | bash
```

Then reload your shell:

```bash
source ~/.sdkman/bin/sdkman-init.sh
```

Verify the installation:

```bash
sdk version
```

You should see something like:

```
SDKMAN!
script: 5.18.2
native: 0.4.6
```

### Installing Java 21 LTS

List available Java versions:

```bash
sdk list java
```

You'll see a comprehensive list of Java distributions. For Spring Boot development, I recommend Amazon Corretto (Amazon's OpenJDK distribution):

```bash
# Install Java 21 LTS from Amazon Corretto
sdk install java 21.0.8-amzn

# Do you want java 21.0.8-amzn to be set as default? (Y/n): Y

# Change another version if needed
sdk use java 24.0.2-amzn
```

Verify your Java installation:

```bash
java -version
```

Output should look like:

```
openjdk version "21.0.8" 2025-07-15 LTS
OpenJDK Runtime Environment Corretto-21.0.8.9.1 (build 21.0.8+9-LTS)
OpenJDK 64-Bit Server VM Corretto-21.0.8.9.1 (build 21.0.8+9-LTS, mixed mode, sharing)
```

### Installing Maven

Maven is the most common build tool for Spring Boot (think Composer for PHP):

```bash
sdk install maven 3.9.11
```

Verify:

```bash
mvn -version
```

## Step 2: Choose Your IDE - VSCode or IntelliJ IDEA

As a Laravel developer, you're likely familiar with VSCode. The good news is that VSCode provides excellent Java and Spring Boot support through extensions. However, IntelliJ IDEA offers some advantages for Java development. Let's explore both options so you can choose what works best for you.

## Option A: Setting Up VSCode for Spring Boot Development

If you're already comfortable with VSCode and want to stick with a familiar environment, this is an excellent choice. VSCode's Java support has matured significantly and provides most features you'll need for Spring Boot development.

> **💡 Related Reading:** For a detailed guide on VSCode Java setup, check out my previous article: [Setting Up Java Development in VSCode: Why I Recommend the Extension Pack for Java](/blog/java-21-part-2-setting-up-java-development-vscode). This Spring Boot-focused guide builds upon those foundations.

### Installing the Extension Pack for Java

The Extension Pack for Java bundles all essential Java development tools:

1. **Open VSCode**
2. **Go to Extensions** (`Cmd+Shift+X` on macOS)
3. **Search for "Extension Pack for Java"**
4. **Install the pack by Microsoft**

This pack includes:

- **Language Support for Java™ by Red Hat** - Syntax highlighting, code completion, refactoring
- **Debugger for Java** - Full debugging support
- **Test Runner for Java** - JUnit and TestNG support
- **Maven for Java** - Project management and build tools
- **Project Manager for Java** - Project navigation and management
- **Visual Studio IntelliCode** - AI-assisted code completion

### Additional Spring Boot Extensions

For enhanced Spring Boot development, also install **Spring Boot Extension Pack**. This pack includes:

- **Spring Boot Tools** - Additional tools for working with Spring Boot applications
- **Spring Initializr Java Support** - Create Spring Boot projects directly in VSCode
- **Spring Boot Dashboard** - Manage and monitor Spring Boot applications

<!-- ### Configuring VSCode for Java

#### **1. Configure Java Runtime**

After installing the extensions, VSCode should automatically detect your SDKMAN Java installation. If not:

1. **Open Command Palette** (`Cmd+Shift+P`)
2. **Type "Java: Configure Java Runtime"**
3. **Set the path to your Java 21 installation** (e.g., `/Users/yourusername/.sdkman/candidates/java/21.0.8-amzn`)

#### **2. Configure Workspace Settings**

Create a `.vscode/settings.json` file in your workspace:

```json
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/Users/yourusername/.sdkman/candidates/java/21.0.8-amzn"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
  "editor.tabSize": 4,
  "editor.insertSpaces": true,
  "files.exclude": {
    "**/target": true,
    "**/.classpath": true,
    "**/.project": true,
    "**/.settings": true,
    "**/.factorypath": true
  }
}
```

#### **3. Verify VSCode Setup**

1. **Open Command Palette** (`Cmd+Shift+P`)
2. **Type "Java: Verify Setup"**
3. **Follow any recommendations** to complete the setup -->

### Creating a Spring Boot Project in VSCode

#### **Method 1: Using Spring Initializr Command Palette**

1. **Open Command Palette** (`Cmd+Shift+P`)
2. **Type "Spring Initializr: Generate a Maven Project"**
3. **Follow the prompts** to configure your project
   ```
   Version: 3.5.4 (latest stable)
   Language: Java
   Group: com.example
   Artifact: hello-spring-boot
   Packaging: Jar
   Java Version: 21
   Dependencies: Spring Web, Spring Boot DevTools, Spring Boot Actuator
   ```
4. **Choose your workspace folder** (e.g., `/Users/yourusername/Developer`)
5. **VSCode will generate the project** and open it in the current workspace

#### **Method 2: Using Spring Initializr Web Interface**

For more control over dependencies and Spring Boot version:

1. **Visit** [https://start.spring.io](https://start.spring.io)
2. **Configure your project:**
   ```
   Project: Maven
   Language: Java
   Spring Boot: 3.2.x (latest stable)
   Group: com.example
   Artifact: hello-spring-boot
   Packaging: Jar
   Java: 21
   ```
3. **Add Dependencies:**
   - Spring Web
   - Spring Boot DevTools
   - Spring Boot Actuator
4. **Click "Generate"** to download the project
5. **Extract and open** in VSCode

#### **Running the Application in VSCode**

- **Using Spring Boot Dashboard Panel**:
  - Click on the Spring Boot Dashboard icon in the activity bar / side panel
  - Click the play button next to your application `hello-spring-boot`
- **Using Terminal**: Open integrated terminal and run `./mvnw spring-boot:run`
- **Using Debug**: Click on the debug icon in the activity bar, then "Run Java"

### VSCode Java Development Tips

#### **Code Snippets and Live Templates**

VSCode includes helpful Java snippets:

- `main` - Creates main method
- `sout` - Creates System.out.println()
- `psvm` - Creates public static void main

For Spring Boot specific snippets, the Spring Boot Extension Pack adds:

- `@GetMapping` snippet
- `@RestController` template
- Spring Boot test templates

## Option B: Setting Up IntelliJ IDEA for Spring Boot Development

IntelliJ IDEA is to Java what PHPStorm is to PHP—an IDE built specifically for the language and ecosystem.

### Download and Install

1. Go to [JetBrains IntelliJ IDEA](https://www.jetbrains.com/idea/)
2. Download **Community Edition** (free) or **Ultimate** (30-day trial)
3. Install using your system's standard installation process

### Essential IntelliJ Configuration for Spring Boot

Once installed, let's configure it for optimal Spring Boot development:

#### **1. Configure JDK**

- Open IntelliJ IDEA
- Go to **File → Project Structure → SDKs**
- Click the **+** button and select **Add JDK**
- Navigate to your SDKMAN Java installation (usually `/Users/yourusername/.sdkman/candidates/java/21.0.8-amzn`)

#### **2. Install Essential Plugins**

Go to **File → Settings → Plugins** (or **IntelliJ IDEA → Preferences → Plugins** on macOS) and install:

- **Spring Boot** (usually pre-installed)
- **Spring Assistant**
- **Maven Helper**
- **Docker**
- **Database Navigator** (if using Community Edition)

#### **3. Configure Code Style**

For consistency with Spring Boot conventions:

- Go to **File → Settings → Editor → Code Style → Java**
- Set **Tab size** and **Indent** to **4**
- Enable **Use tab character** = **false** (use spaces)
- Set **Right margin** to **120**

#### **4. Configure Live Templates**

IntelliJ has excellent live templates for Spring Boot. Enable them:

- Go to **File → Settings → Editor → Live Templates**
- Expand **Spring Boot** and enable all templates

## Step 3: Understanding the Generated Project Structure

Your project structure will look like this:

```
hello-spring-boot/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/hellospringboot/
│   │   │       └── HelloSpringBootApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── static/
│   │       └── templates/
│   └── test/
│       └── java/
│           └── com/example/hellospringboot/
│               └── HelloSpringBootApplicationTests.java
├── target/         # Build output (like vendor/ in Laravel)
├── pom.xml         # Maven dependencies (like composer.json)
└── mvnw, mvnw.cmd  # Maven wrapper (ensures consistent Maven version)
```

**Laravel Comparison:**

```
laravel-project/
├── app/
├── resources/
├── public/
├── vendor/           # → target/ in Java
├── composer.json     # → pom.xml in Java
└── artisan           # → mvnw in Java
```

## Step 4: Running Your First Spring Boot Application

Let's create a simple "Hello World" endpoint to verify everything works:

### Create a REST Controller

Create a new file: `src/main/java/com/example/hello_spring_boot/HelloController.java`

```java
package com.example.hello_spring_boot;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/")
    public String hello() {
        return "Hello from Spring Boot! Laravel developers welcome! 🚀";
    }

    @GetMapping("/api/status")
    public HelloResponse status() {
        return new HelloResponse("Spring Boot is running!", System.currentTimeMillis());
    }

    // Inner class for JSON response
    record HelloResponse(String message, long timestamp) {}
}
```

**Laravel Equivalent:**

```php
<?php
// routes/web.php
Route::get('/', function () {
    return 'Hello from Laravel! Java developers welcome! 🚀';
});

Route::get('/api/status', function () {
    return response()->json([
        'message' => 'Laravel is running!',
        'timestamp' => time()
    ]);
});
```

### Run the Application

**In VSCode:**

1. **Open Spring Boot Dashboard panel**
2. **Click the play button** next to your application
3. **Or use the Run/Debug button** in the top-right when viewing `HelloSpringBootApplication.java`

**In IntelliJ:**

1. **Right-click** on `HelloSpringBootApplication.java`
2. **Select "Run 'HelloSpringBootApplication'"**

**Or use the terminal (works for both):**

```bash
./mvnw spring-boot:run
```

You should see output like:

```
Started HelloSpringBootApplication in 2.345 seconds (JVM running for 3.123)
```

### Test Your Endpoints

Open your browser and visit:

- `http://localhost:8080/` - Should show your hello message
- `http://localhost:8080/api/status` - Should return JSON
- `http://localhost:8080/actuator/health` - Should show `{"status":"UP"}`

## Step 5: Essential Development Workflow Commands

Here are the Maven commands you'll use daily (think of them as `artisan` equivalents):

```bash
# Start the application (like php artisan serve)
./mvnw spring-boot:run

# Run tests (like php artisan test)
./mvnw test

# Build the project (like composer install + assets build)
./mvnw clean package

# Run specific test class
./mvnw test -Dtest=HelloControllerTest

# Generate project report
./mvnw site
```

## Troubleshooting Common Issues

### **"JAVA_HOME is not set"**

Add to your shell profile (`.zshrc`, `.bashrc`):

```bash
export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
export PATH="$JAVA_HOME/bin:$PATH"
```

### **IntelliJ doesn't recognize Java 21 features**

- Go to **File → Project Structure → Project**
- Set **Project SDK** to your Java 21 installation
- Set **Language level** to "21 - Pattern matching for switch"

### **VSCode Java extension issues**

- **Open Command Palette** (`Cmd+Shift+P`)
- **Type "Java: Reload Projects"** to refresh project configuration
- **Type "Java: Configure Java Runtime"** to verify Java settings
- **Check the Java extension output** in the Output panel for error details

### **Maven build fails with "package does not exist"**

This usually means dependency issues:

```bash
# Clear Maven cache and rebuild
./mvnw clean
./mvnw dependency:resolve
./mvnw compile
```

## Environment Verification Checklist

Before moving to the next article, verify:

- ✅ `java -version` shows Java 21
- ✅ `mvn -version` works without errors
- ✅ Your chosen IDE (IntelliJ or VSCode) can create and run Spring Boot projects
- ✅ Your hello endpoint responds at `http://localhost:8080/`
- ✅ Hot reload works (change the hello message and refresh)
- ✅ Debugging works in your IDE

## What's Next?

In the next article, we'll dive into building a proper REST API with Spring Boot. We'll cover:

- Spring Boot project structure deep dive
- Creating REST endpoints with proper HTTP status codes
- Request/response handling and validation
- Exception handling and error responses
- Testing your API with JUnit and MockMvc

Your development environment is now ready for serious Spring Boot development. Whether you chose VSCode for its familiarity and speed, or IntelliJ for its comprehensive Java tooling, you now have:

- **Professional-grade tooling** used by enterprise teams worldwide
- **Version management** that prevents "works on my machine" issues
- **An IDE** that understands your code at a deep level
- **A build system** that scales from solo projects to massive applications

Ready to build your first real Spring Boot application? Let's continue the journey!

---

> **🚀 Ready to Continue?** The next article covers [Building Your First REST API](/blog/msb-03-building-your-first-spring-boot-rest-api) - where we'll create a production-ready API with proper error handling and testing.
>
> **💡 Tip:** Keep your chosen IDE open and experiment with the code examples. The best way to learn Spring Boot is by writing it! Both VSCode and IntelliJ offer excellent debugging and testing capabilities for Spring Boot development.
