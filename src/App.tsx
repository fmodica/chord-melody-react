import React, { Component } from 'react';
import { Tablature, ITabNoteLocation, INote, NoteLetter } from './submodules/tablature-react/src/tablature/tablature';
import { IStringedNote, IChordMelodyService, ChordMelodyService } from './services/chord-melody-service';
import './App.css';

enum Interval {
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

export default class App extends Component<IAppProps, IAppState> {
  private readonly tabsKey: string = 'tabs';
  private readonly menuPixelShiftX: number = 15;
  private readonly menuPixelShiftY: number = 15;
  private readonly chordMelodyService: IChordMelodyService = new ChordMelodyService();

  constructor(props: IAppProps) {
    super(props);

    this.state = this.getInitialState();
  }

  render(): JSX.Element {
    return (
      <div className="app">
        <button className='reset-btn' onClick={this.onReset}>Reset</button>

        <Tablature
          chords={this.state.chords}
          tuning={this.state.tuning}
          maxFretNum={this.state.maxFretNum}
          mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
          focusedNote={this.state.focusedNote}
          onKeyBoardNavigation={this.onKeyBoardNavigation}
          onEdit={this.onEdit}
          onNoteClick={this.onNoteClick}
          onNoteRightClick={this.onNoteRightClick}
        ></Tablature>

        {this.getMenuEl()}

        {this.getSuggestedChordsDisplay()}
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

  onNoteClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    this.setState({ focusedNote: newFocusedNote });
    this.closeMenu();
  }

  onNoteRightClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    e.preventDefault();
    this.setState({ focusedNote: newFocusedNote });
    this.openMenu(e.clientX, e.clientY);
  }

  onSuggestedChordNoteClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    if (this.state.suggestedChords === null) {
      return;
    }

    const newChords: (number | null)[][] = [...this.state.chords];
    const newChord: (number | null)[] = [...this.state.suggestedChords[newFocusedNote.chordIndex]];

    newChords[this.state.focusedNote.chordIndex] = newChord;

    this.setState({ chords: newChords });
    this.closeMenu();
  }

  onReset = (): void => {
    window.localStorage.removeItem(this.tabsKey);
    this.setState(this.getInitialState());
  }

  onChordRootSelected = (root: string): void => {
    const rootAsNumber: NoteLetter = parseInt(root);
    this.setState({ selectedChordRoot: rootAsNumber });
  }

  onIntervalChecked = (interval: Interval): void => {
    let intervalsCopy: Interval[];

    if (this.state.selectedIntervals.includes(interval)) {
      intervalsCopy = this.state.selectedIntervals.filter(i => i !== interval);
    } else {
      intervalsCopy = [interval, ...this.state.selectedIntervals];
    }

    this.setState({ selectedIntervals: intervalsCopy });
  }

  onGetChordsClick = (): void => {
    this.setState({ suggestedChords: this.getSuggestedChords() });
    this.closeMenu();
  }

  private getSuggestedChords(): (number | null)[][] | null {
    const melodyStringedNote: IStringedNote | null = this.getFocusedNoteAsStringedNote();

    if (melodyStringedNote === null) {
      return null;
    }

    const requiredNotesExcludingMelody = this.state.selectedIntervals.map(interval => {
      return this.getNoteLetterFromRootAndInterval(this.state.selectedChordRoot as NoteLetter, interval);
    });

    const suggestedChords: (number | null)[][] | null = this.chordMelodyService.getChords(requiredNotesExcludingMelody, this.state.tuning, 24, melodyStringedNote, this.state.maxFretDistance);

    return suggestedChords;
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

  private openMenu(x: number, y: number): void {
    this.setState({
      menuIsOpen: true,
      menuX: x + this.menuPixelShiftX,
      menuY: y + this.menuPixelShiftY
    });
  }

  private closeMenu(): void {
    this.setState({ menuIsOpen: false });
  }

  private getNoteLetterFromRootAndInterval(root: NoteLetter, interval: Interval): NoteLetter {
    let note: number = root + interval;

    return note > 11
      ? (note - 12)
      : note
  }

  private getInitialState(): IAppState {
    return {
      tablatureIsFocused: false,
      chords: this.getEmptyChords(16, 6),
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
        { letter: NoteLetter.E, octave: 2 },
      ],
      maxFretNum: 24,
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
          [Interval.FlatSecond, 'b2/b9'],
          [Interval.Second, '2/9'],
          [Interval.FlatThird, 'b3/#9'],
          [Interval.Third, '3'],
          [Interval.Fourth, '4/11'],
          [Interval.FlatFifth, 'b5/#11'],
          [Interval.Fifth, '5'],
          [Interval.FlatSixth, 'b6/#5'],
          [Interval.Sixth, '6/13/bb7'],
          [Interval.FlatSeventh, 'b7'],
          [Interval.Seventh, '7']
        ]
      ),
      menuIsOpen: false,
      menuX: 0,
      menuY: 0,
      selectedChordRoot: NoteLetter.C,
      selectedIntervals: [Interval.Root, Interval.Third, Interval.Fifth],
      maxFretDistance: 4,
      suggestedChords: null
    };
  }

  private getEmptyChords(numChords: number, numFrets: number): null[][] {
    return new Array(numChords).fill(this.getAllNulls(numFrets));
  }

  private getAllNulls = (numFrets: number): null[] => {
    return new Array(numFrets).fill(null);
  }

  private getMenuEl(): JSX.Element | null {
    if (!this.state.menuIsOpen) {
      return null;
    }

    return (
      <div style={{ left: this.state.menuX, top: this.state.menuY, width: 200 }} className='note-menu'>
        {this.getChordIntervalAndNotesDisplay()}
      </div>
    );
  }

  private getChordIntervalAndNotesDisplay(): JSX.Element {
    const noteLetterEntries = Array.from(this.state.mapFromNoteLetterEnumToString.entries());
    const intervalEntries = Array.from(this.state.mapFromIntervalEnumToString.entries());

    return (
      <div>
        <select onChange={(e) => this.onChordRootSelected(e.target.value)} value={this.state.selectedChordRoot as NoteLetter}>
          {noteLetterEntries.map(entry => <option key={entry[0]} value={entry[0]}>{entry[1]}</option>)}
        </select>
        <table>
          <tbody>
            {
              intervalEntries.map(entry => {
                return (
                  <tr key={entry[0]}>
                    <td>{entry[1]}</td>
                    <td><input type='checkbox' checked={this.state.selectedIntervals.includes(entry[0])} onChange={() => this.onIntervalChecked(entry[0])} /></td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>

        <button onClick={this.onGetChordsClick}>Get Chords</button>
      </div>
    );
  }

  private getSuggestedChordsDisplay(): JSX.Element | null {
    if (!this.state.suggestedChords) {
      return null;
    }

    if (!this.state.suggestedChords.length) {
      return <div>No chords found</div>;
    }

    return <div className='Suggested-Chords'>
      <Tablature
        chords={this.state.suggestedChords}
        tuning={this.state.tuning}
        maxFretNum={this.state.maxFretNum}
        mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
        focusedNote={this.state.focusedNote}
        onKeyBoardNavigation={this.onKeyBoardNavigation}
        onEdit={this.onEdit}
        onNoteClick={this.onSuggestedChordNoteClick}
        onNoteRightClick={() => { }}
      ></Tablature>
    </div>
  }
}

interface IAppProps { }

interface IAppState {
  tablatureIsFocused: boolean;
  chords: (number | null)[][];
  focusedNote: ITabNoteLocation;
  tuning: INote[];
  maxFretNum: number;
  mapFromNoteLetterEnumToString: Map<NoteLetter, string>;
  mapFromIntervalEnumToString: Map<Interval, string>;
  menuIsOpen: boolean;
  menuX: number;
  menuY: number;
  selectedChordRoot: NoteLetter;
  selectedIntervals: Interval[];
  maxFretDistance: number;
  // If null, we are not currently suggesting chords.
  // If empty, we are suggesting chords but there are none.
  suggestedChords: (number | null)[][] | null;
}