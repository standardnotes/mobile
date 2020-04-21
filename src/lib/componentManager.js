import { Platform } from 'react-native';
import AlertManager from '@SFJS/alertManager';
import ModelManager from '@SFJS/modelManager';
import Sync from '@SFJS/syncManager';
import StyleKit from '@Style/StyleKit';

import { SNComponentManager } from 'snjs';

export default class ComponentManager extends SNComponentManager {
  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ComponentManager({
        modelManager: ModelManager.get(),
        syncManager: Sync.get(),
        alertManager: AlertManager.get(),
        environment: 'mobile',
        platform: Platform.OS,
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
    environment,
  }) {
    super({
      modelManager,
      syncManager,
      desktopManager,
      nativeExtManager,
      alertManager,
      $uiRunner,
      platform,
      environment,
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

  presentPermissionsDialog(dialog) {
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
      },
    });
  }

  /*
    Custom functions, not overrides
  */

  getEditors() {
    return this.componentsForArea('editor-editor');
  }

  getDefaultEditor() {
    return this.getEditors().filter(e => {
      return e.content.isMobileDefault;
    })[0];
  }

  setEditorAsMobileDefault(editor, isDefault) {
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
      editor.setDirty(true);
    }
    Sync.get().sync();
  }

  associateEditorWithNote(editor, note) {
    const currentEditor = this.editorForNote(note);
    if (currentEditor && currentEditor !== editor) {
      // Disassociate currentEditor with note
      currentEditor.associatedItemIds = currentEditor.associatedItemIds.filter(
        id => {
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

      editor.disassociatedItemIds = editor.disassociatedItemIds.filter(id => {
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

  clearEditorForNote(note) {
    this.associateEditorWithNote(null, note);
  }
}
