import { MobileApplication } from './application';
import { removeFromArray } from 'snjs';
import { ApplicationState } from './ApplicationState';
import { ReviewService } from './reviewService';
import { BackupsService } from './BackupsService';
import { StyleKit } from '@Style/StyleKit';
import { PreferencesManager } from './PreferencesManager';
import { pull } from 'lodash';

type AppManagerChangeCallback = () => void;

export class ApplicationGroup {
  applications: MobileApplication[] = [];
  changeObservers: AppManagerChangeCallback[] = [];
  activeApplication?: MobileApplication;

  constructor() {
    this.onApplicationDeinit = this.onApplicationDeinit.bind(this);
    this.createDefaultApplication();
  }

  private async createDefaultApplication() {
    this.activeApplication = this.createNewApplication();
    this.applications.push(this.activeApplication);

    this.notifyObserversOfAppChange();
  }

  async onApplicationDeinit(application: MobileApplication) {
    removeFromArray(this.applications, application);
    if (this.activeApplication === application) {
      this.activeApplication = undefined;
    }
    if (this.applications.length === 0) {
      await this.createDefaultApplication();
    }
  }

  private createNewApplication() {
    const application = new MobileApplication(this.onApplicationDeinit);
    const applicationState = new ApplicationState(application);
    const reviewService = new ReviewService(application);
    const backupsService = new BackupsService(application);
    const themeService = new StyleKit(application);
    const prefsService = new PreferencesManager(application);
    application.setMobileServices({
      applicationState,
      reviewService,
      backupsService,
      themeService,
      prefsService,
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

    return () => {
      pull(this.changeObservers, callback);
    };
  }

  private notifyObserversOfAppChange() {
    for (const observer of this.changeObservers) {
      observer();
    }
  }
}
