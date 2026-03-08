'use client';

import { useState, useMemo } from 'react';
import { useMoodAnalytics } from '@/hooks/use-mood';
import { useDepartments } from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/charts/stat-card';
import { DateRangePicker } from '@/components/charts/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SmilePlus, Users, TrendingUp, BarChart3, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { formatNumber } from '@/lib/utils';
import { MOOD_MAP } from '@/lib/constants';
import { exportMoodEntries } from '@/api/export';
import { format, subDays } from 'date-fns';

export default function MoodPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useMoodAnalytics(dateFrom, dateTo);
  const { data: departments } = useDepartments();

  const stats = useMemo(() => {
    if (!data) return null;
    const { happinessScores, moodEntries, activeUserCount } = data;

    // Overall happiness (company-wide, null department_id)
    const companyScores = happinessScores.filter((s) => s.department_id === null);
    const avgHappiness = companyScores.length > 0
      ? Math.round(companyScores.reduce((sum, s) => sum + s.happiness_score, 0) / companyScores.length * 10) / 10
      : 0;

    // Participation
    const uniqueParticipants = new Set(moodEntries.map((e) => e.user_id)).size;
    const participationRate = activeUserCount > 0 ? Math.round((uniqueParticipants / activeUserCount) * 100) : 0;

    // Happiness trend (daily, company-wide)
    const trendData = companyScores.map((s) => ({ date: s.entry_date, score: s.happiness_score, count: s.submission_count }));

    // By department
    const deptScores = happinessScores.filter((s) => s.department_id !== null);
    const deptMap: Record<string, { total: number; count: number }> = {};
    deptScores.forEach((s) => {
      if (!deptMap[s.department_id!]) deptMap[s.department_id!] = { total: 0, count: 0 };
      deptMap[s.department_id!].total += s.happiness_score;
      deptMap[s.department_id!].count++;
    });
    const deptData = Object.entries(deptMap).map(([deptId, { total, count }]) => {
      const dept = (departments as any[])?.find((d) => d.id === deptId);
      return { name: dept?.name ?? 'Unknown', score: Math.round(total / count * 10) / 10 };
    }).sort((a, b) => b.score - a.score);

    // Mood distribution
    const moodCount: Record<string, number> = {};
    moodEntries.forEach((e) => { moodCount[e.mood] = (moodCount[e.mood] ?? 0) + 1; });
    const moodData = Object.entries(moodCount).map(([mood, count]) => ({
      name: MOOD_MAP[mood]?.label ?? mood,
      value: count,
      color: MOOD_MAP[mood]?.color ?? '#94a3b8',
    }));

    return { avgHappiness, totalSubmissions: moodEntries.length, participationRate, uniqueParticipants, trendData, deptData, moodData };
  }, [data, departments]);

  return (
    <div>
      <PageHeader title="Mood & Happiness" description="Track employee well-being and engagement"
        actions={<><DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} /><Button variant="outline" size="sm" onClick={() => data && exportMoodEntries(data.moodEntries)} disabled={!data}><Download className="mr-2 h-4 w-4" />Export</Button></>} />

      {isLoading ? <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div> : stats && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard title="Happiness Score" value={`${stats.avgHappiness}/100`} icon={SmilePlus} />
            <StatCard title="Participation Rate" value={`${stats.participationRate}%`} icon={Users} description={`${stats.uniqueParticipants} participants`} />
            <StatCard title="Total Submissions" value={formatNumber(stats.totalSubmissions)} icon={TrendingUp} />
            <StatCard title="Departments Tracked" value={stats.deptData.length} icon={BarChart3} />
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Happiness Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} name="Happiness" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Mood Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={stats.moodData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={(props: PieLabelRenderProps) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}>
                      {stats.moodData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {stats.deptData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Happiness by Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, stats.deptData.length * 40)}>
                  <BarChart data={stats.deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#22c55e" radius={[0, 4, 4, 0]} name="Happiness Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
