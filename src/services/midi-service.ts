import { IMusicTheoryService, INote, MusicTheoryService } from "./music-theory-service";

export class MidiService implements IMidiService {
  public highestNoteValue = 108;
  public lowestNoteValue = 21;
  public lastNotesPlayed: number[] = [];
  public ready = false;
  public MIDI: any;

  private readonly musicTheoryService: IMusicTheoryService = new MusicTheoryService();

  constructor() {
    this.MIDI = (<any>window).MIDI;

    this.MIDI.loadPlugin({
      soundfontUrl: `${process.env.PUBLIC_URL}/midi/soundfonts/`,
      instrument: 'acoustic_guitar_nylon',
      onprogress: (state: any, progress: any) => { },
      onsuccess: () => {
        this.ready = true;
        console.log('MIDI JS Success');
      }
    });
  }

  playNotes(notes: INote[]): void {
    if (!(notes && notes.length > 0)) {
      return;
    }

    let noteIntegers: number[] = notes.map(note => this.musicTheoryService.getNoteValue(note) + 12);
    noteIntegers.sort((a, b) => a - b);

    this.playNoteValues(noteIntegers, 0.04);
  }

  stopNotes(): void {
    for (let i = 0; i < this.lastNotesPlayed.length; i++) {
      this.MIDI.noteOff(0, this.lastNotesPlayed[i], 0);
    }
  }

  private playNoteValues(notes: number[], delayBetweenNotes: number): void {
    if (!(this.ready && notes && notes.length)) {
      return;
    }

    // https://en.wikipedia.org/wiki/General_MIDI
    // 25 for acoustic guitar (minus 1)
    this.MIDI.programChange(0, 24);
    let velocity = 96; // how hard the note hits
    this.MIDI.setVolume(0, velocity);

    // for (let i = 0; i < this.lastNotesPlayed.length; i++) {
    //   this.MIDI.noteOff(0, this.lastNotesPlayed[i], 0);
    // }

    let delay = 0;
    this.lastNotesPlayed = [];

    for (let i = 0; i < notes.length; i++) {
      let noteToPlay = notes[i];

      if (i > 0) {
        delay += delayBetweenNotes;
      }

      this.MIDI.noteOn(0, noteToPlay, velocity, delay);
      this.lastNotesPlayed.push(noteToPlay);
    }
  }
}

export interface IMidiService {
  playNotes(notes: INote[]): void;
  stopNotes(): void;
}