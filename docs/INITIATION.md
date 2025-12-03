/**
 * Claude Code Requirements File Builder
 * Composes a CLAUDE.md file based on project configuration options
 */

// Configuration option definitions
export const CONFIG_OPTIONS = {
  // Core Tech Stack
  stateManagement: {
    label: "State Management",
    options: ["zustand", "jotai", "redux-toolkit", "react-context"],
  },
  dataFetching: {
    label: "Data Fetching & Caching",
    options: ["tanstack-query", "swr", "native-fetch"],
  },
  formHandling: {
    label: "Form Handling",
    options: ["react-hook-form", "formik", "native-forms"],
  },
  schemaValidation: {
    label: "Schema Validation",
    options: ["zod", "yup", "valibot", "none"],
  },
  apiArchitecture: {
    label: "API Architecture",
    options: ["rest", "trpc", "graphql", "server-actions"],
  },
  testing: {
    label: "Testing Setup",
    options: ["vitest", "jest", "playwright", "none"],
  },

  // Claude Code Skills
  gitConventions: {
    label: "Git Commit Conventions",
    options: ["conventional-commits", "gitmoji", "simple"],
  },
  performancePatterns: {
    label: "Performance Patterns",
    options: ["aggressive", "balanced", "minimal"],
  },
  securityPractices: {
    label: "Security Practices",
    options: ["strict", "standard", "minimal"],
  },
  loggingApproach: {
    label: "Logging Approach",
    options: ["structured", "console-based", "none"],
  },
};

// Content templates for each configuration option
const TEMPLATES = {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  stateManagement: {
    zustand: {
      dependencies: ["zustand"],
      content: `
## State Management: Zustand

- Create stores in \`/stores\` directory with naming pattern \`use[Name]Store.ts\`
- Keep stores small and focused on a single domain
- Use slices pattern for complex state:
  \`\`\`typescript
  interface StoreState {
    // State
    count: number;
    // Actions
    increment: () => void;
  }
  
  export const useCounterStore = create<StoreState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));
  \`\`\`
- Use \`persist\` middleware for state that needs to survive page refresh
- Prefer selectors to avoid unnecessary re-renders: \`const count = useCounterStore((s) => s.count)\`
- Never access store state outside React components without \`getState()\`
`,
    },
    jotai: {
      dependencies: ["jotai"],
      content: `
## State Management: Jotai

- Define atoms in \`/atoms\` directory, grouped by feature
- Use primitive atoms for simple state, derived atoms for computed values
- Naming convention: \`[name]Atom\` for atoms, \`use[Name]\` for custom hooks wrapping atoms
- Structure:
  \`\`\`typescript
  // Primitive atom
  export const countAtom = atom(0);
  
  // Derived atom (read-only)
  export const doubleCountAtom = atom((get) => get(countAtom) * 2);
  
  // Derived atom (read-write)
  export const countWithActionsAtom = atom(
    (get) => get(countAtom),
    (get, set, action: 'increment' | 'decrement') => {
      set(countAtom, get(countAtom) + (action === 'increment' ? 1 : -1));
    }
  );
  \`\`\`
- Use \`atomWithStorage\` for persisted state
- Prefer atom composition over large monolithic atoms
`,
    },
    "redux-toolkit": {
      dependencies: ["@reduxjs/toolkit", "react-redux"],
      content: `
## State Management: Redux Toolkit

- Organize by feature slices in \`/store/slices\` directory
- Configure store in \`/store/index.ts\`
- Use RTK Query for API state when possible
- Slice structure:
  \`\`\`typescript
  import { createSlice, PayloadAction } from '@reduxjs/toolkit';
  
  interface CounterState {
    value: number;
  }
  
  const initialState: CounterState = { value: 0 };
  
  export const counterSlice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
      increment: (state) => { state.value += 1; },
      setValue: (state, action: PayloadAction<number>) => {
        state.value = action.payload;
      },
    },
  });
  
  export const { increment, setValue } = counterSlice.actions;
  export default counterSlice.reducer;
  \`\`\`
- Use typed hooks: \`useAppDispatch\` and \`useAppSelector\`
- Keep reducers pure - side effects go in thunks or RTK Query
`,
    },
    "react-context": {
      dependencies: [],
      content: `
## State Management: React Context

- Create contexts in \`/contexts\` directory with pattern \`[Name]Context.tsx\`
- Always provide a custom hook for consuming context
- Structure each context file:
  \`\`\`typescript
  interface AuthContextValue {
    user: User | null;
    login: (credentials: Credentials) => Promise<void>;
    logout: () => void;
  }
  
  const AuthContext = createContext<AuthContextValue | null>(null);
  
  export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Implementation
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  
  export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
  }
  \`\`\`
- Use \`useReducer\` for complex state logic within providers
- Split contexts by domain to avoid unnecessary re-renders
- Memoize context values with \`useMemo\` when they contain objects/arrays
`,
    },
  },

  // ============================================
  // DATA FETCHING
  // ============================================
  dataFetching: {
    "tanstack-query": {
      dependencies: ["@tanstack/react-query"],
      content: `
## Data Fetching: TanStack Query

- Configure QueryClient in \`/lib/query-client.ts\`
- Define query keys in \`/lib/query-keys.ts\` as factory functions:
  \`\`\`typescript
  export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: Filters) => [...userKeys.lists(), filters] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
  };
  \`\`\`
- Create custom hooks for queries in \`/hooks/queries\`:
  \`\`\`typescript
  export function useUser(id: string) {
    return useQuery({
      queryKey: userKeys.detail(id),
      queryFn: () => fetchUser(id),
      staleTime: 5 * 60 * 1000,
    });
  }
  \`\`\`
- Use \`useMutation\` with \`onSuccess\` invalidation for data updates
- Implement optimistic updates for better UX on mutations
- Use \`Suspense\` with \`useSuspenseQuery\` for loading states
`,
    },
    swr: {
      dependencies: ["swr"],
      content: `
## Data Fetching: SWR

- Configure global SWR settings in \`/lib/swr-config.ts\`
- Create a fetcher utility in \`/lib/fetcher.ts\`:
  \`\`\`typescript
  export const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  };
  \`\`\`
- Define custom hooks for data fetching in \`/hooks\`:
  \`\`\`typescript
  export function useUser(id: string) {
    const { data, error, isLoading, mutate } = useSWR<User>(
      id ? \`/api/users/\${id}\` : null,
      fetcher
    );
    return { user: data, error, isLoading, mutate };
  }
  \`\`\`
- Use \`mutate\` for revalidation and optimistic updates
- Implement \`useSWRInfinite\` for paginated data
- Use conditional fetching by passing \`null\` as key
`,
    },
    "native-fetch": {
      dependencies: [],
      content: `
## Data Fetching: Native Fetch + React Cache

- Use React \`cache()\` for request deduplication in Server Components
- Create typed fetch utilities in \`/lib/api.ts\`:
  \`\`\`typescript
  import { cache } from 'react';
  
  export const getUser = cache(async (id: string): Promise<User> => {
    const res = await fetch(\`\${API_URL}/users/\${id}\`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  });
  \`\`\`
- Use Next.js fetch options for caching:
  - \`{ cache: 'force-cache' }\` - cache indefinitely
  - \`{ cache: 'no-store' }\` - no caching
  - \`{ next: { revalidate: N } }\` - revalidate every N seconds
  - \`{ next: { tags: ['tag'] } }\` - for on-demand revalidation
- For Client Components, create custom hooks with \`useState\` + \`useEffect\`
- Use \`revalidatePath\` or \`revalidateTag\` for cache invalidation in Server Actions
`,
    },
  },

  // ============================================
  // FORM HANDLING
  // ============================================
  formHandling: {
    "react-hook-form": {
      dependencies: ["react-hook-form"],
      content: `
## Form Handling: React Hook Form

- Integrate with schema validation (Zod recommended)
- Create reusable form components in \`/components/forms\`
- Standard form pattern:
  \`\`\`typescript
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  
  type FormData = z.infer<typeof schema>;
  
  export function LoginForm() {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
      resolver: zodResolver(schema),
    });
    
    const onSubmit = async (data: FormData) => { /* ... */ };
    
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
        {/* ... */}
      </form>
    );
  }
  \`\`\`
- Use \`useFieldArray\` for dynamic field lists
- Implement \`useFormContext\` for deeply nested form components
- Use \`watch\` sparingly - prefer controlled re-renders
`,
    },
    formik: {
      dependencies: ["formik"],
      content: `
## Form Handling: Formik

- Create reusable form field components in \`/components/forms\`
- Use Formik with Yup for validation:
  \`\`\`typescript
  import { Formik, Form, Field, ErrorMessage } from 'formik';
  import * as Yup from 'yup';
  
  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email').required('Required'),
    password: Yup.string().min(8, 'Too short').required('Required'),
  });
  
  export function LoginForm() {
    return (
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          // Handle submission
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <Field type="email" name="email" />
            <ErrorMessage name="email" component="span" />
            <button type="submit" disabled={isSubmitting}>Submit</button>
          </Form>
        )}
      </Formik>
    );
  }
  \`\`\`
- Use \`useFormikContext\` for accessing form state in nested components
- Implement \`<FieldArray>\` for dynamic lists
- Create custom field wrapper components for consistent styling
`,
    },
    "native-forms": {
      dependencies: [],
      content: `
## Form Handling: Native HTML Forms

- Use Server Actions for form submission when possible
- Leverage \`useFormState\` and \`useFormStatus\` hooks:
  \`\`\`typescript
  'use client';
  import { useFormState, useFormStatus } from 'react-dom';
  import { submitForm } from './actions';
  
  function SubmitButton() {
    const { pending } = useFormStatus();
    return <button type="submit" disabled={pending}>Submit</button>;
  }
  
  export function ContactForm() {
    const [state, formAction] = useFormState(submitForm, { message: '' });
    
    return (
      <form action={formAction}>
        <input type="email" name="email" required />
        <SubmitButton />
        {state.message && <p>{state.message}</p>}
      </form>
    );
  }
  \`\`\`
- Use HTML5 validation attributes (\`required\`, \`pattern\`, \`min\`, \`max\`)
- Implement custom validation with \`setCustomValidity\`
- Create controlled inputs with \`useState\` only when needed
- Use \`FormData\` API in Server Actions for type-safe form parsing
`,
    },
  },

  // ============================================
  // SCHEMA VALIDATION
  // ============================================
  schemaValidation: {
    zod: {
      dependencies: ["zod"],
      content: `
## Schema Validation: Zod

- Define schemas in \`/lib/schemas\` directory, grouped by domain
- Export inferred types alongside schemas:
  \`\`\`typescript
  import { z } from 'zod';
  
  export const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(2).max(100),
    role: z.enum(['admin', 'user', 'guest']),
    createdAt: z.coerce.date(),
  });
  
  export type User = z.infer<typeof userSchema>;
  
  // Partial schema for updates
  export const updateUserSchema = userSchema.partial().omit({ id: true, createdAt: true });
  export type UpdateUser = z.infer<typeof updateUserSchema>;
  \`\`\`
- Use \`.safeParse()\` for validation without throwing
- Create reusable schema primitives (email, phone, etc.) in \`/lib/schemas/primitives.ts\`
- Validate API responses and environment variables with Zod
- Integrate with React Hook Form using \`@hookform/resolvers/zod\`
`,
    },
    yup: {
      dependencies: ["yup"],
      content: `
## Schema Validation: Yup

- Define schemas in \`/lib/schemas\` directory
- Create typed schemas with \`InferType\`:
  \`\`\`typescript
  import * as yup from 'yup';
  
  export const userSchema = yup.object({
    id: yup.string().uuid().required(),
    email: yup.string().email().required(),
    name: yup.string().min(2).max(100).required(),
    role: yup.string().oneOf(['admin', 'user', 'guest']).required(),
    createdAt: yup.date().required(),
  });
  
  export type User = yup.InferType<typeof userSchema>;
  \`\`\`
- Use \`.validate()\` with \`{ abortEarly: false }\` to collect all errors
- Create custom validation methods with \`yup.addMethod()\`
- Use \`.when()\` for conditional validation
- Integrate with Formik using \`validationSchema\` prop
`,
    },
    valibot: {
      dependencies: ["valibot"],
      content: `
## Schema Validation: Valibot

- Define schemas in \`/lib/schemas\` directory
- Leverage tree-shakeable imports for minimal bundle:
  \`\`\`typescript
  import * as v from 'valibot';
  
  export const userSchema = v.object({
    id: v.pipe(v.string(), v.uuid()),
    email: v.pipe(v.string(), v.email()),
    name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
    role: v.picklist(['admin', 'user', 'guest']),
    createdAt: v.date(),
  });
  
  export type User = v.InferOutput<typeof userSchema>;
  
  // Usage
  const result = v.safeParse(userSchema, data);
  if (result.success) {
    console.log(result.output);
  } else {
    console.log(result.issues);
  }
  \`\`\`
- Use \`v.pipe()\` for composing validations
- Create custom validations with \`v.custom()\`
- Use \`v.partial()\` and \`v.pick()\` for derived schemas
`,
    },
    none: {
      dependencies: [],
      content: `
## Schema Validation: Manual Validation

- Create validation utilities in \`/lib/validation.ts\`
- Implement type guards for runtime type checking:
  \`\`\`typescript
  interface User {
    id: string;
    email: string;
    name: string;
  }
  
  function isUser(value: unknown): value is User {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value && typeof value.id === 'string' &&
      'email' in value && typeof value.email === 'string' &&
      'name' in value && typeof value.name === 'string'
    );
  }
  
  function validateEmail(email: string): string | null {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email) ? null : 'Invalid email format';
  }
  \`\`\`
- Use assertion functions for stricter validation
- Keep validation functions pure and composable
- Document validation rules in JSDoc comments
`,
    },
  },

  // ============================================
  // API ARCHITECTURE
  // ============================================
  apiArchitecture: {
    rest: {
      dependencies: [],
      content: `
## API Architecture: REST (Next.js API Routes)

- Organize routes in \`/app/api\` following REST conventions
- Use route handlers with typed responses:
  \`\`\`typescript
  // app/api/users/[id]/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  
  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const user = await getUser(params.id);
      if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(user);
    } catch (error) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }
  \`\`\`
- Create API client in \`/lib/api-client.ts\` for frontend consumption
- Implement consistent error response format
- Use proper HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE
- Version API if needed: \`/api/v1/...\`
`,
    },
    trpc: {
      dependencies: ["@trpc/server", "@trpc/client", "@trpc/react-query", "@trpc/next"],
      content: `
## API Architecture: tRPC

- Set up tRPC in \`/server/trpc\` directory
- Define routers by domain:
  \`\`\`typescript
  // server/trpc/routers/user.ts
  import { z } from 'zod';
  import { router, publicProcedure, protectedProcedure } from '../trpc';
  
  export const userRouter = router({
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        return ctx.db.user.findUnique({ where: { id: input.id } });
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db.user.update({ where: { id: input.id }, data: { name: input.name } });
      }),
  });
  \`\`\`
- Merge routers in \`/server/trpc/root.ts\`
- Use \`createCallerFactory\` for server-side calls
- Consume in components via \`trpc.useQuery\` and \`trpc.useMutation\`
- Enable React Query integration for caching
`,
    },
    graphql: {
      dependencies: ["@apollo/client", "graphql"],
      content: `
## API Architecture: GraphQL (Apollo Client)

- Define schema in \`/graphql/schema\` directory
- Organize queries and mutations by feature in \`/graphql/operations\`:
  \`\`\`typescript
  // graphql/operations/user.ts
  import { gql } from '@apollo/client';
  
  export const GET_USER = gql\`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        name
        createdAt
      }
    }
  \`;
  
  export const UPDATE_USER = gql\`
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        id
        name
      }
    }
  \`;
  \`\`\`
- Configure Apollo Client in \`/lib/apollo-client.ts\`
- Use code generation for typed hooks (GraphQL Code Generator)
- Implement proper cache normalization and updates
- Use fragments for reusable field selections
`,
    },
    "server-actions": {
      dependencies: [],
      content: `
## API Architecture: Server Actions Only

- Define actions in \`/actions\` directory, grouped by domain
- Use \`'use server'\` directive at file or function level:
  \`\`\`typescript
  // actions/user.ts
  'use server';
  
  import { revalidatePath } from 'next/cache';
  import { z } from 'zod';
  
  const updateUserSchema = z.object({
    id: z.string(),
    name: z.string().min(2),
  });
  
  export async function updateUser(formData: FormData) {
    const validated = updateUserSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
    });
    
    if (!validated.success) {
      return { error: validated.error.flatten() };
    }
    
    await db.user.update({ where: { id: validated.data.id }, data: validated.data });
    revalidatePath('/users');
    return { success: true };
  }
  \`\`\`
- Always validate input in Server Actions
- Use \`revalidatePath\` or \`revalidateTag\` for cache updates
- Return typed responses for client handling
- Bind additional data with \`.bind()\` when needed
`,
    },
  },

  // ============================================
  // TESTING
  // ============================================
  testing: {
    vitest: {
      dependencies: ["vitest", "@testing-library/react", "@testing-library/jest-dom", "@vitejs/plugin-react", "jsdom"],
      content: `
## Testing: Vitest + React Testing Library

- Configure in \`vitest.config.ts\`:
  \`\`\`typescript
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      globals: true,
    },
  });
  \`\`\`
- Place tests adjacent to source files: \`Component.tsx\` → \`Component.test.tsx\`
- Write user-centric tests:
  \`\`\`typescript
  import { render, screen, userEvent } from '@testing-library/react';
  import { LoginForm } from './LoginForm';
  
  describe('LoginForm', () => {
    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      render(<LoginForm onSubmit={vi.fn()} />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /submit/i }));
      
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
  \`\`\`
- Use \`vi.mock()\` for module mocking
- Run with \`npm test\` or \`vitest --watch\`
`,
    },
    jest: {
      dependencies: ["jest", "@testing-library/react", "@testing-library/jest-dom", "jest-environment-jsdom"],
      content: `
## Testing: Jest + React Testing Library

- Configure in \`jest.config.js\`:
  \`\`\`javascript
  const nextJest = require('next/jest');
  
  const createJestConfig = nextJest({ dir: './' });
  
  module.exports = createJestConfig({
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
  });
  \`\`\`
- Place tests adjacent to source files or in \`__tests__\` directories
- Follow AAA pattern (Arrange, Act, Assert):
  \`\`\`typescript
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { Counter } from './Counter';
  
  describe('Counter', () => {
    it('increments count when button is clicked', async () => {
      // Arrange
      render(<Counter initialCount={0} />);
      
      // Act
      await userEvent.click(screen.getByRole('button', { name: /increment/i }));
      
      // Assert
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
  \`\`\`
- Use \`jest.mock()\` for module mocking
- Run with \`npm test\` or \`jest --watch\`
`,
    },
    playwright: {
      dependencies: ["@playwright/test"],
      content: `
## Testing: Playwright (E2E)

- Configure in \`playwright.config.ts\`:
  \`\`\`typescript
  import { defineConfig, devices } from '@playwright/test';
  
  export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
    use: {
      baseURL: 'http://localhost:3000',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
  });
  \`\`\`
- Write tests in \`/e2e\` directory:
  \`\`\`typescript
  import { test, expect } from '@playwright/test';
  
  test('user can complete login flow', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
  \`\`\`
- Use Page Object Model for complex flows
- Run with \`npx playwright test\` or \`npx playwright test --ui\`
`,
    },
    none: {
      dependencies: [],
      content: `
## Testing: Manual Testing Guidelines

- Document critical user flows in \`/docs/testing-checklist.md\`
- Before each deployment, manually verify:
  - Authentication flows (login, logout, session persistence)
  - Core CRUD operations
  - Form submissions and validations
  - Navigation and routing
  - Responsive design breakpoints
- Use browser DevTools for:
  - Network request inspection
  - Console error monitoring
  - Performance profiling
- Consider adding automated tests as the project grows
`,
    },
  },

  // ============================================
  // GIT CONVENTIONS
  // ============================================
  gitConventions: {
    "conventional-commits": {
      dependencies: [],
      content: `
## Git: Conventional Commits

Follow the Conventional Commits specification for all commit messages:

\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

### Types
- \`feat\`: New feature
- \`fix\`: Bug fix
- \`docs\`: Documentation changes
- \`style\`: Formatting (no code change)
- \`refactor\`: Code restructuring (no behavior change)
- \`perf\`: Performance improvement
- \`test\`: Adding/updating tests
- \`chore\`: Maintenance tasks

### Examples
\`\`\`
feat(auth): add Google OAuth login
fix(cart): resolve quantity update race condition
docs(api): add authentication endpoint examples
refactor(hooks): extract useDebounce from useSearch
\`\`\`

### Rules
- Use imperative mood: "add" not "added" or "adds"
- Keep subject line under 72 characters
- Add breaking change footer: \`BREAKING CHANGE: description\`
- Reference issues: \`Closes #123\`
`,
    },
    gitmoji: {
      dependencies: [],
      content: `
## Git: Gitmoji Commits

Use emoji prefixes for commit categorization:

### Common Gitmojis
- ✨ \`:sparkles:\` - New feature
- 🐛 \`:bug:\` - Bug fix
- 📝 \`:memo:\` - Documentation
- 💄 \`:lipstick:\` - UI/style updates
- ♻️ \`:recycle:\` - Refactor code
- ⚡️ \`:zap:\` - Performance improvement
- 🔧 \`:wrench:\` - Configuration changes
- ✅ \`:white_check_mark:\` - Add/update tests
- 🔒 \`:lock:\` - Security fix
- 🚀 \`:rocket:\` - Deploy
- 🗑️ \`:wastebasket:\` - Remove code/files
- 🏗️ \`:building_construction:\` - Architectural changes

### Examples
\`\`\`
✨ Add user profile page
🐛 Fix login redirect loop
📝 Update API documentation
♻️ Refactor auth middleware
⚡️ Optimize image loading
\`\`\`

### Format
\`\`\`
<emoji> <description>
\`\`\`
Keep description concise and use imperative mood.
`,
    },
    simple: {
      dependencies: [],
      content: `
## Git: Simple Commit Messages

Write clear, descriptive commit messages without strict formatting:

### Guidelines
- Start with a capital letter
- Use present tense: "Add" not "Added"
- Be specific about what changed
- Keep the first line under 72 characters
- Add details in the body if needed

### Good Examples
\`\`\`
Add user authentication with session management
Fix cart total calculation for discounted items
Update dependencies to latest versions
Remove deprecated API endpoints
Improve form validation error messages
\`\`\`

### Bad Examples
\`\`\`
fix bug
updates
WIP
asdf
\`\`\`

### When to Add Body
- Complex changes requiring explanation
- Breaking changes
- Non-obvious implementation decisions
`,
    },
  },

  // ============================================
  // PERFORMANCE PATTERNS
  // ============================================
  performancePatterns: {
    aggressive: {
      dependencies: [],
      content: `
## Performance: Aggressive Optimization

Apply these patterns throughout the codebase:

### Code Splitting
- Use \`next/dynamic\` for all non-critical components
- Implement route-based splitting (automatic in App Router)
- Lazy load modals, drawers, and below-fold content:
  \`\`\`typescript
  const Modal = dynamic(() => import('./Modal'), { ssr: false });
  \`\`\`

### Memoization
- Apply \`React.memo()\` to all list item components
- Use \`useMemo\` for expensive computations
- Use \`useCallback\` for all event handlers passed as props
- Consider \`use\` hook with promises for data components

### Image Optimization
- Always use \`next/image\` with explicit dimensions
- Implement blur placeholders for LCP images
- Use WebP/AVIF formats via Next.js automatic optimization
- Lazy load below-fold images with \`loading="lazy"\`

### Bundle Optimization
- Analyze with \`@next/bundle-analyzer\`
- Use dynamic imports for heavy libraries (charts, editors)
- Implement tree-shaking friendly imports
- Use \`optimizePackageImports\` in next.config.js
`,
    },
    balanced: {
      dependencies: [],
      content: `
## Performance: Balanced Optimization

Focus on high-impact optimizations:

### Key Optimizations
- Lazy load routes automatically via App Router
- Use \`next/dynamic\` for heavy components (editors, charts, maps):
  \`\`\`typescript
  const RichEditor = dynamic(() => import('./RichEditor'), { 
    loading: () => <EditorSkeleton />,
  });
  \`\`\`
- Always use \`next/image\` for user-facing images
- Implement \`React.memo()\` for list items rendered in loops

### When to Memoize
- Components receiving objects/arrays as props
- Expensive filter/sort/map operations
- Event handlers passed to memoized children

### Don't Over-Optimize
- Skip memoization for simple components
- Avoid premature optimization
- Measure before optimizing with React DevTools Profiler
`,
    },
    minimal: {
      dependencies: [],
      content: `
## Performance: Minimal Optimization

Optimize only when measured performance issues arise:

### Default Good Practices
- Use \`next/image\` for images (automatic optimization)
- Rely on Next.js automatic code splitting
- Use Server Components by default (zero client JS)

### When to Optimize
- Measure first using:
  - Lighthouse scores
  - Web Vitals (LCP, FID, CLS)
  - React DevTools Profiler
- Document performance issues before fixing
- Create reproducible benchmarks

### Common Fixes When Needed
- Add \`loading="lazy"\` to below-fold images
- Use \`dynamic()\` for large client components
- Add \`React.memo()\` to components causing excessive re-renders
- Implement pagination for long lists
`,
    },
  },

  // ============================================
  // SECURITY PRACTICES
  // ============================================
  securityPractices: {
    strict: {
      dependencies: [],
      content: `
## Security: Strict Practices

### Input Handling
- Validate and sanitize ALL user inputs on the server
- Use schema validation (Zod) for every API endpoint and Server Action
- Implement strict Content Security Policy headers:
  \`\`\`typescript
  // next.config.js
  const securityHeaders = [
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ];
  \`\`\`

### Authentication & Authorization
- Implement CSRF protection for all state-changing operations
- Use HTTP-only, Secure, SameSite cookies for sessions
- Validate permissions on EVERY server request
- Implement rate limiting on auth endpoints

### Data Protection
- Never expose internal IDs - use UUIDs or public IDs
- Sanitize error messages - never leak stack traces
- Implement proper CORS configuration
- Use parameterized queries - never concatenate SQL
- Audit dependencies regularly: \`npm audit\`

### Secrets Management
- Use environment variables for all secrets
- Never commit \`.env\` files
- Rotate secrets periodically
`,
    },
    standard: {
      dependencies: [],
      content: `
## Security: Standard Practices

### Essential Protections
- Validate user input on the server with schema validation
- Use parameterized queries (ORMs handle this automatically)
- Store secrets in environment variables
- Enable HTTPS in production

### Authentication
- Use established auth libraries (NextAuth, Lucia, Clerk)
- Implement secure session management
- Hash passwords with bcrypt or Argon2
- Add basic rate limiting to login endpoints

### Headers
Add security headers in \`next.config.js\`:
\`\`\`typescript
const headers = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];
\`\`\`

### Regular Maintenance
- Run \`npm audit\` before releases
- Keep dependencies updated
- Review auth flows when modified
`,
    },
    minimal: {
      dependencies: [],
      content: `
## Security: Minimal (Framework Defaults)

Rely on Next.js and library defaults:

### Built-in Protections
- Next.js automatically escapes rendered content (XSS protection)
- Server Actions include CSRF protection by default
- Server Components don't expose sensitive logic to client

### Basic Requirements
- Store secrets in \`.env.local\` (gitignored by default)
- Use established auth libraries instead of custom auth
- Use ORMs (Prisma, Drizzle) for database access

### Remember
- Never commit secrets to git
- Validate required fields on forms
- Use HTTPS in production
`,
    },
  },

  // ============================================
  // LOGGING APPROACH
  // ============================================
  loggingApproach: {
    structured: {
      dependencies: ["pino", "pino-pretty"],
      content: `
## Logging: Structured (Pino)

### Setup
Configure Pino in \`/lib/logger.ts\`:
\`\`\`typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined,
});

// Create child loggers for modules
export const apiLogger = logger.child({ module: 'api' });
export const authLogger = logger.child({ module: 'auth' });
\`\`\`

### Log Levels
- \`error\`: Application errors requiring attention
- \`warn\`: Unexpected situations that aren't errors
- \`info\`: Key business events (user actions, transactions)
- \`debug\`: Detailed diagnostic information

### Usage
\`\`\`typescript
import { apiLogger } from '@/lib/logger';

apiLogger.info({ userId, action: 'purchase' }, 'User completed purchase');
apiLogger.error({ err, userId }, 'Payment processing failed');
\`\`\`

### Best Practices
- Include context objects as first argument
- Add correlation IDs for request tracing
- Never log sensitive data (passwords, tokens)
- Use structured fields, not string interpolation
`,
    },
    "console-based": {
      dependencies: [],
      content: `
## Logging: Console-Based

### Setup
Create a simple logger in \`/lib/logger.ts\`:
\`\`\`typescript
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, data?: object) => {
    console.log(\`[INFO] \${message}\`, data ?? '');
  },
  warn: (message: string, data?: object) => {
    console.warn(\`[WARN] \${message}\`, data ?? '');
  },
  error: (message: string, error?: unknown) => {
    console.error(\`[ERROR] \${message}\`, error);
  },
  debug: (message: string, data?: object) => {
    if (isDev) console.log(\`[DEBUG] \${message}\`, data ?? '');
  },
};
\`\`\`

### Usage Patterns
\`\`\`typescript
import { logger } from '@/lib/logger';

// API routes
logger.info('User login', { userId: user.id });

// Error handling
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error);
}

// Development debugging
logger.debug('State update', { prev, next });
\`\`\`

### Guidelines
- Use prefixes consistently ([INFO], [WARN], [ERROR], [DEBUG])
- Include relevant context data
- Avoid logging in hot paths
- Remove debug logs before production
`,
    },
    none: {
      dependencies: [],
      content: `
## Logging: None (Errors Only)

### Approach
- Use built-in \`console.error()\` for unexpected errors only
- Rely on error boundaries and error.tsx for error display
- Use external monitoring (Vercel Analytics, Sentry) for production

### When to Log
\`\`\`typescript
// DO log: Unexpected errors that need investigation
try {
  await criticalOperation();
} catch (error) {
  console.error('Critical operation failed:', error);
  throw error;
}

// DON'T log: Expected flow, debugging, info messages
\`\`\`

### Debugging Strategies
- Use React DevTools for component state
- Use Network tab for API debugging
- Add temporary console.logs, remove before commit
- Use debugger statement and breakpoints
`,
    },
  },
};

// Base CLAUDE.md template
const BASE_TEMPLATE = `# Project Requirements

This document defines the technical requirements and conventions for this Next.js project.
Generated by Claude Code Requirements Builder.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (latest)

## Project Structure

\`\`\`
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (main)/            # Main app route group
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Utilities and configurations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── styles/               # Global styles
└── public/               # Static assets
\`\`\`

## TypeScript Configuration

- Enable strict mode in \`tsconfig.json\`
- Use absolute imports with \`@/\` prefix
- Define explicit types for component props
- Avoid \`any\` - use \`unknown\` and narrow with type guards

## Component Guidelines

- Use function components with TypeScript
- Define props interface above component
- Use named exports for components
- Co-locate component-specific hooks and utilities

\`\`\`typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick}>
      {children}
    </button>
  );
}
\`\`\`
`;

/**
 * Configuration type definition
 * @typedef {Object} ProjectConfig
 * @property {string} stateManagement
 * @property {string} dataFetching
 * @property {string} formHandling
 * @property {string} schemaValidation
 * @property {string} apiArchitecture
 * @property {string} testing
 * @property {string} gitConventions
 * @property {string} performancePatterns
 * @property {string} securityPractices
 * @property {string} loggingApproach
 */

/**
 * Get all dependencies for a given configuration
 * @param {ProjectConfig} config
 * @returns {string[]}
 */
export function getDependencies(config) {
  const allDeps = new Set();

  Object.entries(config).forEach(([key, value]) => {
    const template = TEMPLATES[key];
    if (template && template[value]) {
      const { dependencies } = template[value];
      dependencies.forEach((dep) => allDeps.add(dep));
    }
  });

  return Array.from(allDeps).sort();
}

/**
 * Build the CLAUDE.md requirements file content
 * @param {ProjectConfig} config
 * @returns {string}
 */
export function buildRequirementsFile(config) {
  const sections = [BASE_TEMPLATE];

  // Add dependencies section
  const dependencies = getDependencies(config);
  if (dependencies.length > 0) {
    sections.push(`
## Dependencies

Install the following packages:

\`\`\`bash
npm install ${dependencies.join(" ")}
\`\`\`
`);
  }

  // Add each configuration section
  const configOrder = [
    "stateManagement",
    "dataFetching",
    "formHandling",
    "schemaValidation",
    "apiArchitecture",
    "testing",
    "gitConventions",
    "performancePatterns",
    "securityPractices",
    "loggingApproach",
  ];

  configOrder.forEach((key) => {
    const value = config[key];
    const template = TEMPLATES[key];
    if (template && template[value]) {
      const { content } = template[value];
      sections.push(content);
    }
  });

  return sections.join("\n---\n");
}

/**
 * Get default configuration
 * @returns {ProjectConfig}
 */
export function getDefaultConfig() {
  return {
    stateManagement: "zustand",
    dataFetching: "tanstack-query",
    formHandling: "react-hook-form",
    schemaValidation: "zod",
    apiArchitecture: "server-actions",
    testing: "vitest",
    gitConventions: "conventional-commits",
    performancePatterns: "balanced",
    securityPractices: "standard",
    loggingApproach: "console-based",
  };
}

/**
 * Validate configuration object
 * @param {Partial<ProjectConfig>} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = [];
  const requiredKeys = [
    "stateManagement",
    "dataFetching",
    "formHandling",
    "schemaValidation",
    "apiArchitecture",
    "testing",
    "gitConventions",
    "performancePatterns",
    "securityPractices",
    "loggingApproach",
  ];

  requiredKeys.forEach((key) => {
    if (!config[key]) {
      errors.push(`Missing required configuration: ${key}`);
    } else {
      const template = TEMPLATES[key];
      if (!template[config[key]]) {
        errors.push(`Invalid value for ${key}: ${config[key]}`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// Example usage and CLI support
if (typeof process !== "undefined" && process.argv[1]?.includes("claude-requirements-builder")) {
  const config = getDefaultConfig();
  console.log("Generated CLAUDE.md:\n");
  console.log(buildRequirementsFile(config));
}