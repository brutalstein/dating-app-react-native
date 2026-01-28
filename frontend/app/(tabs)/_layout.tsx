import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FF5A5F',
        tabBarInactiveTintColor: 'grey',
        headerShown: false,
        tabBarStyle: { 
          height: 85, 
          paddingBottom: 20, 
          borderTopWidth: 0, 
          backgroundColor: 'black' 
        }
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={28} name={focused ? 'flame' : 'flame-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={28} name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={28} name={focused ? 'settings' : 'settings-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}