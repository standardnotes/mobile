import {
  PermissionDialog,
  SNAlertService,
  SNComponent,
  SNComponentManager,
} from '@standardnotes/snjs';
import { objectToCss } from '@Style/css_parser';
import { MobileTheme } from '@Style/theme_service';
import { Base64 } from 'js-base64';

export class ComponentManager extends SNComponentManager {
  private mobileActiveTheme?: MobileTheme;

  async presentPermissionsDialog(dialog: PermissionDialog) {
    const text = `${dialog.component.name} would like to interact with your ${dialog.permissionsString}`;
    const approved = await (this.alertService! as SNAlertService).confirm(
      text,
      'Grant Permissions',
      'Continue',
      undefined,
      'Cancel'
    );
    dialog.callback(approved);
  }

  /** @override */
  urlForComponent(component: SNComponent) {
    if (component.isTheme()) {
      const theme = component as MobileTheme;
      const cssData = objectToCss(theme.mobileContent.variables);
      const encoded = Base64.encodeURI(cssData);
      return `data:text/css;base64,${encoded}`;
    } else {
      return super.urlForComponent(component);
    }
  }

  public setMobileActiveTheme(theme: MobileTheme) {
    this.mobileActiveTheme = theme;
    this.postActiveThemesToAllComponents();
  }

  /** @override */
  getActiveThemes() {
    if (this.mobileActiveTheme) {
      return [this.mobileActiveTheme];
    } else {
      return [];
    }
  }
}
