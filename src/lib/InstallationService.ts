import {
  ApplicationService,
  ButtonType,
  isNullOrUndefined,
  StorageValueModes,
} from 'snjs';
import SNReactNative from 'standard-notes-rn';
import Keychain from './keychain';

const FIRST_RUN_KEY = 'first_run';

export class InstallationService extends ApplicationService {
  async onAppStart() {
    if (await this.needsWipe()) {
      await this.wipeData();
    } else {
      this.markApplicationAsRan();
    }
  }

  // shouldPresentKeyRecoveryWizard() {
  //   let hasKeys =
  //     this.application?.hasAccount() || this.application?.hasPasscode();
  //   if (
  //     !this.accountAuthParams &&
  //     this.offlineAuthParams &&
  //     !this.offlineKeys
  //   ) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  async markApplicationAsRan() {
    return this.application?.setValue(
      FIRST_RUN_KEY,
      false,
      StorageValueModes.Nonwrapped
    );
  }

  async needsWipe() {
    // Needs wipe if has keys but no data. However, since "no data" can be incorrectly reported by underlying
    // AsyncStorage failures, we want to confirm with the user before deleting anything.

    const hasNormalKeys =
      this.application?.hasAccount() || this.application?.hasPasscode();

    const rawKeychainKey = await Keychain.getKeys();
    const hasKeychainValue = !isNullOrUndefined(rawKeychainKey);

    let firstRunKey = await this.application?.getValue(
      FIRST_RUN_KEY,
      StorageValueModes.Nonwrapped
    );
    const firstRunKeyMissing = isNullOrUndefined(firstRunKey);
    return !hasNormalKeys && hasKeychainValue && firstRunKeyMissing;
  }

  async wipeData() {
    // On iOS, keychain data is persisted between installs/uninstalls. (https://stackoverflow.com/questions/4747404/delete-keychain-items-when-an-app-is-uninstalled)
    // This prevents the user from deleting the app and reinstalling if they forgot their local passocde
    // or if fingerprint scanning isn't working. By deleting all data on first run, we allow the user to reset app
    // state after uninstall.

    const confirmed = await this.application?.alertService?.confirm(
      "We've detected a previous installation of Standard Notes based on your keychain data. You must wipe all data from previous installation to continue.\n\nIf you're seeing this message in error, it might mean we're having issues loading your local database. Please restart the app and try again.",
      'Previous Installation',
      'Delete Local Data',
      ButtonType.Danger,
      'Quit App'
    );

    if (confirmed) {
      await this.application?.deviceInterface?.removeAllRawStorageValues();
      await this.application?.deviceInterface?.removeAllRawDatabasePayloads();
      await this.application?.deviceInterface?.clearRawKeychainValue();
    } else {
      SNReactNative.exitApp();
    }
  }
}
