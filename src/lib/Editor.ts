import { ContentType, PayloadSource, removeFromArray, SNNote } from 'snjs';
import { MobileApplication } from './application';

export type EditorNoteChangeObserver = (note: SNNote) => void;
export type EditorNoteValueChangeObserver = (
  note: SNNote,
  source?: PayloadSource
) => void;

export class Editor {
  public note?: SNNote;
  private application: MobileApplication;
  private noteChangeObservers: EditorNoteChangeObserver[] = [];
  private noteValueChangeObservers: EditorNoteValueChangeObserver[] = [];
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
    this.noteChangeObservers.length = 0;
    this.noteValueChangeObservers.length = 0;
    (this.application as any) = undefined;
  }

  private async handleNoteStream(notes: SNNote[], source?: PayloadSource) {
    /** Update our note object reference whenever it changes */
    const matchingNote = notes.find(item => {
      return item.uuid === this.note?.uuid;
    }) as SNNote;

    if (matchingNote) {
      this.isTemplateNote = false;
      this.note = matchingNote;
      this.onNoteValueChange(matchingNote, source);
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

    this.setNote(note as SNNote, true);
  }

  private onNoteChange(note: SNNote) {
    if (note) {
      for (const observer of this.noteChangeObservers) {
        observer(note);
      }
    }
  }

  /**
   * Registers an observer for Editor note change
   * @returns function that unregisters this observer
   */
  public addNoteChangeObserver(callback: EditorNoteChangeObserver) {
    this.noteChangeObservers.push(callback);
    return () => {
      removeFromArray(this.noteChangeObservers, callback);
    };
  }

  /**
   * Registers an observer for Editor note's value changes (and thus a new object reference is created)
   * @returns function that unregisters this observer
   */
  public addNoteValueChangeObserver(callback: EditorNoteValueChangeObserver) {
    this.noteValueChangeObservers.push(callback);
    return () => {
      removeFromArray(this.noteValueChangeObservers, callback);
    };
  }

  private onNoteValueChange(note: SNNote, source?: PayloadSource) {
    for (const observer of this.noteValueChangeObservers) {
      observer(note, source);
    }
  }

  /**
   * Sets the editor contents by setting its note.
   */
  public setNote(note: SNNote, isTemplate = false) {
    this.note = note;
    this.isTemplateNote = isTemplate;
    this.onNoteChange(this.note);
  }
}
