import MainSideMenu from './MainSideMenu';
import NoteSideMenu from './NoteSideMenu';

/**
 * Because SideMenus (SideMenu and NoteSideMenu) are rendering by React
 * Navigation as drawer components on app startup, we can't give them params at
 * will. We need a way for components like the Compose screen to talk to the
 * NoteSideMenu and give it the current note context. The only way seems to be
 * some shared singleton object, which is this.
 *
 * This object will handle state for both side menus.
 */
export default class SideMenuManager {
  private static instance: SideMenuManager;
  leftSideMenu: MainSideMenu | null = null;
  rightSideMenu: NoteSideMenu | null = null;
  leftSideMenuHandler: {
    onTagSelect: (tag: any) => void;
    getSelectedTags: () => any;
  } | null = null;
  rightSideMenuHandler: {
    getCurrentNote: () => any;
    onEditorSelect: (editor: any) => void;
    onPropertyChange: () => void;
    onTagSelect: (tag: any) => void;
    getSelectedTags: () => any;
    onKeyboardDismiss: () => void;
  } | null = null;
  leftSideMenuLocked?: boolean;
  rightSideMenuLocked?: boolean;
  static get() {
    if (!this.instance) {
      this.instance = new SideMenuManager();
    }

    return this.instance;
  }

  setLeftSideMenuReference(ref: MainSideMenu | null) {
    /**
     * The ref handler of the main component sometimes passes null, then passes
     * the correct reference
     */
    if (!this.leftSideMenu) {
      this.leftSideMenu = ref;
    }
  }

  setRightSideMenuReference(ref: NoteSideMenu | null) {
    /**
     * The ref handler of the main component sometimes passes null, then passes
     * the correct reference
     */
    if (!this.rightSideMenu) {
      this.rightSideMenu = ref;
    }
  }

  /**
   * @param handler.onEditorSelect
   * @param handler.onTagSelect
   * @param handler.getSelectedTags
   */
  setHandlerForLeftSideMenu(handler: SideMenuManager['leftSideMenuHandler']) {
    this.leftSideMenuHandler = handler;

    return handler;
  }

  /**
   * @param handler.onTagSelect
   * @param handler.getSelectedTags
   * @param handler.getCurrentNote
   */
  setHandlerForRightSideMenu(handler: SideMenuManager['rightSideMenuHandler']) {
    this.leftSideMenuHandler = handler;

    this.rightSideMenu && this.rightSideMenu.forceUpdate();

    return handler;
  }

  getHandlerForLeftSideMenu() {
    return this.leftSideMenuHandler;
  }

  getHandlerForRightSideMenu() {
    return this.rightSideMenuHandler;
  }

  removeHandlerForRightSideMenu(
    handler: SideMenuManager['rightSideMenuHandler']
  ) {
    // In tablet switching mode, a new Compose window may be created before the first one unmounts.
    // If an old instance asks us to remove handler, we want to make sure it's not the new one
    if (handler === this.rightSideMenuHandler) {
      this.rightSideMenuHandler = null;
    }
  }

  setLockedForLeftSideMenu(locked: boolean) {
    this.leftSideMenuLocked = locked;
  }

  setLockedForRightSideMenu(locked: boolean) {
    this.rightSideMenuLocked = locked;
  }

  isLeftSideMenuLocked() {
    return this.leftSideMenuLocked;
  }

  isRightSideMenuLocked() {
    return this.rightSideMenuLocked;
  }
}
