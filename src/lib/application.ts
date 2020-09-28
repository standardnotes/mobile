import { SCREEN_AUTHENTICATE } from '@Screens/screens';
import { Platform } from 'react-native';
import VersionInfo from 'react-native-version-info';
import {
  Challenge,
  Environment,
  platformFromString,
  SNApplication,
  SNComponentManager,
} from 'snjs';
import { DeinitSource } from 'snjs/dist/@types/types';
import { AlertService } from './AlertService';
import { ApplicationState } from './ApplicationState';
import { BackupsService } from './BackupsService';
import { ComponentGroup } from './componentGroup';
import ComponentManager from './ComponentManager';
import { EditorGroup } from './EditorGroup';
import { InstallationService } from './InstallationService';
import { MobileDeviceInterface } from './interface';
import { navigate } from './NavigationService';
import { PreferencesManager } from './PreferencesManager';
import { ReviewService } from './reviewService';
import { SNReactNativeCrypto } from './SNReactNativeCrypto';

type MobileServices = {
  applicationState: ApplicationState;
  reviewService: ReviewService;
  backupsService: BackupsService;
  installationService: InstallationService;
  prefsService: PreferencesManager;
};

export class MobileApplication extends SNApplication {
  private MobileServices!: MobileServices;
  public editorGroup: EditorGroup;
  public componentGroup: ComponentGroup;
  public Uuid: string; // UI remounts when Uuid changes

  constructor(deviceInterface: MobileDeviceInterface, identifier: string) {
    super(
      Environment.Mobile,
      platformFromString(Platform.OS),
      deviceInterface,
      new SNReactNativeCrypto(),
      new AlertService(),
      identifier,
      [
        {
          swap: SNComponentManager,
          with: ComponentManager,
        },
      ],
      undefined,
      VersionInfo.bundleIdentifier?.includes('dev')
        ? 'https://syncing-server-dev.standardnotes.org/'
        : 'https://sync.standardnotes.org'
    );
    this.Uuid = Math.random().toString();
    this.editorGroup = new EditorGroup(this);
    this.componentGroup = new ComponentGroup(this);
  }

  /** @override */
  deinit(source: DeinitSource) {
    for (const key of Object.keys(this.MobileServices)) {
      const service = (this.MobileServices as any)[key];
      if (service.deinit) {
        service.deinit();
      }
      service.application = undefined;
    }
    this.MobileServices = {} as MobileServices;
    this.editorGroup.deinit();
    this.componentGroup.deinit();
    super.deinit(source);
  }

  promptForChallenge(challenge: Challenge) {
    navigate(SCREEN_AUTHENTICATE, { challenge, title: challenge.modalTitle });
  }

  setMobileServices(services: MobileServices) {
    this.MobileServices = services;
  }

  public getAppState() {
    return this.MobileServices.applicationState;
  }

  public getBackupsService() {
    return this.MobileServices.backupsService;
  }

  public getPrefsService() {
    return this.MobileServices.prefsService;
  }
}
