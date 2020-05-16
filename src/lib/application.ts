import {
  Environment,
  SNApplication,
  SNAlertService,
  platformFromString,
} from 'snjs';
import { MobileDeviceInterface } from './interface';
import { AlertService } from './AlertService';
import { ApplicationState } from './ApplicationState';
import { Platform } from 'react-native';
import { EditorGroup } from './EditorGroup';
import { ComponentGroup } from './componentGroup';
import { ReviewService } from './reviewService';
import { BackupsService } from './BackupsService';
import { PreferencesManager } from './PreferencesManager';

type MobileServices = {
  applicationState: ApplicationState;
  reviewService: ReviewService;
  backupsService: BackupsService;
  themeService: ThemeManager;
  prefsService: PreferencesManager;
};

export class MobileApplication extends SNApplication {
  private onDeinit?: (app: MobileApplication) => void;
  private MobileServices!: MobileServices;
  public editorGroup: EditorGroup;
  public componentGroup: ComponentGroup;

  constructor(onDeinit: (app: MobileApplication) => void) {
    const namespace = '';
    const deviceInterface = new MobileDeviceInterface(namespace);
    super(
      Environment.Mobile,
      platformFromString(Platform.OS),
      deviceInterface,
      namespace,
      undefined,
      [
        {
          swap: SNAlertService,
          with: AlertService,
        },
      ]
    );
    this.onDeinit = onDeinit;
    this.editorGroup = new EditorGroup(this);
    this.componentGroup = new ComponentGroup(this);
  }

  deinit() {
    for (const key of Object.keys(this.MobileServices)) {
      const service = (this.MobileServices as any)[key];
      if (service.deinit) {
        service.deinit();
      }
      service.application = undefined;
    }
    this.MobileServices = {} as MobileServices;
    this.onDeinit!(this);
    this.onDeinit = undefined;
    this.editorGroup.deinit();
    this.componentGroup.deinit();
    super.deinit();
  }

  setMobileServices(services: MobileServices) {
    this.MobileServices = services;
  }

  public getAppState() {
    return this.MobileServices.applicationState;
  }

  public getThemeService() {
    return this.MobileServices.themeService;
  }

  public getBackupsService() {
    return this.MobileServices.backupsService;
  }

  public getPrefsService() {
    return this.MobileServices.prefsService;
  }

  async checkForSecurityUpdate() {
    return this.protocolUpgradeAvailable();
  }
}
