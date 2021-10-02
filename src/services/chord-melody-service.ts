import { ArrayUtilities } from "./array-utilities";
import { ChordPlayabilityService, IChordPlayabilityService } from "./chord-playability-service";
import { IFretIndexPair, IMusicTheoryService, INote, MusicTheoryService, NoteLetter } from "./music-theory-service";

export class ChordMelodyService implements IChordMelodyService {
  private readonly musicTheoryService: IMusicTheoryService = new MusicTheoryService();
  private readonly chordPlayabilityService: IChordPlayabilityService = new ChordPlayabilityService();

  getChords(
    chordRoot: NoteLetter,
    intervalOptionalPairs: IIntervalOptionalPair[],
    tuning: INote[],
    numFrets: number,
    melodyStringedNote: IStringedNote,
    maxFretDistance: number,
    minFret: number,
    maxFret: number,
    excludeChordsWithOpenNotes: boolean,
    maxPlayability: number
  ): (number | null)[][] {
    this.validate(intervalOptionalPairs, tuning, numFrets, maxFretDistance);

    const noteLetterOptionalPairs: INoteLetterOptionalPair[] = this.getNoteLetterOptionalPairs(chordRoot, intervalOptionalPairs);

    const fretsOfNotesOnAllStrings: (number | null)[][] = this.getsFretsOfNotesOnAllStrings(
      noteLetterOptionalPairs.map((pair: INoteLetterOptionalPair) => pair.noteLetter),
      tuning,
      melodyStringedNote,
      minFret,
      maxFret,
      excludeChordsWithOpenNotes
    );

    const allCombos: (number | null)[][] = ArrayUtilities.getAllCombinations(fretsOfNotesOnAllStrings);

    const requiredNoteLetters = noteLetterOptionalPairs
      .filter((pair: INoteLetterOptionalPair) => !pair.isOptional)
      .map((pair: INoteLetterOptionalPair) => pair.noteLetter);

    const requiredNoteLetterSet = new Set<NoteLetter>(requiredNoteLetters);

    const filteredCombos: (number | null)[][] = allCombos.filter((chord: (number | null)[]) => {
      return this.isValidChord(chord, tuning, requiredNoteLetterSet, maxFretDistance);
    });

    const suggestedPlayableChords = filteredCombos.filter(chord => this.chordPlayabilityService.getPlayability(chord) <= 4);

    const mapFromLowestValueNoteToChords = new Map<number, (number | null)[][]>();

    suggestedPlayableChords.forEach(chord => {
      const chordWithoutNulls: IFretIndexPair[] = this.musicTheoryService.getChordWithoutNulls(chord);
      const noteValues: number[] = chordWithoutNulls.map(fretIndexPair => this.musicTheoryService.getNoteValueFromFret(tuning[fretIndexPair.index], fretIndexPair.fret as number));

      const { min: minValue } = ArrayUtilities.getMinMax(noteValues);

      if (!mapFromLowestValueNoteToChords.has(minValue)) {
        mapFromLowestValueNoteToChords.set(minValue, []);
      }

      mapFromLowestValueNoteToChords.get(minValue)?.push(chord);
    });

    mapFromLowestValueNoteToChords.forEach(chords => {
      chords.sort((a, b) => {
        const aWithoutNulls: IFretIndexPair[] = this.musicTheoryService.getChordWithoutNulls(a);
        const bWithoutNulls: IFretIndexPair[] = this.musicTheoryService.getChordWithoutNulls(b);

        // Sort by chord length
        if (aWithoutNulls.length !== bWithoutNulls.length) {
          return aWithoutNulls.length - bWithoutNulls.length;
        }

        // Same chord length, sort by sum of non-bass note values
        const aNoteValues: number[] = aWithoutNulls.map(fretIndexPair => this.musicTheoryService.getNoteValueFromFret(tuning[fretIndexPair.index], fretIndexPair.fret as number));
        const bNoteValues: number[] = bWithoutNulls.map(fretIndexPair => this.musicTheoryService.getNoteValueFromFret(tuning[fretIndexPair.index], fretIndexPair.fret as number));

        const { min: aMinNoteValue } = ArrayUtilities.getMinMax(aNoteValues);
        const { min: bMinNoteValue } = ArrayUtilities.getMinMax(bNoteValues);

        const aSum = aNoteValues.filter(noteValue => noteValue !== aMinNoteValue).reduce((a, b) => a + b, 0);
        const bSum = bNoteValues.filter(noteValue => noteValue !== bMinNoteValue).reduce((a, b) => a + b, 0);

        return bSum - aSum;
      });

      chords.push(...this.musicTheoryService.getEmptyChords(1, tuning.length));
    });

    return Array.from(mapFromLowestValueNoteToChords.values()).flat();

    return filteredCombos;
  }

  private getNoteLetterOptionalPairs(chordRoot: NoteLetter, intervalOptionalPairs: IIntervalOptionalPair[]): INoteLetterOptionalPair[] {
    return intervalOptionalPairs.map((intervalOptionalPair: IIntervalOptionalPair) => {
      const noteLetter: NoteLetter = this.getNoteLetterFromRootAndInterval(chordRoot, intervalOptionalPair.interval);

      return {
        noteLetter: noteLetter,
        isOptional: intervalOptionalPair.isOptional
      };
    });
  }

  private getsFretsOfNotesOnAllStrings(
    notes: NoteLetter[],
    tuning: INote[],
    melodyStringedNote: IStringedNote,
    minFret: number,
    maxFret: number,
    excludeChordsWithOpenNotes: boolean
  ): (number | null)[][] {
    const fretsOfNotesOnAllStrings: (number | null)[][] = [];
    const requiredNotesSet: Set<NoteLetter> = new Set(notes);
    const melodyNote: INote = this.musicTheoryService.getNoteFromFret(tuning[melodyStringedNote.stringIndex], melodyStringedNote.fret);

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      if (stringIndex === melodyStringedNote.stringIndex) {
        fretsOfNotesOnAllStrings.push([melodyStringedNote.fret]);
        continue;
      }

      const fretsOfRequiredNotesOnString: (number | null)[] = this.getFretsOfNotesOnString(tuning, stringIndex, requiredNotesSet, melodyNote, minFret, maxFret, excludeChordsWithOpenNotes);
      fretsOfNotesOnAllStrings.push(fretsOfRequiredNotesOnString);
    }

    return fretsOfNotesOnAllStrings;
  }

  private isValidChord(chord: (number | null)[], tuning: INote[], requiredNoteLetterSet: Set<NoteLetter>, maxFretDistance: number): boolean {
    if (chord.length === 0) {
      throw new Error(`The chord has no elements.`);
    }

    if (!this.meetsNotesRequirement(chord, tuning, requiredNoteLetterSet)) {
      return false;
    }

    if (!this.meetsLengthRequirement(chord, maxFretDistance)) {
      return false;
    }

    return true;
  }

  private meetsNotesRequirement(chord: (number | null)[], tuning: INote[], requiredNoteLetterSet: Set<NoteLetter>): boolean {
    const noteLetterSet = new Set<NoteLetter>();

    for (let i = 0; i < chord.length; i++) {
      const fret: number | null = chord[i];

      if (fret === null) {
        continue;
      }

      const note: INote = this.musicTheoryService.getNoteFromFret(tuning[i], fret);

      if (requiredNoteLetterSet.has(note.letter)) {
        noteLetterSet.add(note.letter);
      }
    }

    return noteLetterSet.size === requiredNoteLetterSet.size;
  }

  private meetsLengthRequirement(chord: (number | null)[], maxFretDistance: number): boolean {
    // Cast to get around TS errors, since we know there are no nulls
    const chordWithoutNullsOrOpens: number[] = chord.filter(fret => fret !== null && fret !== 0) as number[];

    // All null or open
    if (chordWithoutNullsOrOpens.length === 0) {
      return true;
    }

    const { min, max } = ArrayUtilities.getMinMax(chordWithoutNullsOrOpens as number[]);

    return (max - min) <= maxFretDistance;
  }

  private getFretsOfNotesOnString(
    tuning: INote[],
    stringIndex: number,
    requiredNotesSet: Set<NoteLetter>,
    melodyNote: INote,
    minFret: number,
    maxFret: number,
    excludeChordsWithOpenNotes: boolean
  ): (number | null)[] {
    const fretsOfRequiredNotesOnString: (number | null)[] = [null];
    const melodyNoteValue: number = this.musicTheoryService.getNoteValue(melodyNote);

    for (let i = 0; i <= maxFret; i++) {
      if (i === 0 && excludeChordsWithOpenNotes) {
        continue;
      }

      if (i !== 0 && i < minFret) {
        continue;
      }

      let note = this.musicTheoryService.getNoteFromFret(tuning[stringIndex], i);

      if (requiredNotesSet.has(note.letter) && this.musicTheoryService.getNoteValue(note) <= melodyNoteValue) {
        fretsOfRequiredNotesOnString.push(i);
      }
    }

    return fretsOfRequiredNotesOnString;
  }

  private validate(intervalOptionalPairs: IIntervalOptionalPair[], tuning: INote[], numFrets: number, maxFretDistance: number): void {
    // Check for uniqueness
    if (intervalOptionalPairs.length === 0) {
      throw new Error(`The interval-optional pairs array has no elements.`);
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

  private getNoteLetterFromRootAndInterval(root: NoteLetter, interval: Interval): NoteLetter {
    let note: number = root + interval;

    return note > 11
      ? (note - 12)
      : note
  }
}

export interface IStringedNote {
  stringIndex: number;
  fret: number;
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
  Seventh
}

export interface IIntervalOptionalPair {
  interval: Interval;
  isOptional: boolean;
}

interface INoteLetterOptionalPair {
  noteLetter: NoteLetter;
  isOptional: boolean;
}

export interface IChordMelodyService {
  getChords(
    chordRoot: NoteLetter,
    intervalOptionalPairs: IIntervalOptionalPair[],
    tuning: INote[],
    numFrets: number,
    melodyNote: IStringedNote,
    maxFretDistance: number,
    minFret: number,
    maxFret: number,
    excludeChordsWithOpenNotes: boolean,
    maxPlayability: number
  ): (number | null)[][];
}