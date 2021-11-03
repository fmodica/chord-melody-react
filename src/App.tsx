import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import { Tablature, ITabNoteLocation, INote, NoteLetter, IChord } from './submodules/tablature-react/src/tablature/tablature';
import ChordMenu from './components/ChordMenu';
import { IChordMelodyService, ChordMelodyService } from './services/chord-melody-service';
import { IIntervalOptionalPair, IMusicTheoryService, Interval, IStringedNote, MusicTheoryService } from './services/music-theory-service';
import { IMelodyGeneratorService, MelodyGeneratorService } from './services/melody-generator-service';
import { ArrayUtilities } from './services/array-utilities';
import './App.css';
import { IMidiService, MidiService } from './services/midi-service';

export default class App extends Component<IAppProps, IAppState> {
  private readonly appStateKey: string = 'app-state';
  private id: number = 0;
  private timeouts: NodeJS.Timeout[] = [];
  private readonly chordMelodyService: IChordMelodyService = new ChordMelodyService();
  private readonly musicTheoryService: IMusicTheoryService = new MusicTheoryService();
  private readonly melodyGeneratorService: IMelodyGeneratorService = new MelodyGeneratorService();
  private readonly midiService: IMidiService = new MidiService();

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
            getUniqueId={this.getUniqueId}
          ></Tablature>

          {this.getMenuEl()}
        </div>

        <div className='bottom-menu'>
          <Button className='reset-btn' variant='contained' color='secondary' onClick={this.onResetBtnClick}>Start Over</Button>
          {!this.state.isPlaying && <Button className='play-notes-btn' variant='contained' color='primary' onClick={this.onPlayNotesClick}>Play</Button>}
          {this.state.isPlaying && <Button className='play-notes-btn' variant='contained' color='primary' onClick={this.onStopPlayingNotesClick}>Stop</Button>}
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    setInterval(() => {
      const stateToSave: any = { ...this.state };
      delete stateToSave.mapFromIntervalEnumToString;
      delete stateToSave.mapFromNoteLetterEnumToString;

      window.localStorage.setItem(this.appStateKey, JSON.stringify(stateToSave));
    }, 5000);

    const savedStateStr: string | null = window.localStorage.getItem(this.appStateKey);

    if (!savedStateStr) {
      return;
    }

    const savedState: IAppState = JSON.parse(savedStateStr);
    savedState.isPlaying = false;

    // The saved state only is a subset of the IAppState properties, so not all will get overwritten (e.g. maps)
    this.setState({ ...savedState });

    let { max } = ArrayUtilities.getMinMax(savedState.chords.map(c => parseInt(c.id)));
    this.id = ++max;
  }

  onKeyBoardNavigation = (newFocusedNote: ITabNoteLocation, e: KeyboardEvent): void => {
    e.preventDefault();
    this.setState({ focusedNote: newFocusedNote });
  }

  onFocusedNoteChange = (newFocusedNote: ITabNoteLocation): void => {
    this.setState({ focusedNote: newFocusedNote }, () => this.playChord(this.state.focusedNote.chordIndex));
  }

  onEdit = (newChords: IChord[], newFocusedNote: ITabNoteLocation): void => {
    this.setState({ chords: newChords, focusedNote: newFocusedNote }, () => this.playChord(this.state.focusedNote.chordIndex));
  }

  onNoteClick = (clickedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    const fret: number | null = this.state.chords[clickedNote.chordIndex].frets[clickedNote.stringIndex];

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

  getUniqueId = (): string => {
    return (this.id++).toString();
  }

  onSuggestedChordNoteClick = (newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void => {
    if (this.state.suggestedChords === null) {
      return;
    }

    const newChords: IChord[] = [...this.state.chords];

    const newChord: IChord = {
      id: this.getUniqueId(),
      frets: [...this.state.suggestedChords[newFocusedNote.chordIndex].frets]
    };

    newChords[this.state.focusedNote.chordIndex] = newChord;

    this.onEdit(newChords, this.state.focusedNote);
  }

  onResetBtnClick = (): void => {
    window.localStorage.removeItem(this.appStateKey);
    this.setState(this.getInitialState());
  }

  onGetMelodyClick = (): void => {
    // Duplicate code in getSuggestedChords
    const melodyStringedNote: IStringedNote | null = this.getFocusedNoteAsStringedNote();

    if (
      this.state.selectedChordRoot === null ||
      this.state.selectedIntervalOptionalPairs === null ||
      this.state.selectedIntervalOptionalPairs.length === 0 ||
      melodyStringedNote === null
    ) {
      return;
    }

    const melody: (number | null)[][] = this.melodyGeneratorService.getMelody(
      this.state.selectedChordRoot,
      this.state.selectedIntervalOptionalPairs,
      this.state.tuning,
      melodyStringedNote,
      this.state.minFret,
      this.state.maxFret
    );

    const newChords: IChord[] = [...this.state.chords];

    newChords.splice(this.state.focusedNote.chordIndex, melody.length, ...melody.map(this.convertFretsToChord));

    this.setState({ chords: newChords });
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

  onPlayNotesClick = (): void => {
    if (this.state.isPlaying) {
      return;
    }

    this.setState({
      isPlaying: true,
      editorIsFocused: true
    });

    for (let i = this.state.focusedNote.chordIndex; i < this.state.chords.length; i++) {
      const timeout: NodeJS.Timeout = setTimeout(() => {
        this.playChord(i);

        const newFocusedNote: ITabNoteLocation = {
          chordIndex: i,
          stringIndex: 0
        };

        this.setState({ focusedNote: newFocusedNote })

        if (i === this.state.chords.length - 1) {
          this.onStopPlayingNotesClick();
        }
      }, (i - this.state.focusedNote.chordIndex) * 250);

      this.timeouts.push(timeout);
    }
  }

  onStopPlayingNotesClick = (): void => {
    if (!this.state.isPlaying) {
      return;
    }

    this.midiService.stopNotes();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    this.setState({ isPlaying: false });
  }

  private getSuggestedChords(): IChord[] | null {
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
      melodyStringedNote,
      this.state.maxFretDistance,
      this.state.minFret,
      this.state.maxFret,
      this.state.excludeChordsWithOpenNotes,
      4
    );

    return suggestedChords.map(this.convertFretsToChord);
  }

  private convertFretsToChord = (frets: (number | null)[]): IChord => {
    const chord: IChord = {
      id: this.getUniqueId(),
      frets: frets
    }

    return chord;
  }

  private getFocusedNoteAsStringedNote(): IStringedNote | null {
    const focusedChord: IChord = this.state.chords[this.state.focusedNote.chordIndex];
    const melodyFret: number | null = focusedChord.frets[this.state.focusedNote.stringIndex];

    if (melodyFret === null) {
      return null;
    }

    const melodyNote: IStringedNote = {
      fret: melodyFret,
      stringIndex: this.state.focusedNote.stringIndex
    };

    return melodyNote;
  }

  private playChord(chordIndex: number) {
    const notes: (INote | null)[] = this.state.chords[chordIndex].frets.map((fret: number | null, index: number) => {
      return fret !== null
        ? this.musicTheoryService.getNoteFromFret(this.state.tuning[index], fret)
        : null;
    }).filter(note => note !== null);

    this.midiService.playNotes(notes as INote[]);
  }

  private getInitialState(): IAppState {
    const tuning: INote[] = [
      { letter: NoteLetter.E, octave: 4 },
      { letter: NoteLetter.B, octave: 3 },
      { letter: NoteLetter.G, octave: 3 },
      { letter: NoteLetter.D, octave: 3 },
      { letter: NoteLetter.A, octave: 2 },
      { letter: NoteLetter.E, octave: 2 }
    ];

    const maxTabFret = 24;

    return {
      editorIsFocused: true,
      chords: this.musicTheoryService
        .getEmptyChords(64, tuning.length)
        .map(this.convertFretsToChord),
      focusedNote: {
        chordIndex: 0,
        stringIndex: 0
      },
      tuning,
      maxTabFret: maxTabFret,
      minFret: 0,
      maxFret: maxTabFret,
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
      suggestedChords: null,
      isPlaying: false
    };
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
      onGetMelodyClick={this.onGetMelodyClick}
      onSuggestedChordNoteClick={this.onSuggestedChordNoteClick}
      onCloseMenu={this.closeMenu}
      getUniqueId={this.getUniqueId} />
  }
}

interface IAppProps { }

interface IAppState {
  editorIsFocused: boolean;
  chords: IChord[];
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
  suggestedChords: IChord[] | null;
  isPlaying: boolean;
}