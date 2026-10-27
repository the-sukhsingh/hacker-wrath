import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import QRCode from 'qrcode';
import { Text } from '@/components/Themed';

interface QRCodeViewProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  showCenterLogo?: boolean;
  logoLetter?: string;
  logoBgColor?: string;
}

export function QRCodeView({
  value,
  size = 140,
  color = '#191A1D',
  backgroundColor = '#FFFFFF',
  showCenterLogo = true,
  logoLetter = 'M',
  logoBgColor = '#E06D53',
}: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    QRCode.toDataURL(value, {
      width: size * 2, // 2x density for crisp Retina rendering
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: color,
        light: backgroundColor,
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('QR Code generation error:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, color, backgroundColor]);

  const centerBadgeSize = Math.round(size * 0.24);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: 14,
        },
      ]}>
      {loading || !dataUrl ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={logoBgColor} />
        </View>
      ) : (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: dataUrl }}
            style={{ width: size, height: size, borderRadius: 10 }}
            resizeMode="contain"
          />
          {showCenterLogo && (
            <View
              style={[
                styles.centerBadge,
                {
                  width: centerBadgeSize,
                  height: centerBadgeSize,
                  borderRadius: centerBadgeSize / 2,
                  backgroundColor: logoBgColor,
                  borderWidth: 2,
                  borderColor: backgroundColor,
                },
              ]}>
              <Text style={[styles.logoText, { fontSize: centerBadgeSize * 0.55 }]}>
                {logoLetter}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
  },
});
