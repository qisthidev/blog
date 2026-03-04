---
author: Qisthi Ramadhani
pubDatetime: 2025-07-31T00:00:00.000Z
title: "From Laravel to Spring Boot 03: Building Your First REST API with Proper Error Handling"
featured: false
draft: false
tags:
  - spring-boot
  - rest-api
  - validation
  - error-handling
  - testing
  - junit
  - java-development
  - series-spring-boot-for-laravel-developers
description: "Learn to build production-ready REST APIs with Spring Boot. Master request/response handling, validation, exception handling, and testing - the Spring Boot way."
---

Now that you have your development environment set up, it's time to build something real. In this article, we'll create a production-ready REST API that showcases Spring Boot's strengths: explicit error handling, automatic validation, and comprehensive testing.

> **📚 Series Navigation:** This is Part 3 of the [Spring Boot for Laravel Developers](/tags/series-spring-boot-for-laravel-developers) series.
>
> **Previous:** [Setting Up Your Development Environment](/blog/msb-02-setting-up-java-development-environment-sdkman-intellij)

We'll build a **Task Management API** that demonstrates core concepts every Laravel developer needs to understand when transitioning to Spring Boot.

## The Laravel vs Spring Boot API Mental Model

Before we start coding, let's understand the philosophical differences:

| Aspect | Laravel Approach | Spring Boot Approach |
|--------|------------------|---------------------|
| **Validation** | Controller or Form Request | Bean Validation annotations on models |
| **Error Handling** | Global exception handler | @ControllerAdvice with @ExceptionHandler |
| **Response Format** | Eloquent Resources | DTOs or direct object serialization |
| **Testing** | HTTP tests with assertions | MockMvc with matchers |
| **Dependency Injection** | Service container with facades | Constructor injection with @Autowired |

## Project Setup: Task Management API

Let's create a new Spring Boot project for our Task Management API:

### Dependencies We'll Need

Create a new project with these dependencies (or add them to your existing project):

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Application Configuration

Update `src/main/resources/application.properties`:

```properties
# Server configuration
server.port=8080
server.error.include-message=always
server.error.include-binding-errors=always

# H2 Database (for development)
spring.datasource.url=jdbc:h2:mem:taskdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# JPA/Hibernate
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# H2 Console (for development only)
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

## Step 1: Creating the Task Entity

In Spring Boot, entities are your domain models with persistence annotations:

```java
// src/main/java/com/example/taskapi/entity/Task.java
package com.example.taskapi.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    @Column(nullable = false)
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Column(length = 1000)
    private String description;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.TODO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public Task() {}

    public Task(String title, String description, TaskStatus status) {
        this.title = title;
        this.description = description;
        this.status = status;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
```

**Laravel Comparison:**
```php
<?php
// app/Models/Task.php
class Task extends Model
{
    protected $fillable = ['title', 'description', 'status'];

    protected $casts = [
        'status' => TaskStatus::class,
    ];

    // Validation happens in FormRequest or Controller
}
```

### Task Status Enum

```java
// src/main/java/com/example/taskapi/entity/TaskStatus.java
package com.example.taskapi.entity;

public enum TaskStatus {
    TODO("To Do"),
    IN_PROGRESS("In Progress"),
    DONE("Done");

    private final String displayName;

    TaskStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
```

## Step 2: Creating DTOs for Request/Response

DTOs (Data Transfer Objects) control what data flows in and out of your API:

### Task Request DTO

```java
// src/main/java/com/example/taskapi/dto/TaskRequest.java
package com.example.taskapi.dto;

import com.example.taskapi.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class TaskRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private TaskStatus status;

    // Constructors
    public TaskRequest() {}

    public TaskRequest(String title, String description, TaskStatus status) {
        this.title = title;
        this.description = description;
        this.status = status;
    }

    // Getters and Setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }
}
```

### Task Response DTO

```java
// src/main/java/com/example/taskapi/dto/TaskResponse.java
package com.example.taskapi.dto;

import com.example.taskapi.entity.Task;
import com.example.taskapi.entity.TaskStatus;
import java.time.LocalDateTime;

public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructor from Entity
    public TaskResponse(Task task) {
        this.id = task.getId();
        this.title = task.getTitle();
        this.description = task.getDescription();
        this.status = task.getStatus();
        this.createdAt = task.getCreatedAt();
        this.updatedAt = task.getUpdatedAt();
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public TaskStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
```

**Laravel Comparison:**
```php
<?php
// app/Http/Requests/TaskRequest.php
class TaskRequest extends FormRequest
{
    public function rules()
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'sometimes|in:todo,in_progress,done',
        ];
    }
}

// app/Http/Resources/TaskResource.php
class TaskResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

## Step 3: Creating the Repository Layer

```java
// src/main/java/com/example/taskapi/repository/TaskRepository.java
package com.example.taskapi.repository;

import com.example.taskapi.entity.Task;
import com.example.taskapi.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    // Query methods by convention
    List<Task> findByStatus(TaskStatus status);
    List<Task> findByTitleContainingIgnoreCase(String title);

    // Custom JPQL query
    @Query("SELECT t FROM Task t WHERE t.status = :status ORDER BY t.createdAt DESC")
    List<Task> findByStatusOrderByCreatedAtDesc(@Param("status") TaskStatus status);

    // Native SQL query
    @Query(value = "SELECT COUNT(*) FROM tasks WHERE status = ?1", nativeQuery = true)
    long countByStatus(String status);
}
```

**Laravel Comparison:**
```php
<?php
// Laravel uses Eloquent directly in services/controllers
Task::where('status', $status)->get();
Task::where('title', 'like', "%{$title}%")->get();
Task::where('status', $status)->orderBy('created_at', 'desc')->get();
Task::where('status', $status)->count();
```

## Step 4: Creating the Service Layer

```java
// src/main/java/com/example/taskapi/service/TaskService.java
package com.example.taskapi.service;

import com.example.taskapi.dto.TaskRequest;
import com.example.taskapi.dto.TaskResponse;
import com.example.taskapi.entity.Task;
import com.example.taskapi.entity.TaskStatus;
import com.example.taskapi.exception.TaskNotFoundException;
import com.example.taskapi.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAll()
                .stream()
                .map(TaskResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found with id: " + id));
        return new TaskResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByStatus(TaskStatus status) {
        return taskRepository.findByStatus(status)
                .stream()
                .map(TaskResponse::new)
                .collect(Collectors.toList());
    }

    public TaskResponse createTask(TaskRequest request) {
        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setStatus(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO);

        Task savedTask = taskRepository.save(task);
        return new TaskResponse(savedTask);
    }

    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException("Task not found with id: " + id));

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        Task updatedTask = taskRepository.save(task);
        return new TaskResponse(updatedTask);
    }

    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new TaskNotFoundException("Task not found with id: " + id);
        }
        taskRepository.deleteById(id);
    }
}
```

**Laravel Comparison:**
```php
<?php
// app/Services/TaskService.php
class TaskService
{
    public function getAllTasks()
    {
        return TaskResource::collection(Task::all());
    }

    public function createTask(TaskRequest $request)
    {
        $task = Task::create($request->validated());
        return new TaskResource($task);
    }

    public function updateTask(Task $task, TaskRequest $request)
    {
        $task->update($request->validated());
        return new TaskResource($task->fresh());
    }

    // etc...
}
```

## Step 5: Creating the REST Controller

```java
// src/main/java/com/example/taskapi/controller/TaskController.java
package com.example.taskapi.controller;

import com.example.taskapi.dto.TaskRequest;
import com.example.taskapi.dto.TaskResponse;
import com.example.taskapi.entity.TaskStatus;
import com.example.taskapi.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*") // For development only
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(
            @RequestParam(required = false) TaskStatus status) {

        List<TaskResponse> tasks = status != null
                ? taskService.getTasksByStatus(status)
                : taskService.getAllTasks();

        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        TaskResponse task = taskService.getTaskById(id);
        return ResponseEntity.ok(task);
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        TaskResponse createdTask = taskService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request) {

        TaskResponse updatedTask = taskService.updateTask(id, request);
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Laravel Comparison:**
```php
<?php
// app/Http/Controllers/TaskController.php
class TaskController extends Controller
{
    public function __construct(private TaskService $taskService) {}

    public function index(Request $request)
    {
        $status = $request->query('status');
        return $status
            ? $this->taskService->getTasksByStatus($status)
            : $this->taskService->getAllTasks();
    }

    public function store(TaskRequest $request)
    {
        return $this->taskService->createTask($request);
    }

    // etc...
}
```

## Step 6: Global Exception Handling

Create a global exception handler (similar to Laravel's exception handler):

```java
// src/main/java/com/example/taskapi/exception/TaskNotFoundException.java
package com.example.taskapi.exception;

public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException(String message) {
        super(message);
    }
}
```

```java
// src/main/java/com/example/taskapi/exception/GlobalExceptionHandler.java
package com.example.taskapi.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTaskNotFound(TaskNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ValidationErrorResponse errorResponse = new ValidationErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation failed",
                errors,
                LocalDateTime.now()
        );

        return ResponseEntity.badRequest().body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An unexpected error occurred",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

// Error response classes
record ErrorResponse(int status, String message, LocalDateTime timestamp) {}

record ValidationErrorResponse(
        int status,
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp
) {}
```

**Laravel Comparison:**
```php
<?php
// app/Exceptions/Handler.php
class Handler extends ExceptionHandler
{
    public function render($request, Throwable $exception)
    {
        if ($exception instanceof ModelNotFoundException) {
            return response()->json([
                'message' => 'Resource not found'
            ], 404);
        }

        if ($exception instanceof ValidationException) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $exception->errors()
            ], 422);
        }

        return parent::render($request, $exception);
    }
}
```

## Step 7: Testing Your API

Let's create comprehensive tests for our API:

```java
// src/test/java/com/example/taskapi/controller/TaskControllerTest.java
package com.example.taskapi.controller;

import com.example.taskapi.entity.TaskStatus;
import com.example.taskapi.repository.TaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureTestWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureTestWebMvc
public class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
    }

    @Test
    void shouldCreateTask() throws Exception {
        String taskJson = """
            {
                "title": "Test Task",
                "description": "Test Description",
                "status": "TODO"
            }
        """;

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("Test Task")))
                .andExpect(jsonPath("$.description", is("Test Description")))
                .andExpect(jsonPath("$.status", is("TODO")))
                .andExpect(jsonPath("$.id", notNullValue()));
    }

    @Test
    void shouldReturnValidationErrorsForInvalidTask() throws Exception {
        String invalidTaskJson = """
            {
                "title": "",
                "description": "A".repeat(1001)
            }
        """;

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidTaskJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title", notNullValue()))
                .andExpect(jsonPath("$.errors.description", notNullValue()));
    }

    @Test
    void shouldReturn404ForNonExistentTask() throws Exception {
        mockMvc.perform(get("/api/tasks/999"))
                .andExpected(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("Task not found")));
    }
}
```

**Laravel Comparison:**
```php
<?php
// tests/Feature/TaskControllerTest.php
class TaskControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_task()
    {
        $response = $this->postJson('/api/tasks', [
            'title' => 'Test Task',
            'description' => 'Test Description',
            'status' => 'todo'
        ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'data' => [
                         'title' => 'Test Task',
                         'description' => 'Test Description',
                         'status' => 'todo'
                     ]
                 ]);
    }

    public function test_validates_required_fields()
    {
        $response = $this->postJson('/api/tasks', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['title']);
    }
}
```

## Testing Your API

Start your application:

```bash
./mvnw spring-boot:run
```

Test the endpoints:

```bash
# Create a task
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Spring Boot", "description": "Complete the tutorial series"}'

# Get all tasks
curl http://localhost:8080/api/tasks

# Get task by ID
curl http://localhost:8080/api/tasks/1

# Update task
curl -X PUT http://localhost:8080/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Master Spring Boot", "status": "IN_PROGRESS"}'

# Delete task
curl -X DELETE http://localhost:8080/api/tasks/1
```

## Key Takeaways for Laravel Developers

1. **Explicit over Implicit**: Spring Boot favors explicit configuration and type declarations over Laravel's "magic"

2. **Layered Architecture**: Service layer separation is more common and encouraged in Spring Boot

3. **Validation at the Model**: Bean Validation annotations live on entities/DTOs, not in separate form requests

4. **Constructor Injection**: Preferred over field injection for better testability

5. **Comprehensive Testing**: MockMvc provides powerful testing capabilities similar to Laravel's HTTP tests

## What's Next?

In the next article, we'll dive deep into **data persistence with Spring Data JPA and PostgreSQL**. We'll cover:

- Setting up PostgreSQL with Docker
- Advanced JPA mappings and relationships
- Query methods and custom repositories
- Database migrations with Flyway
- Performance optimization techniques

You now have a solid foundation for building REST APIs with Spring Boot. The patterns we've established here—DTOs, service layers, proper exception handling, and comprehensive testing—will serve you well as we tackle more complex topics.

---

> **🚀 Ready to Continue?** The next article covers [Data Persistence with Spring Data JPA](/blog/msb-04-data-persistence-spring-data-jpa-postgresql) - where we'll build a robust data layer with PostgreSQL.
>
> **💡 Practice Tip:** Try extending this API with user authentication, task categories, or due dates. The patterns you've learned here will scale to any complexity level!
