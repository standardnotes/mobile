import { SNNote, ContentType, PayloadSource } from 'snjs';
import { MobileApplication } from './application';

export class Editor {
  public note?: SNNote;
  private application: MobileApplication;
  private _onNoteChange?: (note: SNNote) => void;
  private _onNoteValueChange?: (note: SNNote, source?: PayloadSource) => void;
  private removeStreamObserver?: () => void;
  public isTemplateNote = false;

  constructor(
    application: MobileApplication,
    noteUuid?: string,
    noteTitle?: string
  ) {
    this.application = application;
    this.init(noteUuid, noteTitle);
  }

  async init(noteUuid?: string, noteTitle?: string) {
    if (noteUuid) {
      this.note = this.application.findItem(noteUuid) as SNNote;
    } else {
      await this.reset(noteTitle);
    }

    this.removeStreamObserver = this.application.streamItems(
      ContentType.Note,
      async (items, source) => {
        await this.handleNoteStream(items as SNNote[], source);
      }
    );
  }

  deinit() {
    if (this.removeStreamObserver) {
      this.removeStreamObserver();
    }
    (this.removeStreamObserver as any) = undefined;
    this._onNoteChange = undefined;
    (this.application as any) = undefined;
    this._onNoteChange = undefined;
    this._onNoteValueChange = undefined;
  }

  private async handleNoteStream(notes: SNNote[], source?: PayloadSource) {
    /** Update our note object reference whenever it changes */
    const matchingNote = notes.find(item => {
      return item.uuid === this.note?.uuid;
    }) as SNNote;
    if (matchingNote) {
      this.isTemplateNote = false;
      this.note = matchingNote;
      this._onNoteValueChange && this._onNoteValueChange!(matchingNote, source);
    }
  }

  async insertTemplatedNote() {
    return this.application.insertItem(this.note!);
  }

  /**
   * Reverts the editor to a blank state, removing any existing note from view,
   * and creating a placeholder note.
   */
  async reset(noteTitle?: string) {
    const note = await this.application.createTemplateItem(ContentType.Note, {
      text: '',
      title: noteTitle || '',
      references: [],
    });
    this.isTemplateNote = true;
    this.setNote(note as SNNote);
  }

  /**
   * Register to be notified when the editor's note changes.
   */
  public onNoteChange(callback: (note: SNNote) => void) {
    this._onNoteChange = callback;
    if (this.note) {
      callback(this.note);
    }
    return () => {
      this._onNoteChange = undefined;
    };
  }

  /**
   * Register to be notified when the editor's note's values change
   * (and thus a new object reference is created)
   */
  public onNoteValueChange(
    callback: (note: SNNote, source?: PayloadSource) => void
  ) {
    this._onNoteValueChange = callback;

    return () => {
      this._onNoteValueChange = undefined;
    };
  }

  /**
   * Sets the editor contents by setting its note.
   */
  public setNote(note: SNNote) {
    this.note = note;
    if (this._onNoteChange) {
      this._onNoteChange(this.note);
    }
  }
}