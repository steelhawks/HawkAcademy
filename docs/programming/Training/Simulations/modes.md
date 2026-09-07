---
sidebar_position: 3
---

# Real, Replay, & Sim Modes

The robot codebase supports three distinct operating modes: **REAL**, **SIM**, and **REPLAY**. These modes control how the robot interacts with hardware, simulation physics, or logged data.

## Mode Overview

| Mode | Description | Use Case |
|------|-------------|----------|
| **REAL** | Runs on physical robot hardware | Competition, practice, hardware testing |
| **SIM** | Runs physics simulation (MapleSim/IronMaple) | Development, algorithm testing without hardware |
| **REPLAY** | Replays recorded WPILOG data | Post-match analysis, debugging a specific issue against real recorded data |

## Architecture

### Mode Detection (`Constants.java`)

```java
public enum Mode {
    REAL,
    SIM,
    REPLAY
}

public enum RobotType {
    OMEGABOT,
    ALPHABOT,
    CHASSIS,
    LAST_YEAR,
    TEST_BOARD,
    SIMBOT
}
```

The active mode is determined by `Constants.getMode()`:

```java
public static Mode getMode() {
    return switch (ROBOT_TYPE) {
        case ALPHABOT, OMEGABOT, CHASSIS, LAST_YEAR, TEST_BOARD ->
            RobotBase.isReal() ? Mode.REAL : Mode.REPLAY;
        case SIMBOT -> Mode.SIM;
    };
}
```

- **SIMBOT** → Always runs in `SIM` mode
- **Physical robot types** → Runs `REAL` on hardware, `REPLAY` in simulation (no hardware detected)

### Configuration (`RobotConfig.java`)

`RobotConfig.getConfig()` is what actually decides which factory gets used, and the selection isn't purely mode-based — it checks **mode first, then robot type**:

```java
public static RobotConfig getConfig() {
    if (Constants.getMode() == Mode.REPLAY) {
        return getReplayConfig(); // Always ReplayFactory, regardless of robot type
    }

    return switch (Constants.getRobot()) {
        case OMEGABOT -> /* ... */ .withFactory(new OmegaBotFactory()).build();
        case ALPHABOT -> /* ... */ .withFactory(new AlphaBotFactory()).build();
        case CHASSIS  -> /* ... */ .withFactory(new ChassisBotFactory()).build();
        case LAST_YEAR -> /* ... */ .withFactory(new LastYearFactory()).build();
        case TEST_BOARD -> /* ... */ .withFactory(new TestBoardFactory()).build();
        case SIMBOT -> /* ... */ .withFactory(new SimBotFactory()).build();
    };
}
```

In other words: **every physical robot type has its own real-hardware factory**, but if the mode resolves to `REPLAY` (see Mode Detection above — a real robot type running with no hardware detected), `ReplayFactory` is used instead no matter which robot type was selected.

| Factory | Used When | IO Implementations |
|---------|-----------|-------------------|
| `OmegaBotFactory` | `ROBOT = OMEGABOT`, on real hardware | Hardware (TalonFX, Pigeon2, PhotonVision, etc.) |
| `AlphaBotFactory` | `ROBOT = ALPHABOT`, on real hardware | Hardware |
| `ChassisBotFactory` | `ROBOT = CHASSIS`, on real hardware | Hardware |
| `LastYearFactory` | `ROBOT = LAST_YEAR`, on real hardware | Hardware |
| `TestBoardFactory` | `ROBOT = TEST_BOARD`, on real hardware | Mix — real TalonFX for Flywheel/Turret, but a simulated swerve drivetrain since the test board has no real chassis |
| `SimBotFactory` | `ROBOT = SIMBOT` | Physics sim for every subsystem (`ModuleIOSim`, `GyroIOSim`, `FlywheelIOSim`, `TurretIOSim`, `HoodIOSim`, `IntakeIOSim`, `IndexerIOSim`) |
| `ReplayFactory` | `Constants.getMode() == Mode.REPLAY` (any robot type) | Empty/no-op IO — data comes entirely from the log |

## Running Each Mode

### 1. REAL Mode (Physical Robot)

**Setup:**
```java
// Constants.java - Line 44
private static final RobotType ROBOT = RobotType.OMEGABOT;  // or ALPHABOT, CHASSIS, etc.
```

**Deploy:**
```bash
./gradlew deploy
```
Or use the WPILib VS Code extension: `WPILib: Deploy Robot Code`

**Behavior:**
- Logs to `/home/lvuser/logs` on roboRIO
- Publishes to NetworkTables (when not on FMS)
- Uses hardware IO implementations (TalonFX, Pigeon2, PhotonVision, etc.)
- Power distribution logging enabled

### 2. SIM Mode (Physics Simulation)

**Setup:**
```java
// Constants.java - Line 54-57
private static final RobotType ROBOT_TYPE =
    isCI() ? RobotType.SIMBOT : ROBOT;  // Set ROBOT = RobotType.SIMBOT for local sim
```

**Run Simulation:**
```bash
./gradlew simulateJava
```
Or in VS Code: `WPILib: Simulate Robot Code`

**Behavior:**
- Uses MapleSim/IronMaple for physics (SwerveDriveSimulation)
- Logs to NetworkTables (viewable in AdvantageScope)
- Simulates all subsystems: swerve, flywheel, turret, hood, intake, indexer, vision
- `simulationInit()` resets pose to (3, 3) on field
- Runs at real-time speed (unless `setUseTiming(false)` is called)

**Key Simulation Components:**
- `Swerve.getDriveSimulation()` → IronMaple SwerveDriveSimulation
- `ModuleIOSim` / `GyroIOSim` → Simulated module/gyro IO
- `FlywheelIOSim`, `TurretIOSim`, `HoodIOSim` → DCMotorSim-based physics
- `VisionIOPhotonSim` → PhotonVision simulator with AprilTag fields
- `ObjectVisionSim` → Simulated object detection

### 3. REPLAY Mode (Log Replay)

**Setup:**
```java
// Constants.java - Set to robot type you want to replay
private static final RobotType ROBOT = RobotType.OMEGABOT;
```

**Run Replay:**
```bash
./gradlew simulateJava
```

The log path comes from `LogFileUtil.findReplayLog()`, which checks (in order):
1. The `AKIT_LOG_PATH` environment variable, if set
2. The log file currently open in AdvantageScope (read from a temp file AdvantageScope writes)
3. A prompt in the terminal asking you to type/paste a path

This is **not** "grab the newest file in a folder" — if none of the above resolve to a path, you'll be asked for one interactively, so a plain `./gradlew simulateJava` with no log open in AdvantageScope and no env var set will just sit there waiting on stdin.

**Auto-rerunning replay with `replayWatch`:**
```bash
./gradlew replayWatch
```
This is a dedicated Gradle task (`org.littletonrobotics.junction.ReplayWatch`) that resolves the log path once (same env var / AdvantageScope lookup as above), runs `./gradlew simulateJava` against it immediately, and then watches your `src/` directory — every time you save a file, it automatically reruns the replay against that same log. Useful when you're trying to fix a bug by repeatedly replaying the same match log while you edit code.

**Behavior:**
- Runs **as fast as possible** (`setUseTiming(false)`)
- Reads from a `.wpilog` file via `WPILOGReader`, set as the replay source with `Logger.setReplaySource(...)`
- Writes replay output to a new log (`_sim` suffix) via `WPILOGWriter`
- Uses `ReplayFactory` with empty IO implementations (data comes from log, via `Logger.processInputs()`'s `fromLog()` path)
- Useful for: post-match analysis, debugging a specific bug against real recorded data, AdvantageScope visualization

## Subsystem IO Pattern

Each subsystem defines an `IO` interface with multiple implementations:

```java
// Example: Flywheel
public interface FlywheelIO { ... }
public class FlywheelIOTalonFX implements FlywheelIO { ... }  // REAL
public class FlywheelIOSim implements FlywheelIO { ... }      // SIM
// REPLAY uses anonymous empty implementation: new FlywheelIO() {}
```

**Factories inject the correct implementation:**
- `OmegaBotFactory` → `FlywheelIOTalonFX`
- `SimBotFactory` → `FlywheelIOSim`
- `ReplayFactory` → `new FlywheelIO() {}`

## CI / GitHub Actions

The repo has a real GitHub Actions workflow at `.github/workflows/build.yml`, but it's simpler than "runs the simulation":

```yaml
runs-on: ubuntu-latest
container: wpilib/roborio-cross-ubuntu:2024-22.04
steps:
  - uses: actions/checkout@v4
  - run: chmod +x gradlew
  - run: ./gradlew build
```

It only compiles the project (`./gradlew build`) on every push and pull request — it does **not** run `simulateJava` or actually start the physics simulation. This still catches real problems: an IO interface with a missing `default` method, a factory that doesn't compile, or a broken import will fail CI before it ever reaches a PR review.

The `isCI()` check in `Constants.java` (`System.getenv("CI") != null`) forces `ROBOT_TYPE` to `SIMBOT` whenever it's set, which matters because most CI environments set a `CI` environment variable automatically. This exists so that a plain `./gradlew build` compiles against `SimBotFactory`'s code paths rather than whatever `RobotType` a developer happened to leave selected locally — but since CI never actually executes `robotInit()`, this mostly matters if you ever extend the workflow to run tests or `simulateJava` in the future.

## AdvantageScope Integration

| Mode | Data Source | AdvantageScope View |
|------|-------------|---------------------|
| REAL | NetworkTables (NT4Publisher) | Live robot data |
| SIM | NetworkTables (NT4Publisher) | Simulated robot + physics viz |
| REPLAY | `.wpilog` file opened in AdvantageScope | Historical match data |

The relationship runs both ways: not only can you open a `.wpilog` in AdvantageScope to view it, but if that same log is open in AdvantageScope when you run `./gradlew simulateJava` in REPLAY mode, `LogFileUtil.findReplayLog()` will pick it up automatically as the replay source — no need to pass a path manually.

## Quick Reference

| Task | Command / Action |
|------|------------------|
| Deploy to robot | `./gradlew deploy` |
| Run simulation | `./gradlew simulateJava` (with `ROBOT = RobotType.SIMBOT`) |
| Run replay | `./gradlew simulateJava` (with a real `RobotType` selected, and a log resolvable via `AKIT_LOG_PATH`/AdvantageScope/prompt) |
| Auto-rerun replay on save | `./gradlew replayWatch` |
| Change robot type | Edit `Constants.ROBOT` |
| Force sim mode | Set `ROBOT = RobotType.SIMBOT` |
| Point replay at a specific log | Set the `AKIT_LOG_PATH` environment variable to the `.wpilog` path |
| View logs | Open `.wpilog` in AdvantageScope |
| CI build check | Push to GitHub — compiles the project, does not run the simulator |

## Common Issues

| Issue | Solution |
|-------|----------|
| "Drive simulation not initialized" | Thrown by `Objects.requireNonNull(Swerve.getDriveSimulation(), ...)` in `RobotConfig` — happens if `RobotConfig.getConfig()` runs before `Swerve`'s static initializer has created `DRIVE_SIMULATION`. Make sure nothing references the swerve/gyro sim factories before that static block runs. |
| Replay hangs waiting for input | `LogFileUtil.findReplayLog()` found no `AKIT_LOG_PATH` env var and no log currently open in AdvantageScope, so it's blocking on a terminal prompt. Either set `AKIT_LOG_PATH`, open the log in AdvantageScope first, or type/paste the path when prompted. |
| SIM mode feels slow | This is expected — unlike REPLAY, SIM mode never calls `setUseTiming(false)`, so it intentionally runs at real time to behave like the real robot. If it's *unusually* slow, look for loop overruns (console warnings) rather than trying to disable timing. |
| Wrong robot config | Verify `Constants.ROBOT` matches the physical robot, and remember a real `RobotType` run through the simulator resolves to `REPLAY`, not `SIM` — set `ROBOT = RobotType.SIMBOT` if you actually want physics simulation. |

## Related Files

All of these (except the AdvantageKit library classes) live under `src/main/java/org/steelhawks/` in `Rebuilt2026`:

- `Constants.java` — Mode/RobotType enums, mode detection
- `Robot.java` — Logger setup per mode, `simulationInit`
- `RobotConfig.java` — Subsystem factories per mode/robot
- `Swerve.java` — MapleSim configuration, simulation periodic
- `*IOSim.java` — Simulation IO implementations
- `build.gradle` — `replayWatch` task definition
- `.github/workflows/build.yml` — CI compile check
- `LogFileUtil` / `ReplayWatch` (from `org.littletonrobotics.junction`, part of the AdvantageKit library itself) — replay log discovery and auto-rerun logic