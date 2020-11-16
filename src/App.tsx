import React, { Component } from 'react';

import Button from '@material-ui/core/Button';

import { Tablature, ITabNoteLocation, INote, NoteLetter } from './submodules/tablature-react/src/tablature/tablature';
import ChordMenu from './components/ChordMenu';
import { IStringedNote, Interval, IIntervalOptionalPair, IChordMelodyService, ChordMelodyService } from './services/chord-melody-service';
import { ChordPlayabilityService, IChordPlayabilityService } from './services/chord-playability-service';
import { ArrayUtilities } from './services/array-utilities';

import './App.css';

export default class App extends Component<IAppProps, IAppState> {
  private readonly tabsKey: string = 'tabs';
  private readonly chordMelodyService: IChordMelodyService = new ChordMelodyService();
  private readonly chordPlayabilityService: IChordPlayabilityService = new ChordPlayabilityService();

  constructor(props: IAppProps) {
    super(props);

    this.state = this.getInitialState();
  }

  render(): JSX.Element {
    return (
      <div className='app-container'>
        <div className='app'>
          <Tablature
            editorIsFocused={this.state.editorIsFocused}
            chords={this.state.chords}
            tuning={this.state.tuning}
            maxFretNum={this.state.maxTabFret}
            notesPerMeasure={this.state.notesPerMeasure}
            mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
            focusedNote={this.state.focusedNote}
            onKeyBoardNavigation={this.onKeyBoardNavigation}
            onEdit={this.onEdit}
            onNoteClick={this.onNoteClick}
            onEditorFocus={this.onEditorFocus}
          ></Tablature>

          {this.getMenuEl()}
        </div>

        <div className='bottom-menu'>
          <Button className='reset-btn' variant='contained' color='secondary' onClick={this.onReset}>Start Over</Button>
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    const savedChordsStr = window.localStorage.getItem(this.tabsKey);

    if (!savedChordsStr) {
      return;
    }

    const chords: (number | null)[][] = JSON.parse(savedChordsStr);

    this.onEdit(chords, this.state.focusedNote);
  }

  onKeyBoardNavigation = (newFocusedNote: ITabNoteLocation, e: KeyboardEvent): void => {
    e.preventDefault();
    this.setState({ focusedNote: newFocusedNote })
  }

  onFocusedNoteChange = (newFocusedNote: ITabNoteLocation): void => {
    this.setState({ focusedNote: newFocusedNote });
  }

  onEdit = (newChords: (number | null)[][], newFocusedNote: ITabNoteLocation): void => {
    this.setState({ chords: newChords, focusedNote: newFocusedNote });
    window.localStorage.setItem(this.tabsKey, JSON.stringify(newChords));
  }

  onNoteClick = (clickedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    const fret: number | null = this.state.chords[clickedNote.chordIndex][clickedNote.stringIndex];

    if (this.state.menuIsOpen) {
      this.closeMenu();
    } else if (this.tabLocationsAreEqual(this.state.focusedNote, clickedNote) && fret !== null) {
      this.setState({ menuIsOpen: true });
    }

    this.setState({ focusedNote: clickedNote });
  }

  onEditorFocus = (isFocused: boolean, e: React.FocusEvent): void => {
    this.setState({ editorIsFocused: isFocused });
  }

  onSuggestedChordNoteClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    if (this.state.suggestedChords === null) {
      return;
    }

    const newChords: (number | null)[][] = [...this.state.chords];
    const newChord: (number | null)[] = [...this.state.suggestedChords[newFocusedNote.chordIndex]];

    newChords[this.state.focusedNote.chordIndex] = newChord;

    this.onEdit(newChords, this.state.focusedNote);
  }

  onReset = (): void => {
    window.localStorage.removeItem(this.tabsKey);
    this.setState(this.getInitialState());
  }

  onTabSelected = (event: React.ChangeEvent<{}>, newValue: number): void => {
    this.setState({ selectedTab: newValue });
  }

  onChordRootSelected = (event: React.ChangeEvent<{ value: unknown }>): void => {
    const valueAsString: string | null = event.target.value as string | null;
    const valueParsed: number | null = valueAsString === null ? null : parseInt(valueAsString);

    this.setState({ selectedChordRoot: valueParsed });
  }

  onIntervalChecked = (interval: Interval, indexOfSelectedInterval: number): void => {
    let newIntervalOptionalPairs: IIntervalOptionalPair[] = [...this.state.selectedIntervalOptionalPairs];

    if (indexOfSelectedInterval !== -1) {
      newIntervalOptionalPairs.splice(indexOfSelectedInterval, 1);
    } else {
      newIntervalOptionalPairs.push({
        interval: interval,
        isOptional: interval === Interval.Fifth
      });
    }

    this.setState({ selectedIntervalOptionalPairs: newIntervalOptionalPairs });
  }

  onIntervalOptionalChecked = (interval: Interval, indexOfSelectedInterval: number): void => {
    if (indexOfSelectedInterval === -1) {
      return;
    }

    let newIntervalOptionalPairs: IIntervalOptionalPair[] = [...this.state.selectedIntervalOptionalPairs];
    newIntervalOptionalPairs[indexOfSelectedInterval].isOptional = !newIntervalOptionalPairs[indexOfSelectedInterval].isOptional;

    this.setState({ selectedIntervalOptionalPairs: newIntervalOptionalPairs });
  }

  onExcludeChordsWithOpenNotesChecked = (): void => {
    this.setState(state => {
      return { excludeChordsWithOpenNotes: !state.excludeChordsWithOpenNotes };
    });
  }

  onMinFretChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value: number = parseInt(event.target.value);

    if (value < 0 || value > this.state.maxTabFret /* || value > this.state.maxFret */) {
      return;
    }

    this.setState({ minFret: value });
  }

  onMaxFretChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value: number = parseInt(event.target.value);

    if (value < 0 || value > this.state.maxTabFret /* || value < this.state.minFret */) {
      return;
    }

    this.setState({ maxFret: value });
  }

  onGetChordsClick = (): void => {
    if (this.state.focusedNote === null) {
      return;
    }

    this.setState({ suggestedChords: this.getSuggestedChords() });
  }

  closeMenu = (): void => {
    this.setState({ menuIsOpen: false });

    // Reset the menu placement and contents after the animation is complete
    setTimeout(() => {
      this.setState({ suggestedChords: null });
    }, 200);
  }

  private getSuggestedChords(): (number | null)[][] | null {
    const melodyStringedNote: IStringedNote | null = this.getFocusedNoteAsStringedNote();

    if (
      this.state.selectedChordRoot === null ||
      this.state.selectedIntervalOptionalPairs === null ||
      this.state.selectedIntervalOptionalPairs.length === 0 ||
      melodyStringedNote === null
    ) {
      return null;
    }

    const suggestedChords: (number | null)[][] | null = this.chordMelodyService.getChords(
      this.state.selectedChordRoot,
      this.state.selectedIntervalOptionalPairs,
      this.state.tuning,
      24,
      melodyStringedNote,
      this.state.maxFretDistance,
      this.state.minFret,
      this.state.maxFret,
      this.state.excludeChordsWithOpenNotes
    );

    const suggestedChordsRequiringFourFingersMax = suggestedChords.filter(chord => this.chordPlayabilityService.getPlayability(chord) <= 4);

    suggestedChordsRequiringFourFingersMax.sort((a, b) => {
      // Sort by playability 

      const playabilityA = this.chordPlayabilityService.getPlayability(a);
      const playabilityB = this.chordPlayabilityService.getPlayability(b);

      if (playabilityA !== playabilityB) {
        return playabilityA - playabilityB;
      }

      // Same playability, sort by number of notes

      const aWithoutNulls = a.filter(fret => fret !== null);
      const bWithoutNulls = b.filter(fret => fret !== null);

      if (aWithoutNulls.length !== bWithoutNulls.length) {
        return aWithoutNulls.length - bWithoutNulls.length;
      }

      // Same number of notes, sort by minimum non-zero fret

      const aWithoutNullsOrOpens = aWithoutNulls.filter(fret => fret !== 0);
      const bWithoutNullsOrOpens = bWithoutNulls.filter(fret => fret !== 0);

      const { min: minNonZeroFretA } = ArrayUtilities.getMinMax(aWithoutNullsOrOpens as number[]);
      const { min: minNonZeroFretB } = ArrayUtilities.getMinMax(bWithoutNullsOrOpens as number[]);

      return minNonZeroFretA - minNonZeroFretB;
    });

    return suggestedChordsRequiringFourFingersMax;
  }

  private getFocusedNoteAsStringedNote(): IStringedNote | null {
    const focusedChord: (number | null)[] = this.state.chords[this.state.focusedNote.chordIndex];
    const melodyFret: number | null = focusedChord[this.state.focusedNote.stringIndex];

    if (melodyFret === null) {
      return null;
    }

    const melodyNote: IStringedNote = {
      fret: melodyFret,
      stringIndex: this.state.focusedNote.stringIndex
    };

    return melodyNote;
  }

  private getInitialState(): IAppState {
    return {
      editorIsFocused: true,
      // Make this tuning.length
      chords: this.getEmptyChords(64, 6),
      focusedNote: {
        chordIndex: 0,
        stringIndex: 0
      },
      tuning: [
        { letter: NoteLetter.E, octave: 4 },
        { letter: NoteLetter.B, octave: 3 },
        { letter: NoteLetter.G, octave: 3 },
        { letter: NoteLetter.D, octave: 3 },
        { letter: NoteLetter.A, octave: 2 },
        { letter: NoteLetter.E, octave: 2 }
      ],
      maxTabFret: 24,
      minFret: 0,
      // Reuse maxFretNum
      maxFret: 24,
      notesPerMeasure: 16,
      mapFromNoteLetterEnumToString: new Map(
        [
          [NoteLetter.Aflat, 'Ab'],
          [NoteLetter.A, 'A'],
          [NoteLetter.Bflat, 'Bb'],
          [NoteLetter.B, 'B'],
          [NoteLetter.C, 'C'],
          [NoteLetter.Dflat, 'C#'],
          [NoteLetter.D, 'D'],
          [NoteLetter.Eflat, 'Eb'],
          [NoteLetter.E, 'E'],
          [NoteLetter.F, 'F'],
          [NoteLetter.Gflat, 'F#'],
          [NoteLetter.G, 'G']
        ]
      ),
      mapFromIntervalEnumToString: new Map(
        [
          [Interval.Root, 'root'],
          [Interval.FlatSecond, 'b2 / b9'],
          [Interval.Second, '2/9'],
          [Interval.FlatThird, 'b3 / #9'],
          [Interval.Third, '3'],
          [Interval.Fourth, '4 / 11'],
          [Interval.FlatFifth, 'b5 / #11'],
          [Interval.Fifth, '5'],
          [Interval.FlatSixth, 'b6 / #5'],
          [Interval.Sixth, '6 / 13 / bb7'],
          [Interval.FlatSeventh, 'b7'],
          [Interval.Seventh, '7']
        ]
      ),
      menuIsOpen: false,
      selectedTab: 0,
      selectedChordRoot: null,
      selectedIntervalOptionalPairs: [],
      excludeChordsWithOpenNotes: false,
      maxFretDistance: 4,
      suggestedChords: null
    };
  }

  private getEmptyChords(numChords: number, numFrets: number): null[][] {
    return new Array(numChords).fill(this.getAllNulls(numFrets));
  }

  private getAllNulls = (size: number): null[] => {
    return new Array(size).fill(null);
  }

  private tabLocationsAreEqual(one: ITabNoteLocation, two: ITabNoteLocation): boolean {
    return one.chordIndex === two.chordIndex && one.stringIndex === two.stringIndex;
  }

  private getMenuEl(): JSX.Element | null {
    return <ChordMenu
      tuning={this.state.tuning}
      maxTabFret={this.state.maxTabFret}
      minFret={this.state.minFret}
      maxFret={this.state.maxFret}
      mapFromIntervalEnumToString={this.state.mapFromIntervalEnumToString}
      mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
      menuIsOpen={this.state.menuIsOpen}
      selectedTab={this.state.selectedTab}
      selectedChordRoot={this.state.selectedChordRoot}
      excludeChordsWithOpenNotes={this.state.excludeChordsWithOpenNotes}
      selectedIntervalOptionalPairs={this.state.selectedIntervalOptionalPairs}
      suggestedChords={this.state.suggestedChords}
      onTabSelected={this.onTabSelected}
      onChordRootSelected={this.onChordRootSelected}
      onIntervalChecked={this.onIntervalChecked}
      onIntervalOptionalChecked={this.onIntervalOptionalChecked}
      onMinFretChanged={this.onMinFretChanged}
      onMaxFretChanged={this.onMaxFretChanged}
      onExcludeChordsWithOpenNotesChecked={this.onExcludeChordsWithOpenNotesChecked}
      onGetChordsClick={this.onGetChordsClick}
      onSuggestedChordNoteClick={this.onSuggestedChordNoteClick}
      onCloseMenu={this.closeMenu} />
  }
}

interface IAppProps { }

interface IAppState {
  editorIsFocused: boolean;
  chords: (number | null)[][];
  focusedNote: ITabNoteLocation;
  tuning: INote[];
  maxTabFret: number;
  minFret: number;
  maxFret: number;
  notesPerMeasure: number | null;
  mapFromNoteLetterEnumToString: Map<NoteLetter, string>;
  mapFromIntervalEnumToString: Map<Interval, string>;
  menuIsOpen: boolean;
  selectedTab: number;
  selectedChordRoot: NoteLetter | null;
  selectedIntervalOptionalPairs: IIntervalOptionalPair[];
  excludeChordsWithOpenNotes: boolean;
  maxFretDistance: number;
  // If null, we are not currently suggesting chords.
  // If empty, we are suggesting chords but there are none.
  suggestedChords: (number | null)[][] | null;
}