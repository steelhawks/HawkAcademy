---
sidebar_position: 1
---

# 2026 Programming Reference

> **This is a conversion from our Google Docs version. To see the original click** [here](https://docs.google.com/document/d/1cYESccVNGiP9auOqsNPCvrLDYXkARsxuzas-YJPPSfU/edit?usp=sharing)

---

## Basic Hardware

The [WPILib docs](https://docs.wpilib.org) have explanations for each piece of hardware on the robot. The ones important for this section are below; however, you should be aware of all or most electrical components:

- **RoboRIO** — The brain of the robot. The code gets deployed here and it contains many ports one should know about (see next section).
- **Battery** — The power source for all devices on the robot.
  - 12 volts is optimal. Anything below that may cause a dip in performance and anything above may cause better performance. If the battery reaches ~11.7 volts while driving, it should be changed.
- **Radio** — Allows the robot to connect to a laptop wirelessly.
  - When using a radio, you must make sure it is configured for our team to use. The WPILib docs describe how to configure a radio.
  - When competing, you will have to reconfigure the radio to work at that competition venue. You will not be able to use your radio for personal use unless you reconfigure it at home.
- **Motor controllers** — These connect to motors and manage them.

---

## Basic Software and Installation Guide

Robotics requires a bunch of software including game tools, Driver Station, VS Code, and many other tools useful for coding the robot, checking IDs, debugging, and more.

Three very important things to install:

- WPILib and the subsequent IDE (VS Code) that accompanies it
- FRC Game Tools — includes the driver station needed to run the robot
- Phoenix Tuner

---

## RoboRIO Ports

The roboRIO may appear intimidating at first glance, but not all its ports and pins are important to know at first.

### DIO (Digital Input/Output)

Anything plugged into this strip receives a digital signal. A digital signal can only take one of two values (usually 1 or 0) — also called a binary signal. For instance, a button gives a digital signal: 1 represents pressed and 0 represents unpressed. Sensors that give digital signals are plugged in here.

### PWM (Pulse-Width Modulation)

PWM is for components that receive a range of power (e.g. a motor). PWM switches between periods of delivering power and not delivering power to achieve an overall power level.

| Duty Cycle | Behavior |
|---|---|
| 25% | 25% on, 75% off — low power |
| 50% | Equal on/off — medium power |
| 75% | 75% on, 25% off — high power |

Although motor controllers can be connected to the PWM, this is not usually done. The PWM can only send signals to motors to set them to specific speeds. CAN (discussed below) is a better alternative to PWM for motors.

In code, sensors and components are referred to by their port number on the roboRIO.

The small symbols on the bottom of these strips — `s`, `v`, and an arrow — stand for **signal**, **voltage** (power), and **ground**. Components will only work when wired in the correct order.

### USB-B Connector

On the top of the roboRIO is a USB-B connector. This connects to the robot with a wired connection instead of a radio. During competitions, a wire is used to connect to the robot in the pit because the radio is configured for the field.

---

## CAN Bus

CAN (Controller Area Networks) allows electrical components (most commonly motors) to communicate on the same network. More data can be sent over a CAN network, such as current limiting (required for swerve drive). Pneumatics must also be controlled with a CAN bus.

CAN wires start from the roboRIO. Along the way, the CAN bus loop connects to motors and electrical components. CAN wires are green and yellow wires twisted together. Optionally, CTRE's **CANivore** can be used, which allows CAN FD and provides more bandwidth.

Unlike PWM devices (identified by port number), CAN devices have their own unique **ID**. You can view and change IDs using **Phoenix Tuner** for CTRE devices. For REV devices, use their software.

---

## Control Theory

**Control theory** is a field of control engineering and applied mathematics that deals with the control of dynamical systems. The objective is to develop a model or algorithm governing system inputs to drive the system to a desired state, while minimizing delay, overshoot, or steady-state error.

There are two types of control loops:

### Open-Loop (Feedforward)

A feedforward controller moves independently of current factors or the "process output." A good example is a central heating boiler controlled only by a timer — heat is applied for a constant time regardless of the building temperature.

### Closed-Loop (Feedback)

A feedback controller depends on the process output. In the boiler analogy, this would include a thermostat to monitor the building temperature and feed back a signal so the controller maintains the set temperature.

Some systems use both feedback and feedforward controllers together.

### Key Terms

| Term | Definition |
|---|---|
| **Setpoint / Reference** | The goal output of the mechanism |
| **Output** | The current output of the mechanism |
| **Error** | The difference between setpoint and output |
| **Steady-State Error** | A phenomenon where the error flatlines; the output gets stuck below the setpoint |

> **Useful resource:** [Controls Engineering in FRC (book)](https://file.tavsys.net/control/controls-engineering-in-frc.pdf)

---

## Feedback Control (PID)

One of the most common feedback algorithms is the **PID algorithm**.

```java
u(t) = Kp * e(t) + Ki * ∫e(τ)dτ + Kd * de(t)/dt
```

There are 3 parameters that must be tuned by the programmer:

- **kP (Proportional)** — Attempts to drive the position error to zero by contributing to the control signal proportionally to the current position error. Intuitively, this tries to move the output towards the reference.
- **kI (Integral)** — Attempts to drive the total accumulated error to zero by contributing to the control signal proportionally to the sum of all past errors. Intuitively, this tries to drive the average of all past output values towards the average of all past reference values.
- **kD (Derivative)** — Attempts to drive the velocity error to zero by contributing to the control signal proportionally to the derivative of the error. Intuitively, this tries to make the output move at the same rate as the error.

### Steady-State Error

The steady-state error is the error in the PID loop that does not change — the output never reaches enough speed to hit the setpoint.

:::warning
It is strongly discouraged to use the **kI** term for FRC. Use a feedforward controller instead (discussed below).
:::

### Integral Windup

Integral windup occurs when the integral sums up errors that are far from the setpoint, causing the system to overshoot or "windup." Use an **integrator range** to prevent this — it prevents kI from summing errors until your output is within a certain range of the setpoint.

### When to Use PID

PID controllers are used to control either the **position** of a mechanism or its **speed**.

- Elevator position → position PID
- Flywheel → velocity PID
- kD is usually not needed for a velocity PID controller

### Response Types

| Response | Behavior |
|---|---|
| **Underdamped** | Overshoots setpoint, oscillates |
| **Overdamped** | Approaches slowly, never overshoots |
| **Critically damped** | Reaches setpoint quickly without overshoot — **ideal** |

### Tuning Steps

1. Set I and D to zero. Set P to a conservative value (0.1 is usually a good start).
2. Increase P until you have slight oscillations.
3. Increase D until the oscillations stop.
4. If there's steady-state error, use a feedforward controller or increase I until you reach the goal in time. You may need to decrease P or increase D after adding I.

:::tip
When tuning PID values, do not redeploy code every time you make a change. Instead, use **Shuffleboard's UI** to change values in test mode.
:::

SysID can also be used to get PID values automatically, but they may need fine-tuning afterward. For niche PID loops (like auto-balance or auto-align), hand tuning is required.

---

## Feedforward Control

Feedback control is **reactionary** — it only responds when the system is below a setpoint. A **feedforward controller** provides physical constants about a system's dynamics so controls can react quicker and more efficiently.

If a system is disturbed (e.g. a car climbing a hill), feedback detects the deviation and compensates. Feedforward and feedback are most effective when combined.

WPILib provides formulas for common mechanisms:

- **Simple motor** — For a single motor
- **Arm feedforward** — For arms with friction, inertia, and loads
- **Elevator feedforward** — For elevators with friction, inertia, and loads

### Simple Motor Feedforward

```java
V = Ks * sgn(d') + Kv * d' + Ka * d''
```

Where:
- `V` — Required voltage
- `d'` — Velocity
- `d''` — Acceleration
- **kS** (volts) — Voltage to overcome static friction (minimum voltage to get the motor spinning)
- **kV** (volts·s/distance = volts/velocity) — Voltage to cruise at a constant velocity
- **kA** (volts·s²/distance = volts/acceleration) — Voltage to induce a given acceleration

### Elevator Feedforward

```java
V = Kg + Ks * sgn(d') + Kv * d' + Ka * d''
```

Adds **kG** — the voltage to hold the elevator in place, counteracting gravity.

### Arm Feedforward

```java
V = Kg * cos(θ) + Ks * sgn(θ') + Kv * θ' + Ka * θ''
```

Adds **theta (θ)** — the angle of the arm. kG is multiplied by `cos(θ)` because an arm rotates.

### Calculating Feedforward Constants

Use **SysId** (WPILib's system identification tool) to run routines on your mechanism and calculate kS, kV, kA, and kG. Another tool is [recalc](https://www.reca.lc/), but it cannot find kS, so SysId is generally better.

:::note
Feedforward control is effective for setting motors to a specific **speed**, but cannot control **position** directly. Use motion profiles for position control.
:::

---

## Motion Profiles

Motion profiling is a motion planning technique used to generate smooth trajectories for robotic mechanisms. It defines how velocity, acceleration, and position change over time while adhering to physical constraints.

Motion profiles are typically used for mechanisms like arms, elevators, and drivetrains where jerky movements can cause mechanical wear or loss of control.

### Triangular Motion Profile

Contains 2 phases — same magnitude of acceleration in opposite directions. The maximum velocity is achieved for only an instant. The profile is always accelerating.

> Triangular motion profiles are **not** typically used in FRC.

### Trapezoidal Motion Profile

The most commonly used profile in FRC. Divided into 3 phases:

1. **Acceleration phase**
2. **Constant velocity phase**
3. **Deceleration phase**

Trapezoidal profiles typically have quick acceleration times and longer periods of constant velocity.

### S-Curve Motion Profile

Aimed at reducing **jerk** (the rate of change of acceleration). S-curves smooth the transition between acceleration, constant velocity, and deceleration phases by gradually ramping acceleration up and down.

| Jerk Percent | Notes | Peak Acceleration |
|---|---|---|
| **0%** | Acceleration is always constant. Equivalent to a Trapezoidal profile. | As specified by user |
| **50%** | Acceleration is ramping 50% of the time, constant 50% of the time. | 133% of user value |
| **100%** | Acceleration is ramping 100% of the time, never constant. | 200% of user value |

#### S-Curve in Code (CTRE TalonFX)

The S-curve is not implemented via WPILib's `ProfiledPIDController`. Instead, it is offloaded to the motor controller firmware (TalonFX), where trajectory generation including jerk limiting is computed on the device.

The key method is `.withMotionMagicJerk()`:

```java
motorConfig
    .withSlot0(
        new Slot0Configs()
            .withGravityType(GravityTypeValue.Elevator_Static)
            .withKS(ElevatorConstants.CORAL_KS)
            .withKG(ElevatorConstants.CORAL_KG)
            .withKV(ElevatorConstants.CORAL_KV)
            .withKP(ElevatorConstants.CORAL_KP)
            .withKI(ElevatorConstants.CORAL_KI)
            .withKD(ElevatorConstants.CORAL_KD))
    .withFeedback(
        new FeedbackConfigs()
            .withSensorToMechanismRatio(ElevatorConstants.GEAR_RATIO))
    .withMotionMagic(
        new MotionMagicConfigs()
            .withMotionMagicCruiseVelocity(ElevatorConstants.MAX_VELOCITY_PER_SEC)
            .withMotionMagicAcceleration(ElevatorConstants.MAX_ACCELERATION_PER_SEC_SQUARED)
            .withMotionMagicJerk(ElevatorConstants.MAX_JERK_PER_SEC_CUBED)) // enables S-curve
    .withCurrentLimits(
        new CurrentLimitsConfigs()
            .withStatorCurrentLimit(80.0)
            .withStatorCurrentLimitEnable(true));
```

The `runPosition()` method sends a target position; the TalonFX computes the trajectory internally:

```java
@Override
public void runPosition(double positionRad) {
    mLeftMotor.setControl(
        motionMagic.withPosition(Units.radiansToRotations(positionRad)));
}
```

### Trapezoidal Profile (WPILib)

```java
TrapezoidProfile profile = new TrapezoidProfile(
    new TrapezoidProfile.Constraints(5, 10),  // max velocity=5, max accel=10
    new TrapezoidProfile.State(5, 0),          // end: 5 meters, 0 speed
    new TrapezoidProfile.State(0, 0));         // start: 0 meters, 0 speed
```

### Motion Profile Summary

| Profile | Jerk Management | Acceleration Shape | FRC Use Case |
|---|---|---|---|
| Triangle | None | Linear, abrupt | Theoretical — not used in practice |
| Trapezoid | None | Flat with sharp edges | Common default for FRC mechanisms |
| S-curve | Smoothed | Ramped (S-shape) | Best for precise, wear-sensitive tasks |

---

## Applications of Controllers

Feedback and feedforward controllers can be combined by simply adding their outputs together:

```java
motor.setVoltage(
    feedforward.calculate(velocitySetpoint)
    + PID.calculate(encoder.getRate(), velocitySetpoint));
```

:::tip
Whenever using feedforward (or both), use `setVoltage()` to ensure motors receive the exact voltage supplied.
:::

**PID units note:** PID control doesn't have specified units. When setting motor voltage, ensure your PID controller returns voltages. Change PID arguments to control the return unit.

When using a PID controller with a trapezoidal motion profile, use `ProfiledPIDController` from WPILib:

```java
// Constructing a ProfiledPIDController
ProfiledPIDController controller = new ProfiledPIDController(
    kP, kI, kD,
    new TrapezoidProfile.Constraints(maxVelocity, maxAcceleration));
```

> Note: The constraints are in the rate at which your input is changing — not necessarily m/s or m/s².

Additional resource: [WPILib Tuning Simulator](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-pid-controller.html)

---

## Command-Based Framework

We use a **command-based robot** because of its organized and clean nature. Command-based programming is a design pattern where "normal" periodic checking of conditions is replaced with setting up **events** that run when triggered.

### Subsystems and Commands

There are two main abstractions in a command-based robot:

- **Commands** — Represent actions the robot can take. Commands run when scheduled, until they are interrupted or their end condition is met.
- **Subsystems** — Represent a single mechanism (e.g. elevator, drivetrain). Every command is associated with a subsystem, and only one command may run on a subsystem at a time.

Subsystems contain most of the hardware complexity while commands use subsystem functions. Multiple commands can run simultaneously as long as they don't share a subsystem. Commands are handled by the `CommandScheduler`.

### Command Structure

A command has four methods:

| Method | Description |
|---|---|
| `initialize()` | Runs **once** when the command is scheduled |
| `execute()` | Runs **periodically** while the command is running |
| `end(boolean interrupted)` | Runs when the command ends. `interrupted` is true if stopped by another command. Usually calls `subsystem.stop()`. |
| `isFinished()` | Returns `true` when the command should finish |

To associate a command with a subsystem (prevents multiple commands on one subsystem):

```java
addRequirements(RobotContainer.m_subsystem);
```

> **Note:** When creating commands, they must extend `CommandBase`.

### Command Compositions

Commands can be chained together. Three very common compositions:

| Composition | Behavior |
|---|---|
| `parallelRaceGroup` | Runs multiple commands at the same time, ends all when **one** finishes |
| `sequentialCommandGroup` | Runs each command sequentially, next starts when previous ends |
| `parallelCommandGroup` | Runs all commands at the same time |

Other useful commands:
- **`waitCommand`** — Used in sequential groups to yield for a number of seconds
- **`ConditionalCommand()`** — Runs a command only under a certain condition (useful when you can't use `if` statements inline command groups)

### Subsystems

Subsystems follow **encapsulation** — hiding implementation complexity so using the subsystem in a command is simple. To create a subsystem, extend `SubsystemBase` and make all properties and helper methods `private`.

Subsystems have a `periodic()` method (runs every 20ms) used for sending info to Shuffleboard.

**Default commands** are always running and stop when another command is called on that subsystem. For example, a drivetrain should always run a manual drive command that stops when an autonomous drive command takes over.

### Binding Commands

```java
// Trigger once when button is pressed
button.onTrue(new MyCommand());

// Trigger while button is held
button.whileTrue(new MyCommand());

// Trigger when button is released
button.onFalse(new MyCommand());
```

### Structure of a Command-Based Robot

| File/Directory | Purpose |
|---|---|
| `Main.java` | Starts the robot program. Don't touch this. |
| `Robot.java` | Mostly empty. Creates `RobotContainer` and calls `CommandScheduler`. |
| `RobotContainer.java` | Creates subsystem instances, configures button bindings. |
| `Constants.java` | Stores all constant values: motor IDs, sensor ports, PID values, setpoints. All `public static final`. |
| `subsystems/` | All subsystem files |
| `commands/` | All command files, organized by subsystem |
| `vendordeps/` | External dependencies (PathPlanner, CTRE Phoenix, REV) |
| `build.gradle` | Contains the WPILib version — must be compatible with roboRIO |

#### Why Constants Matter

A constants file is important for two reasons:
1. Allows organized access to any number you want to change (motor speed, etc.)
2. Avoids **magic numbers** — numbers in code whose significance is not clear

### Special Subsystems and Commands

- `PIDSubsystems` / `PIDCommands` — Have built-in PID controllers (rarely used)
- `TrapezoidalProfileSubsystems` / commands — Not used very often
- `ProfiledPIDSubsystems` / controllers — Useful for motion-profile-based control

### Command Factories

For simpler commands, create a **command factory** — a method in the subsystem that returns a command. More convenient than a separate file for short commands.

```java
// In your subsystem
public Command stopCommand() {
    return runOnce(() -> stop());
}
```

### Instantiating Commands

Avoid using the `new` keyword directly for command groups (readability). Use WPILib's command factory methods instead.

---

## Odometry

Odometry estimates the robot's position on the field using sensors. Useful for:
- Adjusting shooter RPM based on distance to target
- Automating robot driving with short trajectories

WPILib uses **kinematics** — instantaneous wheel velocities over time — to estimate position. Over time this builds up error, which is why **vision processing** is often combined with odometry.

Calculating odometry returns a `Pose2d` — your x and y position from the origin.

> Because odometry builds up error over time, it is most accurate during the **autonomous period**, when accuracy is most critical.

To visualize odometry, use the **field2d widget** in Shuffleboard.

---

## Telemetry and Logging

Telemetry is the recording of information or data. Log files can be helpful for debugging.

- **Riolog** — The most basic form of logging. Shows print statements in VS Code. Not used in competitions.

### Data Logs

Data logs have entry keys and values, each timestamped in microseconds.

- `DataLogManager` — Manages data logging (good option but we use AdvantageKit instead)
- **AdvantageKit** — Our preferred logging framework due to its **log replay** abilities and "log everything" mindset. Logs can be saved to a flash drive.

To **visualize logs**, use **AdvantageScope** (a tool made by Team 6328).

### Elastic/Shuffleboard

Elastic/Shuffleboard is a dashboard for viewing robot state. Key notes:

- Prefer **AdvantageScope** for data analysis and testing
- **Elastic/Shuffleboard** should mainly be used for driver information during matches
- **Elastic** is the modern, preferred dashboard over Shuffleboard
- Use `SmartDashboard` to send data; use `Logger.recordOutput()` as a better alternative

### Network Tables

NetworkTables is the backbone for sending and receiving data between the laptop and driver station. We do **not** create `NetworkTables` instances explicitly in code — this section is for understanding data transfer.

---

## Vision

Vision is a critical component of odometry, enabling accurate robot positioning. We primarily use **Limelights** for their simplicity and seamless integration with WPILib through NetworkTables.

To integrate Limelight pose data, use **LimelightLib** for convenience (optional — Limelight auto-publishes to NetworkTables).

For advanced use cases, **PhotonVision** and **OpenCV** can be used for more complex object detection.

### Limelight

Limelight is a camera most notably used for its ease of use in setting up a vision system.

### PhotonVision

PhotonVision is a software vision system that can be used with various camera hardware for AprilTag detection and object tracking.

:::warning Vision + Odometry
Vision integration is essential. When a robot gets stuck (e.g., on a field obstacle), wheels continue to move causing false positional updates in odometry. Vision corrects this drift.
:::

---

## Simulation

Simulation runs and tests code without the physical robot via the **WPILib Simulator**.

WPILib provides useful classes:
- `Mechanism2d` — Visualizes mechanisms in simulation
- `DCMotorSim` — Simulates DC motor behavior

**AdvantageKit's interface-based system** allows replaying log files with 100% accuracy of real-world events — invaluable for debugging without hardware access.

### MapleSim

MapleSim is a physics-based simulation tool that can be used alongside WPILib simulation for more detailed mechanism modeling.

---

## Autonomous

Autonomous is the **15-second period** before teleoperation begins. Perfecting autonomous routines is crucial to being a competitive team.

We use:
- **PathPlannerLib** — To follow paths on the field and use its pathfinding tool to navigate to any pose
- **Choreo** — To generate and create trajectories

---

## AdvantageKit / AdvantageScope

**AdvantageKit** and its visualization tool **AdvantageScope** are essential for analyzing and debugging robot performance.

These tools allow for:
- **Data Logging** — Record telemetry and state information from the robot
- **Replay Functionality** — Recreate match scenarios with full fidelity for accurate debugging

AdvantageScope's interface provides real-time and post-match insights into subsystem behavior, sensor data, and control loops.

### Architecture

AdvantageKit uses an isolated structure with three layers:

| Layer | Purpose |
|---|---|
| **Subsystem class** | WPILIB subsystem with public interface and control logic |
| **IO Interface** | Defines all methods for interacting with hardware |
| **IO Implementation** | Implements the interface using vendor libraries (TalonFX/real, Sim, or No-op) |

Data logging of inputs should occur **between** the control logic and hardware interface — this ensures control logic can be replayed in the simulator.

```java
Subsystem (public interface → control logic) → IO (hardware interface → hardware implementation)
```

> For an example, see our **SwerveTemplate** and look at the `swerve/` subsystem.

---

## Extra Tips

WPILib provides plenty of [examples of mechanisms](https://github.com/wpilibsuite/allwpilib/tree/main/wpilibjExamples/src/main/java/edu/wpi/first/wpilibj/examples).

### Stalling Motors

If power is being applied to a motor but load prevents it from moving, it is **stalling**. Stalling quickly generates heat and can permanently destroy the motor. Treat immediately.

### Shooters

To build a shooter:

1. Add controllers to set the flywheel to any given RPM
2. Pick at least 5 field locations and find the correct flywheel RPM for each
3. Use an **interpolator** to calculate the correct RPM from any arbitrary field position

---

## Troubleshooting: Common Problems

### `com.ctre` is not resolved

External dependencies sometimes don't load properly even after a build (usually after cloning a repo). Fix: delete the vendor file causing issues, repaste it, then rebuild.

### Comms red on the driver station even though you're connected

- [ ] Make sure the driver station team number is **2601**
- [ ] Make sure your radio is configured to **2601** (not for a competition)
- [ ] Make sure your firewall is **off**
- [ ] Check the radio status lights — if something indicates a problem, try wiggling cables **lightly**
- [ ] Try power cycling the robot (off and on again)
- [ ] Try a different wire or radio
- [ ] If a new radio works, mark the old one as broken

### CommandScheduler loop overrun

Robot code runs every 20ms. If any part of the code takes over 20ms in one loop, you will get this error.

Usually caused by expensive calls. For example, in 2024, zeroing a CANcoder (which takes ~50ms) triggered this error almost every loop when called periodically.

:::danger
A loop overrun is **extremely dangerous** — important functions like swerve will not run, causing the robot to become unresponsive.
:::

**Debug:** The rio log shows how long each subsystem's `periodic()` takes. Use our custom `LoopTimeUtil` class to log execution times.

### Periodic Polling Too Slowly

In rare cases, `periodic()` may miss key state changes (e.g., an IR sensor missing a game piece intake at 20ms). **Fix:** Schedule a periodic function at a custom frequency.

### Inverting Motors

With the deprecation of `.setInverted()`, invert by running the motor in the **Clockwise** direction (TalonFX defaults to Counter-Clockwise Positive):

```java
TalonFXConfiguration config = new TalonFXConfiguration();
config.MotorOutput.Inverted =
    invert ? InvertedValue.Clockwise_Positive : InvertedValue.CounterClockwise_Positive;
config.MotorOutput.NeutralMode = NeutralModeValue.Brake;
config.CurrentLimits.SupplyCurrentLimit = currentLimitAmps;
config.CurrentLimits.SupplyCurrentLimitEnable = true;
talon.getConfigurator().apply(config);
```

### Follower Motor Oscillating Between On and Off

All status signals must be updated at the same frequency as the leader motor's signals. Fix:

```java
BaseStatusSignal.setUpdateFrequencyForAll(...);
```

### Losing NT4

NT4 issues are caused by low CPU (visible in VisualVM) — the NetworkTables thread is being starved by another thread.

- **Example:** Vision running on the main robot thread starves NT4
- **Memory drops:** The NT queue is being clogged. Our 6 cameras running at 50fps clogged the NT queue, causing it to drop other data.

**Fix:** Reduce camera FPS (we fixed ours by dropping all cameras to 15fps to free up the NT queue).
