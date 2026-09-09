---
sidebar_position: 1
title: "Phoenix Tuner X"
---

import Note from '@site/src/components/Note.jsx'

# A Comprehensive Guide to Phoenix Tuner 

Phoenix Tuner X is CTRE's cross-platform configuration and diagnostics tool for CAN devices including Talon FX, Talon SRX, Victor SPX, CANcoder, Pigeon IMU, and CANdle. It runs on Windows, macOS, Linux, and in the browser.

## Installation

### Desktop Application (Recommended)

1. Open Microsoft Store (only available on windows)
2. Search Phoenix Tuner
3. Click install and accept any agreements
<Note>
Phoenix Tuner is available on MacOS through the apple store, however there is a fee of $3.99. If you are incapable of purchasing it that's fine, when needed just borrow a windows computer. 
</Note>

## Initial Setup

1. **Launch Phoenix Tuner X**
2. **Accept the license agreement**
3. **Configure device discovery** (Settings → Device Discovery):
   - Enable "Auto-discover devices"
   - Set discovery timeout (default 5s is fine)
   - Enable "Scan for CANivore devices" if using CANivore

## Connecting to the Robot

### USB Connection (Direct)

**Best for:** Prototype testing, initial configuration, firmware updates

1. Connect the robot's roboRIO to your computer via USB (uses USB-b)
2. In Phoenix Tuner X, click **"Connect"** → **"USB"**
3. Select your roboRIO from the list (shows team number)
4. Click **"Connect"**

**Troubleshooting USB:**
- Ensure roboRIO imaging is complete
- Check Windows Device Manager for "National Instruments RIO" device
- Try different USB cable/port
- Restart roboRIO if not detected

### Wireless Connection (Network)

**Best for:** Field testing, competition, when USB isn't practical

**Prerequisites:**
- Robot and computer on same network (radio in AP mode or connected to same WiFi)

1. In Phoenix Tuner X, click **"Connect"** → **"Network"**
2. Enter team number (`2601`)
3. Click **"Connect"**

<Note>
Usually, when on the robot wifi, your driverstation will be connected, so we usually use Phoenix Tuner through driverstation
</Note>


**Troubleshooting Wireless:**
- Ping the roboRIO: `ping roborio-1234-frc.local`
- Disable VPN/firewall temporarily
- Ensure "Client Isolation" is OFF on radio
- Try wired ethernet to radio for stability

### CANivore Connection

For CANivore users (USB or Ethernet):

1. Connect CANivore via USB to computer, OR
2. Connect CANivore via Ethernet to network
3. In Tuner: **"Connect"** → **"CANivore"**
4. Select device and connect

## Navigating the Interface

### Main Areas

| Area | Purpose |
|------|---------|
| **Device Tree** (left) | Hierarchical view of all discovered CAN devices |
| **Device Details** (center) | Selected device's config, status, plots |
| **Plotter** (bottom) | Real-time graphs of motor/device data |
| **Toolbar** (top) | Connection, firmware, tools, settings |

### Device Tree Organization

```
roboRIO-1234 (or CANivore)
├── CAN Bus 0 (RIO)
│   ├── Talon FX [1] "Left Drive"
│   ├── Talon FX [2] "Right Drive"
│   └── CANcoder [3] "Elevator"
├── CAN Bus 1 (CANivore)
│   └── Talon FX [4] "Shooter"
└── Pigeon IMU [5] "Gyro"
```

## Viewing Motors, CAN Buses, and CAN Devices

### Device Tree Overview

- **Bold** = device online and responding
- **Gray/italic** = device previously seen but currently offline
- **Badge colors** indicate status (see Color Guide below)

### Filtering and Search

- **Search box** (top of device tree): Filter by name, ID, or type
- **Bus filter**: Show only specific CAN bus
- **Type filter**: Show only motor controllers, sensors, etc.

### Device Details Tabs

When you select a device, tabs appear:

| Tab | Content |
|-----|---------|
| **Overview** | Quick status, firmware, device info |
| **Configs** | All configurable parameters (grouped) |
| **Plots** | Real-time telemetry graphs |
| **Self-Test** | Diagnostic results |
- **Firmware** | Firmware management |

### CAN Bus Diagnostics

Select a **CAN Bus** node in the tree to see:
- Bus utilization percentage
- Error frame count
- Device count per bus
- Signal quality indicators

## Setting Motor Control Method

### Via Configs Tab

1. Select a motor controller (Talon FX, Talon SRX, Victor SPX)
2. Go to **Configs** tab
3. Expand **"Motor Output"** or **"General"** section
4. Find **"Control Mode"** or **"Control Request Type"**
5. Select desired mode:
   - **Duty Cycle** (-1 to 1, open-loop voltage)
   - **Velocity** (rotations/sec, closed-loop)
   - **Position** (rotations, closed-loop)
   - **Voltage** (volts, compensated)
   - **Torque Current** (amps, FOC - Talon FX only)
   - **Motion Magic** (S-curve motion profiling)
   - **Follower** (follow another device)

### Applying Changes

- **Individual config**: Click the pencil icon → edit → checkmark to save
- **Bulk edit**: Shift-click multiple devices → edit common configs
- **Config groups**: Use "Apply to All" for identical devices

## Testing Prototypes & Direct Motor Control

### Control Panel (Best for Quick Testing)

1. Select a motor controller
2. Click **"Control"** tab (or "Control Panel" button)
3. Choose **Control Mode** dropdown
4. Use slider or input box to command output
5. **Enable** checkbox must be checked to drive motor

**Safety Features:**
- **Deadband**: Ignore small inputs
- **Ramp Rate**: Limit acceleration
- **Max Output**: Clamp maximum command
- **Timeout**: Auto-disable if no updates received

### Plotter for Validation

While controlling:
1. Open **Plotter** (bottom panel)
2. Add signals: `Motor Output`, `Velocity`, `Position`, `Supply Current`, `Torque Current`
3. Observe real-time response
4. Use **"Capture"** to save data snapshot

### Multi-Motor Testing

1. Shift-click multiple motors in device tree
2. Click **"Control"** → opens synchronized control panel
3. Use **"Gang"** mode to command all identically
4. Or control individually with linked sliders

### Example: Testing a Drivetrain Prototype

```text
1. Connect via USB
2. Select both drive Talon FXs
3. Control Panel → Duty Cycle mode
4. Enable both
5. Ramp from 0 → 0.5 → 1.0 → -1.0
6. Watch Plotter: Velocity, Current, Bus Voltage
7. Verify: symmetric response, no brownouts, expected current draw
```

## Blinking Motors (LED Identification)

### Single Motor Blink

1. Right-click motor in device tree
2. Select **"Blink"** or press `Ctrl+B` (Windows/Linux) / `Cmd+B` (Mac)
3. Motor LED blinks **green** rapidly for 10 seconds
4. Press again to stop early

### Blink Multiple Motors

1. Select multiple motors (Shift/Ctrl+click)
2. Right-click → **"Blink Selected"**
3. All selected motors blink simultaneously

### Blink Patterns Meaning

| Pattern | Meaning |
|---------|---------|
| **Fast Green** | Blink command active (identification) |
| **Slow Green (1Hz)** | Device enabled, no faults |
| **Fast Orange** | Firmware update in progress |
| **Double Orange** | Bootloader mode |
| **Red** | Hardware fault (overtemp, short, etc.) |
| **Alternating Red/Green** | CAN bus error / duplicate ID |

## Color Guide: Motor & CAN Bus Status LEDs

### Talon FX / Talon SRX / Victor SPX LED

| Color | Pattern | Status |
|-------|---------|--------|
| **Green** | Solid | Enabled, healthy, output > 5% |
| **Green** | Slow blink (1Hz) | Enabled, healthy, output < 5% |
| **Green** | Fast blink (10Hz) | Blink identification active |
| **Orange** | Solid | Disabled (not enabled), healthy |
| **Orange** | Slow blink | Disabled, sticky fault present |
| **Orange** | Fast blink | Firmware updating |
| **Orange** | Double blink | Bootloader mode |
| **Red** | Solid | Hardware fault (overtemp, overcurrent, short) |
| **Red** | Slow blink | Sticky fault latched |
| **Red/Green** | Alternating | CAN bus error / duplicate CAN ID |
| **Off** | - | No power / not initialized |

### CANcoder LED

| Color | Pattern | Status |
|-------|---------|--------|
| **Green** | Solid | Healthy, magnet detected |
| **Green** | Slow blink | Healthy, no magnet (or weak) |
| **Orange** | Solid | Bootloader |
| **Orange** | Fast blink | Firmware update |
| **Red** | Solid | Hardware fault |
| **Red/Green** | Alternating | CAN error / duplicate ID |

### Pigeon 2.0 / Pigeon IMU LED

| Color | Pattern | Status |
|-------|---------|--------|
| **Green** | Solid | Healthy, calibrated |
| **Green** | Slow blink | Healthy, not calibrated |
| **Orange** | Fast blink | Firmware update |
| **Red** | Solid | Fault (check self-test) |
| **Red/Green** | Alternating | CAN error |

### CANdle LED

| Color | Pattern | Status |
|-------|---------|--------|
| **Green** | Solid | Healthy |
| **Orange** | Fast blink | Firmware update |
| **Red** | Solid | Fault |
| **RGB** | Custom | User-controlled (animation) |

### CAN Bus Status (in Tuner Device Tree)

| Badge Color | Meaning |
|-------------|---------|
| **Green** | Bus healthy, < 5% error frames |
| **Yellow** | Bus degraded, 5-20% error frames |
| **Red** | Bus critical, > 20% error frames |
| **Gray** | Bus offline / no devices |

### Device Status Badges (Next to Device Name)

| Badge | Meaning |
|-------|---------|
| **Green dot** | Online, no faults |
| **Yellow triangle** | Online, sticky faults present |
| **Red triangle** | Online, active hardware faults |
| **Gray dot** | Offline (was seen, now missing) |
| **Blue "U"** | Firmware update available |
| **Orange "B"** | Bootloader mode |

## Advanced Tips

### Firmware Management

1. Select device(s) → **Firmware** tab
2. **"Check for Updates"** - compares to latest
3. **"Update Firmware"** - downloads and flashes
4. **CRITICAL**: Do not power off during update!
5. Verify: LED fast orange → solid green on success



### Field-Upgradable Devices

| Device | Field Upgradable? |
|--------|-------------------|
| Talon FX | Yes (via CAN) |
| Talon SRX | Yes (via CAN) |
| Victor SPX | Yes (via CAN) |
| CANcoder | Yes (via CAN) |
| Pigeon 2.0 | Yes (via CAN) |
| Pigeon IMU | No (requires USB) |
| CANdle | Yes (via CAN) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Blink selected device(s) |
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + R` | Refresh device tree |
| `Ctrl/Cmd + S` | Save configs (burn flash) |
| `Space` | Toggle enable in Control Panel |
| `↑/↓` | Adjust control output (in Control Panel) |

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No devices found | Wrong CAN bus selected | Check bus in device tree |
| Devices gray | No power / CAN wiring | Check 12V, CAN wires, termination |
| Red LED on motor | Hardware fault | Check self-test tab for details |
| "Duplicate ID" error | Two devices same CAN ID | Blink to ID, change ID in configs |
| USB not connecting | Driver issue / roboRIO not ready | Reimage roboRIO, check Device Manager |
| Wireless timeout | Network isolation / firewall | Disable VPN, check radio settings |
| Configs not saving | Not burned to flash | Click burn flash icon |
| Plotter empty | Signals not selected | Add signals in plotter config |

## Resources

- [Phoenix 6 Documentation](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/index.html)
---

*Last updated for Phoenix 6 / Tuner X 2024+*