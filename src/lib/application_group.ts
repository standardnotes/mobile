import { FilesService } from '@Lib/files_service'
import { InternalEventBus } from '@standardnotes/services'
import {
  ApplicationDescriptor,
  DeviceInterface,
  SNApplicationGroup,
} from '@standardnotes/snjs'
import { MobileApplication } from './application'
import { ApplicationState } from './application_state'
import { BackupsService } from './backups_service'
import { InstallationService } from './installation_service'
import { MobileDeviceInterface } from './interface'
import { PreferencesManager } from './preferences_manager'
import { ReviewService } from './review_service'
import { StatusManager } from './status_manager'

export class ApplicationGroup extends SNApplicationGroup {
  constructor() {
    super(new MobileDeviceInterface())
  }

  override async initialize(_callback?: any): Promise<void> {
    await super.initialize({
      applicationCreator: this.createApplication,
    })
  }

  private createApplication = (
    descriptor: ApplicationDescriptor,
    deviceInterface: DeviceInterface
  ) => {
    const application = new MobileApplication(
      deviceInterface as MobileDeviceInterface,
      descriptor.identifier
    )
    const internalEventBus = new InternalEventBus()
    const applicationState = new ApplicationState(application)
    const reviewService = new ReviewService(application, internalEventBus)
    const backupsService = new BackupsService(application, internalEventBus)
    const prefsService = new PreferencesManager(application, internalEventBus)
    const installationService = new InstallationService(
      application,
      internalEventBus
    )
    const statusManager = new StatusManager(application, internalEventBus)
    const filesService = new FilesService(application, internalEventBus)
    application.setMobileServices({
      applicationState,
      reviewService,
      backupsService,
      prefsService,
      installationService,
      statusManager,
      filesService,
    })
    return application
  }
}
