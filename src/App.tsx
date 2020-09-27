import React, { Component } from 'react';

import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import FormHelperText from '@material-ui/core/FormHelperText';
import MenuItem from '@material-ui/core/MenuItem';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import Popover from '@material-ui/core/Popover';

import { Tablature, ITabNoteLocation, INote, NoteLetter } from './submodules/tablature-react/src/tablature/tablature';
import { IStringedNote, IChordMelodyService, ChordMelodyService } from './services/chord-melody-service';
import { ChordPlayabilityService, IChordPlayabilityService } from './services/chord-playability-service';

import './App.css';
import { ArrayUtilities } from './services/array-utilities';

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
  private readonly chordMelodyService: IChordMelodyService = new ChordMelodyService();
  private readonly chordPlayabilityService: IChordPlayabilityService = new ChordPlayabilityService();

  constructor(props: IAppProps) {
    super(props);

    this.state = this.getInitialState();
  }

  render(): JSX.Element {
    return (
      <div className="app">
        <button className='reset-btn' onClick={this.onReset}>Reset</button>

        <Tablature
          editorIsFocused={this.state.editorIsFocused}
          chords={this.state.chords}
          tuning={this.state.tuning}
          maxFretNum={this.state.maxFretNum}
          mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
          focusedNote={this.state.focusedNote}
          onKeyBoardNavigation={this.onKeyBoardNavigation}
          onEdit={this.onEdit}
          onNoteClick={this.onNoteClick}
          onNoteRightClick={this.onNoteRightClick}
          onEditorFocus={this.onEditorFocus}
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
    this.setState({ focusedNote: newFocusedNote, menuAnchorEl: e.target as Element });
    this.closeMenu();
  }

  onNoteRightClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    e.preventDefault();
    this.setState({ focusedNote: newFocusedNote, menuAnchorEl: e.target as Element });
    this.openMenu(e.clientX, e.clientY);
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
    this.closeMenu();
  }

  onReset = (): void => {
    window.localStorage.removeItem(this.tabsKey);
    this.setState(this.getInitialState());
  }

  onChordRootSelected = (event: React.ChangeEvent<{ value: unknown }>): void => {
    const valueAsString: string | null = event.target.value as string | null;
    const valueParsed: number | null = valueAsString === null ? null : parseInt(valueAsString);

    this.setState({
      selectedChordRoot: valueParsed,
      hasChordRootError: false
    });
  }

  onIntervalChecked = (interval: Interval): void => {
    let newIntervals: Interval[];

    if (this.state.selectedIntervals.includes(interval)) {
      newIntervals = this.state.selectedIntervals.filter(i => i !== interval);
    } else {
      newIntervals = [interval, ...this.state.selectedIntervals];
    }

    this.setState({
      selectedIntervals: newIntervals,
      hasSelectedIntervalError: false
    });
  }

  onGetChordsClick = (): void => {
    if (this.state.selectedChordRoot === null) {
      this.setState({ hasChordRootError: true });
      return;
    }

    if (this.state.selectedIntervals.length === 0) {
      this.setState({ hasSelectedIntervalError: true });
      return;
    }

    if (this.state.focusedNote === null) {
      return;
    }


    this.setState({ suggestedChords: this.getSuggestedChords() });
    this.closeMenu();
  }

  onMenuClose = (): void => {
    this.setState({ menuAnchorEl: null, menuIsOpen: false });
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

  private openMenu(x: number, y: number): void {
    this.setState({ menuIsOpen: true });
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
      editorIsFocused: true,
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
        { letter: NoteLetter.E, octave: 2 }
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
      menuAnchorEl: null,
      selectedChordRoot: null,
      hasChordRootError: false,
      selectedIntervals: [],
      hasSelectedIntervalError: false,
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

  private getMenuEl(): JSX.Element | null {
    return (
      <Popover
        open={this.state.menuIsOpen}
        anchorEl={this.state.menuAnchorEl}
        onClose={this.onMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}>

        {this.getChordMelodyOptionsMenu()}
      </Popover>
    );
  }

  private getChordMelodyOptionsMenu(): JSX.Element {
    return (
      <div className='note-menu'>
        {this.getChordMelodySelectMenu()}

        {
          this.state.selectedChordRoot === null ?
            null :
            this.getChordMelodyIntervalsTable()
        }
        
        {
          this.state.selectedIntervals.length === 0 ?
            null :
            <Button variant="contained" color="primary" onClick={this.onGetChordsClick}>Get Chords</Button>
        }
      </div>
    );
  }

  private getChordMelodySelectMenu(): JSX.Element {
    const noteLetterEntries = Array.from(this.state.mapFromNoteLetterEnumToString.entries());

    return (
      <FormControl error={this.state.hasChordRootError}>
        <FormHelperText>Let's build a chord under this melody node.</FormHelperText>
        <FormHelperText>First select a chord root.</FormHelperText>
        <Select className="chord-root-menu" onChange={this.onChordRootSelected} value={this.state.selectedChordRoot === null ? '' : this.state.selectedChordRoot}>
          {
            noteLetterEntries.map(entry => {
              return <MenuItem key={entry[0]} value={entry[0]}>{entry[1]}</MenuItem>;
            })
          }
        </Select>
        {this.state.hasChordRootError && <FormHelperText>A chord root is required</FormHelperText>}
      </FormControl>
    );
  }

  private getChordMelodyIntervalsTable(): JSX.Element {
    const intervalEntries = Array.from(this.state.mapFromIntervalEnumToString.entries());

    return (
      <FormControl error={this.state.hasSelectedIntervalError}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  Interval
              </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                intervalEntries.map(entry => {
                  return (
                    <TableRow key={entry[0]}>
                      <TableCell padding='default'>
                        {entry[1]}
                      </TableCell>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          color="primary"
                          checked={this.state.selectedIntervals.includes(entry[0])}
                          onChange={() => this.onIntervalChecked(entry[0])} />
                      </ TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>
        </TableContainer>
        {this.state.hasSelectedIntervalError && <FormHelperText>At least one interval must be selected</FormHelperText>}
      </FormControl>
    )
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
        editorIsFocused={false}
        chords={this.state.suggestedChords}
        tuning={this.state.tuning}
        maxFretNum={this.state.maxFretNum}
        mapFromNoteLetterEnumToString={this.state.mapFromNoteLetterEnumToString}
        focusedNote={null}
        onKeyBoardNavigation={() => { }}
        onEdit={() => { }}
        onNoteClick={this.onSuggestedChordNoteClick}
        onNoteRightClick={() => { }}
        onEditorFocus={() => { }}
      ></Tablature>
    </div>
  }
}

interface IAppProps { }

interface IAppState {
  editorIsFocused: boolean;
  chords: (number | null)[][];
  focusedNote: ITabNoteLocation;
  tuning: INote[];
  maxFretNum: number;
  mapFromNoteLetterEnumToString: Map<NoteLetter, string>;
  mapFromIntervalEnumToString: Map<Interval, string>;
  menuIsOpen: boolean;
  menuAnchorEl: Element | null;
  selectedChordRoot: NoteLetter | null;
  hasChordRootError: boolean;
  selectedIntervals: Interval[];
  hasSelectedIntervalError: boolean;
  maxFretDistance: number;
  // If null, we are not currently suggesting chords.
  // If empty, we are suggesting chords but there are none.
  suggestedChords: (number | null)[][] | null;
}