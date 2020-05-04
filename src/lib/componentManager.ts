import { Platform } from 'react-native';
import { SNComponentManager } from 'snjs';
import AlertManager from '@Lib/snjs/alertManager';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import StyleKit from '@Style/StyleKit';

type ComponentManagerInstance = {
  modelManager: ModelManager;
  syncManager: Sync;
  alertManager: AlertManager;
  environment: 'mobile';
  platform: typeof Platform.OS;
  desktopManager?: any;
  nativeExtManager?: any;
  $uiRunner?: any;
};

export default class ComponentManager extends SNComponentManager {
  private static instance: ComponentManager;

  static get() {
    if (!this.instance) {
      this.instance = new ComponentManager({
        modelManager: ModelManager.get(),
        syncManager: Sync.get(),
        alertManager: AlertManager.get(),
        environment: 'mobile',
        platform: Platform.OS
      });
    }

    return this.instance;
  }

  constructor({
    modelManager,
    syncManager,
    desktopManager,
    nativeExtManager,
    alertManager,
    $uiRunner,
    platform,
    environment
  }: ComponentManagerInstance) {
    super({
      modelManager,
      syncManager,
      desktopManager,
      nativeExtManager,
      alertManager,
      $uiRunner,
      platform,
      environment
    });
  }

  /*
    Overrides
  */

  urlsForActiveThemes() {
    const theme = StyleKit.get().activeTheme;
    if (theme.content.isSystemTheme) {
      return null;
    }

    if (theme) {
      const url = this.urlForComponent(theme);
      return [url];
    }
  }

  /*
    @param {object} dialog: {permissions, String, component, callback}
  */

  presentPermissionsDialog(dialog: {
    component: { name: any };
    permissionsString: any;
    callback: (arg0: boolean) => void;
  }) {
    let text = `${dialog.component.name} would like to interact with your ${dialog.permissionsString}`;
    this.alertManager.confirm({
      title: 'Grant Permissions',
      text: text,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      onConfirm: () => {
        dialog.callback(true);
      },
      onCancel: () => {
        dialog.callback(false);
      }
    });
  }

  /*
    Custom functions, not overrides
  */

  getEditors() {
    return this.componentsForArea('editor-editor');
  }

  getDefaultEditor() {
    return this.getEditors().filter(
      (e: { content: { isMobileDefault: any } }) => {
        return e.content.isMobileDefault;
      }
    )[0];
  }

  setEditorAsMobileDefault(
    editor: {
      content: { isMobileDefault: any };
      setDirty?: (arg0: boolean) => void;
    },
    isDefault: boolean
  ) {
    if (isDefault) {
      // Remove current default
      const currentDefault = this.getDefaultEditor();
      if (currentDefault) {
        currentDefault.content.isMobileDefault = false;
        currentDefault.setDirty(true);
      }
    }

    // Could be null if plain editor
    if (editor) {
      editor.content.isMobileDefault = isDefault;
      editor.setDirty && editor.setDirty(true);
    }
    Sync.get().sync();
  }

  associateEditorWithNote(
    editor: {
      disassociatedItemIds: any[];
      associatedItemIds: any[];
      setDirty: (arg0: boolean) => void;
    } | null,
    note: {
      uuid: any;
      content: { mobilePrefersPlainEditor: boolean };
      setDirty: (arg0: boolean) => void;
    }
  ) {
    const currentEditor = this.editorForNote(note);
    if (currentEditor && currentEditor !== editor) {
      // Disassociate currentEditor with note
      currentEditor.associatedItemIds = currentEditor.associatedItemIds.filter(
        (id: any) => {
          return id !== note.uuid;
        }
      );

      if (!currentEditor.disassociatedItemIds.includes(note.uuid)) {
        currentEditor.disassociatedItemIds.push(note.uuid);
      }

      currentEditor.setDirty(true);
    }

    if (editor) {
      if (note.content.mobilePrefersPlainEditor === true) {
        note.content.mobilePrefersPlainEditor = false;
        note.setDirty(true);
      }

      editor.disassociatedItemIds = editor.disassociatedItemIds.filter((id) => {
        return id !== note.uuid;
      });

      if (!editor.associatedItemIds.includes(note.uuid)) {
        editor.associatedItemIds.push(note.uuid);
      }

      editor.setDirty(true);
    } else {
      // Note prefers plain editor
      if (!note.content.mobilePrefersPlainEditor) {
        note.content.mobilePrefersPlainEditor = true;
        note.setDirty(true);
      }
    }

    Sync.get().sync();
  }

  clearEditorForNote(note: {
    uuid: any;
    content: { mobilePrefersPlainEditor: boolean };
    setDirty: (arg0: boolean) => void;
  }) {
    this.associateEditorWithNote(null, note);
  }
}
