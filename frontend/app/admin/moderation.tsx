import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActionComposer, canEscalate, canUseAdminPanel, ReportCard, TimelineItemRow } from '@/components/admin/moderation-ui';
import { moderationService, ModerationActionType, ModerationReportItem, ModerationRole, ModerationTimelineItem } from '@/services/moderationService';
import { profileService } from '@/services/profileService';

export default function ModerationScreen() {
  const router = useRouter();
  const [role, setRole] = useState<ModerationRole>('USER');
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [timeline, setTimeline] = useState<ModerationTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ reportId: string; userId: string; action: ModerationActionType } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await profileService.getProfile();
      const userRole = (profile.role ?? 'USER') as ModerationRole;
      setRole(userRole);

      if (!canUseAdminPanel(userRole)) {
        setReports([]);
        setTimeline([]);
        return;
      }

      const [reportData, timelineData] = await Promise.all([
        moderationService.listReports(),
        moderationService.listTimeline(),
      ]);
      setReports(reportData || []);
      setTimeline(timelineData || []);
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Moderasyon verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const requiresEscalation = useMemo(
    () => !!pendingAction && (pendingAction.action === 'BAN' || pendingAction.action === 'UNBAN'),
    [pendingAction]
  );

  const applyAction = async () => {
    if (!pendingAction) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      Alert.alert('Gerekçe zorunlu', 'Lütfen moderasyon aksiyonu için gerekçe girin.');
      return;
    }

    if (requiresEscalation && !canEscalate(role)) {
      Alert.alert('Yetki yok', 'Ban/Unban işlemleri için ADMIN veya OWNER rolü gerekir.');
      return;
    }

    const confirmText = `${pendingAction.action} işlemini uygulamak istediğine emin misin?`;
    Alert.alert('Aksiyon onayı', confirmText, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Onayla',
        style: 'destructive',
        onPress: async () => {
          try {
            await moderationService.userAction(pendingAction.userId, pendingAction.action, trimmed);
            setPendingAction(null);
            setReason('');
            await load();
          } catch (error: any) {
            Alert.alert('Hata', error?.message || 'Aksiyon uygulanamadı.');
          }
        },
      },
    ]);
  };

  const markReviewed = async (reportId: string) => {
    try {
      await moderationService.setReportStatus(reportId, 'REVIEWED');
      await load();
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Rapor güncellenemedi.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF5A5F" />
      </View>
    );
  }

  if (!canUseAdminPanel(role)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 8 }}>Bu alana erişim yetkin yok</Text>
        <Text style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 14 }}>
          Moderasyon ekranı sadece MODERATOR / ADMIN / OWNER rolleri için görünür.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#27272a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 2 }}>Admin Moderasyon</Text>
      <Text style={{ color: '#9ca3af', marginBottom: 12 }}>Rol: {role}</Text>

      <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 8 }}>Açık Raporlar</Text>
      {reports.length === 0 ? <Text style={{ color: '#9ca3af', marginBottom: 10 }}>Rapor bulunamadı.</Text> : null}
      {reports.map((report) => {
        const isActive = pendingAction?.reportId === report.id;

        return (
          <ReportCard
            key={report.id}
            item={report}
            actions={
              report.targetUser?.id ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setPendingAction({ reportId: report.id, userId: report.targetUser!.id, action: 'WARN' })}>
                    <Text style={{ color: '#fbbf24' }}>Warn</Text>
                  </TouchableOpacity>
                  {canEscalate(role) && (
                    <>
                      <TouchableOpacity onPress={() => setPendingAction({ reportId: report.id, userId: report.targetUser!.id, action: 'BAN' })}>
                        <Text style={{ color: '#f87171' }}>Ban</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setPendingAction({ reportId: report.id, userId: report.targetUser!.id, action: 'UNBAN' })}>
                        <Text style={{ color: '#34d399' }}>Unban</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : null
            }>
            {isActive && pendingAction ? (
              <ActionComposer
                action={pendingAction.action}
                reason={reason}
                onReasonChange={setReason}
                onConfirm={applyAction}
                disabled={!reason.trim()}
              />
            ) : null}

            <TouchableOpacity onPress={() => markReviewed(report.id)} style={{ marginTop: 8 }}>
              <Text style={{ color: '#60a5fa' }}>Mark reviewed</Text>
            </TouchableOpacity>
          </ReportCard>
        );
      })}

      <Text style={{ color: '#fff', fontWeight: '700', marginTop: 10, marginBottom: 8 }}>Audit Timeline</Text>
      <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#09090b' }}>
        {timeline.length === 0 ? <Text style={{ color: '#9ca3af', paddingVertical: 12 }}>Timeline boş.</Text> : null}
        {timeline.map((item) => (
          <TimelineItemRow key={item.id} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}
