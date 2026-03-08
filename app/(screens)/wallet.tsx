import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useStarTransactions, type StarTransaction } from '@/hooks/use-star-transactions';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/utils/format';

const TX_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  receive: { icon: 'arrow-down-circle', color: '#22c55e', label: 'Received' },
  redeem: { icon: 'cart', color: '#ef4444', label: 'Redeemed' },
  refund: { icon: 'refresh-circle', color: '#3b82f6', label: 'Refunded' },
  boost_bonus: { icon: 'rocket', color: '#f59e0b', label: 'Boost Bonus' },
  adjust: { icon: 'build', color: '#8b5cf6', label: 'Adjustment' },
};

function TransactionRow({ tx }: { tx: StarTransaction }) {
  const config = TX_TYPE_CONFIG[tx.type] || { icon: 'ellipse', color: '#94a3b8', label: tx.type };
  const isPositive = tx.amount > 0;

  return (
    <View className="flex-row items-center py-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: config.color + '15' }}
      >
        <Ionicons name={config.icon as any} size={18} color={config.color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
          {tx.description}
        </Text>
        <Text className="text-[10px] text-slate-400">
          {config.label} · {formatRelativeTime(tx.created_at)}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`text-sm font-bold ${isPositive ? 'text-success-600' : 'text-danger-500'}`}
        >
          {isPositive ? '+' : ''}{tx.amount}
        </Text>
        <Text className="text-[10px] text-slate-400">
          bal: {tx.balance_after}
        </Text>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: transactions = [], isLoading, refetch, isRefetching } = useStarTransactions();

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 100 }}
      ListHeaderComponent={
        <View className="px-4 pt-4">
          {/* Balance Card */}
          <Card className="mb-4 items-center py-6">
            <Ionicons name="star" size={36} color="#f59e0b" />
            <Text className="mt-2 text-3xl font-bold text-slate-900">
              {user?.starsBalance ?? 0}
            </Text>
            <Text className="text-sm text-slate-500">Star Balance</Text>
          </Card>

          <Text className="mb-2 px-1 text-xs font-semibold uppercase text-slate-400">
            Transaction History
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View className="px-4">
          <TransactionRow tx={item} />
        </View>
      )}
      ItemSeparatorComponent={() => (
        <View className="mx-4 border-b border-slate-100" />
      )}
      ListEmptyComponent={
        !isLoading ? (
          <EmptyState
            icon="⭐"
            title="No transactions yet"
            description="Your star transactions will appear here as you receive and redeem stars."
          />
        ) : (
          <View className="px-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </View>
        )
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
      }
    />
  );
}
