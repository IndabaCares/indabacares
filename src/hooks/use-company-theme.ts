import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';

export interface CompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  companyName: string;
  /** 20% opacity variant of primary for backgrounds */
  primaryLight: string;
  /** 20% opacity variant of secondary for backgrounds */
  secondaryLight: string;
}

/**
 * Returns the current company's white-label theme.
 * Falls back to default IndabaCares branding when no company is loaded.
 */
export function useCompanyTheme(): CompanyTheme {
  const company = useAuthStore((s) => s.company);

  return useMemo(() => {
    const primaryColor = company?.primaryColor || COLORS.primary;
    // secondaryColor comes from the company record (added in migration 011)
    const secondaryColor =
      (company?.features as Record<string, unknown>)?.secondary_color as string ||
      COLORS.warning;

    return {
      primaryColor,
      secondaryColor,
      logoUrl: company?.logoUrl ?? null,
      companyName: company?.name ?? 'IndabaCares',
      primaryLight: primaryColor + '33',
      secondaryLight: secondaryColor + '33',
    };
  }, [company]);
}
