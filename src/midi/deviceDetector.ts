/**
 * MIDI Device Detector
 * 
 * This module provides utilities for detecting and monitoring MIDI device
 * availability and changes in the system.
 */

import { EventEmitter } from 'events';
import { MidiDevice } from './midiTypes';
import { MidiManager, MidiError, MidiErrorType } from './midiManager';

/**
 * Interface for device detector events
 */
export interface DeviceDetectorEvents {
    'devicesChanged': (devices: MidiDevice[]) => void;
    'deviceAdded': (device: MidiDevice) => void;
    'deviceRemoved': (device: MidiDevice) => void;
    'error': (error: MidiError) => void;
}

/**
 * Device Detector class for monitoring MIDI device availability
 */
export class DeviceDetector extends EventEmitter {
    private midiManager: MidiManager;
    private lastKnownDevices: MidiDevice[] = [];
    private monitoringInterval: NodeJS.Timeout | null = null;
    private isMonitoring: boolean = false;

    constructor(midiManager: MidiManager) {
        super();
        this.midiManager = midiManager;
    }

    /**
     * Start monitoring for device changes
     * @param intervalMs - Polling interval in milliseconds (default: 2000)
     */
    public startMonitoring(intervalMs: number = 2000): void {
        if (this.isMonitoring) {
            return; // Already monitoring
        }

        this.isMonitoring = true;

        // Initial device detection
        this.detectAndCompareDevices();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.detectAndCompareDevices();
        }, intervalMs);
    }

    /**
     * Stop monitoring for device changes
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return; // Not monitoring
        }

        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Get the current monitoring status
     * @returns True if monitoring, false otherwise
     */
    public isCurrentlyMonitoring(): boolean {
        return this.isMonitoring;
    }

    /**
     * Get the last known list of devices
     * @returns Array of last detected devices
     */
    public getLastKnownDevices(): MidiDevice[] {
        return [...this.lastKnownDevices];
    }

    /**
     * Manually trigger device detection and comparison
     * @returns Promise resolving to current devices
     */
    public async refreshDevices(): Promise<MidiDevice[]> {
        return this.detectAndCompareDevices();
    }

    /**
     * Detect devices and compare with last known state
     * @returns Promise resolving to current devices
     */
    private async detectAndCompareDevices(): Promise<MidiDevice[]> {
        try {
            const currentDevices = await this.midiManager.detectDevices();
            
            // Compare with last known devices
            const changes = this.compareDeviceLists(this.lastKnownDevices, currentDevices);
            
            // Emit events for changes
            if (changes.added.length > 0 || changes.removed.length > 0) {
                this.emit('devicesChanged', currentDevices);
                
                changes.added.forEach(device => {
                    this.emit('deviceAdded', device);
                });
                
                changes.removed.forEach(device => {
                    this.emit('deviceRemoved', device);
                });
            }
            
            // Update last known devices
            this.lastKnownDevices = currentDevices;
            
            return currentDevices;
            
        } catch (error) {
            const midiError = error instanceof MidiError 
                ? error 
                : new MidiError(
                    MidiErrorType.UNKNOWN_ERROR,
                    'Failed to detect device changes',
                    error as Error
                );
            
            this.emit('error', midiError);
            return this.lastKnownDevices; // Return last known state on error
        }
    }

    /**
     * Compare two device lists and return added/removed devices
     * @param oldDevices - Previous device list
     * @param newDevices - Current device list
     * @returns Object containing added and removed devices
     */
    private compareDeviceLists(
        oldDevices: MidiDevice[], 
        newDevices: MidiDevice[]
    ): { added: MidiDevice[]; removed: MidiDevice[] } {
        const oldIds = new Set(oldDevices.map(device => device.id));
        const newIds = new Set(newDevices.map(device => device.id));
        
        const added = newDevices.filter(device => !oldIds.has(device.id));
        const removed = oldDevices.filter(device => !newIds.has(device.id));
        
        return { added, removed };
    }

    /**
     * Clean up resources when the detector is destroyed
     */
    public dispose(): void {
        this.stopMonitoring();
        this.removeAllListeners();
    }
}

// Type the EventEmitter properly
export interface DeviceDetector {
    on<K extends keyof DeviceDetectorEvents>(event: K, listener: DeviceDetectorEvents[K]): this;
    emit<K extends keyof DeviceDetectorEvents>(event: K, ...args: Parameters<DeviceDetectorEvents[K]>): boolean;
}