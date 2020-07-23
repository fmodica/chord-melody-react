export class ArrayUtilities {
  static getMinMax<T>(arr: T[]): { min: T, max: T } {
    let min = arr[0];
    let max = arr[0];
    let i = arr.length;

    while (i--) {
      min = arr[i] < min ? arr[i] : min;
      max = arr[i] > max ? arr[i] : max;
    }

    return { min, max };
  }

  static getAllCombinations<T>(collection: (T | null)[][]): (T | null)[][] {
    const allCombinations: (T | null)[][] = [];
    this.getAllCombinationsRecursive(collection, 0, [], allCombinations);

    return allCombinations;
  }

  private static getAllCombinationsRecursive<T>(collection: (T | null)[][], index: number, currentCombo: (T | null)[], allCombos: (T | null)[][]): void {
    if (index === collection.length) {
      allCombos.push(currentCombo);
      return;
    }

    const currentLevel = collection[index];

    for (let i = 0; i < currentLevel.length; i++) {
      const currentComboCopy = [...currentCombo];
      currentComboCopy.push(currentLevel[i]);

      this.getAllCombinationsRecursive(collection, index + 1, currentComboCopy, allCombos);
    }
  }
}