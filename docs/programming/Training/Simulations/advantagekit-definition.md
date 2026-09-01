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
AdvantageKit shifts the paradigm of how robot state is handled through three core mechanics:

### 1. The IO Interface Pattern
Instead of subsystems talking directly to hardware (like calling TalonFX.getPosition() deep inside a method), every subsystem talks to an IO interface.

The interface defines a data class called inputs (annotated with @AutoLog).

Every 20ms tick, an updateInputs(InputsAutoLogged inputs) method fetches fresh values from hardware (or simulation, or a log).

The subsystem logic only reads from those inputs. It never touches raw hardware directly.

### 2. Zero-Allocation Logging and WPILOG Files
Instead of spamming NetworkTables with hundreds of individual strings and numbers, AdvantageKit collects all inputs and outputs into a structured format every single loop iteration and writes them directly to a binary .wpilog file stored locally on the RoboRIO's USB log drive.

Binary logging is hyper-efficient. It creates minimal garbage collection pressure in Java and handles massive amounts of data effortlessly.

### 3. Live Publishing to AdvantageScope
While the .wpilog file is being written locally on the robot, AdvantageKit selectively publishes data over NetworkTables using a compressed format so it can stream smoothly to AdvantageScope — our visualization tool of choice — without crashing the field radio.

## Where AdvantageKit lives in our code
You can see AdvantageKit initialized right at the entry point of our robot code. Open up `Robot.java` in `src/main/java/frc/robot/`:

```java
// Robot.java — AdvantageKit initialization
Logger.recordMetadata("RuntimeEnvironment", getMode().toString()); // Set metadata
if (isReal()) {
    Logger.addDataReceiver(new WPILOGWriter("/U/logs")); // Log to USB stick on real robot
    Logger.addDataReceiver(new NT4Publisher());          // Publish to NetworkTables for live viewing
} else if (isSimulation()) {
    Logger.addDataReceiver(new WPILOGWriter("logs/"));   // Log to local folder in sim
    Logger.addDataReceiver(new NT4Publisher());          // Publish to NT4 in sim
} else {
    // REPLAY MODE: We don't write new logs; we read an old one!
    setUseTiming(false); // Run as fast as possible during replay
    String logPath = LogFileUtil.findReplayLog();
    Logger.addDataReceiver(new WPILOGReader(logPath));   // Feed saved log into inputs
}

Logger.start(); // Start the logger!
```

This single block of code dictates how our robot adapts to its environment. Depending on whether Constants.getMode() returns REAL, SIM, or REPLAY, AdvantageKit swaps out its data receivers entirely.

- Real Robot: Writes to a USB drive (/U/logs) and publishes to NetworkTables.

- Simulation: Writes to a local project folder and publishes to NetworkTables.

- Replay: Turns off real-time waiting (setUseTiming(false)), opens a .wpilog file via WPILOGReader, and pushes historical sensor data straight into our subsystem inputs as if the robot were right there on the field.

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