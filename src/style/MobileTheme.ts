import {
  ComponentContent,
  ContentType,
  DecryptedPayload,
  FillItemContent,
  SNTheme,
  ThemeDockIcon,
} from '@standardnotes/snjs';
import { MobileThemeVariables } from './Themes/styled-components';

export interface MobileThemeContent extends ComponentContent {
  variables: MobileThemeVariables;
  isSystemTheme: boolean;
  isInitial: boolean;
  luminosity: number;
  isSwapIn?: boolean;
  package_info: ComponentContent['package_info'] & {
    dock_icon: ThemeDockIcon;
  };
}

export class MobileTheme extends SNTheme {
  get mobileContent() {
    return this.content as MobileThemeContent;
  }

  static BuildTheme(variables?: MobileThemeVariables) {
    return new MobileTheme(
      new DecryptedPayload({
        uuid: `${Math.random()}`,
        content_type: ContentType.Theme,
        content: FillItemContent<MobileThemeContent>({
          variables: variables || ({} as MobileThemeVariables),
          isSystemTheme: false,
          isInitial: false,
        }),
      })
    );
  }
}
