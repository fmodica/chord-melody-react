import { ArrayUtilities } from "./array-utilities";

export class ChordPlayabilityService implements IChordPlayabilityService {
  getPlayability(chord: (number | null)[]): number {
    const chordWithoutNulls: (number | null)[] = chord.filter(
      (fret) => fret !== null
    );

    // No notes in the chord
    if (chordWithoutNulls.length === 0) {
      return 0;
    }

    // Cast to get around TS errors, since we know there are no nulls
    const { min } = ArrayUtilities.getMinMax(chordWithoutNulls as number[]);

    let lastFret: number | null = null;
    let numFingersRequired: number = 0;
    let needsBar: boolean = min !== 0;

    for (let i = 0; i < chord.length; i++) {
      const currentFret = chord[i];

      if (currentFret === min) {
        if (needsBar) {
          needsBar = false;
          numFingersRequired++;
        }
      } else if (currentFret !== null && currentFret !== lastFret) {
        numFingersRequired++;
      }

      lastFret = currentFret;
    }

    return numFingersRequired;
  }
}

export interface IChordPlayabilityService {
  getPlayability(chord: (number | null)[]): number;
}
