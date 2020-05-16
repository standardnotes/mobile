import { MobileApplication } from './application';
import { removeFromArray } from 'snjs';
import { ApplicationState } from './ApplicationState';

type AppManagerChangeCallback = () => void;

export class ApplicationGroup {
  applications: MobileApplication[] = [];
  changeObservers: AppManagerChangeCallback[] = [];
  activeApplication?: MobileApplication;

  constructor() {
    this.onApplicationDeinit = this.onApplicationDeinit.bind(this);
    this.createDefaultApplication();
  }

  private createDefaultApplication() {
    this.activeApplication = this.createNewApplication();
    this.applications.push(this.activeApplication!);
    this.notifyObserversOfAppChange();
  }

  /** @callback */
  onApplicationDeinit(application: MobileApplication) {
    removeFromArray(this.applications, application);
    if (this.activeApplication === application) {
      this.activeApplication = undefined;
    }
    if (this.applications.length === 0) {
      this.createDefaultApplication();
    }
    this.notifyObserversOfAppChange();
  }

  private createNewApplication() {
    const application = new MobileApplication(this.onApplicationDeinit);
    const applicationState = new ApplicationState(application);
    const archiveService = new ArchiveManager(application);
    const desktopService = new DesktopManager(application);
    const keyboardService = new KeyboardManager();
    const lockService = new LockManager(application);
    const nativeExtService = new NativeExtManager(application);
    const prefsService = new PreferencesManager(application);
    const statusService = new StatusManager();
    const themeService = new ThemeManager(application);
    application.setMobileServices({
      applicationState,
      archiveService,
      desktopService,
      keyboardService,
      lockService,
      nativeExtService,
      prefsService,
      statusService,
      themeService,
    });
    return application;
  }

  get application() {
    return this.activeApplication;
  }

  public getApplications() {
    return this.applications.slice();
  }

  /**
   * Notifies observer when the active application has changed.
   * Any application which is no longer active is destroyed, and
   * must be removed from the interface.
   */
  public addApplicationChangeObserver(callback: AppManagerChangeCallback) {
    this.changeObservers.push(callback);
    if (this.application) {
      callback();
    }
  }

  private notifyObserversOfAppChange() {
    for (const observer of this.changeObservers) {
      observer();
    }
  }
}
