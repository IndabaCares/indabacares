import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { getBadgeLevel, type LeaderboardEntry } from '@/api/leaderboard-service';
import { useEmployee } from '@/providers/EmployeeContext';

interface TopThreePodiumProps {
  entries: LeaderboardEntry[];
}

// Display order: 2nd (left), 1st (centre), 3rd (right)
const DISPLAY_ORDER = [1, 0, 2] as const;

const PODIUM_CONFIG = [
  { height: 90,  medal: '🥈', avatarSize: 'md', labelSize: 'text-xs'  },
  { height: 120, medal: '🥇', avatarSize: 'lg', labelSize: 'text-sm'  },
  { height: 70,  medal: '🥉', avatarSize: 'md', labelSize: 'text-xs'  },
] as const;

const PODIUM_COLORS = ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.18)'] as const;

export function TopThreePodium({ entries }: TopThreePodiumProps) {
  if (entries.length === 0) return null;

  const { employee } = useEmployee();

  return (
    <View className="mb-4 px-6 pt-4">
      <View className="flex-row items-end justify-center gap-3">
        {DISPLAY_ORDER.map((dataIndex, displayIndex) => {
          const entry  = entries[dataIndex];
          const config = PODIUM_CONFIG[displayIndex];

          if (!entry) {
            return <View key={displayIndex} className="flex-1" />;
          }

          const badge = getBadgeLevel(entry.points_balance);
          const isMe  = entry.employee_id === employee?.employee_id;
          const firstName = entry.full_name.split(' ')[0];

          return (
            <View key={entry.employee_id} className="flex-1 items-center">
              {/* Medal */}
              <Text className="mb-1.5 text-2xl">{config.medal}</Text>

              {/* Avatar */}
              <View
                style={{
                  borderRadius: 999,
                  padding: 2,
                  borderWidth: isMe ? 2 : 0,
                  borderColor: '#ffffff',
                }}
              >
                <Avatar
                  name={entry.full_name}
                  size={config.avatarSize}
                />
              </View>

              {/* Name */}
              <Text
                className={`mt-1.5 text-center font-bold ${config.labelSize}`}
                style={{ color: '#ffffff' }}
                numberOfLines={1}
              >
                {firstName}
              </Text>

              {/* Badge */}
              <Text className="text-base">{badge.emoji}</Text>

              {/* Points */}
              <Text
                className="text-xs font-bold"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {entry.total_points.toLocaleString()}
              </Text>

              {/* Podium bar */}
              <View
                className="mt-2 w-full rounded-t-2xl"
                style={{
                  height: config.height,
                  backgroundColor: PODIUM_COLORS[displayIndex],
                  opacity: 0.85,
                }}
              >
                {/* Rank number inside bar */}
                <Text className="mt-2 text-center text-xs font-bold text-white/80">
                  #{entry.rank}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
