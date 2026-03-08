'use client';

import { useState, useMemo } from 'react';
import { useRecognitionAnalytics } from '@/hooks/use-recognitions';
import { useThumbsUpTypes } from '@/hooks/use-gamification';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/charts/stat-card';
import { DateRangePicker } from '@/components/charts/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Award, Star, Zap, Users, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, getInitials } from '@/lib/utils';
import { exportRecognitions } from '@/api/export';
import { format, subDays } from 'date-fns';

export default function RecognitionsPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useRecognitionAnalytics(dateFrom, dateTo);
  const { data: types } = useThumbsUpTypes();

  const stats = useMemo(() => {
    if (!data) return null;
    const { recognitions, senders } = data;
    const totalStars = recognitions.reduce((sum, r) => sum + r.stars_per_recipient, 0);
    const boosted = recognitions.filter((r) => r.is_boosted).length;

    // Daily volume
    const dailyMap: Record<string, number> = {};
    recognitions.forEach((r) => {
      const day = r.created_at.split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    });
    const dailyData = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    // By type
    const typeMap: Record<string, number> = {};
    recognitions.forEach((r) => { typeMap[r.thumbs_up_type_id] = (typeMap[r.thumbs_up_type_id] ?? 0) + 1; });
    const typeData = Object.entries(typeMap).map(([typeId, count]) => {
      const t = (types as any[])?.find((t) => t.id === typeId);
      return { name: t?.name ?? typeId.slice(0, 8), count };
    }).sort((a, b) => b.count - a.count);

    // Top senders
    const senderMap: Record<string, { name: string; avatar: string | null; count: number }> = {};
    senders.forEach((s) => {
      if (!senderMap[s.sender_id]) senderMap[s.sender_id] = { name: s.sender?.full_name ?? 'Unknown', avatar: s.sender?.avatar_url ?? null, count: 0 };
      senderMap[s.sender_id].count++;
    });
    const topSenders = Object.values(senderMap).sort((a, b) => b.count - a.count).slice(0, 10);

    return { total: recognitions.length, totalStars, boosted, boostRate: recognitions.length > 0 ? Math.round((boosted / recognitions.length) * 100) : 0, dailyData, typeData, topSenders };
  }, [data, types]);

  return (
    <div>
      <PageHeader title="Recognition Analytics" description="Insights into recognition activity"
        actions={<><DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} /><Button variant="outline" size="sm" onClick={() => data && exportRecognitions(data.recognitions)} disabled={!data}><Download className="mr-2 h-4 w-4" />Export</Button></>} />

      {isLoading ? <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div> : stats && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard title="Total Recognitions" value={formatNumber(stats.total)} icon={Award} />
            <StatCard title="Stars Distributed" value={formatNumber(stats.totalStars)} icon={Star} />
            <StatCard title="Boost Rate" value={`${stats.boostRate}%`} icon={Zap} description={`${stats.boosted} boosted`} />
            <StatCard title="Top Senders" value={stats.topSenders.length} icon={Users} />
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Volume</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">By Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Senders</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topSenders.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-right text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    <Avatar className="h-8 w-8"><AvatarImage src={s.avatar ?? undefined} /><AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback></Avatar>
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <span className="text-sm font-bold">{s.count} recognitions</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
