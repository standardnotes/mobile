import {Platform} from 'react-native';
import AlertManager from './alertManager'
import ModelManager from './modelManager'
import Sync from './sync'
import ApplicationState from '../ApplicationState'
import {Share} from 'react-native';

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

    if(event == this.DeleteEvent) {
      var title = `Delete ${item.displayName}`;
      var message = `Are you sure you want to delete this ${item.displayName.toLowerCase()}?`;

      AlertManager.showConfirmationAlert(title, message, "Delete",
        () => {
          ModelManager.getInstance().setItemToBeDeleted(item);

          afterConfirmCallback && afterConfirmCallback();

          Sync.getInstance().sync(() => {
            callback && callback();
          });
        }
      )
    }

     else if(event == this.PinEvent || event == this.UnpinEvent) {
      item.setAppDataItem("pinned", event == this.PinEvent);
      item.setDirty(true);
      Sync.getInstance().sync();
      callback && callback();
    }

    else if(event == this.LockEvent || event == this.UnlockEvent) {
     item.setAppDataItem("locked", event == this.LockEvent);
     item.setDirty(true);
     Sync.getInstance().sync();
     callback && callback();
   }

     else if(event == this.ArchiveEvent || event == this.UnarchiveEvent) {
      item.setAppDataItem("archived", event == this.ArchiveEvent);
      item.setDirty(true);
      Sync.getInstance().sync();
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
