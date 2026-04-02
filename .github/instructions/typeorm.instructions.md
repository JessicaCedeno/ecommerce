---
description: TypeORM best practices for NestJS applications with PostgreSQL. Apply when working with entities, migrations, repositories, or database configuration.
---

# TypeORM + NestJS Standards

## Configuration

Always configure TypeORM via `TypeOrmModule.forRootAsync` using `ConfigService`. Never hardcode credentials.

```
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    database: config.get('DB_NAME'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false, // NEVER true in production
    migrationsRun: true,
  }),
  inject: [ConfigService],
})
```

## Entities

- One file per entity: `product.entity.ts`
- Always use `@PrimaryGeneratedColumn('uuid')` — never integer auto-increment for public APIs
- Define all relations explicitly with cascade options
- Use `@CreateDateColumn()` and `@UpdateDateColumn()` on every entity
- Add `@Index()` on columns used in WHERE clauses

```
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Relations

Always define both sides of a relation:

```
// order.entity.ts
@ManyToOne(() => Product, { eager: false })
@JoinColumn({ name: 'product_id' })
product: Product;

@Column()
productId: string;
```

Use `eager: false` by default. Load relations explicitly with `relations` option in queries.

## Repositories

- Use the Repository pattern via `@InjectRepository(Entity)`
- Never write raw SQL unless absolutely necessary — use QueryBuilder
- Keep all DB logic inside the service, not the controller

```
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.productRepository.find({ where: { isActive: true } });
  }

  findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id } });
  }
}
```

## Migrations

- **Never use `synchronize: true`** outside of local dev
- Generate migrations with: `npm run migration:generate -- src/migrations/MigrationName`
- Run migrations with: `npm run migration:run`
- Revert with: `npm run migration:revert`

Add these scripts to package.json:

```
"migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/data-source.ts",
"migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
"migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts"
```

Create a `src/data-source.ts` file for the TypeORM CLI:

```
export const AppDataSource = new DataSource({
  type: 'postgres',
  // same config as your module, reading from .env directly
});
```

## Error Handling

Always handle TypeORM errors in the service layer:

- `EntityNotFoundError` → throw `NotFoundException`
- Unique constraint violations → throw `ConflictException`
- Wrap critical operations in transactions when modifying multiple tables

## Module Registration

Register entities per microservice — never share entity imports across services:

```
TypeOrmModule.forFeature([Product])  // in products.module.ts
TypeOrmModule.forFeature([Order])    // in orders.module.ts
```
