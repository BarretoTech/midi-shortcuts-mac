/**
 * MIDI Type Definitions and Interfaces
 * 
 * This module defines all TypeScript interfaces, enums, and constants
 * for MIDI device management and message processing.
 */

/**
 * Enum for different types of MIDI messages
 */
export enum MidiMessageType {
    NOTE_ON = 'noteOn',
    NOTE_OFF = 'noteOff',
    CONTROL_CHANGE = 'controlChange',
    PROGRAM_CHANGE = 'programChange'
}

/**
 * Enum for MIDI input types used in mappings
 */
export enum MidiInputType {
    NOTE = 'note',
    CONTROL_CHANGE = 'controlChange'
}

/**
 * MIDI constants for message parsing and validation
 */
export const MIDI_CONSTANTS = {
    // MIDI message status bytes (upper nibble)
    NOTE_OFF_STATUS: 0x80,
    NOTE_ON_STATUS: 0x90,
    CONTROL_CHANGE_STATUS: 0xB0,
    PROGRAM_CHANGE_STATUS: 0xC0,
    
    // MIDI data ranges
    MIN_CHANNEL: 1,
    MAX_CHANNEL: 16,
    MIN_NOTE: 0,
    MAX_NOTE: 127,
    MIN_VELOCITY: 0,
    MAX_VELOCITY: 127,
    MIN_CONTROLLER: 0,
    MAX_CONTROLLER: 127,
    MIN_PROGRAM: 0,
    MAX_PROGRAM: 127,
    
    // Special values
    NOTE_ON_ZERO_VELOCITY_IS_NOTE_OFF: true
} as const;

/**
 * Interface representing a MIDI device
 */
export interface MidiDevice {
    /** Unique identifier for the MIDI device */
    id: string;
    
    /** Human-readable name of the device */
    name: string;
    
    /** Device manufacturer (optional) */
    manufacturer?: string;
    
    /** Current connection status */
    connected: boolean;
}

/**
 * Interface representing a MIDI message received from a device
 */
export interface MidiMessage {
    /** Type of MIDI message */
    type: MidiMessageType;
    
    /** MIDI channel (1-16) */
    channel: number;
    
    /** Note number for note messages (0-127) */
    note?: number;
    
    /** Velocity for note messages (0-127) */
    velocity?: number;
    
    /** Controller number for control change messages (0-127) */
    controller?: number;
    
    /** Value for control change and program change messages (0-127) */
    value?: number;
    
    /** Timestamp when the message was received */
    timestamp: number;
}

/**
 * Interface representing a MIDI input for mapping purposes
 */
export interface MidiInput {
    /** Type of MIDI input */
    type: MidiInputType;
    
    /** MIDI channel (1-16) */
    channel: number;
    
    /** Note number for note inputs (0-127) */
    note?: number;
    
    /** Controller number for control change inputs (0-127) */
    controller?: number;
}

/**
 * Interface representing a mapping between MIDI input and VSCode command
 */
export interface MidiMapping {
    /** Unique identifier for the mapping */
    id: string;
    
    /** MIDI input that triggers the command */
    midiInput: MidiInput;
    
    /** VSCode command to execute */
    command: string;
    
    /** Optional description for the mapping */
    description?: string;
    
    /** Whether the mapping is currently enabled */
    enabled: boolean;
}

/**
 * Interface for device-related settings
 */
export interface DeviceSettings {
    /** ID of the currently selected MIDI device */
    selectedDeviceId?: string;
    
    /** Whether to automatically connect to the last used device */
    autoConnect: boolean;
    
    /** Whether to enable debug logging */
    enableLogging: boolean;
}

/**
 * Type guard to check if a value is a valid MidiMessageType
 */
export function isMidiMessageType(value: any): value is MidiMessageType {
    return Object.values(MidiMessageType).includes(value);
}

/**
 * Type guard to check if a value is a valid MidiInputType
 */
export function isMidiInputType(value: any): value is MidiInputType {
    return Object.values(MidiInputType).includes(value);
}

/**
 * Utility function to validate MIDI channel range
 */
export function isValidMidiChannel(channel: number): boolean {
    return Number.isInteger(channel) && 
           channel >= MIDI_CONSTANTS.MIN_CHANNEL && 
           channel <= MIDI_CONSTANTS.MAX_CHANNEL;
}

/**
 * Utility function to validate MIDI note range
 */
export function isValidMidiNote(note: number): boolean {
    return Number.isInteger(note) && 
           note >= MIDI_CONSTANTS.MIN_NOTE && 
           note <= MIDI_CONSTANTS.MAX_NOTE;
}

/**
 * Utility function to validate MIDI velocity range
 */
export function isValidMidiVelocity(velocity: number): boolean {
    return Number.isInteger(velocity) && 
           velocity >= MIDI_CONSTANTS.MIN_VELOCITY && 
           velocity <= MIDI_CONSTANTS.MAX_VELOCITY;
}

/**
 * Utility function to validate MIDI controller range
 */
export function isValidMidiController(controller: number): boolean {
    return Number.isInteger(controller) && 
           controller >= MIDI_CONSTANTS.MIN_CONTROLLER && 
           controller <= MIDI_CONSTANTS.MAX_CONTROLLER;
}

/**
 * Utility function to create a unique key for a MIDI input
 * Used for mapping lookups and conflict detection
 */
export function createMidiInputKey(midiInput: MidiInput): string {
    const { type, channel, note, controller } = midiInput;
    
    if (type === MidiInputType.NOTE && note !== undefined) {
        return `${type}:${channel}:${note}`;
    } else if (type === MidiInputType.CONTROL_CHANGE && controller !== undefined) {
        return `${type}:${channel}:${controller}`;
    }
    
    throw new Error('Invalid MIDI input: missing required properties');
}