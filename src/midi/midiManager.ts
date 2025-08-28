/**
 * MIDI Manager
 * 
 * This module handles MIDI device detection, connection, and message processing.
 * It provides a high-level interface for managing MIDI devices and processing
 * incoming MIDI messages.
 */

import { EventEmitter } from 'events';
import * as midi from 'midi';
import { 
    MidiDevice, 
    MidiMessage, 
    MidiMessageType, 
    MIDI_CONSTANTS,
    isValidMidiChannel,
    isValidMidiNote,
    isValidMidiVelocity,
    isValidMidiController
} from './midiTypes';

/**
 * Error types for MIDI operations
 */
export enum MidiErrorType {
    DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    DEVICE_BUSY = 'DEVICE_BUSY',
    INVALID_MESSAGE = 'INVALID_MESSAGE',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for MIDI operations
 */
export class MidiError extends Error {
    constructor(
        public readonly type: MidiErrorType,
        message: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'MidiError';
    }
}

/**
 * Interface for MIDI manager events
 */
export interface MidiManagerEvents {
    'message': (message: MidiMessage) => void;
    'deviceConnected': (device: MidiDevice) => void;
    'deviceDisconnected': (device: MidiDevice) => void;
    'error': (error: MidiError) => void;
}

/**
 * MIDI Manager class for handling device detection, connection, and message processing
 */
export class MidiManager extends EventEmitter {
    private input: midi.Input | null = null;
    private connectedDevice: MidiDevice | null = null;
    private isListening: boolean = false;

    constructor() {
        super();
    }

    /**
     * Detect all available MIDI input devices
     * @returns Promise resolving to array of available MIDI devices
     */
    public async detectDevices(): Promise<MidiDevice[]> {
        try {
            const input = new midi.Input();
            const devices: MidiDevice[] = [];
            
            const portCount = input.getPortCount();
            
            for (let i = 0; i < portCount; i++) {
                const portName = input.getPortName(i);
                
                // Create device object with unique ID based on port index and name
                const device: MidiDevice = {
                    id: `${i}-${portName.replace(/\s+/g, '-').toLowerCase()}`,
                    name: portName,
                    connected: false
                };
                
                devices.push(device);
            }
            
            // Clean up the temporary input
            input.closePort();
            
            return devices;
        } catch (error) {
            const midiError = new MidiError(
                MidiErrorType.UNKNOWN_ERROR,
                'Failed to detect MIDI devices',
                error as Error
            );
            this.emit('error', midiError);
            throw midiError;
        }
    }

    /**
     * Connect to a specific MIDI device
     * @param deviceId - ID of the device to connect to
     */
    public async connectToDevice(deviceId: string): Promise<void> {
        try {
            // Disconnect from current device if connected
            if (this.connectedDevice) {
                await this.disconnect();
            }

            // Find the device in available devices
            const availableDevices = await this.detectDevices();
            const targetDevice = availableDevices.find(device => device.id === deviceId);
            
            if (!targetDevice) {
                throw new MidiError(
                    MidiErrorType.DEVICE_NOT_FOUND,
                    `MIDI device with ID '${deviceId}' not found`
                );
            }

            // Extract port index from device ID
            const portIndex = parseInt(deviceId.split('-')[0]);
            
            // Create new MIDI input
            this.input = new midi.Input();
            
            // Set up message handler before opening port
            this.input.on('message', (deltaTime: number, message: number[]) => {
                this.handleMidiMessage(deltaTime, message);
            });

            // Attempt to open the port
            try {
                this.input.openPort(portIndex);
            } catch (error) {
                // Handle specific connection errors
                const errorMessage = (error as Error).message.toLowerCase();
                
                if (errorMessage.includes('permission') || errorMessage.includes('access')) {
                    throw new MidiError(
                        MidiErrorType.PERMISSION_DENIED,
                        `Permission denied accessing MIDI device '${targetDevice.name}'. Please check system MIDI permissions.`,
                        error as Error
                    );
                } else if (errorMessage.includes('busy') || errorMessage.includes('use')) {
                    throw new MidiError(
                        MidiErrorType.DEVICE_BUSY,
                        `MIDI device '${targetDevice.name}' is busy or in use by another application.`,
                        error as Error
                    );
                } else {
                    throw new MidiError(
                        MidiErrorType.CONNECTION_FAILED,
                        `Failed to connect to MIDI device '${targetDevice.name}': ${(error as Error).message}`,
                        error as Error
                    );
                }
            }

            // Update connected device state
            this.connectedDevice = {
                ...targetDevice,
                connected: true
            };
            
            this.isListening = true;
            
            // Emit connection event
            this.emit('deviceConnected', this.connectedDevice);
            
        } catch (error) {
            // Clean up on error
            if (this.input) {
                try {
                    this.input.closePort();
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
                this.input = null;
            }
            
            if (error instanceof MidiError) {
                this.emit('error', error);
                throw error;
            } else {
                const midiError = new MidiError(
                    MidiErrorType.CONNECTION_FAILED,
                    'Failed to connect to MIDI device',
                    error as Error
                );
                this.emit('error', midiError);
                throw midiError;
            }
        }
    }

    /**
     * Disconnect from the currently connected MIDI device
     */
    public disconnect(): void {
        try {
            if (this.input) {
                this.input.closePort();
                this.input = null;
            }
            
            const disconnectedDevice = this.connectedDevice;
            
            if (this.connectedDevice) {
                this.connectedDevice.connected = false;
                this.emit('deviceDisconnected', this.connectedDevice);
                this.connectedDevice = null;
            }
            
            this.isListening = false;
            
        } catch (error) {
            const midiError = new MidiError(
                MidiErrorType.UNKNOWN_ERROR,
                'Error during MIDI device disconnection',
                error as Error
            );
            this.emit('error', midiError);
        }
    }

    /**
     * Get the currently connected device
     * @returns Currently connected device or null
     */
    public getConnectedDevice(): MidiDevice | null {
        return this.connectedDevice;
    }

    /**
     * Check if currently listening for MIDI messages
     * @returns True if listening, false otherwise
     */
    public isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Handle incoming MIDI messages and parse them into structured format
     * @param deltaTime - Time since last message
     * @param message - Raw MIDI message bytes
     */
    private handleMidiMessage(deltaTime: number, message: number[]): void {
        try {
            const parsedMessage = this.parseMidiMessage(message);
            if (parsedMessage) {
                this.emit('message', parsedMessage);
            }
        } catch (error) {
            const midiError = new MidiError(
                MidiErrorType.INVALID_MESSAGE,
                'Failed to parse MIDI message',
                error as Error
            );
            this.emit('error', midiError);
        }
    }

    /**
     * Parse raw MIDI message bytes into structured MidiMessage
     * @param message - Raw MIDI message bytes
     * @returns Parsed MidiMessage or null if message type not supported
     */
    private parseMidiMessage(message: number[]): MidiMessage | null {
        if (message.length < 2) {
            return null; // Invalid message length
        }

        const [statusByte, ...dataBytes] = message;
        const messageType = statusByte & 0xF0; // Upper nibble
        const channel = (statusByte & 0x0F) + 1; // Lower nibble, convert to 1-16

        // Validate channel
        if (!isValidMidiChannel(channel)) {
            return null;
        }

        const timestamp = Date.now();

        switch (messageType) {
            case MIDI_CONSTANTS.NOTE_ON_STATUS: {
                if (dataBytes.length < 2) return null;
                
                const [note, velocity] = dataBytes;
                
                if (!isValidMidiNote(note) || !isValidMidiVelocity(velocity)) {
                    return null;
                }

                // Note: velocity 0 in NOTE_ON is equivalent to NOTE_OFF
                const type = (velocity === 0 && MIDI_CONSTANTS.NOTE_ON_ZERO_VELOCITY_IS_NOTE_OFF) 
                    ? MidiMessageType.NOTE_OFF 
                    : MidiMessageType.NOTE_ON;

                return {
                    type,
                    channel,
                    note,
                    velocity,
                    timestamp
                };
            }

            case MIDI_CONSTANTS.NOTE_OFF_STATUS: {
                if (dataBytes.length < 2) return null;
                
                const [note, velocity] = dataBytes;
                
                if (!isValidMidiNote(note) || !isValidMidiVelocity(velocity)) {
                    return null;
                }

                return {
                    type: MidiMessageType.NOTE_OFF,
                    channel,
                    note,
                    velocity,
                    timestamp
                };
            }

            case MIDI_CONSTANTS.CONTROL_CHANGE_STATUS: {
                if (dataBytes.length < 2) return null;
                
                const [controller, value] = dataBytes;
                
                if (!isValidMidiController(controller) || !isValidMidiVelocity(value)) {
                    return null;
                }

                return {
                    type: MidiMessageType.CONTROL_CHANGE,
                    channel,
                    controller,
                    value,
                    timestamp
                };
            }

            case MIDI_CONSTANTS.PROGRAM_CHANGE_STATUS: {
                if (dataBytes.length < 1) return null;
                
                const [value] = dataBytes;
                
                if (!isValidMidiVelocity(value)) {
                    return null;
                }

                return {
                    type: MidiMessageType.PROGRAM_CHANGE,
                    channel,
                    value,
                    timestamp
                };
            }

            default:
                // Unsupported message type
                return null;
        }
    }

    /**
     * Clean up resources when the manager is destroyed
     */
    public dispose(): void {
        this.disconnect();
        this.removeAllListeners();
    }
}

// Type the EventEmitter properly
export interface MidiManager {
    on<K extends keyof MidiManagerEvents>(event: K, listener: MidiManagerEvents[K]): this;
    emit<K extends keyof MidiManagerEvents>(event: K, ...args: Parameters<MidiManagerEvents[K]>): boolean;
}