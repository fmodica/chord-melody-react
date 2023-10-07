export class MusicTheoryService implements IMusicTheoryService {
  getNoteValue(note: INote): number {
    return note.octave * 12 + note.letter;
  }

  getNoteFromFret(tuningNote: INote, fret: number): INote {
    const noteLetter = tuningNote.letter + fret;
    const octaveFactor = Math.floor(noteLetter / 12);
    const newOctave = tuningNote.octave + octaveFactor;
    const newNoteLetter = noteLetter - 12 * octaveFactor;

    return {
      letter: newNoteLetter,
      octave: newOctave,
    };
  }

  getChordWithoutNulls(chord: (number | null)[]): IFretIndexPair[] {
    return chord
      .map((fret, index) => ({ fret, index }))
      .filter((fretIndexPair) => fretIndexPair.fret !== null);
  }

  getEmptyChords(numChords: number, numStrings: number): (number | null)[][] {
    const chords: (number | null)[][] = [];

    for (let i = 0; i < numChords; i++) {
      chords.push(this.getNullChord(numStrings));
    }

    return chords;
  }

  getNoteValueFromFret(tuningNote: INote, fret: number): number {
    return this.getNoteValue(this.getNoteFromFret(tuningNote, fret));
  }

  getNullChord(numFrets: number): (number | null)[] {
    const chord: null[] = [];

    for (let i = 0; i < numFrets; i++) {
      chord.push(null);
    }

    return chord;
  }

  getNoteLetterOptionalPairs(
    chordRoot: NoteLetter,
    intervalOptionalPairs: IIntervalOptionalPair[]
  ): INoteLetterOptionalPair[] {
    return intervalOptionalPairs.map(
      (intervalOptionalPair: IIntervalOptionalPair) => {
        const noteLetter: NoteLetter = this.getNoteLetterFromRootAndInterval(
          chordRoot,
          intervalOptionalPair.interval
        );

        return {
          noteLetter: noteLetter,
          isOptional: intervalOptionalPair.isOptional,
        };
      }
    );
  }

  getNoteLetterFromRootAndInterval(
    root: NoteLetter,
    interval: Interval
  ): NoteLetter {
    let note: number = root + interval;

    return note > 11 ? note - 12 : note;
  }
}

export interface IMusicTheoryService {
  getNoteValue(note: INote): number;
  getNoteFromFret(tuningNote: INote, fret: number): INote;
  getChordWithoutNulls(chord: (number | null)[]): IFretIndexPair[];
  getEmptyChords(numChords: number, numStrings: number): (number | null)[][];
  getNoteValueFromFret(tuningNote: INote, fret: number): number;
  getNullChord(numFrets: number): (number | null)[];
  getNoteLetterOptionalPairs(
    chordRoot: NoteLetter,
    intervalOptionalPairs: IIntervalOptionalPair[]
  ): INoteLetterOptionalPair[];
  getNoteLetterFromRootAndInterval(
    root: NoteLetter,
    interval: Interval
  ): NoteLetter;
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
  B,
}

export interface INote {
  letter: NoteLetter;
  octave: number;
}

export interface IFretIndexPair {
  fret: number | null;
  index: number;
}

export enum Interval {
  Root,
  FlatSecond,
  Second,
  FlatThird,
  Third,
  Fourth,
  FlatFifth,
  Fifth,
  FlatSixth,
  Sixth,
  FlatSeventh,
  Seventh,
}

export interface IIntervalOptionalPair {
  interval: Interval;
  isOptional: boolean;
}

export interface INoteLetterOptionalPair {
  noteLetter: NoteLetter;
  isOptional: boolean;
}

export interface IStringedNote {
  stringIndex: number;
  fret: number;
}
