---
sidebar_position: 2
title: What is AdvantageKit?
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# What is AdvantageKit?

On the overview page we introduced AdvantageKit as the logging and simulation framework our entire codebase is built around. Now it’s time to look under the hood and see what it actually is, how it works, and why it changes everything about how we write and debug FRC code.

## The standard FRC logging problem

Normally, when teams want to log data in FRC, they do something like this:

```java
// Traditional logging — scattered all over subsystem periodic code
SmartDashboard.putNumber("Flywheel/Velocity", motor.getVelocity());
SmartDashboard.putNumber("Flywheel/AppliedVoltage", motor.getAppliedOutput());
```

This looks innocent enough, but it comes with massive hidden costs:

NetworkTables overhead: Every SmartDashboard or NetworkTableInstance call serializes data and dumps it over Wi-Fi to the driver station. If you log hundreds of signals at 50 Hz, you saturate the radio bandwidth, causing lag, dropped packets, and broken driver station connections.

Missing data: If you forgot to write a SmartDashboard.putNumber line for a specific internal variable, it’s gone forever. You can’t debug a problem you didn’t record.

No replay: A live log file on a driver station is usually just a lightweight collection of dashboard keys. You can look at graphs after a match, but you cannot feed that data back into your robot code to run a simulation or test a bug fix against what actually happened on the field.

AdvantageKit, created by FRC Team 6328 (Mechanical Advantage), was built to solve every single one of these problems from the ground up.

## How AdvantageKit works under the hood
AdvantageKit shifts the paradigm of how robot state is handled through four core mechanics:

### 1. The IO Interface Pattern
Instead of subsystems talking directly to hardware (like calling TalonFX.getPosition() deep inside a method), every subsystem talks to an IO interface.

The interface defines a data class called inputs (annotated with `@AutoLog`).

Every 20ms tick, an `updateInputs(InputsAutoLogged inputs)` method fetches fresh values from hardware (or simulation).

The subsystem logic only reads from those inputs. It never touches raw hardware directly.

### 2. `Logger.processInputs()` — the call that actually makes replay work
Filling in the inputs object isn't enough by itself &mdash; every subsystem's `periodic()` also has to hand that object to the logger, right after calling `updateInputs()`:

```java
// Indexer.java — periodic(), simplified from our real subsystem
@Override
public void periodic() {
    io.updateInputs(spindexerInputs, feederInputs);
    Logger.processInputs("Indexer/Spindexer/Inputs", spindexerInputs);
    Logger.processInputs("Indexer/Feeder/Inputs", feederInputs);
    // ...the rest of the subsystem's logic reads from spindexerInputs/feederInputs
}
```

`Logger.processInputs(key, inputs)` does one of two completely different things depending on the mode, and that's really the whole trick behind AdvantageKit:

- **On a real robot or in simulation**, `updateInputs()` just filled `inputs` with real (or simulated) values. `processInputs()` takes those values and logs them &mdash; calling the AutoLogged class's generated `toLog()` method to write every field to the `.wpilog` file and NT.
- **In replay**, the IO implementation passed in is an empty one (like `new IndexerIO() {}`), so `updateInputs()` did *nothing*. `processInputs()` instead calls the generated `fromLog()` method, which overwrites every field on `inputs` with the value recorded at that exact timestamp in the log file you're replaying.

Either way, by the time `periodic()` gets past that line, `spindexerInputs`/`feederInputs` hold correct data and the rest of the method has no idea (and doesn't need to know) where that data actually came from.

### 3. Zero-Allocation Logging and WPILOG Files
Instead of spamming NetworkTables with hundreds of individual strings and numbers, AdvantageKit collects all inputs and outputs into a structured format every single loop iteration and writes them directly to a binary `.wpilog` file.

Binary logging is hyper-efficient. It creates minimal garbage collection pressure in Java and handles massive amounts of data effortlessly.

### 4. Live Publishing to AdvantageScope
While the `.wpilog` file is being written, AdvantageKit can also publish data over NetworkTables (via an `NT4Publisher`) using a compressed format so it can stream smoothly to AdvantageScope — our visualization tool of choice — without crashing the field radio.

## Where AdvantageKit lives in our code
You can see AdvantageKit initialized right at the entry point of our robot code. This is pulled directly from `Robot.java` in our actual competition codebase (`org.steelhawks`, `Rebuilt2026`):

```java
// Robot.java — AdvantageKit initialization (robotInit)
Logger.recordMetadata("Robot", Constants.ROBOT_NAME);
Logger.recordMetadata("Robot Mode", Constants.getMode().toString());
Logger.recordMetadata("Robot Type", Constants.getRobot().toString());

switch (Constants.getMode()) {
    case REAL -> {
        // Running on a real robot, log to onboard storage
        Logger.addDataReceiver(new WPILOGWriter("/home/lvuser/logs"));
        if (!DriverStation.isFMSAttached()) {
            Logger.addDataReceiver(new NT4Publisher());
        }
        new PowerDistribution(
            Constants.POWER_DISTRIBUTION_CAN_ID, Constants.PD_MODULE_TYPE);
    }
    case SIM -> // Running a physics simulator, log to NT only
        Logger.addDataReceiver(new NT4Publisher());
    case REPLAY -> {
        // Replaying a log, set up replay source
        setUseTiming(false); // Run as fast as possible
        String logPath = LogFileUtil.findReplayLog();
        Logger.setReplaySource(new WPILOGReader(logPath));
        Logger.addDataReceiver(new WPILOGWriter(LogFileUtil.addPathSuffix(logPath, "_sim")));
    }
}

Logger.start();
```

We also record Git metadata (commit SHA, branch, build date, and whether there were uncommitted changes) before this switch statement, so every single log is permanently stamped with the exact version of code that produced it &mdash; useful when you're staring at a log from three weeks ago trying to figure out what changed since.

This single block of code dictates how our robot adapts to its environment. `Constants.getMode()` (not a WPILib `isReal()`/`isSimulation()` check) decides which branch runs, and AdvantageKit swaps its data receivers and replay source entirely based on it:

- **REAL**: Writes a `.wpilog` to onboard storage (`/home/lvuser/logs`), and only adds an `NT4Publisher` if the robot **isn't** connected to the field's FMS &mdash; the exact NetworkTables-bandwidth problem described earlier in this page is why that check exists. It also spins up a `PowerDistribution` object here, which enables logging of PDH/PDP current draw for free.
- **SIM**: Only publishes to NT4. Unlike a bare-bones AdvantageKit project, our SIM mode doesn't write its own `.wpilog` locally &mdash; live NT viewing in AdvantageScope is enough while you're iterating on your laptop.
- **REPLAY**: Turns off real-time waiting (`setUseTiming(false)`) so the replay runs as fast as your CPU allows, points `Logger.setReplaySource(...)` at an old `.wpilog` file (note this is a *replay source*, not a data receiver &mdash; it's what feeds `fromLog()` calls during replay), and also registers a **new** `WPILOGWriter` with a `_sim` suffix so any newly computed outputs from this replay run get saved to their own log for comparison in AdvantageScope.

<Note title="A gotcha specific to our codebase: SIM vs. REPLAY aren't chosen the way you'd expect">
`Constants.java` doesn't have a simple "sim mode" checkbox. Instead, you pick a `RobotType` (`OMEGABOT`, `ALPHABOT`, `SIMBOT`, etc.), and `getMode()` derives the `Mode` from it:

```java
public static Mode getMode() {
    return switch (ROBOT_TYPE) {
        case ALPHABOT, OMEGABOT, CHASSIS, LAST_YEAR, TEST_BOARD ->
            RobotBase.isReal() ? Mode.REAL : Mode.REPLAY;
        case SIMBOT -> Mode.SIM;
    };
}
```

Notice that picking a *real* robot type (like `OMEGABOT`) and then launching the WPILib simulator (`RobotBase.isReal()` is `false`) doesn't give you `Mode.SIM` &mdash; it gives you `Mode.REPLAY`! That's intentional: if you're not on real hardware and you haven't explicitly asked for a physics simulation, AdvantageKit assumes you're trying to replay an old log against that robot's real IO-less implementations. To actually get physics-based `Mode.SIM`, you have to set `ROBOT = RobotType.SIMBOT` at the top of `Constants.java` before launching the simulator.
</Note>

## Run it: simulating the AdvantageKit data loop
The simplified model below demonstrates how AdvantageKit abstracts data sources. Whether the input source is a physical motor sensor, a physics simulation calculation, or a row extracted from a .wpilog file, the subsystem logic processes it identically.

<JavaRunner starterCode={`public class Main {
static class ElevatorInputsAutoLogged {
public double positionMeters = 0.0;
public double appliedVoltage = 0.0;
}
// Subsystem logic doesn't care where inputs come from  it just processes them
static void subsystemPeriodic(ElevatorInputsAutoLogged inputs) {
    System.out.printf("Processing subsystem logic Position: %.2fm, Voltage: %.2fV%n", 
        inputs.positionMeters, inputs.appliedVoltage);
}

public static void main(String[] args) {
    // Mode 1: Simulated data source
    ElevatorInputsAutoLogged simInputs = new ElevatorInputsAutoLogged();
    simInputs.positionMeters = 0.45;
    simInputs.appliedVoltage = 6.0;
    
    System.out.println("--- Running in SIM Mode ---");
    subsystemPeriodic(simInputs);

    // Mode 2: Replay data source (reading from a past match log)
    ElevatorInputsAutoLogged replayInputs = new ElevatorInputsAutoLogged();
    replayInputs.positionMeters = 1.20; // Last week's match data at this timestamp
    replayInputs.appliedVoltage = 12.0;

    System.out.println("--- Running in REPLAY Mode ---");
    subsystemPeriodic(replayInputs);
}
}`}
/>

<Quiz questions={[
  {
    prompt: "What is the primary purpose of AdvantageKit's log replay framework in FRC?",
    options: [
      "To stream camera feeds to the driver station with lower latency",
      "To record all sensor and controller inputs so the exact same robot code behavior can be re-run in simulation later",
      "To automatically tune PID controllers by logging past values",
      "To replace the RoboRIO with a coprocessor for faster loop times"
    ],
    correct: 1,
    explanation: "AdvantageKit's main feature is deterministic log replay. By recording all inputs, you can replay a match in a simulator, step through code, and even change logic (like an auto routine) using real historical data."
  },
  {
    prompt: "Why does an AdvantageKit project separate subsystems into an IO interface and hardware-specific implementations (e.g., DriveIO and DriveIOTalonFX)?",
    options: [
      "Because Java requires all classes to implement at least one interface",
      "To allow the same subsystem code to run seamlessly on real hardware, a physics sim, or log replay by just swapping the IO implementation",
      "To increase the loop time by adding overhead to the CAN bus calls",
      "Because CTRE devices cannot be accessed directly in a subsystem"
    ],
    correct: 1,
    explanation: "The IO layer isolates the subsystem from hardware. During normal operation, it uses real hardware; during simulation, it uses a physics sim; and during log replay, the inputs are provided directly from the log file, bypassing the implementation entirely."
  },
  {
    prompt: "In our subsystem periodic() methods, what does Logger.processInputs(key, inputs) do differently during REPLAY compared to REAL or SIM?",
    options: [
      "Nothing — it behaves identically in every mode",
      "During REPLAY it calls the generated fromLog() method to overwrite inputs with values from the log file, instead of toLog()-ing values updateInputs() just produced",
      "During REPLAY it disables logging entirely to save CPU time",
      "During REPLAY it automatically rewinds the match timer to zero"
    ],
    correct: 1,
    explanation: "On a real robot or in sim, updateInputs() fills the inputs object and processInputs() logs (toLog()) it. In replay, the IO implementation is empty, so processInputs() instead reads (fromLog()) the values for that timestamp straight out of the log file — which is the actual mechanism that makes replay work."
  },
  {
    prompt: "Which application is primarily designed to visualize the .wpilog files generated by AdvantageKit?",
    options: [
      "AdvantageScope",
      "Phoenix Tuner X",
      "OutlineViewer",
      "The Driver Station charts tab"
    ],
    correct: 0,
    explanation: "AdvantageScope (also developed by Mechanical Advantage) is the companion app built to visualize AdvantageKit logs, supporting 3D field views, swerve modules, graphs, and even synchronized match video."
  },
  {
    prompt: "In an AdvantageKit IO interface, what does the @AutoLog annotation do when applied to the Inputs class?",
    options: [
      "It automatically drives the robot during the autonomous period",
      "It automatically commits the code to GitHub on every successful deploy",
      "It triggers an annotation processor to generate an 'AutoLogged' version of the class that handles writing/reading from the log file",
      "It prints all variables to the standard output console"
    ],
    correct: 2,
    explanation: "The @AutoLog annotation generates boilerplate code (like DriveIOInputsAutoLogged) that knows how to serialize and deserialize the inputs object to the logger, saving you from writing dozens of manual recordOutput() calls."
  },
  {
    prompt: "When writing a subsystem's periodic() method in an AdvantageKit project, how should you get the current position of a motor?",
    options: [
      "Call motor.getPosition() directly on the CAN motor controller object",
      "Read it from NetworkTables using SmartDashboard.getNumber()",
      "Read it from the updated inputs object (e.g., inputs.motorPositionRad) which was refreshed at the top of periodic()",
      "You shouldn't read positions in periodic(), only in simulationPeriodic()"
    ],
    correct: 2,
    explanation: "In AdvantageKit, the subsystem never talks to the hardware directly. At the start of periodic(), it calls io.updateInputs(inputs) and logs them. The rest of the subsystem logic MUST read from the inputs object to ensure deterministic log replay works!"
  }
]} />