import { ArrayUtilities } from "./array-utilities";

export class ChordMelodyService implements IChordMelodyService {
  getChords(requiredNotesExcludingMelody: NoteLetter[], tuning: INote[], numFrets: number, melodyStringedNote: IStringedNote, maxFretDistance: number): (number | null)[][] {
    this.validate(requiredNotesExcludingMelody, tuning, numFrets, maxFretDistance);

    const requiredNotesIncludingMelody: NoteLetter[] = this.addMelodyNoteToRequiredNotes(tuning, melodyStringedNote, requiredNotesExcludingMelody);

    const fretsOfRequiredNotesOnAllStrings: (number | null)[][] = this.getsFretsOfRequiredNotesOnAllStrings(requiredNotesIncludingMelody, tuning, numFrets, melodyStringedNote);

    const allCombos: (number | null)[][] = ArrayUtilities.getAllCombinations(fretsOfRequiredNotesOnAllStrings);

    const filteredCombos: (number | null)[][] = allCombos.filter((chord) => {
      return this.isValidChord(chord, tuning, requiredNotesIncludingMelody, maxFretDistance);
    });

    return filteredCombos;
  }

  private addMelodyNoteToRequiredNotes(tuning: INote[], melodyStringedNote: IStringedNote, requiredNotes: NoteLetter[]): NoteLetter[] {
    const newRequiredNotes = [...requiredNotes];
    const melodyNote = this.getNoteFromStringedNote(tuning, melodyStringedNote);

    if (!newRequiredNotes.includes(melodyNote.letter)) {
      newRequiredNotes.push(melodyNote.letter);
    }

    return newRequiredNotes;
  }

  private getNoteFromStringedNote(tuning: INote[], stringedNote: IStringedNote): INote {
    const openNote = tuning[stringedNote.stringIndex];
    const melodyNote = this.getNoteFromFret(openNote, stringedNote.fret);

    return melodyNote;
  }

  private getsFretsOfRequiredNotesOnAllStrings(requiredNotes: NoteLetter[], tuning: INote[], numFrets: number, melodyStringedNote: IStringedNote): (number | null)[][] {
    const fretsOfRequiredNotesOnAllStrings: (number | null)[][] = [];
    const requiredNotesSet: Set<NoteLetter> = new Set(requiredNotes);
    const melodyNote: INote = this.getNoteFromFret(tuning[melodyStringedNote.stringIndex], melodyStringedNote.fret);

    for (let i = 0; i < tuning.length; i++) {
      if (i === melodyStringedNote.stringIndex) {
        fretsOfRequiredNotesOnAllStrings.push([melodyStringedNote.fret]);
        continue;
      }

      const fretsOfRequiredNotesOnString: (number | null)[] = this.getFretsOfRequiredNotesOnString(numFrets, tuning, i, requiredNotesSet, melodyNote);
      fretsOfRequiredNotesOnAllStrings.push(fretsOfRequiredNotesOnString);
    }

    return fretsOfRequiredNotesOnAllStrings;
  }

  private isValidChord(chord: (number | null)[], tuning: INote[], requiredNotesIncludingMelody: NoteLetter[], maxFretDistance: number): boolean {
    if (chord.length === 0) {
      throw new Error(`The chord has no elements.`);
    }

    if (!this.meetsNotesRequirement(chord, tuning, requiredNotesIncludingMelody)) {
      return false;
    }

    if (!this.meetsLengthRequirement(chord, maxFretDistance)) {
      return false;
    }

    return true;
  }

  private meetsNotesRequirement(chord: (number | null)[], tuning: INote[], requiredNotesIncludingMelody: NoteLetter[]): boolean {
    const noteLetterSet = new Set<NoteLetter>();

    for (let i = 0; i < chord.length; i++) {
      const fret: number | null = chord[i];

      if (fret === null) {
        continue;
      }

      const note: INote = this.getNoteFromFret(tuning[i], fret);
      noteLetterSet.add(note.letter);
    }

    return noteLetterSet.size === requiredNotesIncludingMelody.length;
  }

  private meetsLengthRequirement(chord: (number | null)[], maxFretDistance: number): boolean {
    const chordWithoutNullsOrOpens: (number | null)[] = chord.filter(fret => fret !== null && fret !== 0);

    // All null or open
    if (chordWithoutNullsOrOpens.length === 0) {
      return true;
    }

    // Cast to get around TS errors, since we know there are no nulls
    const { min, max } = ArrayUtilities.getMinMax(chordWithoutNullsOrOpens as number[]);

    return (max - min) <= maxFretDistance;
  }

  private getFretsOfRequiredNotesOnString(numFrets: number, tuning: INote[], stringIndex: number, requiredNotesSet: Set<NoteLetter>, melodyNote: INote): (number | null)[] {
    const fretsOfRequiredNotesOnString: (number | null)[] = [null];
    const melodyNoteValue: number = this.getNoteValue(melodyNote);

    for (let i = 0; i <= numFrets; i++) {
      let note = this.getNoteFromFret(tuning[stringIndex], i);

      if (requiredNotesSet.has(note.letter) && this.getNoteValue(note) <= melodyNoteValue) {
        fretsOfRequiredNotesOnString.push(i);
      }
    }

    return fretsOfRequiredNotesOnString;
  }

  private validate(requiredNotes: NoteLetter[], tuning: INote[], numFrets: number, maxFretDistance: number): void {
    if (requiredNotes.length === 0) {
      throw new Error(`The required notes array has no elements.`);
    }

    if (tuning.length === 0) {
      throw new Error(`The tuning array has no elements.`);
    }

    if (numFrets <= 0) {
      throw new Error(`The number of frets must be greater than zero, but it is ${numFrets}.`);
    }

    if (maxFretDistance <= 0) {
      throw new Error(`The max fret distance must be greater than zero, but it is ${maxFretDistance}.`);
    }
  }

  private getNoteFromFret(tuningNote: INote, fret: number): INote {
    const noteLetter = tuningNote.letter + fret;
    const octaveFactor = Math.floor(noteLetter / 12);
    const newOctave = tuningNote.octave + octaveFactor;
    const newNoteLetter = noteLetter - (12 * octaveFactor);

    return {
      letter: newNoteLetter,
      octave: newOctave
    }
  }

  private getNoteValue(note: INote): number {
    return (note.octave * 12) + note.letter;
  }
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

export interface IStringedNote {
  stringIndex: number;
  fret: number;
}

export interface INote {
  letter: NoteLetter;
  octave: number;
}

export interface IChordMelodyService {
  getChords(
    requiredNotes: NoteLetter[],
    tuning: INote[],
    numFrets: number,
    melodyNote: IStringedNote,
    maxFretDistance: number
  ): (number | null)[][];
}