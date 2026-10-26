import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { View } from './Themed';
import { useColorScheme } from './useColorScheme';

export type OrbMode = 'idle' | 'recording' | 'paused' | 'thinking';

interface ShaderOrbProps {
  state?: OrbMode;
  meterLevel?: number; // 0 to 1
  size?: number;
  style?: ViewStyle;
}

/**
 * Quantum Shader Orb (Inspired by SHDR-11 Hydrogen Wavefunction)
 * Implemented with high-performance React Native Reanimated running on UI thread.
 * Emulates the rotating dome, precessing orbital bands, chromatic aberration,
 * and audio-reactive volume swell of quantum wavefunction |psi|^2.
 */
export function ShaderOrb({
  state = 'idle',
  meterLevel = 0,
  size = 180,
  style,
}: ShaderOrbProps) {
  const theme = useColorScheme();
  const isDark = theme === 'dark';

  // Primary integrated continuous clock rotations
  const spinClock = useSharedValue(0);
  const precessionClock = useSharedValue(0);
  const flowClock = useSharedValue(0);

  // Audio reactivity & State modulation
  const meterEnergy = useSharedValue(0);
  const breathPulse = useSharedValue(1);

  // Set up continuous rotation clocks
  useEffect(() => {
    spinClock.value = withRepeat(
      withTiming(360, {
        duration: state === 'recording' ? 3200 : state === 'thinking' ? 2400 : 9000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    precessionClock.value = withRepeat(
      withTiming(360, {
        duration: state === 'recording' ? 4800 : state === 'thinking' ? 3600 : 14000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    flowClock.value = withRepeat(
      withTiming(360, {
        duration: state === 'recording' ? 5600 : 16000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    breathPulse.value = withRepeat(
      withTiming(state === 'recording' ? 1.08 : 1.04, {
        duration: state === 'recording' ? 1200 : 2600,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [state, breathPulse, flowClock, precessionClock, spinClock]);

  // Smoothly track mic meter level
  useEffect(() => {
    meterEnergy.value = withSpring(Math.max(0, Math.min(1, meterLevel)), {
      damping: 12,
      stiffness: 180,
    });
  }, [meterLevel, meterEnergy]);

  // Atmospheric halo glow
  const haloAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      meterEnergy.value,
      [0, 1],
      [breathPulse.value, breathPulse.value * 1.35]
    );
    const opacity = interpolate(
      meterEnergy.value,
      [0, 1],
      [state === 'idle' ? 0.35 : 0.65, 0.95]
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Orbital Ring 1 (Coral/Amber Precession)
  const ring1AnimatedStyle = useAnimatedStyle(() => {
    const rot = spinClock.value;
    const swell = interpolate(meterEnergy.value, [0, 1], [1, 1.15]);
    return {
      transform: [
        { rotateZ: `${rot}deg` },
        { rotateX: '65deg' },
        { scale: swell },
      ],
    };
  });

  // Orbital Ring 2 (Cyan/Electric Blue Precession)
  const ring2AnimatedStyle = useAnimatedStyle(() => {
    const rot = -precessionClock.value;
    const swell = interpolate(meterEnergy.value, [0, 1], [1, 1.22]);
    return {
      transform: [
        { rotateZ: `${rot}deg` },
        { rotateY: '60deg' },
        { scale: swell },
      ],
    };
  });

  // Orbital Ring 3 (Chromatic Magenta/Violet Precession)
  const ring3AnimatedStyle = useAnimatedStyle(() => {
    const rot = flowClock.value;
    const swell = interpolate(meterEnergy.value, [0, 1], [1, 1.18]);
    return {
      transform: [
        { rotateZ: `${rot}deg` },
        { rotateX: '45deg' },
        { rotateY: '45deg' },
        { scale: swell },
      ],
    };
  });

  // Inner Quantum Core
  const coreAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(meterEnergy.value, [0, 1], [1, 1.14]);
    return {
      transform: [{ scale: scale * breathPulse.value }],
    };
  });

  // Rotating Chromatic Energy Nodes
  const node1Style = useAnimatedStyle(() => {
    const angle = (spinClock.value * Math.PI) / 180;
    const radius = (size / 2) * 0.72;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * (radius * 0.42);
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
    };
  });

  const node2Style = useAnimatedStyle(() => {
    const angle = (-precessionClock.value * Math.PI) / 180 + Math.PI;
    const radius = (size / 2) * 0.78;
    const tx = Math.sin(angle) * (radius * 0.48);
    const ty = Math.cos(angle) * radius;
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
    };
  });

  const coreSize = size * 0.58;
  const haloSize = size * 1.15;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* 1. Atmospheric Diffuse Glow / Halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor:
              state === 'recording'
                ? isDark
                  ? 'rgba(235, 94, 65, 0.28)'
                  : 'rgba(235, 94, 65, 0.18)'
                : state === 'thinking'
                ? 'rgba(139, 92, 246, 0.25)'
                : state === 'paused'
                ? 'rgba(245, 158, 11, 0.22)'
                : isDark
                ? 'rgba(74, 94, 65, 0.22)'
                : 'rgba(224, 220, 214, 0.45)',
          },
          haloAnimatedStyle,
        ]}
      />

      {/* 2. Quantum Precession Orbital Ring 1 (Coral/Amber) */}
      <Animated.View
        style={[
          styles.orbitalRing,
          {
            width: size * 0.94,
            height: size * 0.94,
            borderRadius: (size * 0.94) / 2,
            borderColor: state === 'recording' ? '#FF6B4A' : state === 'paused' ? '#F59E0B' : '#94A3B8',
            borderWidth: 1.5,
            opacity: state === 'recording' ? 0.85 : 0.45,
          },
          ring1AnimatedStyle,
        ]}
      />

      {/* 3. Quantum Precession Orbital Ring 2 (Cyan / Chroma) */}
      <Animated.View
        style={[
          styles.orbitalRing,
          {
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: (size * 0.88) / 2,
            borderColor: state === 'recording' ? '#00F0FF' : '#64748B',
            borderWidth: 1.2,
            opacity: state === 'recording' ? 0.75 : 0.35,
          },
          ring2AnimatedStyle,
        ]}
      />

      {/* 4. Quantum Precession Orbital Ring 3 (Violet / Rainbow Wave) */}
      <Animated.View
        style={[
          styles.orbitalRing,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: (size * 0.82) / 2,
            borderColor: state === 'recording' ? '#EC4899' : '#CBD5E1',
            borderWidth: 1.0,
            opacity: state === 'recording' ? 0.65 : 0.25,
          },
          ring3AnimatedStyle,
        ]}
      />

      {/* 5. Central Deep Quantum Core */}
      <Animated.View
        style={[
          styles.coreSphere,
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: isDark ? '#13151A' : '#1C1F26',
            shadowColor: state === 'recording' ? '#FF6B4A' : '#000000',
            borderColor:
              state === 'recording'
                ? 'rgba(255, 107, 74, 0.45)'
                : state === 'thinking'
                ? 'rgba(139, 92, 246, 0.4)'
                : 'rgba(255, 255, 255, 0.1)',
          },
          coreAnimatedStyle,
        ]}>
        {/* Core Inner Glow Wave */}
        <View
          style={[
            styles.coreInnerAura,
            {
              backgroundColor:
                state === 'recording'
                  ? 'rgba(255, 107, 74, 0.35)'
                  : state === 'thinking'
                  ? 'rgba(139, 92, 246, 0.3)'
                  : 'rgba(56, 189, 248, 0.18)',
            },
          ]}
        />

        {/* Specular 3D Dome Highlight */}
        <View style={styles.specularLight} />
      </Animated.View>

      {/* 6. Orbiting Energy Particles (Quantum Nodes) */}
      {state === 'recording' && (
        <>
          <Animated.View style={[styles.energyNode, { backgroundColor: '#FF8A65' }, node1Style]} />
          <Animated.View style={[styles.energyNode, { backgroundColor: '#38BDF8' }, node2Style]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  halo: {
    position: 'absolute',
  },
  orbitalRing: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  coreSphere: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  coreInnerAura: {
    width: '75%',
    height: '75%',
    borderRadius: 999,
  },
  specularLight: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    width: '32%',
    height: '24%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    transform: [{ rotate: '-35deg' }],
  },
  energyNode: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    elevation: 3,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
