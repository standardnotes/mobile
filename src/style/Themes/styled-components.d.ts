import theme from './blue.json';

export type StyleKitTheme = typeof theme & {
  paddingLeft: number;
  mainTextFontSize: number;
};

declare module 'styled-components' {
  export interface DefaultTheme extends StyleKitTheme {}
}
