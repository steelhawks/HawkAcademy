---
sidebar_position: 2
---

import Note from '@site/src/components/Note.jsx'
import Caption from '@site/src/components/Caption'

# HawkForge

HawkForge is our desktop app for generating subsystem boilerplate. You point it at a robot project, walk through a five-step wizard, and it writes the whole AdvantageKit IO layer for you — the `IO` interface, the `IOTalonFX` hardware class, the `IOSim` stub, and the subsystem itself — then patches your constants, factory, and wiring files so the new subsystem is actually hooked up.

The point is to skip the 400 lines of copy-paste that every new subsystem starts with, and to make sure everyone's signal registration and constants follow the same pattern.

Source: [github.com/steelhawks/HawkForge](https://github.com/steelhawks/HawkForge)

## Installing

Grab the build for your platform from the [Releases page](https://github.com/steelhawks/HawkForge/releases):

| Platform | File |
|---|---|
| macOS Apple Silicon (M1–M4) | `HawkForge-darwin-arm64-*.zip` |
| macOS Intel | `HawkForge-darwin-x64-*.zip` |
| Windows | `HawkForge-Setup.exe` |
| Linux (Debian/Ubuntu) | `*.deb` |
| Linux (Fedora/RHEL) | `*.rpm` |

<Note title="macOS first launch">
The app isn't code-signed, so double-clicking gives you a "damaged / unidentified developer" warning. Right-click the app → **Open** → **Open** the first time. After that it launches normally.
</Note>

Windows builds auto-update through Squirrel on launch. On macOS and Linux you re-download when a new release drops.

## Opening a project

Click **Open FRC Project** and select your robot project root — the folder with `build.gradle` in it, not `src` and not the package folder.

HawkForge scans `src/main/java` and reads four files to figure out what your project looks like:

| File | What it reads |
|---|---|
| `Constants.java` | Robot types (`OMEGABOT`, `ALPHABOT`, `SIMBOT`, …) |
| `Subsystems.java` | The existing subsystem list and their canonical order |
| `RobotConfig.java` | Robot variants and their factory classes |
| `SubsystemConstants.java` | Which variants have constants classes, and current values |

The dashboard then lists every subsystem it found, in order, with the variants that have constants for it. The top bar has a refresh button to re-scan (use it after you've edited Java files outside the app) and **Change Project** to switch repos.

<Caption src="/img/hawkforge-dashboard.png" alt="HawkForge dashboard listing detected subsystems and their constants variants" caption="The dashboard after scanning a project. Each row shows the class name, the field name from Subsystems.java, and which robot variants have constants for it. Subsystems marked 'no constants' have no record in SubsystemConstants.java." />

A row showing `no constants` isn't an error — plenty of subsystems (vision, LEDs, pose estimation) have nothing to tune per robot. It just means there's no constants record for it, so there's nothing for **Edit Constants** to open.

<Note title="If the scan fails">
`No valid FRC Java project found at that path (missing src/main/java)` means you selected the wrong folder — you probably picked the repo's parent directory, or a subfolder. Select the folder containing `build.gradle`.

If the app opens but shows zero subsystems, `Subsystems.java` wasn't found or doesn't match the expected pattern. HawkForge is built around our robot code structure; it won't understand an arbitrary project.
</Note>

## Creating a subsystem

Click **New Subsystem** to launch the wizard. Nothing is written to disk until the last step, so click through freely.

### Step 1 — Basic Info

<Caption src="/img/hawkforge-basic-info.png" alt="Step 1 of the HawkForge wizard showing name, package path, mechanism type cards, and order position chips" caption="Step 1. The mechanism type you pick here decides the defaults for the next three steps, so it's worth getting right." />

- **Subsystem Name** — PascalCase, e.g. `Shooter`, `Hood`, `Elevator`. This drives every generated class name.
- **Package Path** — where it lives under `subsystems/`, e.g. `superstructure.shooter`. Files go in `subsystems/<path>/`.
- **Mechanism Type** — this isn't cosmetic. It pre-fills units, control modes, and which feedforward constants show up in later steps:

  | Type | What it sets up |
  |---|---|
  | Arm | Position control + gravity compensation (kG) |
  | Elevator | Linear position + gravity compensation |
  | Flywheel | Velocity control with kS + kV feedforward |
  | Turret | Rotation with Motion Magic, CANcoder fusion |
  | Intake | Position rack + open-loop roller control |
  | Indexer | Simple duty cycle / open-loop roller |
  | Generic | No opinionated defaults — fully custom |

  Pick the closest match even if it isn't exact; every default is editable in the steps that follow. Only reach for **Generic** when nothing else is close, since you'll be filling in everything by hand.

- **Units** — position (`rot`, `rad`, `°`, `m`) and velocity (`rot/s`, `rad/s`, `°/s`, `RPM`, `m/s`). Picking meters or m/s requires a mechanism radius so the generator can convert. Everything downstream — control function signatures, constants — is generated in the units you pick here.
- **Order Position** — where the subsystem lands in the canonical order. You pick from chips (`First`, `Between Swerve & PoseLink`, `Between Turret & Hood`, …) built from the subsystems already in the project, rather than typing an index. Every config file HawkForge patches inserts entries in this order, so put the new subsystem where it belongs logically — next to the mechanisms it works with.
- **Homing Sequence** *(toggle)* — generates `isHomed`/`isZeroed` flags and a skeleton stall-current homing loop in `periodic()`. Turn on for arms and elevators that need to zero against a hard stop; the actual current threshold logic is yours to fill in.
- **Subsystem Toggle** *(toggle)* — adds a `Toggles.<Name>.isEnabled` entry, guards `shouldRun` with it, and updates `Toggles.java`. Use this when you want to disable the mechanism from NetworkTables without redeploying.

### Step 2 — Motors & Sensors

Add each TalonFX with a **role** (camelCase — `leader`, `left`, `roller`). The role becomes the field name, the signal names, and the CAN ID key later, so name them like you'd name the variable.

Per motor: **Follower of** (leave empty for the leader; set it to the leader's role to make it a follower, plus **Opposed** if it's mirrored), **Gear Reduction** (rotor:output), **Inverted**, and **Brake Mode**.

External sensors are optional:

| Type | Use for |
|---|---|
| `CANcoder` | Absolute encoder over CAN — set **Fuse With Motor** for FusedCANcoder, plus RotorToSensor ratio and offset |
| `CANrange` | Time-of-flight distance sensor |
| `CANdi` | Dual digital input over CAN |
| `DigitalInput` | Limit switch or beam break on a roboRIO DIO channel |
| `None` | Reserved slot — no code generated |

### Step 3 — Controls

Pick the Phoenix 6 control modes the subsystem needs; each one you add becomes a public method on the subsystem. Available modes:

`DutyCycleOut` · `VoltageOut` · `TorqueCurrentFOC` · `PositionVoltage` · `PositionTorqueCurrentFOC` · `VelocityVoltage` · `VelocityTorqueCurrentFOC` · `MotionMagicVoltage` · `MotionMagicTorqueCurrentFOC` · `MotionMagicVelocityVoltage` · `MotionMagicVelocityTorqueCurrentFOC`

You can rename each generated function and edit its parameter list. Parameter types are unit-aware — they come out as WPILib `Measure` types matching the units you chose in Step 1.

Rough guide: position mechanisms (arm, elevator, turret) want `MotionMagicTorqueCurrentFOC`, velocity mechanisms (flywheel) want `VelocityTorqueCurrentFOC`, and dumb rollers want `DutyCycleOut` or `VoltageOut`.

### Step 4 — Constants

This step is per robot variant. Pick a variant on the left, fill in its values on the right, repeat.

- **Enabled** — an enabled variant gets a real `IOTalonFX` implementation from the factory. A disabled one gets `return null`, which is what you want for a robot that doesn't have this mechanism.
- **CAN Bus** — `kRioBus`, `kDrivetrainBus`, `kTurretBus`, or a custom bus name.
- **Motor CAN IDs** — one per motor role.
- **Sensor IDs & Channels** — CAN IDs for CAN sensors, DIO channels for `DigitalInput`.
- **Constant values** — kP, kI, kD, kS, kV, kG, kA, Motion Magic cruise/acceleration, and any mechanism-specific fields. These are strings, so `Rotation2d.fromDegrees(90)` is valid, not just numbers.

Gains get wired as `LoggedTunableNumber`s, so you can tune them live and then copy the good values back here.

### Step 5 — Review & Generate

You get a diff preview of every file, plus checkboxes for which ones to actually write:

- `<Name>IO.java` — the interface with `@AutoLog` inputs for every motor and sensor
- `<Name>IOTalonFX.java` — hardware implementation with full Phoenix 6 signal setup
- `<Name>IOSim.java` — simulation stub built on `DCMotorSim`
- `<Name>.java` — the subsystem: `periodic()`, tunable numbers, your control functions

Plus patches to `SubsystemConstants.java` (the constants record and per-variant instances), `Subsystems.java` (field, setter, accessor), `RobotConfig.java` (factory entries), and `RobotContainer.java` (default command binding).

Read the diffs before you hit **Generate**. It's a code generator, not a code reviewer — it will happily generate something that compiles but is wrong for your mechanism.

<Note title="It won't clobber your work">
Every patch is guarded: if a subsystem with that name already appears in the target file, HawkForge skips that insertion instead of duplicating or overwriting it. Insertions go in at the correct canonical position rather than being appended at the end.

That said — commit before you generate. It's a lot of files at once, and `git diff` is the fastest way to see exactly what changed.
</Note>

## Editing constants later

Tuned your gains on the practice field and want them in the code? Select the subsystem on the dashboard, click **Edit Constants**, change values per variant, and **Save Constants**. This only touches `SubsystemConstants.java` — the IO files are left alone, so nothing you've hand-written gets regenerated.

This is the right way to add a new robot variant's values to an existing subsystem too.

## The signal pattern it generates

Everything HawkForge writes follows the same Phoenix 6 pattern we use across the codebase — worth understanding, since you'll be reading and extending this code:

```java
// Constructor
ParentDevice.optimizeBusUtilizationForAll(leaderMotor, followerMotor);

// Feedback signals (position + velocity) at 250 Hz for closed-loop mechanisms
BaseStatusSignal.setUpdateFrequencyForAll(250, leaderPosition, leaderVelocity, ...);
// Telemetry at 100 Hz
BaseStatusSignal.setUpdateFrequencyForAll(100, leaderVoltage, leaderSupplyCurrent, ...);

// Registered for central refresh — note there is no refreshAll in updateInputs
PhoenixUtil.registerSignals(bus, leaderPosition, leaderVelocity, ...);

// updateInputs — signals are already refreshed by PhoenixUtil.refreshAll()
inputs.leaderConnected = BaseStatusSignal.isAllGood(leaderPosition, leaderVelocity, ...);
```

Signals are registered centrally and refreshed once per loop by `PhoenixUtil.refreshAll()`, so individual subsystems never call `refreshAll` themselves. If you add signals by hand later, register them the same way.

## After generating

1. Build the project — `@AutoLog` needs an annotation-processor pass to produce the `IOInputsAutoLogged` classes.
2. Fill in the `IOSim` stub with a real moment of inertia and gearing if you're going to sim the mechanism.
3. Fill in the homing loop if you enabled homing — the generated version is a skeleton.
4. Bind real commands in `RobotContainer` — the generated binding is just a default command.

## Working on HawkForge itself

```bash
git clone https://github.com/steelhawks/HawkForge
cd HawkForge
npm install
npm start        # Electron with hot-reload renderer
```

Stack is Electron 42, Vite 5, React 18, TypeScript, and Tailwind. The parts that matter:

| File | Purpose |
|---|---|
| `src/main/scanner.ts` | Parses a project to find subsystems, variants, constants |
| `src/main/generator.ts` | Generates the four Java files |
| `src/main/updater.ts` | Patches existing Java files |
| `src/types.ts` | Shared TypeScript interfaces |
| `src/components/wizard/` | The five-step wizard UI |

Releases go out through GitHub Actions — `npm run release:patch`, `release:minor`, or `release:major` bumps the version, tags, pushes, and the workflow builds and publishes installers for all platforms.
