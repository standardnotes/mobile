import { removeFromArray } from 'snjs';
import { MobileApplication } from './application';
import { Editor } from './Editor';

type EditorGroupChangeCallback = (editor?: Editor) => void;

export class EditorGroup {
  public editors: Editor[] = [];
  private application: MobileApplication;
  changeObservers: EditorGroupChangeCallback[] = [];

  constructor(application: MobileApplication) {
    this.application = application;
  }

  public deinit() {
    (this.application as any) = undefined;
    for (const editor of this.editors) {
      this.deleteEditor(editor);
    }
  }

  createEditor(noteUuid?: string, noteTitle?: string) {
    const editor = new Editor(this.application, noteUuid, noteTitle);
    this.editors.push(editor);
    this.notifyObservers();
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
    if (this.activeEditor) {
      callback(this.activeEditor);
    }
    return () => {
      removeFromArray(this.changeObservers, callback);
    };
  }

  private notifyObservers() {
    for (const observer of this.changeObservers) {
      observer();
    }
  }
}
