import { Share } from 'react-native';
import ApplicationState from '@Lib/ApplicationState';
import AlertManager from '@Lib/snjs/alertManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';

export default class ItemActionManager {
  static DeleteEvent = 'DeleteEvent';
  static TrashEvent = 'TrashEvent';
  static RestoreEvent = 'RestoreEvent';
  static EmptyTrashEvent = 'EmptyTrashEvent';

  static PinEvent = 'PinEvent';
  static UnpinEvent = 'UnpinEvent';

  static ArchiveEvent = 'ArchiveEvent';
  static UnarchiveEvent = 'UnarchiveEvent';

  static LockEvent = 'LockEvent';
  static UnlockEvent = 'UnlockEvent';

  static ProtectEvent = 'ProtectEvent';
  static UnprotectEvent = 'UnprotectEvent';

  static ShareEvent = 'ShareEvent';

  /* The afterConfirmCallback is called after user confirms deletion pop up */

  static handleEvent(event, item, callback, afterConfirmCallback) {
    if (event === this.TrashEvent) {
      const title = 'Move to Trash';
      const message = `Are you sure you want to move this ${item.displayName.toLowerCase()} to the trash?`;

      AlertManager.get().confirm({
        title: title,
        text: message,
        confirmButtonText: 'Confirm',
        onConfirm: () => {
          item.content.trashed = true;
          item.setDirty(true);
          Sync.get().sync();
          callback && callback();
        },
      });
    } else if (event === this.EmptyTrashEvent) {
      let deletedCount = ModelManager.get().trashedItems().length;
      AlertManager.get().confirm({
        title: 'Empty Trash',
        text: `Are you sure you want to permanently delete ${deletedCount} notes?`,
        confirmButtonText: 'Delete',
        onConfirm: () => {
          ModelManager.get().emptyTrash();
          Sync.get().sync();
          callback && callback();
        },
      });
    } else if (event === this.DeleteEvent) {
      var title = `Delete ${item.displayName}`;
      var message = `Are you sure you want to permanently delete this ${item.displayName.toLowerCase()}?`;

      AlertManager.get().confirm({
        title: title,
        text: message,
        confirmButtonText: 'Delete',
        onConfirm: () => {
          ModelManager.get().setItemToBeDeleted(item);

          afterConfirmCallback && afterConfirmCallback();

          Sync.get()
            .sync()
            .then(() => {
              callback && callback();
            });
        },
      });
    } else if (event === this.RestoreEvent) {
      item.content.trashed = false;
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    } else if (event === this.PinEvent || event === this.UnpinEvent) {
      item.setAppDataItem('pinned', event === this.PinEvent);
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    } else if (event === this.LockEvent || event === this.UnlockEvent) {
      item.setAppDataItem('locked', event === this.LockEvent);
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    } else if (event === this.ArchiveEvent || event === this.UnarchiveEvent) {
      item.setAppDataItem('archived', event === this.ArchiveEvent);
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    } else if (event === this.ProtectEvent || event === this.UnprotectEvent) {
      item.content.protected = !item.content.protected;
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    } else if (event === this.ShareEvent) {
      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({
          title: item.title,
          message: item.text,
        });
      });
      callback && callback();
    }
  }
}
