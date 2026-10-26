import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export interface MeetaTabBarProps {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: any;
    }>;
  };
  descriptors: Record<string, any>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string, params?: any) => void;
  };
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface TabConfig {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  meetings: {
    name: 'meetings',
    label: 'Schedule',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
  },
  record: {
    name: 'record',
    label: 'Record',
    activeIcon: 'mic',
    inactiveIcon: 'mic-outline',
  },
  notes: {
    name: 'notes',
    label: 'Notes',
    activeIcon: 'document-text',
    inactiveIcon: 'document-text-outline',
  },
  settings: {
    name: 'settings',
    label: 'Settings',
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
  },
};

export function MeetaTabBar({ state, descriptors, navigation, insets }: MeetaTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.dockWrapper,
        {
          bottom: Math.max(insets.bottom, 12),
        },
      ]}>
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: '#000000',
          },
        ]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name] || {
            name: route.name,
            label: route.name,
            activeIcon: 'apps' as const,
            inactiveIcon: 'apps-outline' as const,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          if (isFocused) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.activeCapsule,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}>
                <Ionicons name={config.activeIcon} size={18} color="#FFFFFF" />
                <Text style={styles.activeCapsuleText}>{config.label}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              onPress={onPress}
              onLongPress={onLongPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.inactiveButton,
                {
                  transform: [{ scale: pressed ? 0.88 : 1 }],
                },
              ]}>
              <Ionicons
                name={config.inactiveIcon}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 8,
    borderRadius: 36,
    width: '92%',
    maxWidth: 420,
    borderWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
  },
  activeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#E06D53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  activeCapsuleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  },
  inactiveButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
