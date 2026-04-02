---
description: JWT authentication standards for NestJS. Apply when working with auth, guards, or protected endpoints.
---

# JWT Auth Standards

- Usa @nestjs/jwt y @nestjs/passport
- Guards con JwtAuthGuard en rutas protegidas
- Nunca guardes la password en texto plano, usa bcrypt
- El token va en el header Authorization: Bearer <token>
- Refresh token opcional para esta prueba
- Variables: JWT_SECRET y JWT_EXPIRES_IN via ConfigService

```

---

## Prompts

### Backend — auth service
```

Usa el agente Software Engineer. Lee .github/copilot-instructions.md y la estructura actual del proyecto. Implementa un módulo de autenticación en ambos microservicios con: entidad User, registro con bcrypt, login que retorna JWT, JwtAuthGuard para proteger todos los endpoints existentes, DTOs de login y registro, decoradores Swagger y pruebas unitarias. Usa @nestjs/jwt y @nestjs/passport.

```

### Frontend — auth
```

Usa el agente Expert React Frontend Engineer. Lee .github/copilot-instructions.md y el módulo de autenticación implementado en el backend. Agrega al frontend existente: página de login, página de registro, protección de rutas privadas con middleware de Next.js, almacenamiento del JWT en httpOnly cookie, y redirección automática si no hay sesión activa. Las vistas de productos y órdenes deben ser rutas protegidas.
