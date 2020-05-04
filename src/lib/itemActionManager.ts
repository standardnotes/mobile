import { Share } from 'react-native';
import ApplicationState from '@Lib/ApplicationState';
import AlertManager from '@Lib/snjs/alertManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';

export type EventType =
  | typeof ItemActionManager.DeleteEvent
  | typeof ItemActionManager.TrashEvent
  | typeof ItemActionManager.RestoreEvent
  | typeof ItemActionManager.EmptyTrashEvent
  | typeof ItemActionManager.PinEvent
  | typeof ItemActionManager.UnpinEvent
  | typeof ItemActionManager.ArchiveEvent
  | typeof ItemActionManager.UnarchiveEvent
  | typeof ItemActionManager.LockEvent
  | typeof ItemActionManager.UnlockEvent
  | typeof ItemActionManager.ProtectEvent
  | typeof ItemActionManager.UnprotectEvent
  | typeof ItemActionManager.ShareEvent;

export default class ItemActionManager {
  static DeleteEvent = 'DeleteEvent' as 'DeleteEvent';
  static TrashEvent = 'TrashEvent' as 'TrashEvent';
  static RestoreEvent = 'RestoreEvent' as 'RestoreEvent';
  static EmptyTrashEvent = 'EmptyTrashEvent' as 'EmptyTrashEvent';

  static PinEvent = 'PinEvent' as 'PinEvent';
  static UnpinEvent = 'UnpinEvent' as 'UnpinEvent';

  static ArchiveEvent = 'ArchiveEvent' as 'ArchiveEvent';
  static UnarchiveEvent = 'UnarchiveEvent' as 'UnarchiveEvent';

  static LockEvent = 'LockEvent' as 'LockEvent';
  static UnlockEvent = 'UnlockEvent' as 'UnlockEvent';

  static ProtectEvent = 'ProtectEvent' as 'ProtectEvent';
  static UnprotectEvent = 'UnprotectEvent' as 'UnprotectEvent';

  static ShareEvent = 'ShareEvent' as 'ShareEvent';

  /* The afterConfirmCallback is called after user confirms deletion pop up */

  static handleEvent(
    event: EventType,
    item: {
      displayName: string;
      content: { trashed: boolean; protected: boolean };
      setDirty: (arg0: boolean) => void;
      setAppDataItem: (arg0: string, arg1: boolean) => void;
      title: any;
      text: any;
    },
    callback: { (): any },
    afterConfirmCallback?: () => void
  ) {
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
        }
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
        }
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
        }
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
          message: item.text
        });
      });
      callback && callback();
    }
  }
}
