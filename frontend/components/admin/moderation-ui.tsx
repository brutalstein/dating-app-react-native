import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ModerationActionType, ModerationReportItem, ModerationRole, ModerationTimelineItem } from '@/services/moderationService';

export const canUseAdminPanel = (role?: ModerationRole) => role === 'MODERATOR' || role === 'ADMIN' || role === 'OWNER';
export const canEscalate = (role?: ModerationRole) => role === 'ADMIN' || role === 'OWNER';

export function ActionComposer({
  action,
  reason,
  onReasonChange,
  onConfirm,
  disabled,
}: {
  action: ModerationActionType;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, padding: 10, backgroundColor: '#0b1220' }}>
      <Text style={{ color: '#e5e7eb', fontSize: 12, marginBottom: 6 }}>Gerekçe (zorunlu)</Text>
      <TextInput
        value={reason}
        onChangeText={onReasonChange}
        placeholder="Lütfen aksiyon gerekçesini yazın"
        placeholderTextColor="#6b7280"
        style={{ color: '#fff', borderWidth: 1, borderColor: '#374151', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
      />
      <TouchableOpacity disabled={disabled} onPress={onConfirm} style={{ marginTop: 8, backgroundColor: disabled ? '#4b5563' : '#dc2626', borderRadius: 10, padding: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{action} uygula</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ReportCard({
  item,
  actions,
  children,
}: {
  item: ModerationReportItem;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 14, padding: 12, marginBottom: 10, backgroundColor: '#09090b' }}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>{item.reason}</Text>
      <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 3 }}>Durum: {item.status}</Text>
      <Text style={{ color: '#9ca3af', fontSize: 12 }}>Hedef: {item.targetUser?.email || item.targetUser?.id || '—'}</Text>
      {actions}
      {children}
    </View>
  );
}

export function TimelineItemRow({ item }: { item: ModerationTimelineItem }) {
  const subtitle = item.type === 'ACTION'
    ? `${item.action} · ${item.targetEmail || item.targetId || '-'}`
    : `${item.action} · ${item.details || '-'}`;

  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{subtitle}</Text>
      <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.actorEmail || 'system'} · {new Date(item.createdAt).toLocaleString()}</Text>
      {!!item.reason && <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 2 }}>Gerekçe: {item.reason}</Text>}
    </View>
  );
}
