'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SearchBar } from '@/components/search-bar';
import { AddPersonDialog } from '@/components/add-person-dialog';

interface AppShellProps {
  children: React.ReactNode;
  onPersonSelect?: (personId: string) => void;
}

/**
 * App Shell component
 *
 * Provides the main application layout with navigation,
 * user menu, and a container for 3D canvas content.
 */
export function AppShell({ children, onPersonSelect }: AppShellProps): React.ReactElement {
  const { user, loading, logout } = useAuth();
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  const initials =
    user?.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col">
      <nav
        className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="navigation"
      >
        <div className="container flex h-14 items-center justify-between">
          <Link href={user ? '/constellation' : '/'} className="font-semibold text-lg">
            Ancestral Vision
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddPersonOpen(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Person
              </Button>
            )}
            {user && onPersonSelect && (
              <SearchBar
                onSelect={onPersonSelect}
                className="w-64"
              />
            )}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="font-medium">
                    {user.displayName || user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
        <div data-testid="canvas-container" className="absolute inset-0">
          {children}
        </div>
      </main>

      {/* Add Person Dialog */}
      {isAddPersonOpen && (
        <AddPersonDialog onClose={() => setIsAddPersonOpen(false)} />
      )}
    </div>
  );
}
