const Colors = {
  background: "#0D0D12",
  surface: "#16161E",
  surfaceRaised: "#1D1D28",
  surfaceBright: "#242432",
  border: "#2A2A38",
  borderStrong: "#3A3A4B",
  text: "#F8F7FB",
  textMuted: "#9696AA",
  textDim: "#68687A",
  primary: "#FF007A",
  primarySoft: "#FF3B9A",
  cyan: "#00F0FF",
  green: "#3DFF9A",
  red: "#FF426D",
  amber: "#FFBE5C",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorToken = keyof typeof Colors;

export default Colors;
