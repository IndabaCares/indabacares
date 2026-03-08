export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][]
) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportUsers(users: any[]) {
  downloadCsv(
    'users',
    ['Name', 'Email', 'Role', 'Department', 'Status', 'Points', 'Stars', 'Joined'],
    users.map((u) => [
      u.full_name,
      u.email,
      u.role,
      u.departments?.name ?? '',
      u.is_active ? 'Active' : 'Inactive',
      String(u.points_balance),
      String(u.stars_balance),
      u.created_at,
    ])
  );
}

export function exportRecognitions(recognitions: any[]) {
  downloadCsv(
    'recognitions',
    ['Date', 'Sender ID', 'Type ID', 'Stars', 'Boosted'],
    recognitions.map((r) => [
      r.created_at,
      r.sender_id,
      r.thumbs_up_type_id,
      String(r.stars_per_recipient),
      r.is_boosted ? 'Yes' : 'No',
    ])
  );
}

export function exportRedemptions(redemptions: any[]) {
  downloadCsv(
    'redemptions',
    ['Date', 'User', 'Reward', 'Stars', 'Status'],
    redemptions.map((r) => [
      r.created_at,
      r.user?.full_name ?? '',
      r.reward?.name ?? '',
      String(r.star_cost),
      r.status,
    ])
  );
}

export function exportMoodEntries(entries: any[]) {
  downloadCsv(
    'mood_entries',
    ['Date', 'User ID', 'Mood'],
    entries.map((e) => [e.entry_date, e.user_id, e.mood])
  );
}
