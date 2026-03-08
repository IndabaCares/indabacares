'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { updateCompany } from '@/api/mutations';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Save } from 'lucide-react';
import { toast } from 'sonner';
import { QUERY_KEYS } from '@/lib/constants';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const queryClient = useQueryClient();

  const [name, setName] = useState(company?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor ?? '#22c55e');

  const mutation = useMutation({
    mutationFn: () => {
      if (!company) throw new Error('No company context');
      return updateCompany(company.id, {
        name: name.trim(),
        logo_url: logoUrl.trim() || undefined,
        primary_color: primaryColor,
      });
    },
    onSuccess: () => {
      toast.success('Company settings updated');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users() });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update settings');
    },
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          Only Super Admins can manage company settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Company Settings"
        description="Manage your organization's branding and configuration"
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>Company name, logo, and theme color</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
              />
              {logoUrl && (
                <div className="mt-2 rounded border p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#22c55e"
                  className="w-32 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim()}
        >
          <Save className="mr-2 h-4 w-4" />
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
