/**
 * Supabase Database Types
 *
 * In production, generate with: npx supabase gen types typescript --linked > src/types/database.ts
 * These manual types match the schema from migrations 001-009.
 */

export type AppRole = 'employee' | 'manager' | 'admin' | 'super_admin';
export type Visibility = 'public' | 'team_only' | 'private';
export type MoodValue = 'awful' | 'bad' | 'okay' | 'good' | 'amazing';
export type RedemptionStatus = 'pending' | 'approved' | 'preparing' | 'shipped' | 'fulfilled' | 'rejected' | 'cancelled';
export type NotificationType =
  | 'recognition_received'
  | 'recognition_boosted'
  | 'reaction'
  | 'comment'
  | 'reward_approved'
  | 'reward_in_preparation'
  | 'reward_shipped'
  | 'reward_fulfilled'
  | 'reward_rejected'
  | 'budget_reset'
  | 'badge_earned'
  | 'manager_alert'
  | 'system';

// ─── Row types ──────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface DepartmentRow {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  department_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  points_balance: number;
  stars_balance: number;
  giving_balance: number;
  login_streak: number;
  last_mood_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyValueRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface ThumbsUpTypeRow {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  color: string;
  stars_awarded: number;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface RecognitionRow {
  id: string;
  company_id: string;
  sender_id: string;
  thumbs_up_type_id: string;
  message: string;
  visibility: Visibility;
  stars_per_recipient: number;
  image_url: string | null;
  hashtags: string[];
  is_boosted: boolean;
  boosted_by: string | null;
  boosted_at: string | null;
  created_at: string;
}

interface RecognitionRecipientRow {
  id: string;
  recognition_id: string;
  recipient_id: string;
}

interface ReactionRow {
  id: string;
  company_id: string;
  recognition_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface CommentRow {
  id: string;
  company_id: string;
  recognition_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface RewardRow {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  star_cost: number;
  stock: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RewardCategoryRow {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

interface RedemptionRow {
  id: string;
  company_id: string;
  user_id: string;
  reward_id: string;
  star_cost: number;
  status: RedemptionStatus;
  admin_note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MoodEntryRow {
  id: string;
  company_id: string;
  user_id: string;
  mood: MoodValue;
  note: string | null;
  entry_date: string;
  created_at: string;
}

interface SkillCategoryRow {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

interface SkillIndicatorRow {
  id: string;
  category_id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

interface SkillRatingRow {
  id: string;
  company_id: string;
  rater_id: string;
  recipient_id: string;
  indicator_id: string;
  score: number;
  created_at: string;
}

interface BadgeRow {
  id: string;
  company_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  criteria: Record<string, unknown>;
  created_at: string;
}

interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

interface LeaderboardCacheRow {
  id: string;
  company_id: string;
  user_id: string;
  period_type: string;
  period_key: string;
  total_points: number;
  rank: number;
  rank_change: number;
  refreshed_at: string;
}

interface PointTransactionRow {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  idempotency_key: string;
  created_at: string;
}

interface StarTransactionRow {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  idempotency_key: string;
  created_at: string;
}

// ─── Database interface ─────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: Omit<CompanyRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CompanyRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      departments: {
        Row: DepartmentRow;
        Insert: Omit<DepartmentRow, 'id' | 'created_at'>;
        Update: Partial<Omit<DepartmentRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'points_balance' | 'stars_balance' | 'giving_balance' | 'login_streak' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      company_values: {
        Row: CompanyValueRow;
        Insert: Omit<CompanyValueRow, 'id' | 'created_at'>;
        Update: Partial<Omit<CompanyValueRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      thumbs_up_types: {
        Row: ThumbsUpTypeRow;
        Insert: Omit<ThumbsUpTypeRow, 'id' | 'created_at'>;
        Update: Partial<Omit<ThumbsUpTypeRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      recognitions: {
        Row: RecognitionRow;
        Insert: Omit<RecognitionRow, 'id' | 'created_at'>;
        Update: Partial<Omit<RecognitionRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      recognition_recipients: {
        Row: RecognitionRecipientRow;
        Insert: Omit<RecognitionRecipientRow, 'id'>;
        Update: Partial<Omit<RecognitionRecipientRow, 'id'>>;
        Relationships: [];
      };
      reactions: {
        Row: ReactionRow;
        Insert: Omit<ReactionRow, 'id' | 'created_at' | 'user_id'>;
        Update: Partial<Omit<ReactionRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      comments: {
        Row: CommentRow;
        Insert: Omit<CommentRow, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
        Update: Partial<Omit<CommentRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id' | 'created_at' | 'is_read'>;
        Update: Partial<Omit<NotificationRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      rewards: {
        Row: RewardRow;
        Insert: Omit<RewardRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RewardRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      reward_categories: {
        Row: RewardCategoryRow;
        Insert: Omit<RewardCategoryRow, 'id' | 'created_at'>;
        Update: Partial<Omit<RewardCategoryRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      redemptions: {
        Row: RedemptionRow;
        Insert: Omit<RedemptionRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RedemptionRow, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      mood_entries: {
        Row: MoodEntryRow;
        Insert: Omit<MoodEntryRow, 'id' | 'created_at'>;
        Update: Partial<Omit<MoodEntryRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      skill_categories: {
        Row: SkillCategoryRow;
        Insert: Omit<SkillCategoryRow, 'id' | 'created_at'>;
        Update: Partial<Omit<SkillCategoryRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      skill_indicators: {
        Row: SkillIndicatorRow;
        Insert: Omit<SkillIndicatorRow, 'id' | 'created_at'>;
        Update: Partial<Omit<SkillIndicatorRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      skill_ratings: {
        Row: SkillRatingRow;
        Insert: Omit<SkillRatingRow, 'id' | 'created_at'>;
        Update: Partial<Omit<SkillRatingRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      badges: {
        Row: BadgeRow;
        Insert: Omit<BadgeRow, 'id' | 'created_at'>;
        Update: Partial<Omit<BadgeRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      user_badges: {
        Row: UserBadgeRow;
        Insert: Omit<UserBadgeRow, 'id' | 'earned_at'>;
        Update: Partial<Omit<UserBadgeRow, 'id' | 'earned_at'>>;
        Relationships: [];
      };
      leaderboard_cache: {
        Row: LeaderboardCacheRow;
        Insert: Omit<LeaderboardCacheRow, 'id'>;
        Update: Partial<Omit<LeaderboardCacheRow, 'id'>>;
        Relationships: [];
      };
      point_transactions: {
        Row: PointTransactionRow;
        Insert: Omit<PointTransactionRow, 'id' | 'created_at'>;
        Update: Record<string, never>;
        Relationships: [];
      };
      star_transactions: {
        Row: StarTransactionRow;
        Insert: Omit<StarTransactionRow, 'id' | 'created_at'>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      process_recognition: {
        Args: {
          p_sender_id: string;
          p_company_id: string;
          p_recipient_ids: string[];
          p_thumbs_up_type_id: string;
          p_message: string;
          p_visibility: string;
          p_image_url: string | null;
          p_hashtags: string[];
        };
        Returns: string;
      };
      submit_mood: {
        Args: {
          p_user_id: string;
          p_company_id: string;
          p_mood: string;
          p_note: string | null;
        };
        Returns: string;
      };
      process_redemption: {
        Args: {
          p_user_id: string;
          p_company_id: string;
          p_reward_id: string;
        };
        Returns: string;
      };
      track_login: {
        Args: { target_user_id: string };
        Returns: unknown;
      };
      resolve_budget: {
        Args: { target_user_id: string };
        Returns: unknown;
      };
    };
    Enums: {
      app_role: AppRole;
      mood_value: MoodValue;
      notification_type: NotificationType;
      recognition_visibility: Visibility;
      redemption_status: RedemptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
