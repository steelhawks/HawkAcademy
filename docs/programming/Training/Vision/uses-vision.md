---
sidebar_position: 5
title: Where Do We Use Vision
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Where Do We Use Vision

Now you know how we configure our cameras and how our vision subsystem turns AprilTag detections into robot-pose observations.

*But what do we actually use those observations for?*

Vision is useful because many robot actions depend on knowing the robot's position on the field. In **REBUILT 2026**, we use that position for:

- Correcting odometry with the pose estimator
- Aiming the turret toward the HUB
- Choosing the hood angle and flywheel speed
- Changing drivetrain behavior near field obstacles
- Protecting mechanisms near the HUB and TRENCH
- Recovering when the turret reaches a dead spot
- Correcting autonomous movement

This page follows the same data from beginning to end:

```text
AprilTag detections
        │
        ▼
Vision subsystem
        │
        ▼
Pose estimator
        │
        ▼
Estimated robot pose
        │
        ├── Shooter calculations
        ├── Turret alignment
        ├── TRENCH and BUMP states
        ├── Mechanism protection
        └── Autonomous recovery
```

---

## Background: REBUILT 2026

Before looking at the code, it helps to understand the game pieces and field elements that affect our robot logic.

### FUEL

**FUEL** consists of yellow foam balls used as the game pieces in REBUILT.

Robots collect FUEL and shoot it into the HUB to score.

### HUB

The **HUB** is the field structure where robots score FUEL.

Because the HUB has a known position on the field, the robot can use its own estimated pose to calculate:

- The direction from the robot to the HUB
- The distance from the robot to the HUB

Those two values are the foundation of our shooter calculations.

### TRENCH

The **TRENCH** is a low field structure that robots can travel underneath only if they fit below its height limit.

When our robot enters this area, it must keep its orientation and mechanisms in safe positions.

### BUMP

The **BUMP** is a raised field obstacle that robots can cross to enter or leave the middle area of the field.

Driving across it at a poor angle can make traversal less consistent, so our drivetrain automatically chooses a useful diagonal orientation.

---

## Shooter Vocabulary

### Turret

A **turret** is a rotating mechanism that allows the shooter to aim separately from the drivetrain.

This means the robot can drive in one direction while the shooter points toward the HUB.

### Hood

The **hood** changes the angle at which FUEL leaves the shooter.

A higher or lower hood angle changes the path of the shot.

### Flywheels

The **flywheels** are fast-spinning wheels that launch FUEL.

Changing flywheel speed changes how quickly the FUEL leaves the shooter and therefore how far it travels.

---

## The Pose Estimator

The pose estimator provides the robot's best estimate of its field position.

```java
Pose2d estimatedPose =
    RobotState.getInstance()
        .getEstimatedPose();
```

A `Pose2d` contains:

- The robot's x-position
- The robot's y-position
- The robot's heading

The pose estimator combines two main sources of information:

```text
Wheel encoders + gyro
        │
        ▼
     Odometry

AprilTag cameras
        │
        ▼
      Vision

Odometry + Vision
        │
        ▼
 Estimated robot pose
```

---

### Why not use only odometry?

Odometry tracks movement using wheel encoders and the gyro.

It updates quickly, but small errors slowly build up because:

- Wheels can slip
- The robot can be pushed
- The robot can bounce over field obstacles
- Small encoder errors accumulate

This gradual error is called **drift**.

### Why not use only vision?

Vision knows where the AprilTags are on the field, so it can correct drift. However:

- Cameras do not always see a tag
- Camera results arrive after a short delay
- Distant or angled detections can be less accurate
- A camera measurement can occasionally be wrong

The pose estimator combines the strengths of both systems.

<Note title="The main idea">
Odometry provides smooth, frequent movement updates. Vision provides field-referenced corrections. The pose estimator combines them into one estimated pose.
</Note>

---

## How the Pose Estimator Updates

WPILib's pose estimator receives odometry information every robot loop:

```java
public Pose2d update(
    Rotation2d gyroAngle,
    T wheelPositions
) {
    return updateWithTime(
        MathSharedStore.getTimestamp(),
        gyroAngle,
        wheelPositions
    );
}
```

The estimator stores these recent odometry poses in a short history:

```java
private final
    TimeInterpolatableBuffer<Pose2d>
        m_odometryPoseBuffer =
            TimeInterpolatableBuffer
                .createBuffer(1.5);
```

A **buffer** is temporary storage. This buffer keeps recent robot poses so the estimator can look backward in time.

---

### Adding a delayed vision measurement

A camera image is captured before the result reaches the roboRIO. Therefore, the estimator receives:

```java
addVisionMeasurement(
    visionRobotPoseMeters,
    timestampSeconds,
    visionMeasurementStdDevs
);
```

The three important pieces are:

| Input               | Purpose                                   |
|---------------------|-------------------------------------------|
| Vision pose         | Where the camera believes the robot was   |
| Timestamp           | When the image was captured               |
| Standard deviations | How strongly the result should be trusted |

The estimator finds the odometry pose from the same timestamp:

```java
var odometrySample =
    m_odometryPoseBuffer
        .getSample(timestampSeconds);
```

It then compares that old estimate with the vision pose:

```java
var transform =
    visionRobotPoseMeters.minus(
        visionSample.get()
    );
```

A **transform** here represents the correction between the current estimate and the camera measurement.

The estimator does not apply the entire correction automatically. It scales the correction based on how much it trusts vision:

```java
var kTimesTransform =
    m_visionK.times(
        VecBuilder.fill(
            transform.getX(),
            transform.getY(),
            transform
                .getRotation()
                .getRadians()
        )
    );
```

Finally, it applies the correction and carries the robot's later odometry movement forward.

---

### A simple example

Imagine the robot has moved for several seconds.

```text
Odometry estimate: x = 5.0 m
Vision estimate:   x = 4.8 m
```

The pose estimator does not necessarily jump directly to `4.8 m`.

Instead, it applies a correction based on the measurement's trust settings. The corrected estimate may become something between the two values.

The estimator then continues updating from that corrected position.

---

### Standard deviation review

In this system:

- Smaller standard deviation means **trust vision more**
- Larger standard deviation means **trust vision less**

Our vision subsystem calculates these values before sending a measurement to `RobotState`.

A close multi-tag result normally receives more trust than a distant single-tag result.

<Note title="You do not calculate this by hand">
For understanding the code, you only need to know that standard deviation controls measurement trust. WPILib handles the internal estimator math.
</Note>

---

## Getting the Estimated Pose

Once the pose estimator combines odometry and vision, other systems read the result through `RobotState`:

```java
RobotState.getInstance()
    .getEstimatedPose()
```

This method becomes the common answer to:

> Where does the robot currently believe it is?

Using one shared estimated pose ensures that the shooter, drivetrain, autonomous routines, and mechanism-safety logic all agree on the robot's location.

---

## Scoring with Vision

The main objective in REBUILT is shooting FUEL into the HUB.

To score from many field positions, our shooter needs to answer two questions:

1. Which direction is the HUB?
2. How far away is the HUB?

Both answers come from the robot's estimated pose.

---

### Finding the direction to the HUB

The robot knows:

- Its own field position
- The HUB's fixed field position

These positions can be visualized as:

```text
HUB (targetX, targetY)
          ●
         /
        / direction to HUB
       /
      ●
Robot (robotX, robotY)
```

The difference in x and y is:

```java
double deltaX =
    target.getX() - robot.getX();

double deltaY =
    target.getY() - robot.getY();
```

The program uses `Math.atan2()` to turn those differences into an angle:

```java
double fieldRelativeAngle =
    Math.atan2(
        target.getY() - turretXY.getY(),
        target.getX() - turretXY.getX()
    );
```

---

#### Vocabulary: `atan2`

`Math.atan2(y, x)` returns the angle from the positive x-axis to a point.

Unlike ordinary division, `atan2` correctly identifies which quadrant the target is in.

For example:

```text
        +y
         │
  Q2     │     Q1
         │
─────────┼───────── +x
         │
  Q3     │     Q4
         │
```

The two inputs are:

```java
Math.atan2(
    verticalDifference,
    horizontalDifference
);
```

The result is measured in radians.

---

## Turret Alignment

The turret-alignment code may look complicated because it works with three different angles:

1. The direction to the target on the field
2. The robot's heading on the field
3. The turret's mounting angle on the robot

The final goal is to find the angle the turret must rotate **relative to the robot**.

Here is the code:

```java
double fieldRelativeAngle =
    Math.atan2(
        virtualTarget.getY()
            - turretXY.getY(),
        virtualTarget.getX()
            - turretXY.getX()
    );

double turretMountYaw =
    RobotConstants.ROBOT_TO_TURRET
        .getRotation()
        .getZ();

double turretRelativeAngle =
    MathUtil.angleModulus(
        fieldRelativeAngle
            - robotHeading.getRadians()
            - turretMountYaw
    );
```

Let's break it down.

---

### Step 1: Find the turret's field position

The turret is not located exactly at the robot's center.

Therefore, the shooter calculations use the turret's position:

```java
turretXY
```

instead of only using the robot center.

This makes the direction and distance calculations more accurate.[^turret-offset]

---

### Step 2: Find the field-relative target angle

```java
double fieldRelativeAngle =
    Math.atan2(
        virtualTarget.getY()
            - turretXY.getY(),
        virtualTarget.getX()
            - turretXY.getX()
    );
```

This calculates the angle of the line from the turret to the target.

The result is **field-relative**, meaning it is measured using the field's fixed coordinate system.

Example:

```text
Field x-axis ───────────────►

Turret ●
        \
         \  fieldRelativeAngle
          \
           ● Target
```

At this point, the robot's current heading has not yet been removed.

---

### Step 3: Read the turret mounting yaw

```java
double turretMountYaw =
    RobotConstants.ROBOT_TO_TURRET
        .getRotation()
        .getZ();
```

The turret may not be mounted with its zero direction perfectly matching the robot's forward direction.

`turretMountYaw` stores that fixed mounting rotation.

A **yaw** is rotation around the vertical axis.

---

### Step 4: Convert field angle into robot-relative angle

```java
fieldRelativeAngle
    - robotHeading.getRadians()
```

The target angle is originally measured relative to the field.

Subtracting the robot heading changes it into an angle relative to the robot.

Example:

```text
Target direction on field:  90°
Robot heading on field:      30°
Relative direction:          60°
```

The target is 60° to the robot's left, even though its absolute field direction is 90°.

---

### Step 5: Remove the turret mounting angle

```java
fieldRelativeAngle
    - robotHeading.getRadians()
    - turretMountYaw
```

The turret controller works relative to the turret's own zero position.

Subtracting `turretMountYaw` accounts for how the turret is physically mounted.

---

### Step 6: Wrap the final angle

```java
MathUtil.angleModulus(...)
```

Angles can describe the same direction using different numbers:

```text
270° = -90°
360° = 0°
450° = 90°
```

`angleModulus` wraps the result into the range from `-π` to `π`, or approximately `-180°` to `180°`.

This gives the turret a clean target angle and helps it choose the shorter direction to rotate.

---

### The complete meaning

The calculation:

```java
double turretRelativeAngle =
    MathUtil.angleModulus(
        fieldRelativeAngle
            - robotHeading.getRadians()
            - turretMountYaw
    );
```

means:

```text
Direction to target on field
    - direction robot is facing
    - direction turret zero is mounted
    =
angle turret must rotate
```

---

## Calculating Shot Distance

The shooter also needs the distance from the turret or robot to the HUB.

Using two `Translation2d` objects:

```java
double distance =
    turretXY.getDistance(
        virtualTarget
    );
```

Conceptually, this is the straight-line distance:

```text
Turret ●──────────────● HUB
          distance
```

The shooter uses that distance to select:

- Hood angle
- Flywheel velocity

A closer shot normally requires different settings than a farther shot.

The exact hood and flywheel values can come from:

- A lookup table
- Interpolation between tested values
- A mathematical shot model

Vision's role is to provide the robot pose that makes the distance calculation possible.

---

## Swerve Drive States

The estimated pose is also used to change drivetrain behavior in different areas of the field.

Our teleop command defines these states:

```java
public enum DriveState {
    NORMAL,
    TRENCH_ALIGN,
    BUMP_ALIGN,
    TURRET_ALIGN
}
```

A **state** describes which driving behavior should currently be active.

The normal joystick code still controls movement, but special states can automatically adjust part of that movement.

---

### Changing states with triggers

`RobotState` provides triggers that activate when certain conditions become true:

```java
RobotState.getInstance()
    .getBumpTrigger()
    .onTrue(
        setDriveState(
            DriveState.BUMP_ALIGN
        )
    );
```

The turret-jam trigger activates turret alignment:

```java
RobotState.getInstance()
    .getTurretJamTrigger()
    .onTrue(
        setDriveState(
            DriveState.TURRET_ALIGN
        )
    );
```

A **trigger** watches a boolean condition and schedules a command when the condition changes.

The robot's estimated pose can be used inside these conditions to determine whether the robot is inside a particular field region.

---

## TRENCH Alignment

When the robot is near or inside a TRENCH, it should travel straight through the opening and keep its mechanisms safe.

The code first chooses the center of the nearby TRENCH:

```java
double middleOfTrenchClearanceY =
    RobotState.getInstance()
        .getEstimatedPose()
        .getY()
        >= FieldConstants.FIELD_WIDTH / 2.0

        ? FieldConstants.FIELD_WIDTH
            - (
                FieldConstants.Trench
                    .TRENCH_WIDTH / 2.0
            )

        : FieldConstants.Trench
            .TRENCH_WIDTH / 2.0;
```

This is a **ternary operator**:

```java
condition ? valueIfTrue : valueIfFalse
```

The field is divided into two halves. The robot chooses the TRENCH center on the same side of the field as its current estimated y-position.

---

### Correcting sideways movement

```java
linearVelocity =
    new Translation2d(
        linearVelocity.getX(),
        trenchController.calculate(
            RobotState.getInstance()
                .getEstimatedPose()
                .getY(),
            middleOfTrenchClearanceY
        )
    );
```

The driver still controls forward and backward movement using `linearVelocity.getX()`.

However, a controller automatically adjusts the sideways movement so the robot approaches the middle of the TRENCH.

This creates a useful balance:

```text
Driver controls forward speed
Robot automatically centers sideways
```

---

### Choosing forward or backward orientation

When TRENCH alignment begins, the robot compares its current heading with:

- `0` radians: facing forward
- `π` radians: facing backward

```java
double errorTo0 =
    Math.abs(
        MathUtil.angleModulus(
            currentRad - 0.0
        )
    );

double errorToPi =
    Math.abs(
        MathUtil.angleModulus(
            currentRad - Math.PI
        )
    );
```

It chooses whichever direction requires less rotation:

```java
trenchAngleSetpointSnapshot =
    errorTo0 < errorToPi
        ? 0.0
        : Math.PI;
```

The chosen value is stored as a **snapshot**, meaning it stays fixed while the state is active.

Then the angle controller rotates toward that heading:

```java
omega =
    angleController.calculate(
        currentRad,
        trenchAngleSetpointSnapshot
    );
```

This keeps the robot facing straight through the TRENCH rather than turning sideways into it.

The hood can also be lowered while this state is active to keep the shooter within the allowed height.

---

## BUMP Alignment

When the robot enters the BUMP region, it automatically chooses a nearby diagonal heading.

```java
double closestCornerAngle =
    Math.round(
        currentRad
            / (Math.PI / 4.0)
    )
    * (Math.PI / 4.0);
```

`π / 4` radians equals 45°.

Dividing by 45°, rounding, and multiplying by 45° finds the closest 45° increment.

Examples:

```text
Current angle:  40° → nearest increment: 45°
Current angle: 100° → nearest increment: 90°
Current angle: 140° → nearest increment: 135°
```

The next check makes sure the chosen increment is diagonal:

```java
if (
    (
        Math.round(
            closestCornerAngle
                / (Math.PI / 4.0)
        ) % 2
    ) == 0
) {
    closestCornerAngle +=
        Math.PI / 4.0;
}
```

The `%` operator gives the remainder after division.

Even multiples of 45° are:

```text
0°, 90°, 180°, 270°
```

Odd multiples are:

```text
45°, 135°, 225°, 315°
```

If the chosen angle is an even multiple, the code adds 45° so the final heading is diagonal.

The controller then maintains that angle:

```java
omega =
    angleController.calculate(
        currentRad,
        bumpAngleSetpointSnapshot
    );
```

---

## Protecting the Intake Near the HUB

The HUB is a large field structure.

The robot can compare its estimated position with the known HUB position to determine whether it is too close.

Conceptually:

```java
boolean nearHub =
    robotPosition.getDistance(
        hubCenter
    ) < safeDistance;
```

When `nearHub` is true, the robot prevents the intake from extending.

This protects the mechanism from being driven directly into the HUB.

<Note title="Vision as a safety tool">
Vision is not only used for aiming. A reliable field pose also allows the robot to protect itself around known field structures.
</Note>

---

## Turret Dead Spots

A turret cannot necessarily rotate forever in either direction.

Its motion may be limited by:

- Wires
- Mechanical hard stops
- Safe operating limits
- Other robot mechanisms

A **dead spot** occurs when the HUB is outside the turret's allowed rotation range.

When this happens, the drivetrain rotates the entire robot so the turret can remain inside its safe range while still aiming at the HUB.

---

### Entering `TURRET_ALIGN`

```java
RobotState.getInstance()
    .getTurretJamTrigger()
    .onTrue(
        setDriveState(
            DriveState.TURRET_ALIGN
        )
    );
```

Inside the state, the turret first holds its current position:

```java
RobotContainer.s_Turret
    .freezeAtCurrentPosition();
```

The drivetrain then calculates how it must rotate.

---

### Step 1: Find the HUB angle

```java
double targetFieldAngle =
    Math.atan2(
        hubCenter.getY()
            - robotTranslation.getY(),
        hubCenter.getX()
            - robotTranslation.getX()
    );
```

This is the absolute field direction from the robot to the HUB.

---

### Step 2: Find the required turret angle

```java
double requiredTurretAngle =
    MathUtil.angleModulus(
        targetFieldAngle
            - currentRad
            - turretMountingYaw
    );
```

This is the same coordinate conversion used in normal turret aiming:

```text
Field target angle
    - robot heading
    - turret mounting yaw
    =
required turret-relative angle
```

---

### Step 3: Clamp the turret angle

```java
double clampedTurretAngle =
    MathUtil.clamp(
        requiredTurretAngle,
        RobotContainer.s_Turret
            .getMinRotation()
            .getRadians()
            + Turret.tolerance,
        RobotContainer.s_Turret
            .getMaxRotation()
            .getRadians()
            - Turret.tolerance
    );
```

To **clamp** a value means to keep it inside a minimum and maximum.

For example:

```text
Allowed range: -120° to 120°
Requested:      150°
Clamped result: 120°
```

The tolerance keeps the turret slightly away from its exact mechanical limits.

---

### Step 4: Find the robot angle that makes the clamped turret work

```java
double desiredRobotAngle =
    MathUtil.angleModulus(
        targetFieldAngle
            - turretMountingYaw
            - clampedTurretAngle
    );
```

The system now works backward.

It already knows:

- The HUB's field angle
- The turret mounting yaw
- The safe turret angle

Therefore, it calculates the robot heading that makes all three line up.

```text
Desired robot angle
    + turret mounting yaw
    + safe turret angle
    =
target field angle
```

---

### Step 5: Rotate the drivetrain

```java
double controllerOmega =
    angleController.calculate(
        currentRad,
        desiredRobotAngle
    );
```

The controller calculates the rotational speed needed to turn toward the desired robot angle.

The driver keeps partial rotational control:

```java
omega =
    controllerOmega
        + omega * 0.3;
```

The automatic correction performs most of the alignment, while 30% of the driver's turn input is still added.

---

## Autonomous Scoring

During autonomous, the robot runs without driver control for 15 seconds.

The same shooter logic used during teleop can be used in autonomous:

```text
Estimated pose
      │
      ├── Direction to HUB
      ├── Distance to HUB
      ├── Turret angle
      ├── Hood angle
      └── Flywheel speed
```

Using one shared scoring calculation keeps autonomous and teleop shots consistent.

---

### Correcting Autonomous Paths

Autonomous trajectories are planned paths that the robot attempts to follow.

However, the robot may finish slightly away from the expected endpoint because of:

- Wheel slip
- Contact with another robot
- Crossing the BUMP
- Starting-position error
- Small path-following errors

Vision helps the pose estimator recognize the robot's true position.

The autonomous recovery command then decides how to reach the intended final pose.

```java
public static Command
    recoverToTrajectoryEnd(
        AutoTrajectory traj
    ) {

    return Commands.defer(() -> {
        Pose2d finalPose =
            traj.getFinalPose()
                .orElse(
                    RobotState.getInstance()
                        .getEstimatedPose()
                );

        double distanceFromEnd =
            RobotState.getInstance()
                .getEstimatedPose()
                .getTranslation()
                .getDistance(
                    finalPose.getTranslation()
                );

        if (
            distanceFromEnd
                >= replanDistanceRequirement
        ) {
            return DriveCommands
                .driveToPosition(finalPose);
        } else {
            return new SwerveDriveAlignment(
                finalPose,
                true
            ).withTimeout(1.0);
        }
    }, Set.of(s_Swerve));
}
```

---

#### Vocabulary: trajectory

A **trajectory** is a planned movement across the field.

It normally contains:

- Positions along the path
- Desired headings
- Velocities
- Timing information

The final pose is where the robot is expected to end.

---

#### Vocabulary: deferred command

```java
Commands.defer(...)
```

A **deferred command** waits until the command starts before deciding which command to create.

This matters because the robot's estimated pose may change between:

- The time autonomous is constructed
- The time recovery actually begins

Using `defer` ensures the distance check uses the newest pose.

---

### Step 1: Get the desired endpoint

```java
Pose2d finalPose =
    traj.getFinalPose()
        .orElse(
            RobotState.getInstance()
                .getEstimatedPose()
        );
```

`getFinalPose()` returns an `Optional<Pose2d>`.

An **Optional** may contain a value or may be empty.

If the trajectory has a final pose, the code uses it. Otherwise:

```java
.orElse(currentEstimatedPose)
```

uses the robot's current pose as a safe fallback.

---

### Step 2: Measure endpoint error

```java
double distanceFromEnd =
    RobotState.getInstance()
        .getEstimatedPose()
        .getTranslation()
        .getDistance(
            finalPose.getTranslation()
        );
```

The code compares:

```text
Current estimated position
             ↕ distanceFromEnd
Planned final position
```

Only translation is used here, so the distance describes position error rather than heading error.

---

### Step 3: Choose a recovery method

For a large error:

```java
return DriveCommands
    .driveToPosition(finalPose);
```

The robot pathfinds back to the endpoint.

For a small error:

```java
return new SwerveDriveAlignment(
    finalPose,
    true
).withTimeout(1.0);
```

The robot uses a short precision-alignment command.

The decision is:

```text
Far from endpoint
      │
      ▼
Create a new path

Close to endpoint
      │
      ▼
Use precise alignment
```

This avoids running a full pathfinding routine for a tiny correction.

---

## Why Vision Matters to Autonomous Recovery

The recovery command does not read an AprilTag directly.

Instead, it reads:

```java
RobotState.getInstance()
    .getEstimatedPose()
```

Vision has already corrected this pose through the pose estimator.

This demonstrates an important software pattern:

```text
Vision subsystem measures tags
        │
        ▼
RobotState produces one estimated pose
        │
        ▼
Autonomous code uses that pose
```

The autonomous code does not need to understand cameras, ambiguity, or AprilTag transforms. It only needs a reliable answer to:

> Where am I now?

---

## Summary Table

| Use                 | Vision information used            | Result                                |
|---------------------|------------------------------------|---------------------------------------|
| Pose estimation     | Timestamped robot poses            | Corrects odometry drift               |
| Turret aiming       | Robot/turret position and heading  | Points shooter toward HUB             |
| Shot calculation    | Distance to HUB                    | Selects hood angle and flywheel speed |
| TRENCH state        | Robot position and heading         | Centers and straightens robot         |
| BUMP state          | Robot heading and field region     | Holds a useful diagonal angle         |
| HUB protection      | Distance to HUB                    | Prevents intake collision             |
| Turret dead spot    | Direction to HUB and robot heading | Rotates drivetrain to help turret     |
| Autonomous scoring  | Pose, direction, and distance      | Aims and configures shooter           |
| Autonomous recovery | Distance from planned endpoint     | Pathfinds or aligns back to path      |

---

## General Rules for Using Vision

### Rule 1: Other systems should use the estimated pose

Shooter and autonomous code should normally read:

```java
RobotState.getInstance()
    .getEstimatedPose()
```

They should not separately calculate position from raw camera results.

### Rule 2: Keep coordinate systems clear

When aiming a turret, identify whether an angle is:

- Field-relative
- Robot-relative
- Turret-relative

Most confusing turret bugs come from mixing these coordinate systems.

### Rule 3: Use known field positions

The HUB, TRENCH, BUMP, and other field elements have fixed coordinates.

Comparing the robot's estimated pose with those coordinates allows location-based automation.

### Rule 4: Let drivers keep useful control

Automatic states do not always need to take over every movement axis.

For example:

- TRENCH alignment can control sideways correction and rotation
- The driver can still control forward movement

### Rule 5: Use different recovery methods for different errors

A large autonomous error may need pathfinding.

A small error may need only a short alignment correction.

---

<Quiz questions={[
{
  prompt: "Why combine odometry and vision?",
  options: [
    "Odometry is smooth but drifts, while vision can provide field-referenced corrections",
    "Vision controls the wheel motors directly",
    "Odometry can only work during autonomous",
    "AprilTags contain wheel encoder data"
  ],
  correct: 0,
  explanation: "Odometry updates frequently but accumulates error. Vision uses known field references to correct that drift."
},
{
  prompt: "Why does a vision measurement include a timestamp?",
  options: [
    "To identify the AprilTag family",
    "To compensate for the delay between image capture and result processing",
    "To choose the hood angle",
    "To determine the robot's alliance"
  ],
  correct: 1,
  explanation: "The estimator uses the timestamp to compare vision with the odometry pose from when the image was actually captured."
},
{
  prompt: "What does Math.atan2() calculate in turret aiming?",
  options: [
    "The distance to the HUB",
    "The direction from the turret to the target",
    "The flywheel velocity",
    "The camera exposure"
  ],
  correct: 1,
  explanation: "atan2 uses the x and y differences between two points to calculate the direction from one to the other."
},
{
  prompt: "Why is robotHeading subtracted from fieldRelativeAngle?",
  options: [
    "To convert a field-relative target direction into a robot-relative direction",
    "To calculate the camera latency",
    "To lower the hood",
    "To choose the nearest TRENCH"
  ],
  correct: 0,
  explanation: "The turret rotates relative to the robot, so the robot's field heading must be removed from the field-relative target angle."
},
{
  prompt: "What does MathUtil.angleModulus() do?",
  options: [
    "Calculates distance",
    "Wraps an angle into a standard range",
    "Finds the nearest AprilTag",
    "Limits flywheel speed"
  ],
  correct: 1,
  explanation: "Equivalent angles can have many numeric forms. angleModulus wraps them into the range from -π to π."
},
{
  prompt: "What happens during TRENCH alignment?",
  options: [
    "The driver loses all movement control",
    "The robot centers sideways and chooses a forward or backward heading",
    "The robot always rotates to 45 degrees",
    "The vision cameras are disabled"
  ],
  correct: 1,
  explanation: "The driver can continue controlling forward movement while the robot automatically centers and straightens itself."
},
{
  prompt: "Why does BUMP alignment use odd multiples of 45 degrees?",
  options: [
    "They represent diagonal headings",
    "They increase camera frame rate",
    "They point directly at every AprilTag",
    "They disable field-relative driving"
  ],
  correct: 0,
  explanation: "Odd multiples of 45 degrees are diagonal directions such as 45, 135, 225, and 315 degrees."
},
{
  prompt: "What does clamping the turret angle accomplish?",
  options: [
    "Keeps the turret target inside its allowed mechanical range",
    "Converts radians into meters",
    "Selects a new AprilTag ID",
    "Stops the flywheels"
  ],
  correct: 0,
  explanation: "MathUtil.clamp prevents the requested turret angle from exceeding its safe minimum and maximum."
},
{
  prompt: "Why does recoverToTrajectoryEnd use Commands.defer()?",
  options: [
    "To wait until execution before checking the robot's newest estimated pose",
    "To make the robot drive faster",
    "To disable odometry",
    "To create camera calibration data"
  ],
  correct: 0,
  explanation: "The robot's pose changes over time. defer ensures the recovery decision is made using the current pose when recovery begins."
},
{
  prompt: "When does autonomous recovery use pathfinding?",
  options: [
    "Whenever the robot sees one tag",
    "When the robot is far enough from the planned endpoint",
    "Only while disabled",
    "When the turret is centered"
  ],
  correct: 1,
  explanation: "Large endpoint errors use driveToPosition, while small errors use a short precision-alignment command."
}
]} />

---

## Summary

- The pose estimator combines odometry with timestamped vision corrections.
- Other systems read one shared estimated pose from `RobotState`.
- `atan2` finds the field-relative direction from the turret to the HUB.
- Subtracting robot heading and turret mounting yaw converts that direction into a turret-relative angle.
- The shooter uses distance to the HUB to choose hood and flywheel settings.
- TRENCH and BUMP states use robot pose to make field traversal safer and easier.
- HUB-distance checks can protect the intake from collisions.
- When the turret reaches its rotation limit, the drivetrain rotates to help it aim.
- Autonomous recovery compares the estimated pose with a trajectory endpoint and chooses pathfinding or precision alignment.

---

[^turret-offset]: The turret may be mounted away from the robot center. During close shots, using the turret's actual field position makes the direction and distance calculation more accurate than using the robot center.