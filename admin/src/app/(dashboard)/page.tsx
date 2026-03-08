'use client';

import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Gift, SmilePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { QUERY_KEYS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const company = useAuthStore((s) => s.company);
  const supabase = createClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [usersRes, recognitionsRes, redemptionsRes, moodRes] =
        await Promise.all([
          (supabase.from('profiles') as any)
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true) as Promise<{ count: number | null }>,
          (supabase.from('recognitions') as any)
            .select('id', { count: 'exact', head: true }) as Promise<{ count: number | null }>,
          (supabase.from('redemptions') as any)
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending') as Promise<{ count: number | null }>,
          (supabase.from('mood_entries') as any)
            .select('id', { count: 'exact', head: true })
            .eq('entry_date', new Date().toISOString().split('T')[0]) as Promise<{ count: number | null }>,
        ]);

      return {
        activeUsers: usersRes.count ?? 0,
        totalRecognitions: recognitionsRes.count ?? 0,
        pendingRedemptions: redemptionsRes.count ?? 0,
        todayMoodEntries: moodRes.count ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${company?.name ?? 'IndabaCares'} admin panel`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Active Users"
              value={stats?.activeUsers ?? 0}
              icon={Users}
              description="Total active employees"
            />
            <StatCard
              title="Total Recognitions"
              value={stats?.totalRecognitions ?? 0}
              icon={Award}
              description="All-time recognitions sent"
            />
            <StatCard
              title="Pending Redemptions"
              value={stats?.pendingRedemptions ?? 0}
              icon={Gift}
              description="Awaiting approval"
            />
            <StatCard
              title="Mood Check-ins Today"
              value={stats?.todayMoodEntries ?? 0}
              icon={SmilePlus}
              description="Submissions today"
            />
          </>
        )}
      </div>
    </div>
  );
}
