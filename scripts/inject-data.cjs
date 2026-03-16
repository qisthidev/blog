const fs = require("fs");
const path = require("path");

const pFile = path.resolve("src/data/pseo/performance.json");
let data = JSON.parse(fs.readFileSync(pFile, "utf-8"));

// Clean up any incomplete attempts if my bad command messed it up.
data.entries = data.entries.filter(e => e.topic !== "row-level-security-rls-bypass-laravel" && e.topic !== "jsonb-gin-index-vs-eav-laravel" && e.topic !== "cursor-pagination-vs-offset-pagination-laravel" && e.topic !== "pg-trgm-trigram-similarity-vs-ilike-laravel");

const newEntries = [
  {
    "technology": "postgresql",
    "topic": "row-level-security-rls-bypass-laravel",
    "slug": "postgresql-row-level-security-rls-bypass-laravel",
    "explanation": "PostgreSQL Row-Level Security (RLS) acts as a database-tier safeguard, ensuring queries only return rows a user is authorized to see regardless of application-level bugs. In multi-tenant Laravel apps, developers often rely solely on Eloquent global scopes (`builder->where(\"tenant_id\", ...)`). If a developer forgets a scope or uses a raw query, data leakage occurs. Implementing RLS moves tenant isolation to PostgreSQL itself. However, Laravel connection pooling and state persistence (e.g., in Octane) can inadvertently bypass RLS if the PostgreSQL session variable (`app.current_tenant`) isn't explicitly reset or set on every request.",
    "problem_scenario": "You built a multi-tenant Laravel SaaS. You enabled PostgreSQL RLS to prevent cross-tenant data leaks. You deployed to production using Laravel Octane (Swoole). Because Octane workers persist database connections across requests, Tenant B makes a request immediately after Tenant A on the same worker. If Tenant B's request doesn't explicitly set the PostgreSQL session variable, it executes under Tenant A's RLS context, leaking Tenant A's data to Tenant B.",
    "solution_code": {
      "before": "// UNSAFE: Setting RLS context in Middleware without a reset\nclass TenantMiddleware\n{\n    public function handle($request, Closure $next)\n    {\n        $tenantId = $request->user()->tenant_id;\n        \n        // Sets the PostgreSQL session variable for RLS\n        DB::statement(\"SET app.current_tenant = ?\", [$tenantId]);\n        \n        return $next($request);\n        // Missing: What happens when the request is done? \n        // In Octane, this connection goes back to the pool STILL SET to $tenantId!\n    }\n}",
      "after": "// SAFE: Resetting RLS context to prevent cross-request leakage\nclass TenantMiddleware\n{\n    public function handle($request, Closure $next)\n    {\n        $tenantId = $request->user()->tenant_id;\n        DB::statement(\"SET LOCAL app.current_tenant = ?\", [$tenantId]);\n        \n        try {\n            return $next($request);\n        } finally {\n            // CRITICAL: Reset the session variable before releasing the connection\n            // Or use SET LOCAL which only lasts for the current transaction\n            // (Assuming you wrap requests in transactions)\n            DB::statement(\"RESET app.current_tenant\");\n        }\n    }\n}\n\n-- PostgreSQL RLS Policy:\n-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;\n-- CREATE POLICY tenant_isolation_policy ON orders\n--     USING (tenant_id = current_setting('app.current_tenant')::uuid);",
      "language": "php"
    },
    "performance_impact": "Zero application-level overhead for missing global scopes, guarantees 100% data isolation at the database layer, while maintaining ~1ms connection reset overhead.",
    "metrics": [
      { "metric": "Data Leakage Risk", "before": "High (Depends on developers)", "after": "0% (Enforced by PostgreSQL)" },
      { "metric": "Query Overhead", "before": "Added WHERE clause", "after": "Transparent RLS filtering" },
      { "metric": "Connection Reset Time", "before": "N/A", "after": "0.5ms (RESET statement)" },
      { "metric": "Security Layer", "before": "Application Only", "after": "Application + Database" }
    ],
    "related_articles": ["postgresql", "laravel", "security", "multi-tenancy", "advanced-postgresql-laravel"],
    "faqs": [
      {
        "question": "Does Row Level Security (RLS) impact PostgreSQL query performance?",
        "answer": "RLS policies are essentially invisible WHERE clauses appended to every query by the database engine. If the columns used in the RLS policy (like tenant_id) are properly indexed, the performance impact is negligible (less than 1ms). However, complex RLS policies involving subqueries can cause significant degradation, so keep policies simple."
      },
      {
        "question": "How do I bypass RLS for background jobs or admin tasks in Laravel?",
        "answer": "To bypass RLS, you must either connect using a PostgreSQL role that has the `BYPASSRLS` attribute (e.g., a superuser, which is dangerous), or temporarily disable it for the transaction using `SET LOCAL row_security = OFF`. For Laravel artisan commands or admin dashboards, it's safer to set a special bypass flag in your session variables that your policy explicitly permits."
      }
    ]
  },
  {
    "technology": "postgresql",
    "topic": "jsonb-gin-index-vs-eav-laravel",
    "slug": "postgresql-jsonb-gin-index-vs-eav-laravel",
    "explanation": "The Entity-Attribute-Value (EAV) pattern is a legacy approach for handling dynamic schemas (like user settings or product attributes) where data is spread across multiple tables and requires expensive JOINs. PostgreSQL's JSONB column type combined with a GIN (Generalized Inverted Index) offers a massively superior alternative. JSONB stores structured data in a binary format, and a GIN index allows lightning-fast searches inside the JSON document—eliminating JOINs entirely while preserving schema flexibility.",
    "problem_scenario": "Your Laravel e-commerce app has products with varying attributes (T-shirts have sizes, Laptops have RAM). You used an EAV pattern with `products`, `attributes`, and `product_attribute_values` tables. To find all 'Large' 'Red' products, Laravel generates a complex query with multiple INNER JOINs. As the catalog grows to 500,000 products, this query takes 3+ seconds.",
    "solution_code": {
      "before": "-- EAV Pattern (Slow, Complex)\nSELECT p.* FROM products p\nJOIN product_attribute_values c ON c.product_id = p.id \nJOIN attributes ca ON c.attribute_id = ca.id AND ca.name = 'color'\nJOIN product_attribute_values s ON s.product_id = p.id \nJOIN attributes sa ON s.attribute_id = sa.id AND sa.name = 'size'\nWHERE c.value = 'Red' AND s.value = 'Large';\n\n-- In Laravel:\n$products = Product::whereHas('attributes', function($q) {\n    $q->where('name', 'color')->where('value', 'Red');\n})->whereHas('attributes', function($q) {\n    $q->where('name', 'size')->where('value', 'Large');\n})->get();",
      "after": "-- PostgreSQL JSONB + GIN Index (Fast, Simple)\n-- Add a JSONB column and an index:\nALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;\nCREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);\n\n-- The query eliminates all JOINs and uses the index operator @>\nSELECT * FROM products \nWHERE attributes @> '{\"color\": \"Red\", \"size\": \"Large\"}'::jsonb;\n\n-- In Laravel:\n$products = Product::whereJsonContains('attributes', [\n    'color' => 'Red',\n    'size' => 'Large'\n])->get();",
      "language": "sql"
    },
    "performance_impact": "Query performance improved by 100x (3000ms to 30ms) by eliminating multiple table JOINs, replacing them with a single GIN index lookup.",
    "metrics": [
      { "metric": "Query Execution Time", "before": "3,200ms", "after": "30ms" },
      { "metric": "Required Database JOINs", "before": "4 JOINs per query", "after": "0 JOINs" },
      { "metric": "Database Storage Footprint", "before": "High (Millions of EAV rows)", "after": "Low (Compact JSONB format)" },
      { "metric": "Laravel Eloquent Overhead", "before": "Heavy (Hydrating pivot models)", "after": "Light (Native array casting)" }
    ],
    "related_articles": ["postgresql", "laravel", "database", "performance", "advanced-postgresql-laravel"],
    "faqs": [
      {
        "question": "What is the difference between JSON and JSONB in PostgreSQL?",
        "answer": "The `json` data type stores an exact copy of the input text, which must be reparsed every time it is queried. The `jsonb` data type is stored in a decomposed binary format. While `jsonb` is slightly slower to insert due to the conversion, it is significantly faster to process and supports GIN indexing, making it the definitive choice for Laravel applications."
      },
      {
        "question": "Can I enforce constraints on JSONB data?",
        "answer": "Yes. While JSONB allows schematic flexibility, you can enforce required keys or types using PostgreSQL check constraints. For example: `ALTER TABLE users ADD CONSTRAINT check_settings CHECK (settings ? 'theme' AND settings->>'theme' IN ('dark', 'light'));`. You can also use Laravel Form Requests for validation before insertion."
      }
    ]
  },
  {
    "technology": "postgresql",
    "topic": "cursor-pagination-vs-offset-pagination-laravel",
    "slug": "postgresql-cursor-pagination-vs-offset-pagination-laravel",
    "explanation": "Offset pagination (`LIMIT 15 OFFSET 10000`) is the default in Laravel (`paginate()`) but becomes catastrophically slow on large PostgreSQL tables. To fulfill an OFFSET query, PostgreSQL must fetch, sort, and discard all rows before the offset point—meaning page 10,000 scans 150,000 rows just to throw away 149,985 of them. Cursor pagination (`cursorPaginate()`) solves this by using a WHERE clause on an ordered index (e.g., `WHERE id > 150000 ORDER BY id LIMIT 15`). It executes instantly regardless of depth.",
    "problem_scenario": "Your Laravel application exposes an API endpoint serving 10 million transaction records. Users complain that fetching page 1 is fast, but navigating to page 5,000 causes the API to time out after 10 seconds. Your database CPU spikes because PostgreSQL is performing an expensive disk sort and sequential scan to discard millions of rows for every deep pagination request.",
    "solution_code": {
      "before": "-- OFFSET Pagination (Catastrophic on deep pages)\nSELECT * FROM transactions \nORDER BY created_at DESC \nLIMIT 15 OFFSET 150000;\n\n-- PostgreSQL EXPLAIN:\n-- Limit  (cost=12345.00..12346.00 rows=15)\n--   -> Sort  (cost=10000.00..15000.00 rows=10000000)\n--        Sort Key: created_at DESC\n--        -> Seq Scan on transactions\n\n-- In Laravel:\n$transactions = Transaction::orderBy('created_at', 'desc')->paginate(15);",
      "after": "-- Cursor Pagination (Instant on any page)\n-- Requires an index: CREATE INDEX idx_trans_created ON transactions(created_at DESC, id DESC);\n\n-- Instead of OFFSET, it uses the last seen values:\nSELECT * FROM transactions \nWHERE (created_at, id) < ('2025-03-01 10:00:00', 987654) \nORDER BY created_at DESC, id DESC \nLIMIT 15;\n\n-- PostgreSQL EXPLAIN:\n-- Limit  (cost=0.43..1.50 rows=15)\n--   -> Index Scan using idx_trans_created on transactions\n--        Index Cond: RowCompare((created_at, id), <, ...)\n\n-- In Laravel:\n$transactions = Transaction::orderBy('created_at', 'desc')->cursorPaginate(15);",
      "language": "php"
    },
    "performance_impact": "Deep pagination response times dropped from 10+ seconds (timeout) to 2ms, providing O(1) constant time performance regardless of how many pages the user navigates.",
    "metrics": [
      { "metric": "Page 10,000 query time", "before": "12,400ms", "after": "2ms" },
      { "metric": "Database CPU usage", "before": "High (Disk Sorting)", "after": "Low (Index Scan)" },
      { "metric": "Rows scanned by PostgreSQL", "before": "150,015 rows", "after": "15 rows" },
      { "metric": "Memory footprint", "before": "Large Sort Buffer", "after": "Minimal" }
    ],
    "related_articles": ["postgresql", "laravel", "performance", "api", "advanced-postgresql-laravel"],
    "faqs": [
      {
        "question": "What are the limitations of cursor pagination in Laravel?",
        "answer": "Cursor pagination does not support `total()` page counts or jumping to a specific page number (e.g., navigating directly to Page 5). It only supports `Next` and `Previous` links. This makes it perfect for endless scrolling interfaces or API integrations, but unsuitable for traditional numbered pagination UI."
      },
      {
        "question": "Why does Laravel's cursorPaginate require ordering by ID as well?",
        "answer": "Cursor pagination relies on strict ordering to know exactly where to resume. If you order by `created_at` and multiple records have the exact same timestamp, the cursor might skip records or create duplicates across pages. Laravel automatically appends the primary key (e.g., `id`) to the sort order to ensure absolute determinism."
      }
    ]
  },
  {
    "technology": "postgresql",
    "topic": "pg-trgm-trigram-similarity-vs-ilike-laravel",
    "slug": "postgresql-pg-trgm-trigram-similarity-vs-ilike-laravel",
    "explanation": "Standard B-tree indexes cannot optimize partial substring searches (e.g., `WHERE name ILIKE '%john%'`), forcing PostgreSQL to perform a full sequential table scan. For applications requiring fast fuzzy search or autocomplete across millions of rows without deploying Elasticsearch, the `pg_trgm` extension is the solution. It breaks text into trigrams (3-letter chunks) and uses a GIN or GiST index to quickly find rows matching substrings or calculating spelling similarity.",
    "problem_scenario": "Your Laravel application has a user directory with 2 million users. Users frequently search for partial names (`LIKE '%smith%'`). The query takes 800ms because it scans all 2 million rows. You also want to support typos (e.g., `smithe` finding `smith`), but `ILIKE` requires exact substring matches, frustrating your users and slowing down the server.",
    "solution_code": {
      "before": "-- Slow: Sequential scan required for leading wildcard\nEXPLAIN ANALYZE \nSELECT * FROM users WHERE name ILIKE '%smit%';\n-- Seq Scan on users (actual time=0.03..850.00 rows=520)\n-- Filter: ((name)::text ~~* '%smit%'::text)\n\n-- In Laravel:\n$users = User::where('name', 'ILIKE', \"%{$query}%\")->get();",
      "after": "-- Fast: pg_trgm extension with GIN index\nCREATE EXTENSION IF NOT EXISTS pg_trgm;\n\n-- Create a GIN index using the trigram operator class\nCREATE INDEX CONCURRENTLY idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);\n\n-- Now ILIKE uses the index instantly!\nEXPLAIN ANALYZE \nSELECT * FROM users WHERE name ILIKE '%smit%';\n-- Bitmap Heap Scan on users (actual time=0.1..2.5 rows=520)\n--   -> Bitmap Index Scan on idx_users_name_trgm\n\n-- Bonus: Fuzzy searching for typos using similarity (> 0.3 threshold)\nSELECT name, similarity(name, 'smithe') as score \nFROM users \nWHERE name % 'smithe' \nORDER BY score DESC LIMIT 10;\n\n-- In Laravel (using raw queries for similarity):\n$users = User::whereRaw('name % ?', [$query])\n             ->orderByRaw('similarity(name, ?) DESC', [$query])\n             ->limit(10)->get();",
      "language": "sql"
    },
    "performance_impact": "Keyword search speed improved by 340x (850ms to 2.5ms) while adding the ability to tolerate spelling mistakes without requiring a heavy Elasticsearch cluster.",
    "metrics": [
      { "metric": "Query execution time", "before": "850ms", "after": "2.5ms" },
      { "metric": "PostgreSQL Scan Type", "before": "Sequential Scan", "after": "Bitmap Index Scan" },
      { "metric": "Typo Tolerance", "before": "None", "after": "Full (Trigram Similarity)" },
      { "metric": "Infrastructure complexity", "before": "Need external search engine", "after": "Native PostgreSQL database" }
    ],
    "related_articles": ["postgresql", "search", "laravel", "database", "advanced-postgresql-laravel"],
    "faqs": [
      {
        "question": "Should I use GIN or GiST indexes for pg_trgm?",
        "answer": "Use GIN. GIN index lookups are about 3 times faster than GiST for trigram searches. The only downside is that GIN indexes take longer to build and update slightly more slowly on INSERTs. For a typical Laravel app where reads dramatically outnumber writes, GIN is the preferred indexing method for text search."
      },
      {
        "question": "Can I use pg_trgm instead of Elasticsearch/Meilisearch in Laravel Scout?",
        "answer": "Yes! For datasets up to roughly 10-20 million rows, `pg_trgm` provides excellent performance and completely eliminates the operational overhead of running a separate search cluster. You can even write a custom Laravel Scout engine driver that leverages underlying `pg_trgm` similarity functions."
      }
    ]
  }
];

data.entries.push(...newEntries);
fs.writeFileSync(pFile, JSON.stringify(data, null, 2) + "\\n");

console.log("Successfully injected 4 PostgreSQL performance payload entries!");
