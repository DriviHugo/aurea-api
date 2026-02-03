# Coding Guidelines for Migration Scripts

This document defines the coding standards that AI-assisted migration scripts must follow when generating code. These guidelines ensure consistency, quality, and maintainability across the migrated codebase.

## General Conventions

### Variable Naming

Variables and constants must use descriptive and meaningful names:

- Use `isSomething` or `hasSomething` for boolean variables
- Use plural nouns for arrays (e.g., `items`, `users`, `expedientes`)
- Use camelCase for local variables (e.g., `ratePointsToConsume`)
- Use UPPER_SNAKE_CASE for constants (e.g., `MAX_LOGIN_REQUESTS_PER_DAY`)

**Examples:**
```typescript
// Good
const isActive = true;
const hasPermission = false;
const userList = [];
const MAX_RETRIES = 3;

// Bad
const active = true;
const permission = false;
const list = [];
const maxRetries = 3;
```

### Indentation and Spacing

- Use spaces instead of tabs
- Use 2 spaces per indentation level
- Leave one blank line between functions and related code blocks

### Line Length

- Limit code lines to 80-100 characters for readability
- Break long lines logically when exceeding the limit

### Code Language

All code must be written in English, including:
- Variable names
- Function names
- Class names
- Comments
- Documentation

**Never use Spanish or other languages in the codebase.**

## Coding Style

### Comments

- Avoid creating comments unless function complexity requires explanation
- Code should be self-descriptive following proper naming conventions
- Use JSDoc for function documentation when necessary

**Example:**
```typescript
// Good - self-descriptive
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}

// Bad - unnecessary comment
// This function calculates the total
function calc(arr: any[]): number {
  return arr.reduce((t, i) => t + i.p, 0);
}
```

### Whitespace Usage

- Place whitespace around operators: `a = b + c` (not `a=b+c`)
- Place whitespace after commas in lists and function arguments
- No trailing whitespace at end of lines

### Import Organization

Organize imports alphabetically and group by origin:

1. External libraries (node_modules)
2. Internal modules (absolute imports)
3. Relative imports

**Example:**
```typescript
// External libraries
import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

// Internal modules
import { authenticate } from '@/middleware/auth';
import { logger } from '@/utils/logger';

// Relative imports
import { ExpedienteSchema } from './schemas';
```

## Language-Specific Conventions

### TypeScript/JavaScript

Follow the [JavaScript Standard Style](https://standardjs.com/) recommendations:

- Use strict equality (`===` and `!==`)
- Always use semicolons
- Single quotes for strings (except to avoid escaping)
- No unused variables

### Exception Handling

- Use `try...catch` blocks for proper exception handling
- Avoid generic exceptions when possible
- Always provide meaningful error messages

**Example:**
```typescript
// Good
try {
  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId }
  });
  
  if (!expediente) {
    throw new Error(`Expediente with id ${expedienteId} not found`);
  }
} catch (error) {
  logger.error('Failed to fetch expediente', { expedienteId, error });
  throw error;
}

// Bad
try {
  const data = await prisma.expediente.findUnique({ where: { id } });
} catch (e) {
  console.log(e);
}
```

### Class and Method Naming

- Use PascalCase for classes: `MyClass`, `UserService`, `ExpedienteRepository`
- Use camelCase for methods and functions: `myFunction`, `getUserById`, `calculateTotal`

## Generated Code Standards

### Fastify Routes

Generated routes must follow this structure:

```typescript
export default async function expedienteRoutes(app: FastifyInstance) {
  app.get('/expedientes', {
    schema: {
      querystring: Type.Object({
        page: Type.Integer({ minimum: 1, default: 1 }),
        limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 })
      }),
      response: {
        200: Type.Object({
          data: Type.Array(Type.Ref('Expediente')),
          meta: Type.Object({
            total: Type.Integer(),
            page: Type.Integer(),
            limit: Type.Integer()
          })
        })
      }
    },
    preHandler: app.authenticate,
  }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      app.prisma.expediente.findMany({ skip, take: limit }),
      app.prisma.expediente.count()
    ]);
    
    return { data, meta: { total, page, limit } };
  });
}
```

### Prisma Models

Generated Prisma schemas must follow these conventions:

- Use PascalCase for model names
- Use camelCase for field names
- Always include `@@map()` for table names that differ from model names
- Always include `@map()` for field names that differ from column names

```prisma
model Expediente {
  id              String   @id @default(uuid()) @db.Uuid
  codigo          String   @unique
  tipoContrato    String   @map("tipo_contrato")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@map("expedientes")
}
```

### React Hooks

Generated hooks must maintain consistent patterns:

```typescript
export function useExpedientes() {
  return useQuery({
    queryKey: ['expedientes'],
    queryFn: async () => {
      const response = await fetchAPI('/api/expedientes');
      return response.data;
    }
  });
}

export function useCreateExpediente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expediente: ExpedienteInsert) => {
      return await fetchAPI('/api/expedientes', {
        method: 'POST',
        body: JSON.stringify(expediente)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedientes'] });
    }
  });
}
```

## Error Handling Patterns

All generated code must include proper error handling:

```typescript
// Route error handling
app.post('/expedientes', async (request, reply) => {
  try {
    const expediente = await app.prisma.expediente.create({
      data: request.body
    });
    return reply.code(201).send(expediente);
  } catch (error) {
    app.log.error('Failed to create expediente', error);
    return reply.code(500).send({
      error: 'Internal server error',
      message: 'Failed to create expediente'
    });
  }
});
```

## Testing Standards

Generated tests must follow these patterns:

```typescript
describe('ExpedienteRoutes', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await buildApp();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  it('should list expedientes with pagination', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/expedientes?page=1&limit=10'
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: expect.any(Array),
      meta: expect.objectContaining({
        total: expect.any(Number),
        page: 1,
        limit: 10
      })
    });
  });
});
```

## Documentation Requirements

All generated functions must include JSDoc when complexity warrants:

```typescript
/**
 * Analyzes contract budget and provides recommendations
 * 
 * @param expedienteId - UUID of the expediente to analyze
 * @param options - Analysis configuration options
 * @returns Analysis result with recommendations
 * @throws {NotFoundError} When expediente does not exist
 * @throws {ValidationError} When budget data is invalid
 */
async function analyzeContractBudget(
  expedienteId: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  // Implementation
}
```

## Summary

These guidelines ensure that all code generated by AI migration scripts maintains high quality, consistency, and follows enterprise standards. When generating code:

1. Use descriptive English names for all identifiers
2. Follow proper naming conventions (camelCase, PascalCase, UPPER_SNAKE_CASE)
3. Maintain consistent indentation and spacing
4. Include proper error handling
5. Write self-descriptive code that minimizes comment needs
6. Organize imports logically
7. Follow TypeScript best practices
8. Generate complete, production-ready code

AI scripts must reference these guidelines in their system prompts to ensure compliance.
