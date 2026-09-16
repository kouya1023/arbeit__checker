import { Outfit } from "next/font/google";
import type { CSSProperties } from "react";

export const outfit = Outfit({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const THEME = {
  "--background": "#f5f7fb",
  "--foreground": "#0f2a4a",
  "--card": "#ffffff",
  "--primary": "#2f6fed",
  "--secondary": "#0f2a4a",
  "--accent": "#ffce00",
  "--muted-foreground": "#64748b",
  "--border": "#e2e8f0",
} as CSSProperties;
