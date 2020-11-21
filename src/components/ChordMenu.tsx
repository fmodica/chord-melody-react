import React from 'react';
import Draggable from 'react-draggable';
import { AppBar, Box, Button, Checkbox, Dialog, DialogContent, DialogTitle, FormControl, FormControlLabel, FormHelperText, MenuItem, Paper, Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@material-ui/core';

import { IIntervalOptionalPair, Interval } from '../services/chord-melody-service';
import { INote, ITabNoteLocation, NoteLetter, Tablature } from '../submodules/tablature-react/src/tablature/tablature';

const ChordMenu: React.FC<IChordMenuProps> = (props: IChordMenuProps) => {
  let { content, title } = props.suggestedChords ?
    getSuggestedChordsDisplay(props) :
    getChordMelodyOptionsMenu(props);

  return (
    <Dialog
      open={props.menuIsOpen}
      onClose={props.onCloseMenu}
      PaperComponent={PaperComponent}
      aria-labelledby="draggable-dialog-title"
      className={props.suggestedChords ? 'has-suggested-chords' : ''}>
      <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
        {title}
      </DialogTitle>
      <DialogContent>
        {content}
      </DialogContent>
    </Dialog>
  );
}

function PaperComponent(props: any) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

function getSuggestedChordsDisplay(props: IChordMenuProps): { content: JSX.Element | null, title: string } {
  if (!props.suggestedChords?.length) {
    return { content: <div>No chords found</div>, title: '' };
  }

  return {
    content:
      <div className='suggested-chords'>
        <Tablature
          editorIsFocused={false}
          chords={props.suggestedChords}
          tuning={props.tuning}
          maxFretNum={props.maxTabFret}
          notesPerMeasure={null}
          mapFromNoteLetterEnumToString={props.mapFromNoteLetterEnumToString}
          focusedNote={null}
          onKeyBoardNavigation={() => { }}
          onEdit={() => { }}
          onNoteClick={props.onSuggestedChordNoteClick}
          onEditorFocus={() => { }}
        ></Tablature>
      </div>,
    title: 'Pick a chord'
  };
}

function getChordMelodyOptionsMenu(props: IChordMenuProps): { content: JSX.Element | null, title: string } {
  const noteMenuCss = `note-menu ${props.selectedChordRoot === null ? '' : 'chord-root-selected'}`;

  return {
    content: <>
      <AppBar position="relative">
        <Tabs value={props.selectedTab} onChange={props.onTabSelected}>
          <Tab label="Options" />
          <Tab label="Advanced" />
        </Tabs>
      </AppBar>
      <TabPanel value={props.selectedTab} index={0}>
        <div className={noteMenuCss}>
          {getChordMelodySelectMenu(props)}

          {
            props.selectedChordRoot === null ?
              null :
              <>
                {getChordMelodyIntervalsTable(props)}
                {getSubmitButton(props)}
              </>
          }
        </div>
      </TabPanel>
      <TabPanel value={props.selectedTab} index={1}>
        <div className='note-menu'>
          <TextField
            label="Min fret"
            type="number"
            value={props.minFret}
            onChange={props.onMinFretChanged} />

          <TextField
            label="Max fret"
            type="number"
            value={props.maxFret}
            onChange={props.onMaxFretChanged} />

          <FormControlLabel
            label="Exclude chords with open notes"
            labelPlacement="end"
            control={
              <Checkbox
                size='small'
                color='primary'
                checked={props.excludeChordsWithOpenNotes}
                onChange={props.onExcludeChordsWithOpenNotesChecked} />}
          ></FormControlLabel>

          <FormControlLabel
            label="Exclude chords with repeated note letters"
            labelPlacement="end"
            control={
              <Checkbox
                size='small'
                color='primary'
                checked={props.excludeChordsWithDuplicateNoteLetters}
                onChange={props.onExcludeChordsWithDuplicateNoteLettersChecked} />}
          ></FormControlLabel>
        </div>
      </TabPanel>
    </>,
    title: `Let's build a chord under this melody note.`
  };
}

function getChordMelodyIntervalsTable(props: IChordMenuProps): JSX.Element {
  const intervalEntries = Array.from(props.mapFromIntervalEnumToString.entries());

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
                const indexOfSelectedInterval: number = props.selectedIntervalOptionalPairs.findIndex(x => x.interval === entry[0]);

                return (
                  <TableRow key={entry[0]}>
                    <TableCell padding='none' size='small'>
                      <FormControlLabel
                        label={entry[1]}
                        labelPlacement="end"
                        control={
                          <Checkbox
                            size='small'
                            color='primary'
                            checked={indexOfSelectedInterval !== -1}
                            onChange={() => props.onIntervalChecked(entry[0], indexOfSelectedInterval)} />}
                      ></FormControlLabel>
                    </TableCell>
                    <TableCell padding='none' size='small'>
                      <Checkbox
                        size='small'
                        color='primary'
                        disabled={indexOfSelectedInterval === -1}
                        checked={indexOfSelectedInterval !== -1 && props.selectedIntervalOptionalPairs[indexOfSelectedInterval].isOptional}
                        onChange={() => props.onIntervalOptionalChecked(entry[0], indexOfSelectedInterval)} />
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

function getChordMelodySelectMenu(props: IChordMenuProps): JSX.Element {
  const noteLetterEntries = Array.from(props.mapFromNoteLetterEnumToString.entries());

  return (
    <FormControl variant='outlined'>
      <FormHelperText>First select a chord root.</FormHelperText>
      <Select className='chord-root-menu' onChange={props.onChordRootSelected} value={props.selectedChordRoot === null ? '' : props.selectedChordRoot}>
        {
          noteLetterEntries.map(entry => {
            return <MenuItem key={entry[0]} value={entry[0]}>{entry[1]}</MenuItem>;
          })
        }
      </Select>
    </FormControl>
  );
}

function getSubmitButton(props: IChordMenuProps): JSX.Element {
  return <Button variant='contained' color='primary' disabled={props.selectedIntervalOptionalPairs.length === 0} onClick={props.onGetChordsClick}>Get Chords</Button>;
}

interface IChordMenuProps {
  tuning: INote[];
  maxTabFret: number;
  minFret: number;
  maxFret: number;
  mapFromNoteLetterEnumToString: Map<NoteLetter, string>;
  mapFromIntervalEnumToString: Map<Interval, string>;
  menuIsOpen: boolean;
  selectedTab: number;
  selectedChordRoot: NoteLetter | null;
  excludeChordsWithOpenNotes: boolean;
  excludeChordsWithDuplicateNoteLetters: boolean;
  selectedIntervalOptionalPairs: IIntervalOptionalPair[];
  suggestedChords: (number | null)[][] | null;
  onTabSelected(event: React.ChangeEvent<{}>, newValue: number): void;
  onChordRootSelected(event: React.ChangeEvent<{ value: unknown }>): void;
  onIntervalChecked(interval: Interval, indexOfSelectedInterval: number): void;
  onIntervalOptionalChecked(interval: Interval, indexOfSelectedInterval: number): void;
  onExcludeChordsWithOpenNotesChecked(): void;
  onExcludeChordsWithDuplicateNoteLettersChecked(): void;
  onMinFretChanged(event: React.ChangeEvent<HTMLInputElement>): void;
  onMaxFretChanged(event: React.ChangeEvent<HTMLInputElement>): void;
  onGetChordsClick(): void;
  onSuggestedChordNoteClick(newFocusedNote: ITabNoteLocation, e: React.MouseEvent): void;
  onCloseMenu(): void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export default ChordMenu;