import React, { Component } from 'react';

import FormControl from '@material-ui/core/FormControl';
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
import Draggable from 'react-draggable';

import { Tablature, ITabNoteLocation, INote, NoteLetter } from './submodules/tablature-react/src/tablature/tablature';
import { IStringedNote, Interval, IIntervalOptionalPair, IChordMelodyService, ChordMelodyService } from './services/chord-melody-service';
import { ChordPlayabilityService, IChordPlayabilityService } from './services/chord-playability-service';

import './App.css';
import { ArrayUtilities } from './services/array-utilities';
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
      <div className='app'>
        <Button className='reset-btn' variant='contained' color='secondary' onClick={this.onReset}>Start Over</Button>

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
  }

  onNoteRightClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    e.preventDefault();

    if (newFocusedNote === null) {
      return;
    }

    const fret: number | null = this.state.chords[newFocusedNote.chordIndex][newFocusedNote.stringIndex];

    if (fret === null) {
      return;
    }

    this.setState({
      focusedNote: newFocusedNote,
      menuIsOpen: true,
      menuAnchorEl: e.target as Element
    });
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

  onGetChordsClick = (): void => {
    if (this.state.focusedNote === null) {
      return;
    }

    this.setState({ suggestedChords: this.getSuggestedChords() });
  }

  onMenuClose = (): void => {
    this.setState({ menuIsOpen: false });

    // Reset the menu placement and contents after the animation is complete
    setTimeout(() => {
      this.setState(state => {
        return {
          suggestedChords: null,
          menuAnchorEl: null,
          menuCloseCount: state.menuCloseCount + 1,
          selectedChordRoot: null,
          selectedIntervalOptionalPairs: []
        };
      });
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
      this.state.maxFretDistance
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

  private openMenu(): void {
    this.setState({ menuIsOpen: true });
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
      menuCloseCount: 0,
      selectedChordRoot: null,
      selectedIntervalOptionalPairs: [],
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
    let content: JSX.Element | null = this.state.suggestedChords ?
      this.getSuggestedChordsDisplay() :
      this.getChordMelodyOptionsMenu();

    return (
      // Changing the key will allow the menu position to be reset
      <Draggable key={this.state.menuCloseCount}>
        <Popover
          open={this.state.menuIsOpen}
          anchorEl={this.state.menuAnchorEl}
          onClose={this.onMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}>
          <Button onClick={this.onMenuClose} className='close-btn'>&#10006;</Button>
          {content}
        </Popover>
      </Draggable>
    );
  }

  private getSuggestedChordsDisplay(): JSX.Element | null {
    if (!this.state.suggestedChords?.length) {
      return <div>No chords found</div>;
    }

    return <div className='suggested-chords'>
      <p className='pick-chord'>Pick a chord</p>

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
    </div>;
  }

  private getChordMelodyOptionsMenu(): JSX.Element {
    const noteMenuCss = `note-menu ${this.state.selectedChordRoot === null ? '' : 'chord-root-selected'}`;

    return (
      <div className={noteMenuCss}>
        {this.getChordMelodySelectMenu()}

        {
          this.state.selectedChordRoot === null ?
            null :
            [this.getChordMelodyIntervalsTable(), this.getSubmitButton()]
        }
      </div>
    );
  }

  private getSubmitButton(): JSX.Element {
    return <Button variant='contained' color='primary' disabled={this.state.selectedIntervalOptionalPairs.length === 0} onClick={this.onGetChordsClick}>Get Chords</Button>;
  }

  private getChordMelodySelectMenu(): JSX.Element {
    const noteLetterEntries = Array.from(this.state.mapFromNoteLetterEnumToString.entries());

    return (
      <FormControl variant='outlined'>
        <FormHelperText>Let's build a chord under this melody node.</FormHelperText>
        <FormHelperText>First select a chord root.</FormHelperText>
        <Select className='chord-root-menu' onChange={this.onChordRootSelected} value={this.state.selectedChordRoot === null ? '' : this.state.selectedChordRoot}>
          {
            noteLetterEntries.map(entry => {
              return <MenuItem key={entry[0]} value={entry[0]}>{entry[1]}</MenuItem>;
            })
          }
        </Select>
      </FormControl>
    );
  }

  private getChordMelodyIntervalsTable(): JSX.Element {
    const intervalEntries = Array.from(this.state.mapFromIntervalEnumToString.entries());

    return (
      <FormControl>
        <FormHelperText>Now select the chord intervals.</FormHelperText>
        <TableContainer>
          <Table size='small' padding='none'>
            <TableHead>
              <TableRow>
                <TableCell padding='none'>
                  Interval
                </TableCell>
                <TableCell padding='none'>
                  Optional?
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                intervalEntries.map(entry => {
                  const indexOfSelectedInterval: number = this.state.selectedIntervalOptionalPairs.findIndex(x => x.interval === entry[0]);

                  return (
                    <TableRow key={entry[0]}>
                      <TableCell padding='none' size='small'>
                        <Checkbox
                          size='small'
                          color='primary'
                          checked={indexOfSelectedInterval !== -1}
                          onChange={() => this.onIntervalChecked(entry[0], indexOfSelectedInterval)} />
                        <label>{entry[1]}</label>
                      </TableCell>
                      <TableCell padding='none' size='small'>
                        <Checkbox
                          size='small'
                          color='primary'
                          disabled={indexOfSelectedInterval === -1}
                          checked={indexOfSelectedInterval !== -1 && this.state.selectedIntervalOptionalPairs[indexOfSelectedInterval].isOptional}
                          onChange={() => this.onIntervalOptionalChecked(entry[0], indexOfSelectedInterval)} />
                      </TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>
        </TableContainer>
      </FormControl>
    )
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
  menuCloseCount: number;
  selectedChordRoot: NoteLetter | null;
  selectedIntervalOptionalPairs: IIntervalOptionalPair[];
  maxFretDistance: number;
  // If null, we are not currently suggesting chords.
  // If empty, we are suggesting chords but there are none.
  suggestedChords: (number | null)[][] | null;
}