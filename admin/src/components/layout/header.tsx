'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

export function Header() {
  const router = useRouter();
  const { user, company, logout } = useAuthStore();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    logout();
    router.replace('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        {company && (
          <span className="text-sm font-medium text-muted-foreground">
            {company.name}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
          <Avatar className="h-8 w-8">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
            <AvatarFallback className="text-xs">
              {user ? getInitials(user.fullName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium">{user?.fullName}</p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {user?.role && (
                <Badge variant="secondary" className="w-fit text-xs">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
