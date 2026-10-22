import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

export default function AuthScreen() {
  useEffect(() => {
    // 1. Complete auth session if running in web popup or tab
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch {}

    // 2. On web, check if we need to deep link back to native scheme
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const href = window.location.href;
      if (href.includes('code=') || href.includes('access_token=')) {
        try {
          const queryString = window.location.search || '';
          const hashString = window.location.hash || '';
          window.location.href = `hackerwrath://auth${queryString}${hashString}`;
        } catch {}
      }
    }

    const timer = setTimeout(() => {
      router.replace('/(tabs)/meetings');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.title}>Completing Authentication...</Text>
      <Text style={styles.subtitle}>Returning you to HackerWrath Meetings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
