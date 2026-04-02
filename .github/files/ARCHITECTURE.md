# LinkTic E-Commerce Platform — Architecture Document

> **Version:** 1.0.0
> **Date:** 2025-07-10
> **Status:** Approved
> **Author:** Senior Cloud Architect

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Component Descriptions](#4-component-descriptions)
5. [Data Architecture](#5-data-architecture)
6. [Inter-Service Communication](#6-inter-service-communication)
7. [API Design](#7-api-design)
8. [Cloud Simulation with Docker Compose](#8-cloud-simulation-with-docker-compose)
9. [Cloud-Ready Design — AWS Mapping](#9-cloud-ready-design--aws-mapping)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Security Considerations](#11-security-considerations)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Technical Decisions Log (ADR-Style)](#13-technical-decisions-log-adr-style)

---

## 1. Executive Summary

The **LinkTic E-Commerce Platform** is a backend-focused, cloud-ready microservices system designed to manage two core business domains: **product catalogue management** and **order processing**. It is built as a technical assessment to demonstrate modern backend engineering practices applicable to production-grade environments.

### Purpose

Provide a scalable, maintainable, and independently deployable backend foundation for an e-commerce operation, with strict domain isolation, automated delivery pipelines, and a clear cloud migration path.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime Framework | NestJS ^11.x (Node.js 22 LTS) | Opinionated, modular, TypeScript-first |
| Architecture Style | Microservices | Independent scalability and deployability per domain |
| Persistence | PostgreSQL 17 + TypeORM ^0.3.x | Proven relational store with ORM abstraction |
| Database Strategy | Database-per-service | Full domain isolation, independent schema evolution |
| Inter-service Communication | HTTP (synchronous REST) | Simplicity for MVP; cloud-native upgrade path available |
| Entry Point | API Gateway | Single public surface, routing decoupling |
| Local Simulation | Docker Compose v2 | Cloud-equivalent topology without infrastructure cost |
| Primary Key Strategy | UUID v4 | Globally unique, no central coordinator needed |
| CI/CD | GitHub Actions | Native VCS integration, path-filtered per service |

### System Boundaries

The system exposes a single public entry point — the **API Gateway** — and internally routes requests to two autonomous microservices. All external clients (browsers, mobile apps, third-party integrations) interact exclusively through this gateway. No microservice is directly reachable from the public internet.

---

## 2. Architecture Overview

### Why Microservices?

Although this is a simplified assessment platform, the microservices approach was chosen deliberately to demonstrate production-grade thinking:

| Concern | Monolith | Microservices (chosen) |
|---|---|---|
| Domain isolation | Shared codebase | Explicit service boundaries |
| Independent deployability | Full rebuild/redeploy | Deploy only the changed service |
| Technology flexibility | Single stack forced | Each service can evolve independently |
| Fault isolation | Single point of failure | Failure in one service does not cascade |
| Team scalability | Merge conflicts, coordination overhead | Independent ownership per service |

The two business domains — **products** and **orders** — have clearly different data models, lifecycle frequencies, and scalability profiles. Products are read-heavy (catalogue browsing); orders are write-heavy and transactional. Separating them allows independent horizontal scaling.

### Scalability Approach

```
Scale-out strategy:
  products-service  →  Read replica DB + horizontal pod replication (high read throughput)
  orders-service    →  Write-optimised DB + queue-backed async processing (high write throughput)
  api-gateway       →  Stateless; scale horizontally behind a load balancer
```

Each service is **stateless** — all state lives in its dedicated database. This means any number of service replicas can be added behind a load balancer with zero code change.

### Maintainability Strategy

- **Module cohesion**: Each NestJS service is built around the single responsibility principle — one module per domain entity.
- **Shared conventions**: Global pipes, filters, and interceptors enforce a uniform request/response contract across all services, reducing cognitive overhead when switching between them.
- **Schema isolation**: Each service owns and migrates its own database schema. There is no shared schema or cross-service foreign key.
- **Swagger documentation**: Every service auto-generates interactive API documentation at `/api/docs`, keeping documentation in sync with implementation.

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONCERN BOUNDARIES                          │
├──────────────────┬──────────────────────┬───────────────────────────┤
│ API Gateway      │ products-service     │ orders-service            │
│                  │                      │                           │
│ • Routing        │ • Product CRUD       │ • Order lifecycle         │
│ • Entry point    │ • Catalogue rules    │ • Inventory validation    │
│ • Load balance   │ • Product schema     │ • Order-product relation  │
│ • Rate limiting  │ • products_db only   │ • orders_db only          │
│ (future)         │                      │                           │
└──────────────────┴──────────────────────┴───────────────────────────┘
```

---

## 3. System Architecture Diagram

### 3.1 Full System Topology

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          LINKTIC E-COMMERCE PLATFORM                                ║
║                         Local Cloud Simulation (Docker)                              ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                            PUBLIC ZONE (Host Machine)                           │
  │                                                                                 │
  │   ┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐   │
  │   │    Browser   │       │  REST Client │       │   CI/CD (GitHub Actions) │   │
  │   │  / Mobile    │       │  (Postman,   │       │   (see diagram §3.2)     │   │
  │   │    App       │       │   curl, etc) │       │                          │   │
  │   └──────┬───────┘       └──────┬───────┘       └──────────────────────────┘   │
  │          │                      │                                               │
  │          └──────────┬───────────┘                                               │
  │                     │  HTTP  :3000                                               │
  └─────────────────────┼─────────────────────────────────────────────────────────┘
                        │
  ┌─────────────────────┼──────────── Docker bridge network: backend ──────────────┐
  │                     ▼                                                           │
  │   ┌─────────────────────────────────────────────────────────────────────────┐  │
  │   │                       API GATEWAY                                       │  │
  │   │                  Container: api-gateway                                 │  │
  │   │                  Internal port: 3000                                    │  │
  │   │                  External port: 3000                                    │  │
  │   │                  Image: node:22-alpine                                  │  │
  │   │                  Framework: NestJS ^11.x                                │  │
  │   │                                                                         │  │
  │   │   Routes:                                                               │  │
  │   │   /api/products/** ──────────────────────────────────────────────────► │  │
  │   │   /api/orders/**   ───────────────────────────────────────────────►    │  │
  │   │   /api/health      ─── gateway health check                            │  │
  │   └──────────────────────────┬─────────────────────┬───────────────────────┘  │
  │                              │                     │                           │
  │            HTTP :3000        │                     │  HTTP :3000               │
  │     (Docker DNS resolution)  │                     │  (Docker DNS resolution)  │
  │                              ▼                     ▼                           │
  │   ┌───────────────────────────────┐   ┌───────────────────────────────────┐   │
  │   │       PRODUCTS SERVICE        │   │         ORDERS SERVICE            │   │
  │   │  Container: products-service  │   │  Container: orders-service        │   │
  │   │  Internal port: 3000          │   │  Internal port: 3000              │   │
  │   │  External port: 3001          │   │  External port: 3002              │   │
  │   │  Image: node:22-alpine        │   │  Image: node:22-alpine            │   │
  │   │  Framework: NestJS ^11.x      │   │  Framework: NestJS ^11.x          │   │
  │   │  ORM: TypeORM ^0.3.x          │   │  ORM: TypeORM ^0.3.x              │   │
  │   │                               │   │                                   │   │
  │   │  Endpoints:                   │   │  Endpoints:                       │   │
  │   │  GET  /api/products           │   │  GET  /api/orders                 │   │
  │   │  POST /api/products           │   │  POST /api/orders                 │   │
  │   │  GET  /api/products/:id       │   │  GET  /api/orders/:id             │   │
  │   │  PATCH /api/products/:id      │   │  GET  /api/health                 │   │
  │   │  DELETE /api/products/:id     │   │  GET  /api/docs (Swagger)         │   │
  │   │  GET  /api/health             │◄──┤                                   │   │
  │   │  GET  /api/docs (Swagger)     │   │  HTTP call to validate product    │   │
  │   │                               │   │  before creating order            │   │
  │   └───────────────┬───────────────┘   └──────────────────┬────────────────┘   │
  │                   │                                       │                    │
  │          SQL :5432│                              SQL :5432│                    │
  │                   ▼                                       ▼                    │
  │   ┌───────────────────────────────┐   ┌───────────────────────────────────┐   │
  │   │         PRODUCTS DB           │   │           ORDERS DB               │   │
  │   │  Container: products-db       │   │  Container: orders-db             │   │
  │   │  Image: postgres:17-alpine    │   │  Image: postgres:17-alpine        │   │
  │   │  Internal port: 5432          │   │  Internal port: 5432              │   │
  │   │  External port: 5432          │   │  External port: 5433              │   │
  │   │  Database: products_db        │   │  Database: orders_db              │   │
  │   │  Volume: products_data        │   │  Volume: orders_data              │   │
  │   └───────────────────────────────┘   └───────────────────────────────────┘   │
  │                                                                                │
  └────────────────────────────────────────────────────────────────────────────────┘
                        Docker bridge network: backend
                        (All containers resolve each other by service name)
```

### 3.2 CI/CD Pipeline Diagram

```
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │                        GITHUB ACTIONS CI/CD PIPELINE                          │
  │                                                                               │
  │  Trigger: push/PR to main or develop (path filter per service)               │
  │                                                                               │
  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
  │  │          │   │          │   │          │   │          │   │          │  │
  │  │ Checkout │──►│ Install  │──►│  Lint &  │──►│  Build   │──►│  Test    │  │
  │  │   Code   │   │   Deps   │   │  Format  │   │ (tsc)    │   │ (Jest)   │  │
  │  │          │   │  (npm ci)│   │(eslint)  │   │          │   │          │  │
  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘  │
  │                                                                     │        │
  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │        │
  │  │          │   │          │   │          │   │          │        │        │
  │  │ Simulate │◄──│  Version │◄──│Changelog │◄──│  Docker  │◄───────┘        │
  │  │  Deploy  │   │   Bump   │   │   Gen    │   │  Build   │                  │
  │  │(docker-  │   │(npm ver- │   │(convent- │   │& Push    │                  │
  │  │ compose) │   │ sion     │   │ional-    │   │(ghcr.io/ │                  │
  │  │          │   │ patch)   │   │changelog)│   │ ECR)     │                  │
  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘                  │
  │                                                                               │
  │  Pipelines run independently per service:                                    │
  │  • .github/workflows/products-service.yml  → paths: services/products/**    │
  │  • .github/workflows/orders-service.yml    → paths: services/orders/**      │
  │  • .github/workflows/api-gateway.yml       → paths: api-gateway/**          │
  └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Descriptions

### 4.1 API Gateway

| Attribute | Detail |
|---|---|
| **Container Name** | `api-gateway` |
| **Framework** | NestJS ^11.x |
| **Runtime** | Node.js 22 LTS (Alpine) |
| **Internal Port** | 3000 |
| **External Port** | 3000 |
| **Primary Responsibility** | Single entry point for all external clients. Routes incoming requests to the appropriate downstream microservice using path-based routing. Abstracts service topology from consumers. |
| **Dependencies** | `products-service`, `orders-service` (HTTP) |

**Routing Table:**

| Incoming Path | Forwarded To | Target Service |
|---|---|---|
| `GET /api/products/**` | `http://products-service:3000/api/products/**` | products-service |
| `GET /api/orders/**` | `http://orders-service:3000/api/orders/**` | orders-service |
| `POST /api/products` | `http://products-service:3000/api/products` | products-service |
| `POST /api/orders` | `http://orders-service:3000/api/orders` | orders-service |
| `GET /api/health` | Gateway self health-check | api-gateway |

**Key Responsibilities:**
- Path-based reverse proxy / HTTP forwarding
- Centralised CORS configuration
- Rate limiting (future enhancement)
- Authentication middleware injection point (JWT validation before forwarding)

---

### 4.2 Products Service

| Attribute | Detail |
|---|---|
| **Container Name** | `products-service` |
| **Framework** | NestJS ^11.x |
| **Runtime** | Node.js 22 LTS (Alpine) |
| **Internal Port** | 3000 |
| **External Port** | 3001 |
| **Primary Responsibility** | Manages the product catalogue. Full CRUD lifecycle for product entities. Source of truth for product existence and metadata. |
| **Database** | `products_db` on container `products-db` (PostgreSQL 17) |
| **Dependencies** | `products-db` (TypeORM/SQL) |

**NestJS Module Structure:**
```
ProductsModule
  ├── ProductsController   → HTTP handlers for /api/products
  ├── ProductsService      → Business logic layer
  ├── Product (Entity)     → TypeORM entity mapped to `products` table
  └── ProductsRepository   → Data access layer (TypeORM repository pattern)
```

**Global Enhancements Applied:**
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `AllExceptionsFilter` → uniform error envelope `{ statusCode, timestamp, path, message }`
- `TransformInterceptor` → uniform success envelope `{ success, data, timestamp }`

---

### 4.3 Orders Service

| Attribute | Detail |
|---|---|
| **Container Name** | `orders-service` |
| **Framework** | NestJS ^11.x |
| **Runtime** | Node.js 22 LTS (Alpine) |
| **Internal Port** | 3000 |
| **External Port** | 3002 |
| **Primary Responsibility** | Manages order creation, tracking, and lifecycle. Validates product existence before persisting an order by calling the products-service. Maintains the relationship between orders and their line items. |
| **Database** | `orders_db` on container `orders-db` (PostgreSQL 17) |
| **Dependencies** | `orders-db` (TypeORM/SQL), `products-service` (HTTP via HttpModule) |

**NestJS Module Structure:**
```
OrdersModule
  ├── OrdersController     → HTTP handlers for /api/orders
  ├── OrdersService        → Business logic + inter-service orchestration
  ├── Order (Entity)       → TypeORM entity mapped to `orders` table
  ├── OrderItem (Entity)   → TypeORM entity mapped to `order_items` table
  ├── OrdersRepository     → Data access layer
  └── ProductsClientService → HttpModule wrapper to call products-service
```

---

### 4.4 Products Database (`products_db`)

| Attribute | Detail |
|---|---|
| **Container Name** | `products-db` |
| **Image** | `postgres:17-alpine` |
| **Internal Port** | 5432 |
| **External Port** | 5432 |
| **Database Name** | `products_db` |
| **Volume** | `products_data` (named Docker volume) |
| **Accessed By** | `products-service` only |

---

### 4.5 Orders Database (`orders_db`)

| Attribute | Detail |
|---|---|
| **Container Name** | `orders-db` |
| **Image** | `postgres:17-alpine` |
| **Internal Port** | 5432 |
| **External Port** | 5433 |
| **Database Name** | `orders_db` |
| **Volume** | `orders_data` (named Docker volume) |
| **Accessed By** | `orders-service` only |

---

## 5. Data Architecture

### 5.1 Entity-Relationship Diagram

```
  products_db (owned by products-service)
  ┌──────────────────────────────────────────┐
  │                 products                 │
  ├──────────────────────────────────────────┤
  │ id          UUID         PK NOT NULL     │
  │ name        VARCHAR(255) NOT NULL        │
  │ description TEXT                        │
  │ price       DECIMAL(10,2) NOT NULL       │
  │ stock       INT           NOT NULL       │
  │ created_at  TIMESTAMP    DEFAULT NOW()   │
  │ updated_at  TIMESTAMP    DEFAULT NOW()   │
  └──────────────────────────────────────────┘

  ─ ─ ─ ─ ─ ─ ─ ─ service boundary ─ ─ ─ ─ ─ ─ ─ ─

  orders_db (owned by orders-service)
  ┌────────────────────────────────────────────┐
  │                   orders                   │
  ├────────────────────────────────────────────┤
  │ id           UUID         PK NOT NULL      │
  │ status       ENUM         NOT NULL         │  ← 'pending' | 'confirmed' | 'cancelled'
  │ total_amount DECIMAL(10,2) NOT NULL        │
  │ created_at   TIMESTAMP    DEFAULT NOW()    │
  │ updated_at   TIMESTAMP    DEFAULT NOW()    │
  └─────────────────────┬──────────────────────┘
                        │ 1
                        │ has many
                        │ N
  ┌─────────────────────┴──────────────────────┐
  │                 order_items                 │
  ├─────────────────────────────────────────────┤
  │ id           UUID         PK NOT NULL       │
  │ order_id     UUID         FK → orders.id    │
  │ product_id   UUID         NOT NULL          │  ← logical reference only (no DB FK)
  │ product_name VARCHAR(255) NOT NULL          │  ← snapshot at order time
  │ unit_price   DECIMAL(10,2) NOT NULL         │  ← snapshot at order time
  │ quantity     INT          NOT NULL          │
  │ subtotal     DECIMAL(10,2) NOT NULL         │
  │ created_at   TIMESTAMP    DEFAULT NOW()     │
  └─────────────────────────────────────────────┘
```

> **Important design note:** `order_items.product_id` is a **logical reference** to `products.id`, not a database foreign key. Since `products` lives in a different database, cross-database FK constraints are not used. Instead, the products-service is called at order creation time to validate existence, and product name and price are **snapshotted** into `order_items` to preserve historical accuracy even if a product is later modified or deleted.

---

### 5.2 Entity Descriptions

#### Product

The core catalogue entity. Represents a sellable item with its pricing and stock information.

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Globally unique identifier, auto-generated |
| `name` | VARCHAR(255) | Product display name |
| `description` | TEXT | Optional long-form description |
| `price` | DECIMAL(10,2) | Unit price in local currency |
| `stock` | INT | Available inventory units |
| `created_at` | TIMESTAMP | Record creation time (automatic) |
| `updated_at` | TIMESTAMP | Last modification time (automatic) |

#### Order

Represents a customer purchase transaction. Contains the aggregate total and lifecycle status.

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Globally unique identifier |
| `status` | ENUM | `pending` → `confirmed` → `cancelled` |
| `total_amount` | DECIMAL(10,2) | Sum of all line item subtotals |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last status change time |

#### OrderItem

A single line item within an order. Captures the product reference, quantity, and a price snapshot.

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Globally unique identifier |
| `order_id` | UUID (FK) | Reference to parent order |
| `product_id` | UUID | Logical reference to product (no DB FK) |
| `product_name` | VARCHAR(255) | Snapshot of product name at order time |
| `unit_price` | DECIMAL(10,2) | Snapshot of price at order time |
| `quantity` | INT | Number of units ordered |
| `subtotal` | DECIMAL(10,2) | `unit_price × quantity` |

---

### 5.3 Database Isolation Rationale

Using one database per microservice enforces **true domain isolation**:

1. **Independent deployments**: Schema migrations in `products_db` have zero impact on `orders_db` and vice versa.
2. **Technology flexibility**: Each database can evolve to a different engine if needed (e.g., orders → NoSQL document store) without touching the other service.
3. **Blast radius containment**: A corrupt or unavailable `products_db` does not prevent existing orders from being read from `orders_db`.
4. **Ownership clarity**: The team responsible for `orders-service` controls all migrations and schema changes in `orders_db` with no coordination needed with the products team.
5. **Security boundaries**: Database credentials are service-scoped. `orders-service` literally cannot connect to `products_db` — there are no credentials for it.

---

## 6. Inter-Service Communication

### 6.1 Communication Pattern

The `orders-service` calls the `products-service` **synchronously over HTTP** using NestJS's `HttpModule` (Axios under the hood) when creating a new order. This is the only cross-service call in the current architecture.

```
Communication model: Request-Response (synchronous HTTP REST)
Protocol:           HTTP/1.1
Service discovery:  Docker internal DNS (container names as hostnames)
Target URL:         http://products-service:3000/api/products/:id
```

### 6.2 Order Creation Sequence Diagram

```
  Client          API Gateway       orders-service    products-service    orders_db
    │                  │                  │                  │                │
    │  POST /api/orders│                  │                  │                │
    │─────────────────►│                  │                  │                │
    │                  │  HTTP forward    │                  │                │
    │                  │─────────────────►│                  │                │
    │                  │                  │                  │                │
    │                  │                  │ Validate input   │                │
    │                  │                  │ (ValidationPipe) │                │
    │                  │                  │                  │                │
    │                  │                  │  For each item:  │                │
    │                  │                  │  GET /api/products/:id            │
    │                  │                  │─────────────────►│                │
    │                  │                  │                  │ SELECT product │
    │                  │                  │                  │───────────────►│
    │                  │                  │                  │  product data  │
    │                  │                  │                  │◄───────────────│
    │                  │                  │  200 { data: {   │                │
    │                  │                  │    id, name,     │                │
    │                  │                  │    price, ... }} │                │
    │                  │                  │◄─────────────────│                │
    │                  │                  │                  │                │
    │                  │                  │ [product not found → 404]         │
    │                  │                  │ [products-service down → 503]     │
    │                  │                  │                  │                │
    │                  │                  │ Snapshot price & name             │
    │                  │                  │ Calculate subtotals               │
    │                  │                  │ Build Order + OrderItems          │
    │                  │                  │                  │                │
    │                  │                  │  INSERT order + order_items       │
    │                  │                  │───────────────────────────────────►
    │                  │                  │                  │  order saved   │
    │                  │                  │◄───────────────────────────────────
    │                  │                  │                  │                │
    │                  │  201 { success,  │                  │                │
    │                  │    data: order } │                  │                │
    │                  │◄─────────────────│                  │                │
    │  201 Created     │                  │                  │                │
    │◄─────────────────│                  │                  │                │
    │                  │                  │                  │                │
```

### 6.3 Error Handling for Inter-Service Calls

The `orders-service` must handle failures from `products-service` gracefully:

| Scenario | HTTP Status from products-service | orders-service Behaviour | Client Response |
|---|---|---|---|
| Product found | 200 OK | Continue order creation | 201 Created |
| Product not found | 404 Not Found | Abort, throw `NotFoundException` | 404 Not Found |
| products-service unavailable | Connection refused / 503 | Throw `ServiceUnavailableException` | 503 Service Unavailable |
| Invalid product ID format | 400 Bad Request | Caught by local `ValidationPipe` first | 400 Bad Request |
| Network timeout | Axios timeout | Throw `GatewayTimeoutException` | 504 Gateway Timeout |

All errors are formatted uniformly by `AllExceptionsFilter`:
```json
{
  "statusCode": 503,
  "timestamp": "2025-07-10T12:00:00.000Z",
  "path": "/api/orders",
  "message": "products-service is currently unavailable"
}
```

### 6.4 Service Discovery via Docker DNS

Within the `backend` Docker bridge network, each container is reachable by its **service name** as defined in `docker-compose.yml`. Docker's internal DNS resolver handles name-to-IP translation automatically.

```
Container name  →  Resolved hostname  →  Example URL
products-service   products-service      http://products-service:3000
orders-service     orders-service        http://orders-service:3000
products-db        products-db           postgresql://products-db:5432
orders-db          orders-db             postgresql://orders-db:5432
```

No external DNS, service mesh, or sidecar proxy is required for the local simulation. In the cloud deployment, this role is fulfilled by AWS Cloud Map, Kubernetes CoreDNS, or an internal Application Load Balancer.

---

## 7. API Design

### 7.1 Global Response Envelopes

All endpoints follow a uniform contract enforced by global NestJS interceptors and filters.

**Success response** (`TransformInterceptor`):
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-07-10T12:00:00.000Z"
}
```

**Error response** (`AllExceptionsFilter`):
```json
{
  "statusCode": 400,
  "timestamp": "2025-07-10T12:00:00.000Z",
  "path": "/api/products",
  "message": "Validation failed: name should not be empty"
}
```

---

### 7.2 Products Service Endpoints

Base URL (direct): `http://localhost:3001`
Base URL (via gateway): `http://localhost:3000`

| Method | Path | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Health check | 200 |
| `GET` | `/api/docs` | Swagger UI | 200 |
| `GET` | `/api/products` | List all products | 200 |
| `POST` | `/api/products` | Create a new product | 201, 400 |
| `GET` | `/api/products/:id` | Get product by ID (UUID) | 200, 404 |
| `PATCH` | `/api/products/:id` | Partially update a product | 200, 400, 404 |
| `DELETE` | `/api/products/:id` | Delete a product | 200, 404 |

**POST /api/products — Request Body:**
```json
{
  "name": "Laptop Pro 15",
  "description": "High-performance laptop for developers",
  "price": 1299.99,
  "stock": 50
}
```

**GET /api/products — Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Pro 15",
      "description": "High-performance laptop for developers",
      "price": "1299.99",
      "stock": 50,
      "created_at": "2025-07-10T12:00:00.000Z",
      "updated_at": "2025-07-10T12:00:00.000Z"
    }
  ],
  "timestamp": "2025-07-10T12:01:00.000Z"
}
```

---

### 7.3 Orders Service Endpoints

Base URL (direct): `http://localhost:3002`
Base URL (via gateway): `http://localhost:3000`

| Method | Path | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Health check | 200 |
| `GET` | `/api/docs` | Swagger UI | 200 |
| `GET` | `/api/orders` | List all orders | 200 |
| `POST` | `/api/orders` | Create a new order | 201, 400, 404, 503 |
| `GET` | `/api/orders/:id` | Get order by ID (UUID) | 200, 404 |

**POST /api/orders — Request Body:**
```json
{
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "product_id": "660e9500-f30c-52e5-b827-557766551111",
      "quantity": 1
    }
  ]
}
```

**POST /api/orders — Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "770fa600-g41d-63f6-c938-668877662222",
    "status": "pending",
    "total_amount": "3899.97",
    "items": [
      {
        "id": "880gb700-h52e-74g7-d049-779988773333",
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "product_name": "Laptop Pro 15",
        "unit_price": "1299.99",
        "quantity": 2,
        "subtotal": "2599.98"
      },
      {
        "id": "990hc800-i63f-85h8-e150-880099884444",
        "product_id": "660e9500-f30c-52e5-b827-557766551111",
        "product_name": "USB-C Hub",
        "unit_price": "1299.99",
        "quantity": 1,
        "subtotal": "1299.99"
      }
    ],
    "created_at": "2025-07-10T12:05:00.000Z",
    "updated_at": "2025-07-10T12:05:00.000Z"
  },
  "timestamp": "2025-07-10T12:05:00.000Z"
}
```

---

## 8. Cloud Simulation with Docker Compose

### 8.1 Strategy

Docker Compose v2 provides a **faithful local simulation** of a cloud microservices topology:

| Cloud Concept | Docker Compose Equivalent |
|---|---|
| VPC / Private Network | `backend` bridge network |
| Service endpoints (DNS) | Container service names |
| Managed databases (RDS) | PostgreSQL containers with named volumes |
| Secrets Manager | `.env` files per service |
| Container Registry (ECR) | Local Docker image builds |
| Load Balancer | API Gateway container |
| Health checks / readiness | `healthcheck` + `depends_on` conditions |
| Persistent storage | Named Docker volumes |
| Environment segregation | Multiple `.env` files (`.env.dev`, `.env.prod`) |

### 8.2 Docker Compose Service Topology

```yaml
# Logical structure (not actual file — see docker-compose.yml)

services:
  api-gateway:
    build: ./api-gateway
    ports: ["3000:3000"]
    networks: [backend]
    depends_on:
      products-service: { condition: service_healthy }
      orders-service:   { condition: service_healthy }
    env_file: ./api-gateway/.env
    restart: unless-stopped

  products-service:
    build: ./services/products
    ports: ["3001:3000"]
    networks: [backend]
    depends_on:
      products-db: { condition: service_healthy }
    env_file: ./services/products/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  orders-service:
    build: ./services/orders
    ports: ["3002:3000"]
    networks: [backend]
    depends_on:
      orders-db:        { condition: service_healthy }
      products-service: { condition: service_healthy }
    env_file: ./services/orders/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  products-db:
    image: postgres:17-alpine
    ports: ["5432:5432"]
    networks: [backend]
    volumes: [products_data:/var/lib/postgresql/data]
    env_file: ./services/products/.env.db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  orders-db:
    image: postgres:17-alpine
    ports: ["5433:5432"]
    networks: [backend]
    volumes: [orders_data:/var/lib/postgresql/data]
    env_file: ./services/orders/.env.db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  backend:
    driver: bridge

volumes:
  products_data:
  orders_data:
```

### 8.3 Environment Variables Per Service

```
# services/products/.env
NODE_ENV=development
PORT=3000
DB_HOST=products-db
DB_PORT=5432
DB_NAME=products_db
DB_USER=products_user
DB_PASS=products_secret
PRODUCTS_SERVICE_URL=http://products-service:3000
```

```
# services/orders/.env
NODE_ENV=development
PORT=3000
DB_HOST=orders-db
DB_PORT=5432
DB_NAME=orders_db
DB_USER=orders_user
DB_PASS=orders_secret
PRODUCTS_SERVICE_URL=http://products-service:3000
```

```
# api-gateway/.env
NODE_ENV=development
PORT=3000
PRODUCTS_SERVICE_URL=http://products-service:3000
ORDERS_SERVICE_URL=http://orders-service:3000
```

### 8.4 Running Locally

```bash
# Clone the repository
git clone https://github.com/linktic/ecommerce-platform.git
cd ecommerce-platform

# Start all services (detached)
docker compose up -d --build

# Check all services are healthy
docker compose ps

# Tail logs for a specific service
docker compose logs -f products-service

# Access endpoints
curl http://localhost:3000/api/health         # API Gateway health
curl http://localhost:3001/api/health         # Products Service health (direct)
curl http://localhost:3002/api/health         # Orders Service health (direct)
curl http://localhost:3001/api/docs           # Products Swagger UI
curl http://localhost:3002/api/docs           # Orders Swagger UI

# Stop and clean up
docker compose down
docker compose down -v   # Also remove volumes (WARNING: deletes all data)
```

### 8.5 Build Optimisation — Multi-Stage Dockerfile

Each service uses a multi-stage Docker build to minimise image size and leverage layer caching:

```
Stage 1 (deps):    node:22-alpine → npm ci (production deps only)
Stage 2 (build):   node:22-alpine → npm ci (all deps) + tsc build
Stage 3 (runtime): node:22-alpine → copy dist + prod deps → non-root user
```

This ensures the final image contains only compiled JavaScript and production dependencies — no TypeScript compiler, no dev dependencies, no source maps.

---

## 9. Cloud-Ready Design — AWS Mapping

### 9.1 AWS Architecture Mapping Table

| Local Component | AWS Equivalent | Notes |
|---|---|---|
| API Gateway container | AWS Application Load Balancer (ALB) + API Gateway v2 | Path-based routing rules, WAF integration |
| products-service container | AWS ECS Fargate task (or EKS Pod) | Serverless containers, auto-scaling policies |
| orders-service container | AWS ECS Fargate task (or EKS Pod) | Independent scaling from products-service |
| products-db (PostgreSQL 17) | Amazon RDS for PostgreSQL (Multi-AZ) | Managed DB with automated backups, read replicas |
| orders-db (PostgreSQL 17) | Amazon RDS for PostgreSQL (Multi-AZ) | Separate RDS instance for full isolation |
| Docker `backend` network | AWS VPC + Private Subnets + Security Groups | Services in private subnets, no public IP |
| `.env` files | AWS Secrets Manager / Parameter Store | Secrets injected as env vars at task launch |
| Docker volumes | Amazon EFS (shared) or RDS storage | Persistent managed storage |
| Docker image builds | Amazon ECR (Elastic Container Registry) | One ECR repo per service |
| GitHub Actions CI/CD | GitHub Actions + ECR push + ECS deploy action | `aws-actions/amazon-ecs-deploy-task-definition` |
| Health checks | ALB target group health checks + ECS health checks | Automatic unhealthy task replacement |
| Logs (STDOUT) | Amazon CloudWatch Logs (awslogs driver) | Centralised log aggregation |

### 9.2 AWS Target Architecture Diagram

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          AWS Cloud (ap-northeast-1)                      │
  │                                                                          │
  │  ┌──────────────────────────────────────────────────────────────────┐   │
  │  │                        VPC: 10.0.0.0/16                          │   │
  │  │                                                                  │   │
  │  │  ┌────────────────────────────────────────────────────────────┐  │   │
  │  │  │                  Public Subnets (AZ-a, AZ-b)               │  │   │
  │  │  │                                                            │  │   │
  │  │  │   ┌─────────────────────────────────────────────────┐     │  │   │
  │  │  │   │         Application Load Balancer (ALB)         │     │  │   │
  │  │  │   │         Listener: HTTPS :443                     │     │  │   │
  │  │  │   │         Path rules:                             │     │  │   │
  │  │  │   │           /api/products/** → TG-products         │     │  │   │
  │  │  │   │           /api/orders/**   → TG-orders           │     │  │   │
  │  │  │   └─────────────────────────────────────────────────┘     │  │   │
  │  │  │                   │               │                        │  │   │
  │  │  └───────────────────┼───────────────┼────────────────────────┘  │   │
  │  │                      │               │                            │   │
  │  │  ┌───────────────────┼───────────────┼────────────────────────┐  │   │
  │  │  │               Private App Subnets (AZ-a, AZ-b)             │  │   │
  │  │  │                   │               │                        │  │   │
  │  │  │   ┌───────────────▼───┐   ┌───────▼───────────────────┐   │  │   │
  │  │  │   │  ECS Fargate      │   │  ECS Fargate              │   │  │   │
  │  │  │   │  products-service │   │  orders-service           │   │  │   │
  │  │  │   │  (1-N tasks)      │   │  (1-N tasks)              │   │  │   │
  │  │  │   │  ECR image        │   │  ECR image                │   │  │   │
  │  │  │   └──────────┬────────┘   └──────────┬───────────────┘   │  │   │
  │  │  │              │   ▲                   │                    │  │   │
  │  │  │              │   └───────────────────┘                    │  │   │
  │  │  │              │  (HTTP inter-service via                    │  │   │
  │  │  │              │   internal ALB or Cloud Map DNS)            │  │   │
  │  │  └──────────────┼────────────────────────────────────────────┘  │   │
  │  │                 │                                                 │   │
  │  │  ┌──────────────┼────────────────────────────────────────────┐  │   │
  │  │  │          Private Data Subnets (AZ-a, AZ-b)                │  │   │
  │  │  │              │                                            │  │   │
  │  │  │   ┌──────────▼────────────┐  ┌──────────────────────┐    │  │   │
  │  │  │   │  RDS PostgreSQL 17    │  │  RDS PostgreSQL 17   │    │  │   │
  │  │  │   │  products_db          │  │  orders_db           │    │  │   │
  │  │  │   │  (Multi-AZ)           │  │  (Multi-AZ)          │    │  │   │
  │  │  │   └───────────────────────┘  └──────────────────────┘    │  │   │
  │  │  └────────────────────────────────────────────────────────────┘  │   │
  │  │                                                                  │   │
  │  │  Secrets Manager: DB credentials, API keys (per service)         │   │
  │  │  CloudWatch Logs: Centralised log streams per service            │   │
  │  │  ECR: Container registries (products-service, orders-service)    │   │
  │  └──────────────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Environment Configuration Strategy (Cloud)

```
Local:        .env files (gitignored) per service
Staging:      AWS Parameter Store (SecureString) — referenced in ECS task definition
Production:   AWS Secrets Manager — auto-rotation enabled for DB credentials
              Values injected as environment variables at ECS task launch
              No secrets ever baked into Docker images
```

---

## 10. CI/CD Pipeline

### 10.1 Pipeline Philosophy

Each microservice has its **own independent CI/CD pipeline** triggered only when files in that service's directory change. This prevents unnecessary builds and deployments when an unrelated service is modified.

### 10.2 Trigger Strategy (Path Filtering)

```yaml
# .github/workflows/products-service.yml
on:
  push:
    branches: [main, develop]
    paths:
      - 'services/products/**'
      - '.github/workflows/products-service.yml'
  pull_request:
    branches: [main]
    paths:
      - 'services/products/**'
```

### 10.3 Pipeline Stages — Detailed Diagram

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                    GITHUB ACTIONS PIPELINE (per service)                    │
  │                                                                             │
  │  EVENT: push to main/develop | PR to main                                  │
  │                                                                             │
  │  ┌─────────────┐                                                           │
  │  │  STAGE 1    │                                                           │
  │  │  Checkout   │  git checkout + fetch full history (for changelog)        │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 2    │                                                           │
  │  │  Install    │  npm ci --prefer-offline (uses package-lock.json)         │
  │  │  Deps       │  Cached: ~/.npm key=package-lock.json hash                │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 3    │                                                           │
  │  │  Lint &     │  npx eslint src/ --ext .ts                                │
  │  │  Format     │  npx prettier --check src/                                │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 4    │                                                           │
  │  │  Build      │  npm run build (tsc → dist/)                              │
  │  │  (compile)  │  Validates TypeScript types                               │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 5    │                                                           │
  │  │  Test       │  npm run test (Jest unit tests)                           │
  │  │             │  npm run test:e2e (optional E2E)                          │
  │  │             │  Coverage report uploaded to artifacts                    │
  │  └──────┬──────┘                                                           │
  │         │   (only on push to main)                                         │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 6    │                                                           │
  │  │  Docker     │  docker build -t $SERVICE:$VERSION .                      │
  │  │  Build &    │  docker push ghcr.io/$ORG/$SERVICE:$VERSION               │
  │  │  Push       │  docker push ghcr.io/$ORG/$SERVICE:latest                 │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 7    │                                                           │
  │  │  Version    │  npm version patch --no-git-tag-version                   │
  │  │  Bump       │  git tag v$NEW_VERSION                                    │
  │  │             │  git push origin v$NEW_VERSION                            │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 8    │                                                           │
  │  │  Changelog  │  npx conventional-changelog-cli -p angular -i CHANGELOG  │
  │  │  Generation │  git commit -m "chore(release): update changelog"         │
  │  └──────┬──────┘                                                           │
  │         │                                                                  │
  │  ┌──────▼──────┐                                                           │
  │  │  STAGE 9    │                                                           │
  │  │  Simulate   │  docker compose up -d --build                             │
  │  │  Deploy     │  docker compose ps (verify healthy)                       │
  │  │             │  curl http://localhost:PORT/api/health                    │
  │  │             │  docker compose down                                      │
  │  └─────────────┘                                                           │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Commit Message Convention

Conventional Commits format is required to enable automatic changelog generation:

```
feat(products): add stock validation on create
fix(orders): handle null product reference gracefully
chore(ci): add path filter for orders-service pipeline
docs(readme): update local setup instructions
refactor(gateway): extract routing config to constants
test(orders): add unit tests for order creation service
```

Changelog sections generated automatically:
- `### Features` ← `feat:` commits
- `### Bug Fixes` ← `fix:` commits
- `### Performance Improvements` ← `perf:` commits

### 10.5 Version Management

```
Strategy:   Semantic Versioning (SemVer) — automated patch bumps
            Manual minor/major bumps for breaking changes
Format:     v{MAJOR}.{MINOR}.{PATCH}
Tags:       Per service: products-service/v1.0.5, orders-service/v1.2.1
Command:    npm version patch   → 1.0.4 → 1.0.5
            npm version minor   → 1.0.5 → 1.1.0
            npm version major   → 1.1.0 → 2.0.0
```

---

## 11. Security Considerations

### 11.1 Container Security

```
✅ Non-root user in Dockerfile:
   RUN addgroup -S appgroup && adduser -S appuser -G appgroup
   USER appuser

✅ Multi-stage build → no dev tools in production image
✅ Alpine Linux base → minimal attack surface
✅ Read-only filesystem where possible
✅ No secrets baked into images (ENV instructions never contain credentials)
```

### 11.2 Secret Management

```
✅ .env files are gitignored (.gitignore includes *.env, .env.*)
✅ .env.example files committed to show required variables without values
✅ Docker secrets or environment injection at runtime
✅ Production: AWS Secrets Manager (auto-rotation for DB passwords)
✅ CI/CD: GitHub Actions Secrets (encrypted, never logged)
```

### 11.3 Input Validation

```
✅ NestJS ValidationPipe configured globally:
   {
     whitelist: true,              ← strips unknown properties
     forbidNonWhitelisted: true,   ← throws 400 on unknown properties
     transform: true               ← auto-transforms to DTO types
   }

✅ All DTOs use class-validator decorators:
   @IsString(), @IsNotEmpty(), @IsUUID(), @IsNumber(), @Min(0), etc.

✅ TypeORM parameterised queries → SQL injection prevention
✅ UUIDs validated before DB queries
```

### 11.4 Network Security

```
✅ Microservices not directly exposed to the internet
   (only api-gateway has a mapped external port)
✅ Docker bridge network → services isolated from host network
✅ In AWS: services in private subnets, only ALB in public subnet
✅ Security Groups: each service only accepts traffic from ALB or designated caller
```

### 11.5 CORS Configuration

```
✅ CORS configured in NestJS app.enableCors() per service
✅ Origins restricted to known client domains (not wildcard * in production)
✅ Only required HTTP methods and headers allowed
```

### 11.6 Optional JWT Authentication Path (Bonus)

When authentication is implemented, the following security envelope applies:

```
Flow:
  1. Client → POST /api/auth/login → JWT access token (15min) + refresh token (7d)
  2. Client → Authorization: Bearer <token> on subsequent requests
  3. API Gateway validates JWT before forwarding to services
  4. Services can also validate JWT independently (defence in depth)

Token storage:
  Access token:  In-memory (React state / Vuex store)
  Refresh token: HttpOnly Secure cookie (XSS-safe)

JWT payload:
  { sub: userId, email, role, iat, exp }
```

---

## 12. Non-Functional Requirements

### 12.1 Scalability

| Component | Scaling Strategy | Metric to Trigger Scaling |
|---|---|---|
| `api-gateway` | Horizontal (multiple instances behind LB) | CPU > 70% or RPS > threshold |
| `products-service` | Horizontal (read replicas + more instances) | CPU > 60% or response time P95 > 200ms |
| `orders-service` | Horizontal (more instances) | CPU > 60% or queue depth (future) |
| `products-db` | Vertical (larger instance) + Read Replicas | CPU > 70% or storage > 80% |
| `orders-db` | Vertical + partitioning by date | Write IOPS, storage growth rate |

```
Local:  docker compose up --scale products-service=3
AWS:    ECS Service Auto Scaling (Target Tracking policy on CPU utilisation)
        ALB distributes traffic across all healthy tasks in the target group
```

### 12.2 Reliability

```
Health Checks:
  ✅ GET /api/health on each service (returns 200 with uptime info)
  ✅ Docker healthcheck with retry logic (3 retries, 30s interval)
  ✅ depends_on: condition: service_healthy ensures startup order

Restart Policies:
  ✅ restart: unless-stopped (Docker Compose)
  ✅ ECS: minimumHealthyPercent: 50, maximumPercent: 200 (rolling deploys)

Database:
  ✅ TypeORM connection retry logic (retryAttempts: 10, retryDelay: 3000)
  ✅ AWS RDS Multi-AZ for automatic failover (< 60s RTO)
  ✅ Automated daily snapshots (35-day retention)

Circuit Breaker (future enhancement):
  → Implement with @nestjs/axios + Axios retry interceptor
  → Open circuit after 5 consecutive failures to products-service
  → Return cached or degraded response to orders-service
```

### 12.3 Observability

```
Logging:
  ✅ NestJS built-in Logger (structured JSON in production)
  ✅ All logs to STDOUT (Docker/ECS collects automatically)
  ✅ Log levels: error, warn, log (info), debug, verbose
  ✅ Request logging: method, path, statusCode, duration

API Documentation:
  ✅ Swagger UI at /api/docs per service
  ✅ Auto-generated from decorators (@ApiProperty, @ApiOperation, etc.)
  ✅ OpenAPI 3.0 spec exportable for integration testing

Metrics (future enhancement):
  → @nestjs/terminus for advanced health checks (DB connectivity, memory, disk)
  → Prometheus metrics endpoint (/metrics)
  → Grafana dashboards for visualisation
  → AWS CloudWatch Metrics for ECS/RDS monitoring

Distributed Tracing (future enhancement):
  → OpenTelemetry SDK for NestJS
  → Correlation IDs propagated in HTTP headers (X-Correlation-ID)
  → AWS X-Ray for end-to-end request tracing
```

### 12.4 Performance

```
Database Connection Pooling (TypeORM):
  extra: {
    max: 10,          ← maximum pool connections per service instance
    min: 2,           ← minimum idle connections kept alive
    idleTimeoutMillis: 30000
  }

Docker Build Caching:
  ✅ Multi-stage Dockerfile → node_modules layer cached separately from source
  ✅ COPY package*.json before COPY src/ → npm install only re-runs if deps change
  ✅ GitHub Actions cache for ~/.npm directory

Application Performance:
  ✅ NestJS lazy module loading where possible
  ✅ Response compression middleware (compression package)
  ✅ TypeORM query optimisation: select only required columns
  ✅ Indexed columns: id (PK, auto-indexed), created_at (for pagination)
  ✅ Pagination on list endpoints (page/limit query params)

Target SLOs (non-binding for assessment):
  ├── P50 response time: < 50ms
  ├── P95 response time: < 200ms
  ├── P99 response time: < 500ms
  └── Availability: 99.9% (excluding planned maintenance)
```

### 12.5 Maintainability

```
Code Organisation:
  ✅ NestJS module-per-feature pattern
  ✅ DTOs separate from entities (clear API contract vs persistence model)
  ✅ Service layer encapsulates business logic (controllers are thin)
  ✅ Repository pattern for data access (swappable persistence layer)

Dependency Management:
  ✅ package-lock.json committed (reproducible installs)
  ✅ Dependabot or Renovate for automated dependency updates
  ✅ Pinned Node.js version via .nvmrc and Dockerfile FROM node:22-alpine

Documentation:
  ✅ Swagger/OpenAPI auto-generated from code annotations
  ✅ ARCHITECTURE.md (this document) kept in version control
  ✅ Conventional commits → auto-generated CHANGELOG.md per service
  ✅ README.md with quick-start instructions

Testing Strategy:
  ✅ Unit tests: Jest (services, controllers, mappers)
  ✅ Integration tests: TestContainers or in-memory SQLite
  ✅ E2E tests: Supertest (HTTP layer validation)
  ✅ Minimum 70% code coverage gate in CI pipeline
```

---

## 13. Technical Decisions Log (ADR-Style)

---

### ADR-001: Microservices Architecture Over Monolith

**Date:** 2025-07-01
**Status:** Accepted

**Context:**
The e-commerce platform manages two distinct business domains: product catalogue and order processing. Both have different data models, access patterns (read-heavy vs write-heavy), scalability needs, and potential for independent team ownership.

**Decision:**
Adopt a microservices architecture with two independent services: `products-service` and `orders-service`, each with its own codebase, database, and deployment unit.

**Rationale:**
- Allows independent scaling (products need more read capacity; orders need more write capacity)
- Each domain can be deployed, updated, and rolled back independently
- Failure in one service does not cascade to the other (e.g., products-service outage does not prevent existing order reads)
- Demonstrates cloud-native design patterns relevant to production environments
- Aligns with the technical assessment requirement for a microservices architecture

**Consequences:**
- (+) Independent scalability and deployability
- (+) Clear domain ownership and bounded contexts
- (+) Technology evolution flexibility per service
- (-) More complex local setup (Docker Compose required)
- (-) Inter-service communication adds latency and failure modes
- (-) Distributed debugging is harder than monolith

---

### ADR-002: Database-per-Service Pattern

**Date:** 2025-07-01
**Status:** Accepted

**Context:**
A shared database between `products-service` and `orders-service` would create tight coupling at the data layer, even if the services themselves are decoupled at the network layer.

**Decision:**
Each microservice has its own dedicated PostgreSQL 17 database instance (`products_db` and `orders_db`). No service has credentials to access another service's database.

**Rationale:**
- Prevents implicit coupling through shared tables or shared schemas
- Each service can evolve its schema without coordinating with other teams
- Database migrations are isolated to the owning service
- Failure or maintenance of one database does not impact the other service
- Enables independent database sizing, backup schedules, and technology choices

**Consequences:**
- (+) Full domain isolation at the storage layer
- (+) Independent schema migration lifecycle
- (+) Independent database scaling and sizing
- (-) Cross-service queries are impossible at the DB level (must go through API)
- (-) Data consistency across services requires eventual consistency patterns
- (-) Higher infrastructure cost (two DB instances vs one)

**Alternatives Considered:**
- **Shared database, separate schemas**: Rejected — still creates tight coupling through the schema, shared credentials, and shared resource contention.
- **Shared database, shared tables**: Rejected — violates service autonomy entirely.

---

### ADR-003: Synchronous HTTP Communication Over Message Broker

**Date:** 2025-07-02
**Status:** Accepted (with noted upgrade path)

**Context:**
`orders-service` needs to validate that a product exists before creating an order. This requires communication with `products-service`. Options include synchronous HTTP REST calls and asynchronous messaging (RabbitMQ, Kafka, AWS SQS/SNS).

**Decision:**
Use synchronous HTTP calls from `orders-service` to `products-service` via NestJS `HttpModule` (Axios).

**Rationale:**
- Simplicity: No additional infrastructure (broker) required for local simulation
- Consistency: Order creation is a synchronous user-facing operation — the user expects immediate feedback on whether the product exists
- MVP scope: Message brokers add significant operational complexity (dead letter queues, retry logic, message schema versioning) that is disproportionate for the current scope
- Easier to test and debug locally

**Consequences:**
- (+) Simple implementation with no additional infrastructure
- (+) Immediate consistency feedback to the client
- (+) Easier local debugging (HTTP requests are observable in logs)
- (-) Tight temporal coupling: orders-service is unavailable if products-service is down
- (-) Higher latency for batch order creation (sequential HTTP calls per product)
- (-) Does not scale as well as async messaging under very high load

**Upgrade Path (when needed):**
When the system needs to handle high-volume order processing, replace synchronous product validation with:
1. Products service publishes product events to AWS EventBridge / SNS
2. Orders service maintains a local read-model of products (eventually consistent)
3. Order creation validates against local read-model (no network call needed)

---

### ADR-004: UUID v4 as Primary Key Strategy

**Date:** 2025-07-01
**Status:** Accepted

**Context:**
Primary keys must uniquely identify records. Options include auto-incrementing integers (SERIAL/BIGSERIAL in PostgreSQL) and UUID v4.

**Decision:**
Use UUID v4 (`gen_random_uuid()` in PostgreSQL 17, or `uuid()` in TypeORM entity) as the primary key for all entities.

**Rationale:**
- **Globally unique across services**: UUIDs are safe to generate on the application side without a DB round-trip or central sequence
- **No information leakage**: Integer IDs reveal record count and creation order (`/api/orders/1` tells an attacker there is exactly 1 order)
- **Merge-safe**: When combining data from multiple environments (dev, staging), UUID collisions are astronomically unlikely
- **Distributed system ready**: In a future sharded or multi-region setup, each node can generate PKs independently
- **TypeORM support**: `@PrimaryGeneratedColumn('uuid')` decorator handles generation automatically

**Consequences:**
- (+) No sequential ID guessing (security improvement)
- (+) Application-side ID generation (no DB round-trip needed for FK setup)
- (+) Globally unique across databases and environments
- (-) Larger storage footprint (16 bytes vs 4/8 bytes for integer)
- (-) Random UUID v4 leads to B-tree index fragmentation (mitigated by PostgreSQL 17's improvements, or by using UUID v7 ordered by time in future)
- (-) Less human-readable for debugging (mitigated by structured logging)

**Alternatives Considered:**
- **BIGSERIAL**: Rejected due to security and distributed uniqueness concerns
- **ULID/UUID v7**: Considered — time-ordered, solves index fragmentation. Not yet widely supported in TypeORM. Recommended for future adoption.

---

### ADR-005: Docker Compose for Local Simulation Over LocalStack

**Date:** 2025-07-02
**Status:** Accepted

**Context:**
The system must be runnable locally while simulating a cloud-like environment. Options include LocalStack (AWS API simulation), Docker Compose with real service containers, and full cloud deployment.

**Decision:**
Use Docker Compose v2 with native service containers (NestJS apps + PostgreSQL 17) for local cloud simulation.

**Rationale:**
- **Simplicity**: Docker Compose has near-zero configuration overhead compared to LocalStack
- **Accuracy**: Running actual PostgreSQL 17 is more accurate than LocalStack's simulated RDS, which has known compatibility gaps
- **Portability**: Any developer with Docker Desktop can run the full system with `docker compose up --build`
- **CI/CD integration**: GitHub Actions supports Docker Compose natively for integration testing
- **Real behaviour**: Actual network isolation, DNS resolution, and health check logic matches the production topology more closely than mock AWS APIs
- **Learning curve**: Docker Compose is universally understood; LocalStack requires AWS SDK knowledge even for local dev

**Consequences:**
- (+) Zero-friction developer onboarding (one command)
- (+) No AWS account required for local development
- (+) Actual PostgreSQL behaviour (transactions, constraints, extensions)
- (-) Not testing actual AWS service integrations (S3, SQS, SNS)
- (-) Secrets management is simplified (.env files vs Secrets Manager)
- (-) IAM roles not tested locally

**Upgrade Path:**
When AWS-specific integrations (S3 for file storage, SQS for async messaging) are added, introduce LocalStack as a secondary local option or add an integration test stage in CI that targets actual AWS dev account resources.

---

*This document is maintained in version control at `.github/files/ARCHITECTURE.md` and should be updated whenever significant architectural changes are made.*

---

**End of Architecture Document**

> Last updated: 2025-07-10 | Version: 1.0.0
> For questions, contact the platform architecture team.
