import React, { useEffect, useRef, useState, type CSSProperties } from 'react';

export type OrbState = 'idle' | 'thinking' | 'speaking';

export interface OrbParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  integrate?: boolean;
}

export interface OrbColorDef {
  key: string;
  label: string;
  default: string;
}

export interface OrbVariant {
  key: string;
  label: string;
  note: string;
  frag: string;
  params: OrbParamDef[];
  colors: OrbColorDef[];
  statePresets?: Partial<Record<OrbState, Record<string, number>>>;
  stateColors?: Partial<Record<OrbState, Record<string, string>>>;
}

export type OrbParamValues = Partial<Record<string, number>>;
export type OrbColorValues = Partial<Record<string, string>>;

export interface ShaderOrbProps {
  variant: OrbVariant;
  state?: OrbState;
  size?: number;
  params?: OrbParamValues;
  colors?: OrbColorValues;
  statePresets?: Partial<Record<OrbState, Record<string, number>>>;
  stateColors?: Partial<Record<OrbState, Record<string, string>>>;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * WebGL ShaderOrb component from zzzzshawn/orbkit
 * Runs on WebGL-enabled canvas contexts (Web / Electron / WebGL runtime).
 */
export function ShaderOrb({
  variant,
  state = 'idle',
  size = 280,
  style,
}: ShaderOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // In React Native / mobile native DOM, HTMLCanvasElement is optional
    if (typeof window === 'undefined' || !canvasRef.current) return;
    setIsReady(true);
  }, [variant, state]);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          opacity: isReady ? 1 : 0.8,
        }}
      />
    </div>
  );
}
