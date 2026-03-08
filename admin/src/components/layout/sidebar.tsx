'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard,
  Users,
  Building2,
  Award,
  SmilePlus,
  ThumbsUp,
  Heart,
  Trophy,
  Brain,
  Wallet,
  Gift,
  Tag,
  ClipboardList,
  FileText,
  Settings,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Departments', href: '/departments', icon: Building2 },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Recognitions', href: '/recognitions', icon: Award },
      { label: 'Mood & Happiness', href: '/mood', icon: SmilePlus },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Thumbs Up Types', href: '/gamification/thumbs-up-types', icon: ThumbsUp },
      { label: 'Company Values', href: '/gamification/company-values', icon: Heart },
      { label: 'Badges', href: '/gamification/badges', icon: Trophy },
      { label: 'Skills', href: '/gamification/skills', icon: Brain },
      { label: 'Budgets', href: '/gamification/budgets', icon: Wallet },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { label: 'Reward Catalog', href: '/rewards', icon: Gift },
      { label: 'Categories', href: '/rewards/categories', icon: Tag },
      { label: 'Redemption Queue', href: '/rewards/redemptions', icon: ClipboardList },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', href: '/audit-logs', icon: FileText, superAdminOnly: true },
      { label: 'Settings', href: '/settings', icon: Settings, superAdminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">IndabaCares</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.superAdminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-6">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              {visibleItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
