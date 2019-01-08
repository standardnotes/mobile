import ModelManager from "./modelManager";
import Sync from "./syncManager";
import { SFPrivilegesManager, SFSingletonManager } from "standard-file-js";
import AuthenticationSourceAccountPassword from "@Screens/Authentication/Sources/AuthenticationSourceAccountPassword";
import AuthenticationSourceLocalPasscode from "@Screens/Authentication/Sources/AuthenticationSourceLocalPasscode";
import AuthenticationSourceBiometric from "@Screens/Authentication/Sources/AuthenticationSourceBiometric";
import KeysManager from "@Lib/keysManager"
import Storage from "@SFJS/storageManager"
import Auth from "@SFJS/authManager"
import ApplicationState from "@Lib/ApplicationState"

export default class PrivilegesManager extends SFPrivilegesManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      let singletonManager = new SFSingletonManager(ModelManager.get(), Sync.get());
      this.instance = new PrivilegesManager(ModelManager.get(), Sync.get(), singletonManager);
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
        return KeysManager.get().hasOfflinePasscode();
      },
      saveToStorage: async (key, value) => {
        return Storage.get().setItem(key, value);
      },
      getFromStorage: async (key) => {
        return Storage.get().getItem(key);
      }
    });
  }

  async presentPrivilegesModal(action, navigation, onSuccess, onCancel) {
    if(this.authenticationInProgress()) {
      onCancel && onCancel();
      return;
    }

    let customSuccess = () => {
      onSuccess && onSuccess();
      this.authInProgress = false;
    }

    let customCancel = () => {
      onCancel && onCancel();
      this.authInProgress = false;
    }

    let sources = await this.sourcesForAction(action);

    navigation.navigate("Authenticate", {
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
      },
      authenticationSources: sources,
      hasCancelOption: true,
      onSuccess: () => {
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
    const sourcesForCredential = (credential) => {
      if(credential == SFPrivilegesManager.CredentialAccountPassword) {
        return [new AuthenticationSourceAccountPassword()];
      } else if(credential == SFPrivilegesManager.CredentialLocalPasscode) {
        var hasPasscode = KeysManager.get().hasOfflinePasscode();
        var hasFingerprint = KeysManager.get().hasFingerprint();
        let sources = [];
        if(hasPasscode) {sources.push(new AuthenticationSourceLocalPasscode());}
        if(hasFingerprint) {sources.push(new AuthenticationSourceBiometric());}
        return sources;
      }
    }

    let credentials = await this.netCredentialsForAction(action);
    let sources = [];
    for(var credential of credentials) {
      sources = sources.concat(sourcesForCredential(credential));
    }

    return sources;
  }

}
