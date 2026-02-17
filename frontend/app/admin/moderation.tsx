import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { moderationService } from '@/services/moderationService';

export default function ModerationScreen() {
  const [reports, setReports] = useState<any[]>([]);

  const load = async () => {
    const data = await moderationService.listReports();
    setReports(data || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Admin Moderasyon</Text>
      {reports.map((r) => (
        <View key={r.id} style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10, marginBottom: 10 }}>
          <Text style={{ color: '#fff' }}>Report: {r.reason}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>Status: {r.status}</Text>
          {r.targetUser?.id ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => moderationService.userAction(r.targetUser.id, 'WARN', 'Policy warning')}><Text style={{ color: '#fbbf24' }}>Warn</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => moderationService.userAction(r.targetUser.id, 'BAN', 'Policy violation')}><Text style={{ color: '#f87171' }}>Ban</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => moderationService.userAction(r.targetUser.id, 'UNBAN')}><Text style={{ color: '#34d399' }}>Unban</Text></TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity onPress={() => moderationService.setReportStatus(r.id, 'REVIEWED').then(load)} style={{ marginTop: 8 }}>
            <Text style={{ color: '#60a5fa' }}>Mark reviewed</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
