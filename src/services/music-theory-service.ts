export class MusicTheoryService implements IMusicTheoryService {
  getNoteValue(note: INote): number {
    return (note.octave * 12) + note.letter;
  }

  getNoteFromFret(tuningNote: INote, fret: number): INote {
    const noteLetter = tuningNote.letter + fret;
    const octaveFactor = Math.floor(noteLetter / 12);
    const newOctave = tuningNote.octave + octaveFactor;
    const newNoteLetter = noteLetter - (12 * octaveFactor);

    return {
      letter: newNoteLetter,
      octave: newOctave
    }
  }

  getChordWithoutNulls(chord: (number | null)[]): IFretIndexPair[] {
    return chord
      .map((fret, index) => ({ fret, index }))
      .filter(fretIndexPair => fretIndexPair.fret !== null);
  }

  getNoteValueFromFret(tuningNote: INote, fret: number): number {
    return this.getNoteValue(this.getNoteFromFret(tuningNote, fret));
  }
}

export interface IMusicTheoryService {
  getNoteValue(note: INote): number;
  getNoteFromFret(tuningNote: INote, fret: number): INote;
  getChordWithoutNulls(chord: (number | null)[]): IFretIndexPair[];
  getNoteValueFromFret(tuningNote: INote, fret: number): number;
}

export enum NoteLetter {
  C,
  Dflat,
  D,
  Eflat,
  E,
  F,
  Gflat,
  G,
  Aflat,
  A,
  Bflat,
  B
}

export interface INote {
  letter: NoteLetter;
  octave: number;
}

export interface IFretIndexPair {
  fret: number | null;
  index: number;
}