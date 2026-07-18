---
sidebar_position: 3
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Programming Swerve Drive
In the last section you learned what swerve drive is. In this section, you'll learn how to program it the way **WE** do it.

We'll go over:
- File structure
- What's in each file
- Swerve methods

When you're ready, let's dive in!

---

## Field Centric vs Robot Centric
From now on things are going to become a little more mathematical, so we need to define some terms
$$\text{(0, 0)}$$

**Field Centric:** This means relative to the game field. For example, if a ball is in the left corner of the field, and the left corner is the origin $$\text{(0, 0)}$$ of the field, then the ball is at coordinate $$\text{(0, 0)}$$ in field-centric coordinates

**Robot Centric:** This means relative to the robot coordinates. This means if a ball is next to the robot, and the robot is considered the origin $$\text{(0, 0)}$$, then the ball could be at $$\text{(3, 0)}$$ for a robot centric coordinate system. 

Especially in Swerve, these math concepts are heavily used and extremely important so try to remember them!

---

## File Structure
First up, file structure. We treat the Swerve drive as a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>subsystem</span>

This means that it has it's own folder in the subsystems folder, where all of the code will go.
<Note title="File Organization">
We organize subsystems into the pre-created subsystems folder, utilities into the utils folder, and commands into the pre-created commands folder. Everything else goes outside and are <strong>major</strong> files
</Note>

Within our `swerve` folder (in our `subsystems` folder) we have 3 groups of files. These are:
- `GyroIO` files: These files are the io layer files for the gyros on each of our swerve modules
- `ModuleIO` files: These files are the io layer files for the actual module (there are 4 of them)
- `Swerve` & `SwerveModule`: These files Combine everything so we get a functional swerve.
<Note title="Vocabulary review">
Here are some vocab words:
- A gyro is a sensor used to measure rotational angle, and helps the robot calculate field centric movement
- A Module is one group of sensors and motors, and there are 4 of these that make up a swerve drive

By default moving the joysticks is robot-centric movement, which is why we use a gyro
</Note>

---

## The IO Layer Pattern

Before diving into individual files, you need to understand the architectural pattern that all of these files use. It's called the **IO layer pattern**, and it comes from a logging framework we use called **AdvantageKit**.

The idea is simple: instead of having subsystem code talk directly to hardware (motors, sensors), we put a **layer of abstraction** in between. The subsystem only talks to an **interface**, and a separate class handles the actual hardware calls.

```
Swerve.java  ──uses──>  GyroIO (interface)
                              │
                    ┌─────────┴──────────┐
                    │                    │
             GyroIOPigeon2         GyroIOSim
             (real hardware)      (simulation)
```

This means:
- `Swerve.java` never changes regardless of whether we're on the real robot or in simulation
- Swapping from a NavX to a Pigeon2 gyro is as simple as passing a different implementation
- Every input to the subsystem is automatically logged to a file (via the `@AutoLog` annotation)

You'll see this same pattern repeated for `ModuleIO` and all four swerve modules.

---

## GyroIO Files

`GyroIO.java` is a **Java interface** — it defines what a gyro must provide, without specifying how. Any class that `implements GyroIO` must define the `updateInputs` method that fills in this data structure:

```java
@AutoLog
class GyroIOInputs {
    public boolean connected = false;
    public Rotation2d rollPosition  = new Rotation2d();  // tilt side-to-side
    public Rotation2d pitchPosition = new Rotation2d();  // tilt front-to-back
    public Rotation2d yawPosition   = new Rotation2d();  // rotation left-right (most important!)
    public double accelerationXInGs = 0.0;
    public double accelerationYInGs = 0.0;
    public double yawVelocityRadPerSec = 0.0;
    // High-frequency odometry samples (explained later)
    public double[]     odometryYawTimestamps = new double[]{};
    public Rotation2d[] odometryYawPositions  = new Rotation2d[]{};
}
```

<Note title="Roll, Pitch, and Yaw">
These are the three axes of rotation:
- **Yaw** — rotating left/right (like turning your head). This is what we use for field-centric driving.
- **Pitch** — tilting forward/backward (like nodding). Used to detect when we drive over a bump.
- **Roll** — tilting side-to-side (like tilting your head to your shoulder).
</Note>

The `@AutoLog` annotation tells AdvantageKit to auto-generate a class called `GyroIOInputsAutoLogged` that records every field to the log file on every loop cycle. That is why in `Swerve.java` you see:

```java
private final GyroIOInputsAutoLogged gyroInputs = new GyroIOInputsAutoLogged();
```

### GyroIOPigeon2 — Real Robot

Our main robot uses a **Pigeon2** IMU (Inertial Measurement Unit) from CTRE. The `GyroIOPigeon2` class configures the sensor and reads its status signals:

```java
public void updateInputs(GyroIOInputs inputs) {
    inputs.connected = BaseStatusSignal.isAllGood(yaw, accelerationX, accelerationY, yawVelocity);
    inputs.yawPosition   = Rotation2d.fromDegrees(yaw.getValueAsDouble());
    inputs.pitchPosition = Rotation2d.fromDegrees(pitch.getValueAsDouble());
    inputs.rollPosition  = Rotation2d.fromDegrees(roll.getValueAsDouble());
    inputs.accelerationXInGs = accelerationX.getValueAsDouble();
    inputs.yawVelocityRadPerSec = Units.degreesToRadians(yawVelocity.getValueAsDouble());
    // ... fill high-frequency odometry arrays
}
```

The gyro update frequency is set to match the odometry thread:

```java
yaw.setUpdateFrequency(Swerve.ODOMETRY_FREQUENCY); // 250 Hz on OmegaBot
```

### GyroIONavX — Alternative Gyro

Some of our robots use a **NavX** instead of a Pigeon2. Notice the **negative sign** in its implementation:

```java
inputs.yawPosition = Rotation2d.fromDegrees(-navX.getYaw());
```

The NavX reports clockwise rotation as positive, but WPILib uses **CCW-positive** (counterclockwise-positive) as its convention. The negative sign converts between them. This is a subtle but critical detail — forgetting the sign would make the robot turn the wrong direction in field-centric mode.

### GyroIOSim — Simulation

The simulation implementation is the simplest:

```java
public void updateInputs(GyroIOInputs inputs) {
    inputs.connected = true;
    inputs.yawPosition = mGyroSimulation.getGyroReading();
    inputs.yawVelocityRadPerSec = mGyroSimulation.getMeasuredAngularVelocity().in(RadiansPerSecond);
    inputs.odometryYawPositions = mGyroSimulation.getCachedGyroReadings();
}
```

MapleSim's `GyroSimulation` handles all the physics — we just read from it, the same way we read from real hardware.

---

## ModuleIO Files

`ModuleIO.java` is the same pattern applied to a single swerve module. Each module has:
- A **drive motor** that spins the wheel
- A **turn (steer) motor** that rotates the module to face a direction
- A **CANcoder** (absolute encoder) that reports the exact steering angle

The `ModuleIOInputs` struct captures all of this:

```java
@AutoLog
class ModuleIOInputs {
    // Drive motor
    public double drivePositionRad    = 0.0;  // total wheel rotation in radians
    public double driveVelocityRadPerSec = 0.0;  // current wheel speed
    public double driveAppliedVolts   = 0.0;
    public double driveCurrentAmps    = 0.0;

    // Turn motor + encoder
    public Rotation2d turnAbsolutePosition = new Rotation2d(); // from CANcoder (never resets)
    public Rotation2d turnPosition         = new Rotation2d(); // from motor encoder (resets on boot)
    public double turnVelocityRadPerSec    = 0.0;
    public double turnCurrentAmps          = 0.0;

    // High-frequency odometry samples
    public double[]     odometryTimestamps        = new double[]{};
    public double[]     odometryDrivePositionsRad = new double[]{};
    public Rotation2d[] odometryTurnPositions     = new Rotation2d[]{};
}
```

<Note title="Absolute vs Relative Encoder">
A <strong>relative encoder</strong> (built into the motor) counts rotations from zero, but its zero is wherever the motor was when it powered on. A <strong>absolute encoder</strong> (the CANcoder) always knows the exact angle, even across power cycles, because it has a magnet that gives a unique reading at every angle. We use the CANcoder to tell the turn motor where it actually is on boot.
</Note>

The interface methods define everything a caller can ask a module to do:

```java
default void setDriveVelocity(double velocityRadPerSec) {}  // closed-loop speed control
default void setTurnPosition(Rotation2d rotation) {}         // closed-loop angle control
default void setDriveOpenLoop(double output) {}              // raw voltage (for characterization)
default void setTurnOpenLoop(double output) {}
```

### ModuleIOTalonFX — Real Hardware

`ModuleIOTalonFX` configures two **Kraken X60 (TalonFX)** motors and a CANcoder. A few important configuration details:

**Continuous wrap for steering:**
```java
turnConfig.ClosedLoopGeneral.ContinuousWrap = true;
```
This tells the TalonFX that steering wraps around (0° = 360°), so it always takes the shortest path to the target angle instead of spinning all the way around.

**Motion Magic for smooth steering:**
```java
turnConfig.MotionMagic.MotionMagicCruiseVelocity = 100.0 / constants.SteerMotorGearRatio;
turnConfig.MotionMagic.MotionMagicAcceleration =
    turnConfig.MotionMagic.MotionMagicCruiseVelocity / 0.100;
```
Motion Magic is a CTRE feature that adds velocity and acceleration constraints to position control. Instead of instantly commanding max voltage, it smoothly ramps up and down — making steering feel fluid rather than jerky.

**Current limiting to prevent wheel slip:**
```java
driveConfig.CurrentLimits.StatorCurrentLimit = constants.SlipCurrent;
driveConfig.CurrentLimits.StatorCurrentLimitEnable = true;
```
Each robot's `SlipCurrent` is tuned to the maximum torque the wheel can apply before it starts slipping on the carpet. Going above this wastes energy and damages traction.

**Setting drive velocity:**
```java
@Override
public void setDriveVelocity(double velocityRadPerSec) {
    double velocityRotPerSec = Units.radiansToRotations(velocityRadPerSec);
    driveTalon.setControl(
        switch (constants.DriveMotorClosedLoopOutput) {
            case Voltage -> velocityVoltageRequest.withVelocity(velocityRotPerSec);
            case TorqueCurrentFOC -> velocityTorqueCurrentRequest.withVelocity(velocityRotPerSec);
        });
}
```
The switch between `Voltage` and `TorqueCurrentFOC` is a configuration choice. TorqueCurrentFOC (Field-Oriented Control) is a more advanced motor control mode that gives better performance at the cost of requiring a CTRE Pro license.

### ModuleIOSim — Simulation

The sim implementation uses PID controllers (since the simulated motors don't have onboard PID):

```java
@Override
public void setDriveVelocity(double velocityRadPerSec) {
    driveClosedLoop = true;
    // Feedforward: kS overcomes static friction, kV is voltage per unit velocity
    driveFFVolts = DRIVE_KS * Math.signum(velocityRadPerSec) + DRIVE_KV * velocityRadPerSec;
    driveController.setSetpoint(velocityRadPerSec);
}

@Override
public void setTurnPosition(Rotation2d rotation) {
    turnClosedLoop = true;
    turnController.setSetpoint(rotation.getRadians());
}
```

The drive uses a **feedforward + PID** combination. The feedforward predicts the voltage needed for a given speed, and the PID corrects for any error. The turn just uses PID with `enableContinuousInput(-π, π)` to handle wrap-around correctly.

---

## Core Concepts

Before explaining `SwerveModule` and `Swerve`, let's nail down the key data types and math involved.

### SwerveModuleState vs SwerveModulePosition

These are two different WPILib types used throughout the code:

| Type | Contains | Used for |
|---|---|---|
| `SwerveModuleState` | speed (m/s) + angle | Commanding and measuring what a module is doing right now |
| `SwerveModulePosition` | distance traveled (m) + angle | Odometry — tracking where the robot has been |

```java
// State: current speed + angle
SwerveModuleState state = new SwerveModuleState(1.5, Rotation2d.fromDegrees(45));

// Position: total distance traveled + angle
SwerveModulePosition position = new SwerveModulePosition(3.2, Rotation2d.fromDegrees(45));
```

### ChassisSpeeds

`ChassisSpeeds` represents the robot's overall motion as three values:
- **`vx`** — forward/backward speed in m/s (positive = forward)
- **`vy`** — left/right speed in m/s (positive = left)
- **`omega`** — rotation rate in radians/s (positive = counterclockwise)

This is what the teleop command produces from joystick inputs, and what gets passed to `runVelocity`.

### SwerveDriveKinematics

The `kinematics` object knows where each module is located on the robot (its `Translation2d` position). Given a `ChassisSpeeds`, it calculates the exact speed and angle needed from each module — this is **inverse kinematics**:

```java
// "I want to drive forward at 1 m/s while rotating left"
ChassisSpeeds speeds = new ChassisSpeeds(1.0, 0.0, 0.5);
SwerveModuleState[] states = kinematics.toSwerveModuleStates(speeds);
// Each module gets a unique angle and speed that combines translation + rotation
```

It can also go the other direction — given what all four modules are currently doing, compute the robot's overall velocity. This is **forward kinematics**:

```java
ChassisSpeeds robotSpeeds = kinematics.toChassisSpeeds(getModuleStates());
```

Both directions are used constantly: inverse kinematics to command movement, forward kinematics to report the current measured velocity.

---

## SwerveModule

`SwerveModule.java` is the bridge between the IO layer and the main `Swerve` subsystem. There are four `SwerveModule` objects — one per corner (FL, FR, BL, BR).

### periodic()

Each `SwerveModule` has its own `periodic()` that reads fresh sensor data from the IO layer:

```java
public void periodic() {
    io.updateInputs(inputs);
    Logger.processInputs(loggerKey, inputs);

    // Update cached state and position from raw sensor values
    cachedState.speedMetersPerSecond = inputs.driveVelocityRadPerSec * constants.WheelRadius;
    cachedState.angle = inputs.turnPosition;
    cachedPosition.distanceMeters = inputs.drivePositionRad * constants.WheelRadius;
    cachedPosition.angle = inputs.turnPosition;

    // Convert high-frequency odometry samples from radians to meters
    for (int i = 0; i < inputs.odometryTimestamps.length; i++) {
        odometryPositions[i].distanceMeters = inputs.odometryDrivePositionsRad[i] * constants.WheelRadius;
        odometryPositions[i].angle = inputs.odometryTurnPositions[i];
    }
}
```

Notice `driveVelocityRadPerSec * constants.WheelRadius` — the encoder reports in radians per second, but we want meters per second. Multiplying by wheel radius makes that conversion.

### runSetpoint — The Most Important Method

```java
public void runSetpoint(SwerveModuleState state) {
    state.optimize(getAngle());
    state.cosineScale(inputs.turnPosition);

    io.setDriveVelocity(state.speedMetersPerSecond / constants.WheelRadius);
    io.setTurnPosition(state.angle);
}
```

Two important optimizations happen before the hardware is commanded:

**1. State Optimization** (`state.optimize(getAngle())`)

Any angle can be reached two ways: rotate to it directly, or rotate to the opposite angle and reverse the wheel spin. `optimize` picks whichever requires less than 90° of steering rotation.

Example: the wheel is at 0° (pointing forward), and the target is 180° (pointing backward). Instead of rotating 180° and driving forward, `optimize` keeps the wheel at 0° and reverses the drive motor. Same result, much less steering travel.

**2. Cosine Scaling** (`state.cosineScale(inputs.turnPosition)`)

If the wheel isn't done turning yet, it shouldn't spin at full speed — it would be propelling the robot in the wrong direction. Cosine scaling multiplies the drive speed by `cos(steering_error)`:
- Error = 0° → scale = 1.0 (full speed)
- Error = 45° → scale = 0.71 (71% speed)
- Error = 90° → scale = 0.0 (stopped — don't drive if pointing 90° wrong)

As the wheel approaches its target angle, the drive speed smoothly ramps up.

### Odometry Sample Buffer

```java
private static final int MAX_ODOMETRY_SAMPLES = 20;
private final SwerveModulePosition[] odometryPositions = new SwerveModulePosition[MAX_ODOMETRY_SAMPLES];
```

The `PhoenixOdometryThread` (explained later) collects position samples at 250 Hz, while the main loop runs at 50 Hz. Between every main loop cycle, up to 5 extra samples accumulate. `SwerveModule` stores all of them in this array so the odometry processor can use every sample for maximum accuracy.

---

## The Swerve Subsystem

`Swerve.java` is the main class that pulls everything together. It `extends SubsystemBase`, which means WPILib automatically calls its `periodic()` every 20ms.

### Constructor

```java
public Swerve(
    CANBus bus,
    GyroIO gyroIO,
    ModuleIO flModuleIO,
    ModuleIO frModuleIO,
    ModuleIO blModuleIO,
    ModuleIO brModuleIO) {
    this.gyroIO = gyroIO;

    this.kinematics = new SwerveDriveKinematics(
        Objects.requireNonNull(getModuleTranslations())
    );

    swerveModules[0] = new SwerveModule(flModuleIO, 0, /* FL constants */);
    swerveModules[1] = new SwerveModule(frModuleIO, 1, /* FR constants */);
    swerveModules[2] = new SwerveModule(blModuleIO, 2, /* BL constants */);
    swerveModules[3] = new SwerveModule(brModuleIO, 3, /* BR constants */);

    PhoenixOdometryThread.getInstance().start(bus);
    // ...configure PathPlanner, SysId, alignment PID, etc.
}
```

The constructor takes IO interfaces as parameters — the actual implementations (TalonFX or Sim) are injected from `RobotContainer`. `Swerve.java` itself never has to know or care which robot it's running on.

`getModuleTranslations()` returns the physical X/Y position of each module relative to the robot's center. These differ by robot:

```java
public static Translation2d[] getModuleTranslations() {
    return switch (Constants.getRobot()) {
        case OMEGABOT, SIMBOT -> new Translation2d[]{
            new Translation2d(TunerConstants.FrontLeft.LocationX,  TunerConstants.FrontLeft.LocationY),
            new Translation2d(TunerConstants.FrontRight.LocationX, TunerConstants.FrontRight.LocationY),
            new Translation2d(TunerConstants.BackLeft.LocationX,   TunerConstants.BackLeft.LocationY),
            new Translation2d(TunerConstants.BackRight.LocationX,  TunerConstants.BackRight.LocationY)
        };
        // ... other robots
    };
}
```

These positions directly affect the kinematics math. If you got them wrong, the robot would behave erratically when trying to rotate.

### periodic()

```java
@Override
public void periodic() {
    odometryLock.lock();
    gyroIO.updateInputs(gyroInputs);
    Logger.processInputs("Swerve/Gyro", gyroInputs);
    for (var module : swerveModules) {
        module.periodic();
    }
    odometryLock.unlock();

    if (DriverStation.isDisabled()) {
        for (var module : swerveModules) {
            module.stop();
        }
    }

    processOdometryObservations();
    robotState.updateChassisSpeeds(getChassisSpeeds());
}
```

The `odometryLock` is a **mutex** (mutual exclusion lock) shared with the `PhoenixOdometryThread`. When `periodic()` wants to read sensor data, it locks the mutex — this blocks the background thread from writing new samples at the same time. Once reading is done, the lock is released and the background thread can resume. Without this, you'd get data races where the odometry thread writes halfway through a value while the main loop reads it.

### runVelocity — The Core Drive Method

This is the most important method in the entire subsystem. Everything that moves the robot goes through here:

```java
public void runVelocity(ChassisSpeeds speeds) {
    ChassisSpeeds discreteSpeeds = ChassisSpeeds.discretize(speeds, 0.02);
    SwerveModuleState[] setpointStates = kinematics.toSwerveModuleStates(discreteSpeeds);
    SwerveDriveKinematics.desaturateWheelSpeeds(setpointStates, getMaxLinearSpeedMetersPerSec());

    for (int i = 0; i < 4; i++) {
        swerveModules[i].runSetpoint(setpointStates[i]);
    }
}
```

Every line is important:

**Step 1: `ChassisSpeeds.discretize(speeds, 0.02)`**

When a robot translates and rotates at the same time, there's a mathematical inaccuracy that builds up because the control loop runs in discrete 20ms time steps. In continuous time the robot would follow a perfect arc, but in discrete time the straight-line approximation causes a slight drift. `discretize` applies a small correction to the velocity that compensates for this. Without it, the robot curves slightly when commanded to drive straight while rotating.

**Step 2: `kinematics.toSwerveModuleStates(discreteSpeeds)`**

Inverse kinematics: converts the three-value robot velocity into four `SwerveModuleState` objects. Each module gets a unique angle and speed based on its position on the robot and the desired motion.

**Step 3: `SwerveDriveKinematics.desaturateWheelSpeeds(...)`**

If any module's calculated speed exceeds the robot's maximum, this method scales all four modules down proportionally. This preserves the intended direction and the ratio of speeds between modules (so the robot still turns correctly), just at a lower overall magnitude.

**Step 4: `swerveModules[i].runSetpoint(setpointStates[i])`**

Send the target state to each module, which applies optimize + cosine scale and commands the hardware.

### Odometry

Odometry estimates the robot's position on the field by tracking how far each wheel has traveled and how much the robot has rotated.

```java
private void processOdometryObservations() {
    double[] sampleTimestamps = swerveModules[0].getOdometryTimestamps();
    int sampleCount = sampleTimestamps.length;

    for (int i = 0; i < sampleCount; i++) {
        // Collect new position data from all 4 modules
        for (int moduleIndex = 0; moduleIndex < 4; moduleIndex++) {
            SwerveModulePosition pos = swerveModules[moduleIndex].getOdometryPositions()[i];
            odometryDeltasBuffer[moduleIndex].distanceMeters =
                pos.distanceMeters - lastModulePositions[moduleIndex].distanceMeters;
            odometryDeltasBuffer[moduleIndex].angle = pos.angle;
            lastModulePositions[moduleIndex] = pos;
        }

        // Use gyro if connected; fall back to kinematics if disconnected
        if (gyroInputs.connected) {
            rawGyroRotation = gyroInputs.odometryYawPositions[i];
        } else {
            Twist2d twist = kinematics.toTwist2d(odometryDeltasBuffer);
            rawGyroRotation = rawGyroRotation.plus(new Rotation2d(twist.dtheta));
        }

        robotState.addOdometryObservation(
            new RobotState.OdometryObservation(
                sampleTimestamps[i],
                odometryPositionsBuffer,
                gyroInputs.connected ? rawGyroRotation : null
            )
        );
    }
}
```

This loop processes every high-frequency position sample collected since the last main loop cycle. Each sample is sent to `RobotState`, which runs a **pose estimator** that fuses odometry with vision measurements (from cameras) to produce the best possible position estimate on the field.

Notice the gyro fallback: if the gyro disconnects, we can approximate rotation from the wheel movements alone using `kinematics.toTwist2d`. It's less accurate but better than nothing.

### Utility Methods

```java
// Stop all modules by commanding zero velocity
public void stop() {
    runVelocity(new ChassisSpeeds());
}

// Stop and lock in an X-pattern to resist being pushed
public void stopWithX() {
    Rotation2d[] headings = new Rotation2d[4];
    for (int i = 0; i < 4; i++) {
        headings[i] = Objects.requireNonNull(getModuleTranslations())[i].getAngle();
    }
    kinematics.resetHeadings(headings);
    stop();
}
```

`stopWithX()` points each module tangentially around the robot's center, forming an X shape when viewed from above. Because each wheel is perpendicular to the direction of any push force, the robot becomes very difficult to shove — useful for resisting defense. The `kinematics.resetHeadings(headings)` call sets the expected headings so that subsequent calls know where each module started.

**Speed modes:**

```java
private static final double SLOW_SPEED_MULTIPLIER = 0.3;
private static final double SPEED_MULTIPLIER       = 1.0;

public double getSpeedMultiplier() {
    return (requestSlowMode ? SLOW_SPEED_MULTIPLIER : SPEED_MULTIPLIER);
}

public Command toggleMultiplier() {
    return Commands.runOnce(() -> requestSlowMode = !requestSlowMode);
}
```

The operator can press a button to toggle slow mode (30% speed). The teleop drive command reads `getSpeedMultiplier()` and scales joystick inputs before calling `runVelocity`. This is useful for precise fine-tuning, like lining up against a game piece.

### Collision Detection

```java
public boolean collisionDetected() {
    double ax = gyroInputs.accelerationXInGs;
    double ay = gyroInputs.accelerationYInGs;

    double jerkX = (ax - previousAx) / Constants.UPDATE_LOOP_DT;
    double jerkY = (ay - previousAy) / Constants.UPDATE_LOOP_DT;

    double jerkMag = Math.hypot(jerkX, jerkY);

    boolean highCommandedAccel = isCommandingHighAcceleration();
    boolean linearCollision = jerkMag > COLLISION_JERK_THRESHOLD.get() && !highCommandedAccel;
    return collisionDebouncer.calculate(linearCollision || angularCollision);
}
```

**Jerk** is the rate of change of acceleration (how quickly acceleration changes). A sudden spike in jerk that wasn't commanded by the driver indicates the robot hit something. The `&& !highCommandedAccel` condition prevents false positives when the driver intentionally floors it. A `Debouncer` filters out brief noise spikes, only reporting a collision if the jerk stays elevated for at least 200ms.

---

## High-Frequency Odometry

### PhoenixOdometryThread

The main robot loop runs at 50 Hz (every 20ms). But when the robot is spinning fast, 50 Hz position samples aren't frequent enough — the odometry estimate drifts. `PhoenixOdometryThread` is a background Java thread that samples encoder and gyro positions at **250 Hz** on OmegaBot, giving 5x more position data per main loop cycle.

```java
@Override
public void run() {
    while (true) {
        // On CAN FD: block until all signals update simultaneously
        if (isCANFD && phoenixSignals.length > 0) {
            BaseStatusSignal.waitForAll(2.0 / Swerve.ODOMETRY_FREQUENCY, phoenixSignals);
        } else {
            // On standard CAN: sleep and poll
            Thread.sleep((long) (1000.0 / Swerve.ODOMETRY_FREQUENCY));
            if (phoenixSignals.length > 0) BaseStatusSignal.refreshAll(phoenixSignals);
        }

        // Store samples in ring buffer queues
        Swerve.odometryLock.lock();
        try {
            double timestamp = RobotController.getFPGATime() / 1e6;
            for (int i = 0; i < phoenixSignals.length; i++) {
                phoenixQueues.get(i).offer(phoenixSignals[i].getValueAsDouble());
            }
            for (DoubleRingBuffer timestampQueue : timestampQueues) {
                timestampQueue.offer(timestamp);
            }
        } finally {
            Swerve.odometryLock.unlock();
        }
    }
}
```

On a **CAN FD bus** (like CANivore), `waitForAll` blocks the thread until every signal updates together — this gives precisely synchronized timestamps across all modules and the gyro. On standard CAN, the thread just sleeps for the right interval and polls.

The thread uses the same `odometryLock` as `periodic()` to safely share data between threads.

### DoubleRingBuffer

```java
public class DoubleRingBuffer {
    private final double[] buffer;
    private int head = 0;
    private int tail = 0;
    private int size = 0;

    public boolean offer(double value) {
        if (size == buffer.length) return false;
        buffer[head] = value;
        head = (head + 1) % buffer.length;
        size++;
        return true;
    }

    public double poll() {
        if (size == 0) return 0.0;
        double value = buffer[tail];
        tail = (tail + 1) % buffer.length;
        size--;
        return value;
    }
}
```

This is a hand-rolled **ring buffer** (also called a circular buffer) for primitive `double` values. It replaces Java's `Queue<Double>` for one specific reason: **zero allocation**.

`Queue<Double>` requires every `double` to be wrapped in a `Double` object (autoboxing) every time it's inserted. At 250 Hz across 9 signals, that's thousands of tiny object allocations per second. In Java, objects must be garbage collected, and GC pauses can interrupt the real-time robot loop. By using a `double[]` array directly, there are zero allocations and zero GC pressure.

<Note title="Why ring buffers?">
A ring buffer reuses a fixed array by tracking a head pointer (where to write next) and a tail pointer (where to read next). When head reaches the end of the array, it wraps back to 0. This gives constant-time insert and remove without ever allocating memory — perfect for real-time systems.
</Note>

---

## Putting It All Together

Here's how data flows from joystick to wheel on every loop cycle:

```
Driver Joystick
      │
      ▼  (field-centric math applied using gyro yaw)
TeleopSwerve Command → ChassisSpeeds(vx, vy, omega)
      │
      ▼
Swerve.runVelocity()
      ├─ discretize (fix discrete-time drift)
      ├─ inverse kinematics (ChassisSpeeds → SwerveModuleState[4])
      └─ desaturate (scale down if over max speed)
      │
      ▼
SwerveModule[0..3].runSetpoint(state)
      ├─ optimize (shortest steering rotation)
      └─ cosine scale (reduce speed while turning)
      │
      ▼
ModuleIOTalonFX
      ├─ setDriveVelocity (closed-loop velocity on Kraken)
      └─ setTurnPosition (Motion Magic position on Kraken)
      │
      ▼
Physical Wheels


PhoenixOdometryThread (background, 250 Hz)
      │  DoubleRingBuffer queues (thread-safe via odometryLock)
      ▼
Swerve.processOdometryObservations()
      │  all high-frequency samples fed in per main loop cycle
      ▼
RobotState (pose estimator — fuses odometry + vision)
      │
      ▼
Estimated Field Position (used for auto, alignment, etc.)
```

---

<Quiz questions={[
{
  prompt: "Why does ModuleIO use an interface instead of directly calling TalonFX in Swerve.java?",
  options: [
    "Interfaces are required by WPILib",
    "TalonFX can only be used through an interface",
    "Interfaces run faster than concrete classes",
    "So the subsystem can work with real hardware or simulation without any changes to Swerve.java"
  ],
  correct: 3,
  explanation: "The IO layer pattern lets you swap in different implementations (real hardware, simulation, test doubles) without touching the subsystem. Swerve.java always talks to the interface and never needs to change."
},
{
  prompt: "What does state.optimize(getAngle()) do in SwerveModule.runSetpoint()?",
  options: [
    "It finds the shortest path to the target angle — possibly flipping the drive direction to avoid turning more than 90°",
    "It maximizes the drive motor speed",
    "It prevents the turn motor from exceeding current limits",
    "It optimizes PID gains automatically"
  ],
  correct: 0,
  explanation: "For any target angle, there are two ways to get there: rotate directly, or rotate to the opposite angle and reverse the wheel. Optimize picks whichever requires less than 90° of steering movement."
},
{
  prompt: "What is the purpose of ChassisSpeeds.discretize() in runVelocity()?",
  options: [
    "It limits the speed to the robot's maximum",
    "It converts units from imperial to metric",
    "It compensates for drift that occurs when the robot both translates and rotates at the same time in a discrete 20ms loop",
    "It converts ChassisSpeeds into SwerveModuleStates"
  ],
  correct: 2,
  explanation: "In discrete time, simultaneously translating and rotating introduces a mathematical drift. discretize applies a correction to the velocity command to compensate, keeping the robot on its intended path."
},
{
  prompt: "Why does PhoenixOdometryThread run at 250 Hz when the main loop only runs at 50 Hz?",
  options: [
    "To collect more position samples per cycle, reducing odometry drift especially when the robot is rotating quickly",
    "Because TalonFX motors require 250 Hz updates to function",
    "The gyro only works at 250 Hz",
    "250 Hz is the WPILib default"
  ],
  correct: 0,
  explanation: "Higher-frequency position sampling gives a more accurate picture of where the wheels have been between main loop cycles. This is especially important during fast rotation, where 50 Hz sampling would miss significant movement."
},
{
  prompt: "What does stopWithX() do and why is it useful?",
  options: [
    "It resets the gyro to zero",
    "It stops all motors immediately and cuts power",
    "It activates slow mode",
    "It points the four modules in an X pattern so each wheel resists being pushed, making the robot hard to shove"
  ],
  correct: 3,
  explanation: "In an X configuration, each wheel is perpendicular to any possible push direction. A force in any direction is resisted by at least two wheels, making it very difficult to slide the robot. This is used to hold position against defense."
},
{
  prompt: "Why does DoubleRingBuffer exist instead of using Java's built-in Queue<Double>?",
  options: [
    "Queue<Double> requires autoboxing every double into a Double object, creating garbage at 250 Hz; DoubleRingBuffer uses a raw double[] with zero allocation",
    "DoubleRingBuffer is faster because it uses linked lists",
    "Queue<Double> doesn't support thread safety",
    "Queue<Double> is not available in the WPILib version we use"
  ],
  correct: 0,
  explanation: "Queue<Double> would need to wrap each primitive double in a Double object (autoboxing), creating thousands of tiny allocations per second at 250 Hz. These trigger garbage collection, which can interrupt the robot loop. DoubleRingBuffer uses a primitive double[] array — zero allocations, zero GC pressure."
}
]} />
