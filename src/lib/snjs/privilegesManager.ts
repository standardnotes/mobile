import { Platform } from 'react-native';
import { SFPrivilegesManager, SFSingletonManager } from 'snjs';
import KeysManager from '@Lib/keysManager';
import { SCREEN_AUTHENTICATE } from '@Screens/screens';
import AuthenticationSourceAccountPassword from '@Screens/Authentication/Sources/AuthenticationSourceAccountPassword';
import AuthenticationSourceBiometric from '@Screens/Authentication/Sources/AuthenticationSourceBiometric';
import AuthenticationSourceLocalPasscode from '@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import Storage from '@Lib/snjs/storageManager';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class PrivilegesManager extends SFPrivilegesManager {
  private static instance: PrivilegesManager;

  static get() {
    if (!this.instance) {
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

  constructor(
    modelManager: ModelManager,
    syncManager: Sync,
    singletonManager: any
  ) {
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
      saveToStorage: async (key: string, value: string | null | undefined) => {
        return Storage.get().setItem(key, value);
      },
      getFromStorage: async (key: string) => {
        return Storage.get().getItem(key);
      },
    });
  }

  async presentPrivilegesModal(
    action: any,
    navigation: {
      navigate: (
        arg0: string,
        arg1: {
          leftButton: { title: string | null; iconName: string | null };
          authenticationSources: any[];
          hasCancelOption: boolean;
          sessionLengthOptions: any;
          selectedSessionLength: any;
          onSuccess: (selectedSessionLength: any) => void;
          onCancel: () => void;
        }
      ) => void;
    },
    onSuccess: { (): void; (): any },
    onCancel?: () => any
  ) {
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
          Platform.OS === 'ios' ? null : StyleKit.nameForIcon(ICON_CLOSE),
      },
      authenticationSources: sources,
      hasCancelOption: true,
      sessionLengthOptions: sessionLengthOptions,
      selectedSessionLength: selectedSessionLength,
      onSuccess: (selectedSessionLength: any) => {
        this.setSessionLength(selectedSessionLength);
        customSuccess();
      },
      onCancel: () => {
        customCancel();
      },
    });

    this.authInProgress = true;
  }

  authenticationInProgress() {
    return this.authInProgress;
  }

  async sourcesForAction(action: any) {
    const sourcesForCredential = (credential: any) => {
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
    let sources: any[] = [];
    for (const credential of credentials) {
      sources = sources
        .concat(sourcesForCredential(credential))
        .sort((a, b) => {
          return a.sort - b.sort;
        });
    }

    return sources;
  }

  async grossCredentialsForAction(action: any) {
    const privs = await this.getPrivileges();
    const creds = privs.getCredentialsForAction(action);
    return creds;
  }
}
