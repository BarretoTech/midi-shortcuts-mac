# MIDI VSCode Shortcuts

A VSCode extension that enables mapping MIDI controller inputs to VSCode commands for tactile development workflow control.

## Features

- Connect MIDI controllers to VSCode
- Map MIDI keys/controls to any VSCode command
- Persistent configuration across sessions
- Real-time MIDI input detection
- Export/import configuration

## Requirements

- VSCode 1.74.0 or higher
- A MIDI controller device
- macOS (initial platform support)

## Extension Settings

This extension contributes the following settings:

- `midiShortcuts.device`: MIDI device configuration
- `midiShortcuts.mappings`: Array of MIDI input to command mappings

## Commands

- `MIDI Shortcuts: Open MIDI Configuration` - Open the configuration interface
- `MIDI Shortcuts: Select MIDI Device` - Choose which MIDI device to use
- `MIDI Shortcuts: Start MIDI Listening` - Begin listening for MIDI input
- `MIDI Shortcuts: Stop MIDI Listening` - Stop listening for MIDI input
- `MIDI Shortcuts: Export MIDI Configuration` - Export current mappings
- `MIDI Shortcuts: Import MIDI Configuration` - Import saved mappings

## Development

This extension is built with TypeScript and uses the VSCode Extension API.

### Building

```bash
npm install
npm run compile
```

### Running

Press F5 to open a new Extension Development Host window with the extension loaded.

## Release Notes

### 0.0.1

Initial release with basic project structure.
