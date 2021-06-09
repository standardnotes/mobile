import { removeFromArray } from '@standardnotes/snjs';
import { MobileApplication } from './application';
import { Editor } from './editor';

type EditorGroupChangeCallback = (editor?: Editor) => void;

export class EditorGroup {
  public editors: Editor[] = [];
  private application?: MobileApplication;
  changeObservers: EditorGroupChangeCallback[] = [];

  constructor(application: MobileApplication) {
    this.application = application;
  }

  public deinit() {
    this.application = undefined;
    for (const editor of this.editors) {
      this.deleteEditor(editor);
    }
  }

  async createEditor(noteUuid?: string, noteTitle?: string) {
    if (this.application) {
      const editor = new Editor(this.application);
      await editor.init(noteUuid, noteTitle);
      this.editors.push(editor);
      this.notifyObservers();
    }
  }

  deleteEditor(editor: Editor) {
    editor.deinit();
    removeFromArray(this.editors, editor);
  }

  closeEditor(editor: Editor) {
    this.deleteEditor(editor);
    this.notifyObservers();
  }

  closeActiveEditor() {
    const activeEditor = this.activeEditor;
    if (activeEditor) {
      this.deleteEditor(activeEditor);
      this.notifyObservers();
    }
  }

  closeAllEditors() {
    for (const editor of this.editors) {
      this.deleteEditor(editor);
    }
  }

  get activeEditor() {
    return this.editors[0];
  }

  /**
   * Notifies observer when the active editor has changed.
   */
  public addChangeObserver(callback: EditorGroupChangeCallback) {
    this.changeObservers.push(callback);
    return () => {
      removeFromArray(this.changeObservers, callback);
    };
  }

  private notifyObservers() {
    for (const observer of this.changeObservers) {
      observer(this.activeEditor);
    }
  }
}
