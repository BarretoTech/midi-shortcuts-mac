/**
 * Unit Tests for MIDI Manager Message Processing and Parsing
 * 
 * This test suite focuses on testing the MIDI message parsing logic,
 * validation, and sanitization functionality as required by task 2.3.
 */

import { EventEmitter } from 'events';
import { MidiManager, MidiError, MidiErrorType } from './midiManager';
import { MidiMessage, MidiMessageType, MIDI_CONSTANTS } from './midiTypes';

// Mock the midi module to avoid requiring actual MIDI hardware
jest.mock('midi', () => {
  class MockInput extends EventEmitter {
    private portCount: number = 0;
    private portNames: string[] = [];
    private isOpen: boolean = false;

    constructor() {
      super();
    }

    getPortCount(): number {
      return this.portCount;
    }

    getPortName(index: number): string {
      return this.portNames[index] || `Mock MIDI Device ${index}`;
    }

    openPort(index: number): void {
      if (index < 0 || index >= this.portCount) {
        throw new Error('Invalid port index');
      }
      this.isOpen = true;
    }

    closePort(): void {
      this.isOpen = false;
    }

    // Test helper methods
    setMockDevices(devices: string[]): void {
      this.portNames = devices;
      this.portCount = devices.length;
    }

    simulateMidiMessage(deltaTime: number, message: number[]): void {
      if (this.isOpen) {
        this.emit('message', deltaTime, message);
      }
    }
  }

  return {
    Input: MockInput
  };
});

describe('MidiManager - Message Processing and Parsing', () => {
  let midiManager: MidiManager;
  let mockInput: any;

  beforeEach(() => {
    midiManager = new MidiManager();
    // Access the mock input for testing
    const midi = require('midi');
    mockInput = new midi.Input();
  });

  afterEach(() => {
    midiManager.dispose();
  });

  describe('MIDI Message Parsing', () => {
    describe('Note On Messages', () => {
      test('should parse valid Note On message correctly', (done) => {
        const expectedMessage: Partial<MidiMessage> = {
          type: MidiMessageType.NOTE_ON,
          channel: 1,
          note: 60, // Middle C
          velocity: 100
        };

        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(expectedMessage.type);
          expect(message.channel).toBe(expectedMessage.channel);
          expect(message.note).toBe(expectedMessage.note);
          expect(message.velocity).toBe(expectedMessage.velocity);
          expect(message.timestamp).toBeGreaterThan(0);
          done();
        });

        // Simulate Note On message: status byte (0x90 = Note On, channel 0), note 60, velocity 100
        const rawMessage = [0x90, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should parse Note On with zero velocity as Note Off', (done) => {
        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(MidiMessageType.NOTE_OFF);
          expect(message.channel).toBe(5);
          expect(message.note).toBe(72);
          expect(message.velocity).toBe(0);
          done();
        });

        // Note On with velocity 0 on channel 5 (0x94 = 0x90 + 4)
        const rawMessage = [0x94, 72, 0];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should handle different MIDI channels correctly', (done) => {
        const testCases = [
          { statusByte: 0x90, expectedChannel: 1 },  // Channel 0 -> 1
          { statusByte: 0x95, expectedChannel: 6 },  // Channel 5 -> 6
          { statusByte: 0x9F, expectedChannel: 16 }, // Channel 15 -> 16
        ];

        let testIndex = 0;

        midiManager.on('message', (message: MidiMessage) => {
          const testCase = testCases[testIndex];
          expect(message.channel).toBe(testCase.expectedChannel);
          
          testIndex++;
          if (testIndex < testCases.length) {
            // Process next test case
            const nextCase = testCases[testIndex];
            const rawMessage = [nextCase.statusByte, 60, 100];
            (midiManager as any).handleMidiMessage(0, rawMessage);
          } else {
            done();
          }
        });

        // Start with first test case
        const firstCase = testCases[0];
        const rawMessage = [firstCase.statusByte, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should validate note range and reject invalid notes', () => {
        const invalidNoteCases = [
          [0x90, -1, 100],   // Note below minimum
          [0x90, 128, 100],  // Note above maximum
          [0x90, 60.5, 100], // Non-integer note
        ];

        invalidNoteCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });

      test('should validate velocity range and reject invalid velocities', () => {
        const invalidVelocityCases = [
          [0x90, 60, -1],    // Velocity below minimum
          [0x90, 60, 128],   // Velocity above maximum
          [0x90, 60, 100.5], // Non-integer velocity
        ];

        invalidVelocityCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });
    });

    describe('Note Off Messages', () => {
      test('should parse valid Note Off message correctly', (done) => {
        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(MidiMessageType.NOTE_OFF);
          expect(message.channel).toBe(3);
          expect(message.note).toBe(64);
          expect(message.velocity).toBe(64);
          done();
        });

        // Note Off message: 0x82 = Note Off on channel 2 (0-indexed)
        const rawMessage = [0x82, 64, 64];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });
    });

    describe('Control Change Messages', () => {
      test('should parse valid Control Change message correctly', (done) => {
        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(MidiMessageType.CONTROL_CHANGE);
          expect(message.channel).toBe(1);
          expect(message.controller).toBe(7); // Volume controller
          expect(message.value).toBe(127);
          expect(message.note).toBeUndefined();
          expect(message.velocity).toBeUndefined();
          done();
        });

        // Control Change message: 0xB0 = CC on channel 0
        const rawMessage = [0xB0, 7, 127];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should validate controller range and reject invalid controllers', () => {
        const invalidControllerCases = [
          [0xB0, -1, 64],    // Controller below minimum
          [0xB0, 128, 64],   // Controller above maximum
          [0xB0, 7.5, 64],   // Non-integer controller
        ];

        invalidControllerCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });

      test('should validate control value range and reject invalid values', () => {
        const invalidValueCases = [
          [0xB0, 7, -1],     // Value below minimum
          [0xB0, 7, 128],    // Value above maximum
          [0xB0, 7, 64.5],   // Non-integer value
        ];

        invalidValueCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });
    });

    describe('Program Change Messages', () => {
      test('should parse valid Program Change message correctly', (done) => {
        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(MidiMessageType.PROGRAM_CHANGE);
          expect(message.channel).toBe(10);
          expect(message.value).toBe(42);
          expect(message.note).toBeUndefined();
          expect(message.velocity).toBeUndefined();
          expect(message.controller).toBeUndefined();
          done();
        });

        // Program Change message: 0xC9 = PC on channel 9 (0-indexed)
        const rawMessage = [0xC9, 42];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should validate program value range and reject invalid values', () => {
        const invalidProgramCases = [
          [0xC0, -1],      // Program below minimum
          [0xC0, 128],     // Program above maximum
          [0xC0, 42.5],    // Non-integer program
        ];

        invalidProgramCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });
    });

    describe('Message Validation and Sanitization', () => {
      test('should reject messages with insufficient data bytes', () => {
        const insufficientDataCases = [
          [0x90],           // Note On with no data bytes
          [0x90, 60],       // Note On with only note, no velocity
          [0xB0],           // Control Change with no data bytes
          [0xB0, 7],        // Control Change with only controller, no value
          [0xC0],           // Program Change with no data byte
          [],               // Empty message
        ];

        insufficientDataCases.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });

      test('should reject messages with invalid channel range', () => {
        // Manually create invalid channel scenarios (this is theoretical since 
        // MIDI channels are always 0-15 in the status byte)
        const invalidChannelMessage = [0x90, 60, 100]; // Valid message
        
        // Test the channel validation function directly
        const { isValidMidiChannel } = require('./midiTypes');
        expect(isValidMidiChannel(0)).toBe(false);   // Channel 0 is invalid (should be 1-16)
        expect(isValidMidiChannel(17)).toBe(false);  // Channel 17 is invalid
        expect(isValidMidiChannel(1)).toBe(true);    // Channel 1 is valid
        expect(isValidMidiChannel(16)).toBe(true);   // Channel 16 is valid
      });

      test('should reject unsupported message types', () => {
        const unsupportedMessageTypes = [
          [0xA0, 60, 100],  // Polyphonic Key Pressure (not supported)
          [0xD0, 100],      // Channel Pressure (not supported)
          [0xE0, 0, 64],    // Pitch Bend (not supported)
          [0xF0, 0x7E],     // System Exclusive (not supported)
        ];

        unsupportedMessageTypes.forEach(rawMessage => {
          const result = (midiManager as any).parseMidiMessage(rawMessage);
          expect(result).toBeNull();
        });
      });

      test('should include timestamp in all parsed messages', (done) => {
        const startTime = Date.now();
        
        midiManager.on('message', (message: MidiMessage) => {
          expect(message.timestamp).toBeGreaterThanOrEqual(startTime);
          expect(message.timestamp).toBeLessThanOrEqual(Date.now());
          done();
        });

        const rawMessage = [0x90, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });
    });

    describe('Error Handling', () => {
      test('should continue processing after invalid messages', (done) => {
        let messageReceived = false;

        midiManager.on('message', (message: MidiMessage) => {
          expect(message.type).toBe(MidiMessageType.NOTE_ON);
          messageReceived = true;
          done();
        });

        // First send an invalid message (should be silently ignored)
        const invalidMessage: number[] = []; // Empty message
        (midiManager as any).handleMidiMessage(0, invalidMessage);

        // Then send a valid message to ensure processing continues
        setTimeout(() => {
          const validMessage = [0x90, 60, 100];
          (midiManager as any).handleMidiMessage(0, validMessage);
        }, 10);
      });

      test('should handle parsing errors gracefully', () => {
        // Mock the parseMidiMessage method to throw an error
        const originalParseMidiMessage = (midiManager as any).parseMidiMessage;
        (midiManager as any).parseMidiMessage = jest.fn(() => {
          throw new Error('Parsing error');
        });

        let errorEmitted = false;
        midiManager.on('error', (error: MidiError) => {
          expect(error.type).toBe(MidiErrorType.INVALID_MESSAGE);
          expect(error.message).toContain('Failed to parse MIDI message');
          errorEmitted = true;
        });

        const rawMessage = [0x90, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);

        expect(errorEmitted).toBe(true);

        // Restore original method
        (midiManager as any).parseMidiMessage = originalParseMidiMessage;
      });
    });

    describe('Event-Driven Message Handling', () => {
      test('should emit message events for valid MIDI messages', (done) => {
        let messageCount = 0;
        const expectedMessages = 3;

        midiManager.on('message', (message: MidiMessage) => {
          messageCount++;
          expect(message).toBeDefined();
          expect(message.timestamp).toBeGreaterThan(0);
          
          if (messageCount === expectedMessages) {
            done();
          }
        });

        // Send multiple messages
        const messages = [
          [0x90, 60, 100], // Note On
          [0x80, 60, 64],  // Note Off
          [0xB0, 7, 127],  // Control Change
        ];

        messages.forEach((message, index) => {
          setTimeout(() => {
            (midiManager as any).handleMidiMessage(0, message);
          }, index * 10);
        });
      });

      test('should support multiple event listeners', (done) => {
        let listener1Called = false;
        let listener2Called = false;

        midiManager.on('message', (message: MidiMessage) => {
          listener1Called = true;
          checkCompletion();
        });

        midiManager.on('message', (message: MidiMessage) => {
          listener2Called = true;
          checkCompletion();
        });

        function checkCompletion() {
          if (listener1Called && listener2Called) {
            done();
          }
        }

        const rawMessage = [0x90, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);
      });

      test('should handle event listener removal', () => {
        let messageReceived = false;

        const listener = (message: MidiMessage) => {
          messageReceived = true;
        };

        midiManager.on('message', listener);
        midiManager.removeListener('message', listener);

        const rawMessage = [0x90, 60, 100];
        (midiManager as any).handleMidiMessage(0, rawMessage);

        // Give some time for the event to potentially fire
        setTimeout(() => {
          expect(messageReceived).toBe(false);
        }, 50);
      });
    });
  });

  describe('MIDI Constants and Validation', () => {
    test('should have correct MIDI constants defined', () => {
      expect(MIDI_CONSTANTS.NOTE_OFF_STATUS).toBe(0x80);
      expect(MIDI_CONSTANTS.NOTE_ON_STATUS).toBe(0x90);
      expect(MIDI_CONSTANTS.CONTROL_CHANGE_STATUS).toBe(0xB0);
      expect(MIDI_CONSTANTS.PROGRAM_CHANGE_STATUS).toBe(0xC0);
      
      expect(MIDI_CONSTANTS.MIN_CHANNEL).toBe(1);
      expect(MIDI_CONSTANTS.MAX_CHANNEL).toBe(16);
      expect(MIDI_CONSTANTS.MIN_NOTE).toBe(0);
      expect(MIDI_CONSTANTS.MAX_NOTE).toBe(127);
      expect(MIDI_CONSTANTS.MIN_VELOCITY).toBe(0);
      expect(MIDI_CONSTANTS.MAX_VELOCITY).toBe(127);
    });

    test('should validate MIDI ranges correctly', () => {
      const { 
        isValidMidiChannel, 
        isValidMidiNote, 
        isValidMidiVelocity, 
        isValidMidiController 
      } = require('./midiTypes');

      // Test channel validation
      expect(isValidMidiChannel(1)).toBe(true);
      expect(isValidMidiChannel(16)).toBe(true);
      expect(isValidMidiChannel(0)).toBe(false);
      expect(isValidMidiChannel(17)).toBe(false);

      // Test note validation
      expect(isValidMidiNote(0)).toBe(true);
      expect(isValidMidiNote(127)).toBe(true);
      expect(isValidMidiNote(-1)).toBe(false);
      expect(isValidMidiNote(128)).toBe(false);

      // Test velocity validation
      expect(isValidMidiVelocity(0)).toBe(true);
      expect(isValidMidiVelocity(127)).toBe(true);
      expect(isValidMidiVelocity(-1)).toBe(false);
      expect(isValidMidiVelocity(128)).toBe(false);

      // Test controller validation
      expect(isValidMidiController(0)).toBe(true);
      expect(isValidMidiController(127)).toBe(true);
      expect(isValidMidiController(-1)).toBe(false);
      expect(isValidMidiController(128)).toBe(false);
    });
  });
});