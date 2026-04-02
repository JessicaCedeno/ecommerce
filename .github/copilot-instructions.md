# GitHub Copilot Instructions

## Project Overview

This is an **e-commerce microservices platform** built as a technical assessment. It consists of two independent NestJS microservices, an API Gateway, and a shared PostgreSQL database layer — all orchestrated locally with Docker Compose and deployed via GitHub Actions CI/CD.

**Services:**
- `products-service` — Product catalog management (CRUD)
- `orders-service` — Order creation and management
- `api-gateway` — Single entry point, routes requests to downstream services

---

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Respect the exact versions defined in each service's `package.json`. Never suggest features beyond the detected version.
2. **Microservice Boundaries**: Each service is fully independent. Never import entities, services, or modules from a sibling service. Inter-service communication happens via HTTP (axios/HttpModule).
3. **NestJS Patterns**: Follow the layered architecture: `Controller → Service → Repository (TypeORM)`. Business logic lives exclusively in services.
4. **TypeORM Conventions**: Use decorators, Repository pattern, migrations (never `synchronize: true` in production), and UUID primary keys.
5. **Code Quality**: Prioritize maintainability, security, and testability in all generated code.

---

## Technology Stack & Versions

| Technology        | Version   | Notes                                          |
|-------------------|-----------|------------------------------------------------|
| Node.js           | 22.x LTS  | Alpine Docker image: `node:22-alpine`          |
| NestJS            | ^11.x     | `@nestjs/core`, `@nestjs/common`               |
| @nestjs/typeorm   | ^11.x     | TypeORM integration for NestJS                 |
| TypeORM           | ^0.3.x    | Repository pattern, decorators                 |
| PostgreSQL         | 17        | One DB per service (schema isolation)          |
| Docker / Compose  | 27.x / v2 | Multi-stage Dockerfiles                        |
| GitHub Actions    | N/A       | CI/CD pipelines per service                    |
| class-validator   | ^0.15.x   | DTO validation via `ValidationPipe`            |
| class-transformer | ^0.5.x    | Transform payloads in DTOs                     |
| Jest              | ^30.x     | Unit and integration testing                   |
| Swagger (OpenAPI) | ^11.x     | `@nestjs/swagger` for API docs                 |
| @nestjs/config    | ^4.x      | Config management via `ConfigService`          |
| @nestjs/jwt       | ^11.x     | JWT authentication (optional auth bonus)       |
| rxjs              | ^7.8.x    | Reactive extensions (HttpService observables)  |

---

## Project Structure

Each microservice follows this exact layout:

```
<service-name>/
├── src/
│   ├── main.ts                  # Bootstrap, global pipes, Swagger setup
│   ├── app.module.ts            # Root module: TypeOrmModule, ConfigModule
│   ├── config/
│   │   └── database.config.ts   # TypeORM factory using ConfigService
│   ├── <domain>/
│   │   ├── <domain>.module.ts
│   │   ├── <domain>.controller.ts
│   │   ├── <domain>.service.ts
│   │   ├── <domain>.entity.ts
│   │   ├── dto/
│   │   │   ├── create-<domain>.dto.ts
│   │   │   ├── update-<domain>.dto.ts
│   │   │   └── query-<domain>.dto.ts
│   │   └── interfaces/
│   │       └── <domain>.interface.ts
│   └── common/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── transform.interceptor.ts
│       └── decorators/
├── test/
│   ├── unit/
│   └── e2e/
├── migrations/
├── Dockerfile
├── .env.example
└── package.json
```

Root repository layout:
```
/
├── products-service/
├── orders-service/
├── api-gateway/
├── docker-compose.yml
├── docker-compose.override.yml  # local dev overrides
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── products-service.yml
│       └── orders-service.yml
└── README.md
```

---

## NestJS Coding Standards

### Modules

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    HttpModule,                       // only when calling other services
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

- One module per domain feature.
- `forFeature([Entity])` registers entities per service — never share entities across services.
- Export services only when consumed by other modules in the same service.

### Controllers

```typescript
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active products' })
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }
}
```

- Controllers are thin — no business logic, no direct DB access.
- Always use `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators for Swagger.
- Use `ParseUUIDPipe` for UUID path parameters.
- Apply `@HttpCode(HttpStatus.CREATED)` for POST endpoints.

### Services

```typescript
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(dto);
    return this.productRepository.save(product);
  }
}
```

- All database access goes through the injected `Repository<Entity>`.
- Throw NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`) directly — the global filter handles the response shape.
- Never return raw TypeORM errors to the client.

### DTOs and Validation

```typescript
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Pro', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({ example: 'High performance laptop' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1299.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  stock: number;
}
```

- Every DTO uses `class-validator` decorators — no manual validation in controllers or services.
- Use `@ApiProperty` / `@ApiPropertyOptional` on all DTO fields for Swagger.
- Use `@Type(() => Number)` from `class-transformer` for numeric fields received from query params.
- Separate `Create`, `Update` (using `PartialType`), and `Query` DTOs per entity.

### Entities (TypeORM)

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- **Always** use `@PrimaryGeneratedColumn('uuid')` — never integer IDs for public APIs.
- **Always** add `@CreateDateColumn()` and `@UpdateDateColumn()`.
- Add `@Index()` on columns used in WHERE clauses.
- Use `nullable: true` and `| null` type union for optional columns.
- Never use `synchronize: true` in non-local environments.

---

## TypeORM Configuration

### Database config factory (`src/config/database.config.ts`)

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USER'),
  password: config.get<string>('DB_PASS'),
  database: config.get<string>('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: config.get<string>('NODE_ENV') === 'development',
  migrationsRun: true,
  logging: config.get<string>('NODE_ENV') === 'development',
});
```

### Root module registration

```typescript
TypeOrmModule.forRootAsync({
  useFactory: databaseConfig,
  inject: [ConfigService],
})
```

### Migration commands (each service's `package.json`)

```json
{
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/data-source.ts",
  "migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
  "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts"
}
```

---

## Inter-Service Communication

Services communicate via HTTP using NestJS `HttpModule`:

```typescript
// In orders-service: validate product existence before creating order
@Injectable()
export class ProductsClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getProduct(productId: string): Promise<ProductDto> {
    const url = `${this.configService.get('PRODUCTS_SERVICE_URL')}/products/${productId}`;
    try {
      const { data } = await firstValueFrom(this.httpService.get<ProductDto>(url));
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException(`Product ${productId} not found`);
      }
      throw new ServiceUnavailableException('Products service is unavailable');
    }
  }
}
```

- Always wrap inter-service HTTP calls in try/catch and map HTTP errors to NestJS exceptions.
- Use `firstValueFrom` from `rxjs` to convert Observables to Promises.
- Keep the client service isolated in its own file.

---

## Error Handling

### Global exception filter (`src/common/filters/http-exception.filter.ts`)

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(`${request.method} ${request.url} → ${status}`, exception instanceof Error ? exception.stack : '');

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

Register globally in `main.ts`:
```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

### Response transform interceptor

```typescript
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({ success: true, data, timestamp: new Date().toISOString() })),
    );
  }
}
```

---

## Bootstrap (`src/main.ts`)

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Products Service API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  // Prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Service running on port ${port}`);
}
```

---

## Docker & Docker Compose

### Service Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
```

### `docker-compose.yml` structure

```yaml
version: '3.9'

services:
  products-db:
    image: postgres:17-alpine
      POSTGRES_USER: ${PRODUCTS_DB_USER}
      POSTGRES_PASSWORD: ${PRODUCTS_DB_PASS}
    volumes:
      - products_db_data:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PRODUCTS_DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  products-service:
    build:
      context: ./products-service
      target: production
    depends_on:
      products-db:
        condition: service_healthy
    env_file: ./products-service/.env
    ports:
      - "3001:3000"
    networks:
      - backend

  orders-db:
    image: postgres:17-alpine
      POSTGRES_USER: ${ORDERS_DB_USER}
      POSTGRES_PASSWORD: ${ORDERS_DB_PASS}
    volumes:
      - orders_db_data:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${ORDERS_DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  orders-service:
    build:
      context: ./orders-service
      target: production
    depends_on:
      orders-db:
        condition: service_healthy
    env_file: ./orders-service/.env
    ports:
      - "3002:3000"
    networks:
      - backend
    environment:
      PRODUCTS_SERVICE_URL: http://products-service:3000

  api-gateway:
    build:
      context: ./api-gateway
      target: production
    depends_on:
      - products-service
      - orders-service
    ports:
      - "3000:3000"
    networks:
      - backend
    environment:
      PRODUCTS_SERVICE_URL: http://products-service:3000
      ORDERS_SERVICE_URL: http://orders-service:3000

volumes:
  products_db_data:
  orders_db_data:

networks:
  backend:
    driver: bridge
```

**Rules:**
- Each service has its own database (schema isolation per microservice).
- Use `condition: service_healthy` on DB depends_on.
- No service should use host networking.
- Secrets and credentials are passed via `.env` files (never hardcoded).

---

## GitHub Actions CI/CD

### Workflow pattern (`.github/workflows/<service>.yml`)

```yaml
name: Products Service CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'products-service/**'
  pull_request:
    branches: [main]
    paths:
      - 'products-service/**'

jobs:
  ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: products-service

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0       # needed for changelog generation

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: products-service/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Unit tests
        run: npm run test:cov

      - name: Auto-bump version
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npm version patch -m "chore(release): bump version to %s [skip ci]"
          git push --follow-tags

      - name: Build Docker image
        run: docker build -t products-service:${{ github.sha }} .

      - name: Simulate deployment
        run: |
          docker run --rm \
            -e NODE_ENV=production \
            -e DB_HOST=localhost \
            products-service:${{ github.sha }} \
            node -e "console.log('Deployment simulation OK')"
```

**Rules:**
- Use `paths:` filter so each service's workflow only triggers on its own changes.
- Use `actions/checkout@v4` and `actions/setup-node@v4` (v4).
- Cache npm dependencies with `cache-dependency-path` pointing to the service's lockfile.
- Version bumps only on `main` branch pushes; use `[skip ci]` in commit message.
- Build Docker image in CI to validate the Dockerfile.

---

## Testing Standards

### Unit test pattern

```typescript
describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  describe('findOne', () => {
    it('should return a product when found', async () => {
      const product = { id: 'uuid-1', name: 'Test' } as Product;
      repository.findOne.mockResolvedValue(product);
      await expect(service.findOne('uuid-1')).resolves.toEqual(product);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('uuid-1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- Mock the TypeORM repository using `getRepositoryToken(Entity)`.
- Test both the happy path and all error branches.
- Test file names: `<domain>.service.spec.ts`, `<domain>.controller.spec.ts`.

---

## Environment Variables

Each service requires a `.env` file (committed as `.env.example`):

```env
# App
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=secret
DB_NAME=products_db

# Inter-service (orders-service only)
PRODUCTS_SERVICE_URL=http://products-service:3000
```

**Rules:**
- Never commit `.env` files — only `.env.example`.
- Use `@nestjs/config` with `ConfigModule.forRoot({ isGlobal: true })` in root module.
- Access all config values via `ConfigService`, never via `process.env` directly in services.

---

## Health Check Endpoint

Every service must expose `GET /api/health`:

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

---

## REST API Design Conventions

| Operation         | Method | Path              | Status Code |
|-------------------|--------|-------------------|-------------|
| List all          | GET    | `/api/<resource>` | 200         |
| Get by ID         | GET    | `/api/<resource>/:id` | 200     |
| Create            | POST   | `/api/<resource>` | 201         |
| Update (partial)  | PATCH  | `/api/<resource>/:id` | 200     |
| Delete (soft)     | DELETE | `/api/<resource>/:id` | 204     |

- Use **PATCH** (not PUT) for partial updates — DTOs use `PartialType(CreateDto)`.
- Prefer **soft deletes** (`isActive: false`) over hard deletes.
- All responses follow the `TransformInterceptor` envelope: `{ success, data, timestamp }`.
- Error responses follow the `AllExceptionsFilter` shape: `{ statusCode, timestamp, path, message }`.

---

## Naming Conventions

| Element           | Convention         | Example                      |
|-------------------|--------------------|------------------------------|
| Files             | kebab-case         | `create-product.dto.ts`      |
| Classes           | PascalCase         | `ProductsService`            |
| Variables/methods | camelCase          | `findAllProducts()`          |
| DB tables         | snake_case plural  | `products`, `order_items`    |
| DB columns        | snake_case         | `created_at`, `is_active`    |
| Environment vars  | SCREAMING_SNAKE    | `DB_HOST`, `PRODUCTS_SERVICE_URL` |
| Docker services   | kebab-case         | `products-service`           |
| Git branches      | kebab-case         | `feat/add-order-endpoint`    |

---

## General Best Practices

- **No circular dependencies** between modules.
- **Single responsibility**: one concern per file.
- **No `any` type** in TypeScript — use explicit types or generics.
- **No raw SQL** unless QueryBuilder is insufficient — always use Repository or QueryBuilder.
- **Swagger documentation is mandatory** for all public endpoints.
- **Every service must have a health check** at `GET /api/health`.
- **Log using NestJS Logger** — never `console.log` in production code.
- **Validate all inputs** — `ValidationPipe` is global with `whitelist: true`.
- **Git commits** follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
