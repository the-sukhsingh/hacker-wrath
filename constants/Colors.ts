/**
 * Google Material Design 3 (Material You / MD3) Color Palette
 * Full semantic token architecture with tonal surface containers,
 * primary/secondary/tertiary container pairs, and dynamic light/dark values.
 */

export interface M3ColorScheme {
  // Brand & Accent roles
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Feedback
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Material You Surface Hierarchy
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Outlines & Dividers
  outline: string;
  outlineVariant: string;

  // Legacy mappings for backwards-compatible component styles
  text: string;
  textSecondary: string;
  textMuted: string;
  card: string;
  cardBorder: string;
  cardHover: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
  primaryText: string;
  accent: string;
  accentLight: string;
  accentBorder: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
}

const lightTheme: M3ColorScheme = {
  // Primary (Google Pixel Blue)
  primary: '#0B57D0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D3E3FD',
  onPrimaryContainer: '#041E49',

  // Secondary (Material You Active Pill Cyan/Teal)
  secondary: '#00639B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#C2E7FF',
  onSecondaryContainer: '#001D35',

  // Tertiary (Google AI / Gemma Purple)
  tertiary: '#7C3AED',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#EDE9FE',
  onTertiaryContainer: '#2E1065',

  // Error (Google Material Coral Red)
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Surface Tonal Hierarchy
  background: '#F8F9FD',
  onBackground: '#191C20',
  surface: '#F8F9FD',
  onSurface: '#191C20',
  surfaceVariant: '#DFE2EB',
  onSurfaceVariant: '#43474E',

  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F3F8',
  surfaceContainer: '#ECEDF3',
  surfaceContainerHigh: '#E6E8EE',
  surfaceContainerHighest: '#E0E2E8',

  // Outlines
  outline: '#73777F',
  outlineVariant: '#C3C7D0',

  // Legacy mappings
  text: '#191C20',
  textSecondary: '#43474E',
  textMuted: '#73777F',
  card: '#FFFFFF',
  cardBorder: '#E0E2E8',
  cardHover: '#F2F3F8',
  tint: '#0B57D0',
  tabIconDefault: '#73777F',
  tabIconSelected: '#0B57D0',
  border: '#E0E2E8',
  primaryText: '#FFFFFF',
  accent: '#0D9488',
  accentLight: '#CCFBF1',
  accentBorder: '#99F6E4',
  danger: '#BA1A1A',
  dangerLight: '#FFDAD6',
  warning: '#B45309',
  warningLight: '#FEF3C7',
};

const darkTheme: M3ColorScheme = {
  // Primary (Pixel Night Blue)
  primary: '#A8C7FA',
  onPrimary: '#062E6F',
  primaryContainer: '#0842A0',
  onPrimaryContainer: '#D3E3FD',

  // Secondary
  secondary: '#7FCFFF',
  onSecondary: '#003453',
  secondaryContainer: '#004A77',
  onSecondaryContainer: '#C2E7FF',

  // Tertiary (AI Purple Night)
  tertiary: '#C4B5FD',
  onTertiary: '#3B0764',
  tertiaryContainer: '#5B21B6',
  onTertiaryContainer: '#EDE9FE',

  // Error
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  // Surface Tonal Hierarchy
  background: '#101318',
  onBackground: '#E1E2E8',
  surface: '#101318',
  onSurface: '#E1E2E8',
  surfaceVariant: '#43474E',
  onSurfaceVariant: '#C3C7D0',

  surfaceContainerLowest: '#0B0E13',
  surfaceContainerLow: '#191C20',
  surfaceContainer: '#1D2025',
  surfaceContainerHigh: '#272A2F',
  surfaceContainerHighest: '#32353A',

  // Outlines
  outline: '#8D9199',
  outlineVariant: '#43474E',

  // Legacy mappings
  text: '#E1E2E8',
  textSecondary: '#C3C7D0',
  textMuted: '#8D9199',
  card: '#1D2025',
  cardBorder: '#272A2F',
  cardHover: '#272A2F',
  tint: '#A8C7FA',
  tabIconDefault: '#8D9199',
  tabIconSelected: '#A8C7FA',
  border: '#272A2F',
  primaryText: '#062E6F',
  accent: '#2DD4BF',
  accentLight: '#134E4A40',
  accentBorder: '#14B8A6',
  danger: '#FFB4AB',
  dangerLight: '#93000A40',
  warning: '#FBBF24',
  warningLight: '#78350F40',
};

export default {
  light: lightTheme,
  dark: darkTheme,
};
