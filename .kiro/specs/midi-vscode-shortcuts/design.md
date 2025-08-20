# Design Document

## Overview

The MIDI VSCode Extension is a VSCode extension that enables users to map MIDI controller inputs to VSCode commands. The extension runs within VSCode's Node.js environment and uses native MIDI libraries to communicate with hardware controllers. It provides a configuration interface through VSCode's command palette and webviews, with settings persisted through VSCode's configuration system.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MIDI Device   │────│  MIDI Manager    │────│ Command Mapper  │
│   (Hardware)    │    │  (Node.js)       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        │
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Configuration    │────│ VSCode Commands │
                       │ Manager          │    │ API             │
                       └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐
                       │ Configuration UI │
                       │ (Webview)        │
                       └──────────────────┘
```

### Extension Structure

```
src/
├── extension.ts          # Main extension entry point
├── midi/
│   ├── midiManager.ts    # MIDI device management
│   ├── midiTypes.ts      # MIDI message type definitions
│   └── deviceDetector.ts # MIDI device detection
├── mapping/
│   ├── commandMapper.ts  # MIDI to command mapping logic
│   └── mappingTypes.ts   # Mapping type definitions
├── config/
│   ├── configManager.ts  # VSCode settings management
│   └── configTypes.ts    # Configuration type definitions
├── ui/
│   ├── configWebview.ts  # Configuration webview
│   └── commands.ts       # VSCode command definitions
└── utils/
    ├── logger.ts         # Logging utilities
    └── constants.ts      # Application constants
```

## Components and Interfaces

### MIDI Manager

**Purpose:** Handles MIDI device detection, connection, and message processing.

**Key Methods:**

- `detectDevices(): Promise<MidiDevice[]>` - Discover available MIDI devices
- `connectToDevice(deviceId: string): Promise<void>` - Connect to specific device
- `disconnect(): void` - Disconnect from current device
- `onMidiMessage(callback: (message: MidiMessage) => void)` - Register message handler

**Dependencies:**

- `midi` npm package for native MIDI access
- Node.js EventEmitter for message broadcasting

### Command Mapper

**Purpose:** Maps MIDI inputs to VSCode commands and executes them.

**Key Methods:**

- `addMapping(midiInput: MidiInput, command: string): void` - Create new mapping
- `removeMapping(midiInput: MidiInput): void` - Remove existing mapping
- `executeCommand(midiInput: MidiInput): Promise<void>` - Execute mapped command
- `getAllMappings(): MidiMapping[]` - Get all current mappings

**Dependencies:**

- VSCode Commands API
- Configuration Manager for persistence

### Configuration Manager

**Purpose:** Manages extension settings through VSCode's configuration system.

**Key Methods:**

- `getMappings(): MidiMapping[]` - Load mappings from settings
- `saveMappings(mappings: MidiMapping[]): Promise<void>` - Save mappings to settings
- `getDeviceSettings(): DeviceSettings` - Get device configuration
- `saveDeviceSettings(settings: DeviceSettings): Promise<void>` - Save device settings

**Storage:** VSCode workspace/user settings under `midiShortcuts` namespace

### Configuration UI

**Purpose:** Provides user interface for mapping configuration through webview.

**Features:**

- Device selection dropdown
- MIDI input detection (listen mode)
- Command search and selection
- Mapping list with edit/delete options
- Test functionality for mappings

**Implementation:** VSCode Webview API with HTML/CSS/JavaScript frontend

## Data Models

### Core Types

```typescript
interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  connected: boolean;
}

interface MidiMessage {
  type: "noteOn" | "noteOff" | "controlChange" | "programChange";
  channel: number;
  note?: number; // For note messages
  velocity?: number; // For note messages
  controller?: number; // For CC messages
  value?: number; // For CC and program change
  timestamp: number;
}

interface MidiInput {
  type: "note" | "controlChange";
  channel: number;
  note?: number; // For note inputs
  controller?: number; // For CC inputs
}

interface MidiMapping {
  id: string;
  midiInput: MidiInput;
  command: string;
  description?: string;
  enabled: boolean;
}

interface DeviceSettings {
  selectedDeviceId?: string;
  autoConnect: boolean;
  enableLogging: boolean;
}
```

### Configuration Schema

VSCode settings will be structured as:

```json
{
  "midiShortcuts.device": {
    "selectedDeviceId": "string",
    "autoConnect": true,
    "enableLogging": false
  },
  "midiShortcuts.mappings": [
    {
      "id": "uuid",
      "midiInput": {
        "type": "note",
        "channel": 1,
        "note": 60
      },
      "command": "workbench.action.quickOpen",
      "description": "Quick Open",
      "enabled": true
    }
  ]
}
```

## Error Handling

### MIDI Device Errors

- **Device Not Found:** Show user-friendly message, allow device reselection
- **Connection Lost:** Attempt automatic reconnection, notify user if persistent
- **Permission Denied:** Guide user through macOS MIDI permissions setup
- **Device Busy:** Inform user device is in use by another application

### Command Execution Errors

- **Command Not Found:** Log error, disable mapping, notify user
- **Command Failed:** Log error details, continue operation
- **Extension Not Available:** Check if required extension is installed/enabled

### Configuration Errors

- **Invalid Settings:** Validate and sanitize, use defaults for invalid values
- **Settings Corruption:** Backup and restore mechanism, reset to defaults if needed

### Error Recovery

- Graceful degradation when MIDI unavailable
- Automatic retry mechanisms for transient failures
- User notification for persistent issues
- Detailed logging for troubleshooting

## Testing Strategy

### Unit Tests

**MIDI Manager Tests:**

- Device detection mocking
- Message parsing validation
- Connection state management
- Error handling scenarios

**Command Mapper Tests:**

- Mapping creation/deletion
- Command execution simulation
- Edge cases (duplicate mappings, invalid commands)

**Configuration Manager Tests:**

- Settings serialization/deserialization
- Migration between setting versions
- Validation logic

### Integration Tests

**End-to-End Mapping Tests:**

- MIDI input → command execution flow
- Configuration persistence
- Device reconnection scenarios

**VSCode API Integration:**

- Command palette integration
- Settings synchronization
- Extension lifecycle events

### Manual Testing

**Hardware Testing:**

- Various MIDI controller types (keyboards, pad controllers, control surfaces)
- Different MIDI message types (notes, CCs, program changes)
- Multiple device scenarios

**User Experience Testing:**

- Configuration workflow usability
- Error message clarity
- Performance with high-frequency MIDI input

### Test Environment Setup

- Mock MIDI devices for automated testing
- VSCode extension test framework
- Continuous integration with macOS runners
- Test coverage reporting

## Performance Considerations

### MIDI Message Processing

- Debouncing for high-frequency inputs
- Efficient message filtering
- Non-blocking command execution
- Memory management for message history

### Configuration Management

- Lazy loading of settings
- Efficient diff detection for changes
- Minimal VSCode API calls
- Caching of frequently accessed data

### UI Responsiveness

- Async operations for device detection
- Progressive loading of command lists
- Responsive webview design
- Minimal main thread blocking

## Security Considerations

### MIDI Device Access

- Request minimal necessary permissions
- Validate all MIDI input data
- Sanitize device names and metadata
- Handle malformed MIDI messages safely

### Command Execution

- Validate commands against VSCode's available commands
- Prevent execution of potentially harmful commands
- Rate limiting for command execution
- Audit logging for security-sensitive commands

### Configuration Security

- Validate all configuration inputs
- Prevent injection attacks in settings
- Secure handling of exported/imported configurations
- No sensitive data in configuration files
