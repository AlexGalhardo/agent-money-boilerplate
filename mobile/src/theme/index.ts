import palette from "./palette";

export type ColorToken = keyof typeof palette;

/** Raw color values for props that can't take a className (icons, pickers, spinners). */
export const colors: Readonly<Record<ColorToken, string>> = palette;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
