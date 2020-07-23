import React, { Component } from 'react';
import { Tablature, ITabNoteLocation, INote, NoteLetter } from './submodules/tablature-react/src/tablature/tablature';
import './App.css';

export default class App extends Component<IAppProps, IAppState> {
  private readonly tabsKey = 'tabs';
  private readonly menuPixelShiftX = 15;
  private readonly menuPixelShiftY = 15;

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

  onReset = (): void => {
    window.localStorage.removeItem(this.tabsKey);
    this.setState(this.getInitialState());
  }

  onChordRootSelected = (root: string) => {
    const rootAsNumber: NoteLetter = parseInt(root);
    this.setState({ selectedChordRoot: rootAsNumber });
  }

  onIntervalChecked = (interval: Interval) => {
    let intervalsCopy: Interval[];

    if (this.state.selectedIntervals.includes(interval)) {
      intervalsCopy = this.state.selectedIntervals.filter(i => i !== interval);
    } else {
      intervalsCopy = [interval, ...this.state.selectedIntervals];
    }

    this.setState({ selectedIntervals: intervalsCopy });
  }

  onGetChordClick = () => {
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
      selectedIntervals: [Interval.Root, Interval.Third, Interval.Fifth]
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

        <button onClick={this.onGetChordClick}>Get Chords</button>
      </div>
    );
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
}

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