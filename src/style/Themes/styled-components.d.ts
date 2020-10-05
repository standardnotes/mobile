import theme from './blue.json';

export type MobileThemeVariables = typeof theme & {
  paddingLeft: number;
  mainTextFontSize: number;
};

declare module 'styled-components' {
  export interface DefaultTheme extends MobileThemeVariables {}
}
