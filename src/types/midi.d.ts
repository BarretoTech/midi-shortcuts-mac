/**
 * Type declarations for the 'midi' npm package
 */

declare module 'midi' {
    import { EventEmitter } from 'events';

    export class Input extends EventEmitter {
        constructor();
        
        /**
         * Get the number of available MIDI input ports
         */
        getPortCount(): number;
        
        /**
         * Get the name of a MIDI input port
         * @param portNumber - The port number (0-based)
         */
        getPortName(portNumber: number): string;
        
        /**
         * Open a MIDI input port
         * @param portNumber - The port number to open
         */
        openPort(portNumber: number): void;
        
        /**
         * Open a virtual MIDI input port
         * @param portName - Name for the virtual port
         */
        openVirtualPort(portName: string): void;
        
        /**
         * Close the currently open MIDI input port
         */
        closePort(): void;
        
        /**
         * Check if a port is open
         */
        isPortOpen(): boolean;
        
        /**
         * Set whether to ignore MIDI timing messages
         * @param ignore - Whether to ignore timing messages
         */
        ignoreTypes(sysex: boolean, timing: boolean, activeSensing: boolean): void;
        
        // EventEmitter events
        on(event: 'message', listener: (deltaTime: number, message: number[]) => void): this;
        on(event: string, listener: (...args: any[]) => void): this;
    }

    export class Output {
        constructor();
        
        /**
         * Get the number of available MIDI output ports
         */
        getPortCount(): number;
        
        /**
         * Get the name of a MIDI output port
         * @param portNumber - The port number (0-based)
         */
        getPortName(portNumber: number): string;
        
        /**
         * Open a MIDI output port
         * @param portNumber - The port number to open
         */
        openPort(portNumber: number): void;
        
        /**
         * Open a virtual MIDI output port
         * @param portName - Name for the virtual port
         */
        openVirtualPort(portName: string): void;
        
        /**
         * Close the currently open MIDI output port
         */
        closePort(): void;
        
        /**
         * Check if a port is open
         */
        isPortOpen(): boolean;
        
        /**
         * Send a MIDI message
         * @param message - Array of MIDI message bytes
         */
        sendMessage(message: number[]): void;
    }
}