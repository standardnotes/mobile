import { SNAlertService, SNComponentManager } from 'snjs';
import { PermissionDialog } from 'snjs/dist/@types/services/component_manager';

export default class ComponentManager extends SNComponentManager {
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
}
