import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  description?: string;
}

export function StatCard({ title, value, icon: Icon, trend, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span className={cn('flex items-center text-xs font-medium', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
              {trend.isPositive ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
