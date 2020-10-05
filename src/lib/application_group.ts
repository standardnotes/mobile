import {
  ApplicationDescriptor,
  DeviceInterface,
  SNApplicationGroup,
} from 'snjs';
import { MobileApplication } from './application';
import { ApplicationState } from './application_state';
import { BackupsService } from './backups_service';
import { InstallationService } from './installation_service';
import { MobileDeviceInterface } from './interface';
import { PreferencesManager } from './preferences_manager';
import { ReviewService } from './review_service';

export class ApplicationGroup extends SNApplicationGroup {
  constructor() {
    super(new MobileDeviceInterface());
  }

  async initialize(_callback?: any) {
    await super.initialize({
      applicationCreator: this.createApplication,
    });
  }

  private createApplication = (
    descriptor: ApplicationDescriptor,
    deviceInterface: DeviceInterface
  ) => {
    const application = new MobileApplication(
      deviceInterface as MobileDeviceInterface,
      descriptor.identifier
    );
    const applicationState = new ApplicationState(application);
    const reviewService = new ReviewService(application);
    const backupsService = new BackupsService(application);
    const prefsService = new PreferencesManager(application);
    const installationService = new InstallationService(application);
    application.setMobileServices({
      applicationState,
      reviewService,
      backupsService,
      prefsService,
      installationService,
    });
    return application;
  };
}
