import { Platform } from 'react-native';
import { SFPrivilegesManager, SFSingletonManager } from 'standard-file-js';
import KeysManager from '@Lib/keysManager';
import { SCREEN_AUTHENTICATE } from '@Screens/screens';
import AuthenticationSourceAccountPassword from '@Screens/Authentication/Sources/AuthenticationSourceAccountPassword';
import AuthenticationSourceBiometric from '@Screens/Authentication/Sources/AuthenticationSourceBiometric';
import AuthenticationSourceLocalPasscode from '@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode';
import Auth from '@SFJS/authManager';
import ModelManager from '@SFJS/modelManager';
import Sync from '@SFJS/syncManager';
import Storage from '@SFJS/storageManager';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class PrivilegesManager extends SFPrivilegesManager {
  static instance = null;

  static get() {
    if (this.instance == null) {
      let singletonManager = new SFSingletonManager(
        ModelManager.get(),
        Sync.get()
      );
      this.instance = new PrivilegesManager(
        ModelManager.get(),
        Sync.get(),
        singletonManager
      );
    }

    return this.instance;
  }

  constructor(modelManager, syncManager, singletonManager) {
    super(modelManager, syncManager, singletonManager);

    this.setDelegate({
      isOffline: async () => {
        return Auth.get().offline();
      },
      hasLocalPasscode: async () => {
        const hasPasscode = KeysManager.get().hasOfflinePasscode();
        const hasBiometrics = KeysManager.get().hasBiometrics();
        return hasPasscode || hasBiometrics;
      },
      saveToStorage: async (key, value) => {
        return Storage.get().setItem(key, value);
      },
      getFromStorage: async key => {
        return Storage.get().getItem(key);
      }
    });
  }

  async presentPrivilegesModal(action, navigation, onSuccess, onCancel) {
    if (this.authenticationInProgress()) {
      onCancel && onCancel();
      return;
    }

    const customSuccess = () => {
      onSuccess && onSuccess();
      this.authInProgress = false;
    };

    const customCancel = () => {
      onCancel && onCancel();
      this.authInProgress = false;
    };

    const sources = await this.sourcesForAction(action);

    const sessionLengthOptions = await this.getSessionLengthOptions();
    const selectedSessionLength = await this.getSelectedSessionLength();

    navigation.navigate(SCREEN_AUTHENTICATE, {
      leftButton: {
        title: Platform.OS === 'ios' ? 'Cancel' : null,
        iconName:
          Platform.OS === 'ios' ? null : StyleKit.nameForIcon(ICON_CLOSE)
      },
      authenticationSources: sources,
      hasCancelOption: true,
      sessionLengthOptions: sessionLengthOptions,
      selectedSessionLength: selectedSessionLength,
      onSuccess: (selectedSessionLength) => {
        this.setSessionLength(selectedSessionLength);
        customSuccess();
      },
      onCancel: () => {
        customCancel();
      }
    });

    this.authInProgress = true;
  }

  authenticationInProgress() {
    return this.authInProgress;
  }

  async sourcesForAction(action) {
    const sourcesForCredential = credential => {
      if (credential === SFPrivilegesManager.CredentialAccountPassword) {
        return [new AuthenticationSourceAccountPassword()];
      } else if (credential === SFPrivilegesManager.CredentialLocalPasscode) {
        const hasPasscode = KeysManager.get().hasOfflinePasscode();
        const hasBiometrics = KeysManager.get().hasBiometrics();
        let sources = [];
        if (hasPasscode) {
          sources.push(new AuthenticationSourceLocalPasscode());
        }
        if (hasBiometrics) {
          sources.push(new AuthenticationSourceBiometric());
        }
        return sources;
      }
    };

    const credentials = await this.netCredentialsForAction(action);
    let sources = [];
    for (const credential of credentials) {
      sources = sources
        .concat(sourcesForCredential(credential))
        .sort((a, b) => {
          return a.sort - b.sort;
        });
    }

    return sources;
  }

  async grossCredentialsForAction(action) {
    const privs = await this.getPrivileges();
    const creds = privs.getCredentialsForAction(action);
    return creds;
  }
}
