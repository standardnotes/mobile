import {Platform, Share} from 'react-native';
import ApplicationState from '../ApplicationState'
import AlertManager from './sfjs/alertManager'
import ModelManager from './sfjs/modelManager'
import Sync from './sfjs/syncManager'

export default class ItemActionManager {

  static DeleteEvent = "DeleteEvent";

  static PinEvent = "PinEvent";
  static UnpinEvent = "UnpinEvent";

  static ArchiveEvent = "ArchiveEvent";
  static UnarchiveEvent = "UnarchiveEvent";

  static LockEvent = "LockEvent";
  static UnlockEvent = "UnlockEvent";

  static ShareEvent = "ShareEvent";

  /* The afterConfirmCallback is called after user confirms deletion pop up */

  static handleEvent(event, item, callback, afterConfirmCallback) {

    console.log("Handling event", event);

    if(event == this.DeleteEvent) {
      var title = `Delete ${item.displayName}`;
      var message = `Are you sure you want to delete this ${item.displayName.toLowerCase()}?`;

      AlertManager.get().confirm({
        title: title,
        text: message,
        confirmButtonText: "Delete",
        onConfirm: () => {
          ModelManager.get().setItemToBeDeleted(item);

          afterConfirmCallback && afterConfirmCallback();

          Sync.get().sync().then(() => {
            callback && callback();
          });
        }
      })
    }

     else if(event == this.PinEvent || event == this.UnpinEvent) {
      item.setAppDataItem("pinned", event == this.PinEvent);
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    }

    else if(event == this.LockEvent || event == this.UnlockEvent) {
     item.setAppDataItem("locked", event == this.LockEvent);
     item.setDirty(true, true);
     Sync.get().sync();
     callback && callback();
   }

     else if(event == this.ArchiveEvent || event == this.UnarchiveEvent) {
      item.setAppDataItem("archived", event == this.ArchiveEvent);
      item.setDirty(true);
      Sync.get().sync();
      callback && callback();
    }

    else if(event == this.ShareEvent) {
      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({
          title: item.title,
          message: item.text,
        })
      })
      callback && callback();
    }
  }

}
