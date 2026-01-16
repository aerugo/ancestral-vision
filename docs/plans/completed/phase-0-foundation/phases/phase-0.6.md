# Phase 0.6: UI Foundation

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Set up shadcn/ui component library, create base layouts, auth pages, and the main app shell with 3D canvas container.

---

## Invariants Enforced in This Phase

- **INV-U001**: Dark theme is the default (cosmic aesthetic)
- **INV-U002**: All interactive elements have accessible labels
- **INV-U003**: Pages protected by auth redirect to login

---

## TDD Steps

### Step 0.6.1: Write Failing Tests (RED)

Create `src/app/page.test.tsx`:

**Test Cases**:

1. `it('should render landing page')` - Basic render
2. `it('should have call-to-action button')` - CTA presence
3. `it('should link to login')` - Navigation

Create `src/app/(auth)/login/page.test.tsx`:

**Test Cases**:

1. `it('should render login form')` - Form presence
2. `it('should validate email format')` - Validation
3. `it('should show error on failed login')` - Error handling

Create `src/components/app-shell.test.tsx`:

**Test Cases**:

1. `it('should render navigation')` - Nav presence
2. `it('should render canvas container')` - Canvas mount
3. `it('should show user menu when authenticated')` - Auth state

```typescript
// src/app/page.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Landing Page', () => {
  it('should render landing page', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('should have call-to-action button', () => {
    render(<Home />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('should link to login', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});
```

```typescript
// src/app/(auth)/login/page.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { AuthProvider } from '@/components/providers/auth-provider';

// Wrap with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
};

describe('Login Page', () => {
  it('should render login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should have link to register', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute(
      'href',
      '/register'
    );
  });
});
```

```typescript
// src/components/app-shell.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';
import { useAuth } from '@/components/providers/auth-provider';

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('App Shell', () => {
  it('should render navigation', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      loading: false,
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render canvas container', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      loading: false,
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByTestId('canvas-container')).toBeInTheDocument();
  });

  it('should show user menu when authenticated', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { email: 'test@example.com', displayName: 'Test User' },
      loading: false,
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });

  it('should show login button when not authenticated', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});
```

### Step 0.6.2: Implement to Pass Tests (GREEN)

**Initialize shadcn/ui**:

```bash
npx shadcn@latest init
# Select: Dark theme, CSS variables, Tailwind CSS
```

**Add components**:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add form
```

**`src/app/layout.tsx`**:

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ancestral Vision',
  description: 'Transform your family tree into a living 3D constellation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**`src/components/providers/index.tsx`**:

```typescript
// src/components/providers/index.tsx
'use client';

import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
```

**`src/app/page.tsx`**:

```typescript
// src/app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Ancestral Vision
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          Transform your family tree into a living 3D constellation.
          Fly through generations and discover your ancestry like never before.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

**`src/app/(auth)/login/page.tsx`**:

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data.email, data.password);
      router.push('/constellation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to access your constellation
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Create account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

**`src/components/app-shell.tsx`**:

```typescript
// src/components/app-shell.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading, logout } = useAuth();

  const initials = user?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Ancestral Vision
          </Link>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="font-medium">
                    {user.displayName || user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 relative">
        <div
          data-testid="canvas-container"
          className="absolute inset-0"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
```

### Step 0.6.3: Refactor

1. Add loading skeletons
2. Add toast notifications
3. Create shared form components

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/layout.tsx` | MODIFY | Add providers |
| `src/app/page.tsx` | MODIFY | Landing page |
| `src/app/page.test.tsx` | CREATE | Landing page tests |
| `src/app/(auth)/login/page.tsx` | CREATE | Login page |
| `src/app/(auth)/login/page.test.tsx` | CREATE | Login tests |
| `src/app/(auth)/register/page.tsx` | CREATE | Register page |
| `src/app/(app)/constellation/page.tsx` | CREATE | Main app page |
| `src/components/app-shell.tsx` | CREATE | App shell |
| `src/components/app-shell.test.tsx` | CREATE | App shell tests |
| `src/components/providers/index.tsx` | CREATE | Provider aggregation |
| `src/components/providers/theme-provider.tsx` | CREATE | Theme provider |
| `src/components/ui/*.tsx` | CREATE | shadcn/ui components |

---

## Verification

```bash
# Run UI tests
npx vitest run src/app
npx vitest run src/components

# Start dev server
npm run dev

# Check landing page
open http://localhost:3000

# Check login page
open http://localhost:3000/login

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All page tests pass
- [ ] All component tests pass
- [ ] Landing page renders with CTA
- [ ] Login page validates input
- [ ] Register page works
- [ ] App shell shows user when authenticated
- [ ] Dark theme applied by default
- [ ] Type check passes
- [ ] Lint passes
