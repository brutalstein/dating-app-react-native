export function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes}dk`;
  if (hours < 24) return `${hours}sa`;
  if (days < 7) return `${days}g`;

  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
