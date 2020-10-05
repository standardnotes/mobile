import { objectToCss } from '@Style/css_parser';
import { MobileTheme } from '@Style/stylekit';
import { Base64 } from 'js-base64';
import { SNAlertService, SNComponent, SNComponentManager } from 'snjs';
import { PermissionDialog } from 'snjs/dist/@types/services/component_manager';

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
