/**
 * Demo script for testing MIDI Manager functionality
 * 
 * This script can be run manually to test MIDI device detection and connection.
 * Run with: node out/midi/demo.js
 */

import { MidiManager, MidiError } from './midiManager';
import { DeviceDetector } from './deviceDetector';

async function runDemo() {
    console.log('🎹 MIDI Manager Demo Starting...\n');

    const midiManager = new MidiManager();
    const deviceDetector = new DeviceDetector(midiManager);

    // Set up event listeners
    midiManager.on('message', (message) => {
        console.log('📨 MIDI Message:', {
            type: message.type,
            channel: message.channel,
            note: message.note,
            velocity: message.velocity,
            controller: message.controller,
            value: message.value,
            timestamp: new Date(message.timestamp).toISOString()
        });
    });

    midiManager.on('deviceConnected', (device) => {
        console.log('🔌 Device Connected:', device.name);
    });

    midiManager.on('deviceDisconnected', (device) => {
        console.log('🔌 Device Disconnected:', device.name);
    });

    midiManager.on('error', (error: MidiError) => {
        console.error('❌ MIDI Error:', error.type, '-', error.message);
    });

    deviceDetector.on('deviceAdded', (device) => {
        console.log('➕ Device Added:', device.name);
    });

    deviceDetector.on('deviceRemoved', (device) => {
        console.log('➖ Device Removed:', device.name);
    });

    try {
        // Test device detection
        console.log('🔍 Detecting MIDI devices...');
        const devices = await midiManager.detectDevices();
        
        if (devices.length === 0) {
            console.log('ℹ️  No MIDI devices found. Connect a MIDI device and try again.');
        } else {
            console.log(`✅ Found ${devices.length} MIDI device(s):`);
            devices.forEach((device, index) => {
                console.log(`  ${index + 1}. ${device.name} (ID: ${device.id})`);
            });

            // Try to connect to the first device
            if (devices.length > 0) {
                console.log(`\n🔗 Attempting to connect to: ${devices[0].name}`);
                
                try {
                    await midiManager.connectToDevice(devices[0].id);
                    console.log('✅ Successfully connected!');
                    console.log('🎵 Play some notes on your MIDI device to see messages...');
                    
                    // Start device monitoring
                    console.log('👀 Starting device monitoring...');
                    deviceDetector.startMonitoring(3000);
                    
                    // Keep the demo running for 30 seconds
                    console.log('⏱️  Demo will run for 30 seconds...\n');
                    
                    setTimeout(() => {
                        console.log('\n⏹️  Demo ending...');
                        deviceDetector.stopMonitoring();
                        midiManager.disconnect();
                        midiManager.dispose();
                        deviceDetector.dispose();
                        console.log('👋 Demo completed!');
                        process.exit(0);
                    }, 30000);
                    
                } catch (error) {
                    console.error('❌ Failed to connect to device:', error);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error during device detection:', error);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Demo interrupted. Cleaning up...');
    process.exit(0);
});

// Run the demo
runDemo().catch(console.error);