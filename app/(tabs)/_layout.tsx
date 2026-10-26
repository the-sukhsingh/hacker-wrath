import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface TabItemProps {
  focused: boolean;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  coralColor: string;
  inactiveColor: string;
}

function MeetaTabItem({
  focused,
  label,
  activeIcon,
  inactiveIcon,
  coralColor,
  inactiveColor,
}: TabItemProps) {
  if (focused) {
    return (
      <View style={[styles.activeCapsule, { backgroundColor: coralColor }]}>
        <Ionicons name={activeIcon} size={18} color="#FFFFFF" />
        <Text style={styles.activeCapsuleLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.inactiveIconWrapper}>
      <Ionicons name={inactiveIcon} size={22} color={inactiveColor} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(insets.bottom + 8, 14),
          left: 16,
          right: 16,
          backgroundColor: colors.surface,
          borderRadius: 36,
          height: 64,
          paddingHorizontal: 6,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
        },
        tabBarItemStyle: {
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <MeetaTabItem
              focused={focused}
              label="Home"
              activeIcon="home"
              inactiveIcon="home-outline"
              coralColor={colors.primary}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <MeetaTabItem
              focused={focused}
              label="Schedule"
              activeIcon="calendar"
              inactiveIcon="calendar-outline"
              coralColor={colors.primary}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused }) => (
            <MeetaTabItem
              focused={focused}
              label="Record"
              activeIcon="mic"
              inactiveIcon="mic-outline"
              coralColor={colors.primary}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ focused }) => (
            <MeetaTabItem
              focused={focused}
              label="Notes"
              activeIcon="document-text"
              inactiveIcon="document-text-outline"
              coralColor={colors.primary}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <MeetaTabItem
              focused={focused}
              label="Settings"
              activeIcon="settings"
              inactiveIcon="settings-outline"
              coralColor={colors.primary}
              inactiveColor={colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#E06D53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  activeCapsuleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inactiveIconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
