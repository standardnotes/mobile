import {
  PermissionDialog,
  SNAlertService,
  SNComponentManager,
} from '@standardnotes/snjs';
import { MobileTheme } from '@Style/theme_service';

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
