import { IIntervalOptionalPair, IMusicTheoryService, INote, INoteLetterOptionalPair, IStringedNote, MusicTheoryService, NoteLetter } from "./music-theory-service";

export class MelodyGeneratorService implements IMelodyGeneratorService {
  private readonly musicTheoryService: IMusicTheoryService = new MusicTheoryService();

  getMelody(chordRoot: NoteLetter, intervalOptionalPairs: IIntervalOptionalPair[], tuning: INote[], melodyNote: IStringedNote, minFret: number, maxFret: number, averageNoteJump: number): (number | null)[][] {
    const noteLetterOptionalPairs: INoteLetterOptionalPair[] = this.musicTheoryService.getNoteLetterOptionalPairs(chordRoot, intervalOptionalPairs);
    const allowedNotes: NoteLetter[] = noteLetterOptionalPairs.map((pair: INoteLetterOptionalPair) => pair.noteLetter)

    const allowedNotesSortedAsc = [...allowedNotes];
    allowedNotesSortedAsc.sort((a, b) => a - b);

    const allowedNotesSortedDesc = [...allowedNotesSortedAsc];
    allowedNotesSortedDesc.reverse();

    const fretsOfNotesOnAllStrings: (number | null)[][] = this.getsFretsOfNotesOnAllStrings(allowedNotes, tuning, minFret, maxFret);

    //const firstRandomString = this.getRandomIntInclusive(0, tuning.length - 1);
    //const firstRandomFret = this.getRandomIntInclusive(0, fretsOfNotesOnAllStrings[firstRandomString].length - 1);
    //const firstRandomMelodyChord: (number | null)[] = this.musicTheoryService.getNullChord(tuning.length);

    //firstRandomMelodyChord[firstRandomString] = firstRandomFret;
    const firstChord: (number | null)[] = [];

    for (let i = 0; i < tuning.length; i++) {
      if (i === melodyNote.stringIndex) {
        firstChord.push(melodyNote.fret);
      } else {
        firstChord.push(null);
      }
    }
    const melodyChords: (number | null)[][] = [firstChord];

    //let lastNote: INote = this.musicTheoryService.getNoteFromFret(tuning[firstRandomString], firstRandomFret);

    const fretsOnString: (number | null)[] = fretsOfNotesOnAllStrings[melodyNote.stringIndex];

    let lastNote: INote = this.musicTheoryService.getNoteFromFret(tuning[melodyNote.stringIndex], melodyNote.fret);
    let lastFret: number = melodyNote.fret;

    for (let i = 0; i < 15; i++) {
      // http://nodegame.github.io/JSUS/docs/lib/random.js.html
      // Use .5 for an average of 2
      const distancePositive: number = Math.round(this.nextExponential(1 / averageNoteJump));
      const sign: number = this.getRandomIntInclusive(0, 1);
      const distance: number = distancePositive * (sign === 1 ? 1 : -1);

      let allowedNotesSorted: NoteLetter[];

      if (distance < 0) {
        allowedNotesSorted = allowedNotesSortedDesc;
      } else {
        allowedNotesSorted = allowedNotesSortedAsc;
      }

      // Need some validation against the initial note 
      const indexOfLastNoteLetter: number = allowedNotesSorted.findIndex(noteLetter => noteLetter === lastNote.letter);
      const newNoteLetterIndex: number = indexOfLastNoteLetter + Math.abs(distance);
      const octaveFactor: number = Math.floor(newNoteLetterIndex / allowedNotesSorted.length) * (distance < 0 ? -1 : 1);
      const newNoteLetterIndexCorrected: number = newNoteLetterIndex - (allowedNotesSorted.length * Math.abs(octaveFactor));
      const newOctave: number = lastNote.octave + octaveFactor;
      const newNote: INote = { letter: allowedNotesSorted[newNoteLetterIndexCorrected], octave: newOctave };

      const newMelodyChord: (number | null)[] = this.musicTheoryService.getNullChord(tuning.length);

      if (this.musicTheoryService.getNoteValue(newNote) === this.musicTheoryService.getNoteValue(lastNote)) {
        melodyChords.push(newMelodyChord);
        continue;
      }

      const fretsOfNotesOnAllStringsCopy = [...fretsOfNotesOnAllStrings];
      let found: boolean = false;

      while (!found && fretsOfNotesOnAllStringsCopy.length > 0) {
        const randomStringIndex = this.getRandomIntInclusive(0, fretsOfNotesOnAllStringsCopy.length - 1);
        const fretsOnString = fretsOfNotesOnAllStringsCopy[randomStringIndex];

        for (let k = 0; k < fretsOnString.length; k++) {
          if (this.musicTheoryService.getNoteValueFromFret(tuning[randomStringIndex], fretsOnString[k]!) === this.musicTheoryService.getNoteValue(newNote) && (lastFret === null || Math.abs(fretsOnString[k]! - lastFret) <= 4)) {
            newMelodyChord[randomStringIndex] = fretsOnString[k];
            lastFret = fretsOnString[k]!;
            melodyChords.push(newMelodyChord);
            found = true;
            break;
          }
        }

        fretsOfNotesOnAllStringsCopy.splice(randomStringIndex, 1);
      }

      if (found) {
        lastNote = newNote;
      } else {
        i--;
      }
    }

    return melodyChords;
  }

  private getsFretsOfNotesOnAllStrings(
    notes: NoteLetter[],
    tuning: INote[],
    minFret: number,
    maxFret: number
  ): (number | null)[][] {
    const fretsOfNotesOnAllStrings: (number | null)[][] = [];
    const requiredNotesSet: Set<NoteLetter> = new Set(notes);

    for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
      const fretsOfRequiredNotesOnString: (number | null)[] = this.getFretsOfNotesOnString(tuning, stringIndex, requiredNotesSet, minFret, maxFret);
      fretsOfNotesOnAllStrings.push(fretsOfRequiredNotesOnString);
    }

    return fretsOfNotesOnAllStrings;
  }

  private getFretsOfNotesOnString(
    tuning: INote[],
    stringIndex: number,
    requiredNotesSet: Set<NoteLetter>,
    minFret: number,
    maxFret: number
  ): (number | null)[] {
    const fretsOfRequiredNotesOnString: (number | null)[] = [/*null*/];

    for (let i = 0; i <= maxFret; i++) {
      if (i !== 0 && i < minFret) {
        continue;
      }

      const note: INote = this.musicTheoryService.getNoteFromFret(tuning[stringIndex], i);

      if (requiredNotesSet.has(note.letter)) {
        fretsOfRequiredNotesOnString.push(i);
      }
    }

    return fretsOfRequiredNotesOnString;
  }

  private getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
  }

  private nextExponential = function (lambda: number) {
    if (lambda <= 0) {
      throw new TypeError('nextExponential: lambda must be greater than 0.');
    }

    return - Math.log(1 - Math.random()) / lambda;
  };
}

export interface IMelodyGeneratorService {
  getMelody(chordRoot: NoteLetter, intervalOptionalPairs: IIntervalOptionalPair[], tuning: INote[], melodyNote: IStringedNote, minFret: number, maxFret: number, averageNoteJump: number): (number | null)[][];
}