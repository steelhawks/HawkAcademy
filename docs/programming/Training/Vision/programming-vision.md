---
sidebar_position: 4
title: Programming Vision
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Programming Vision

In the last section, we mounted, calibrated, and tuned the cameras. Now it is time to learn how the robot uses the information produced by PhotonVision.

Our vision code has three main jobs:

- Read AprilTag detections from each camera
- Convert those detections into an estimated robot position
- Send trustworthy position measurements to `RobotState`

The vision subsystem is split into these main files:

```text
VisionIO.java
    Defines the information every camera must provide

VisionIOPhoton.java
    Reads real PhotonVision cameras

VisionIOPhotonSim.java
    Creates simulated PhotonVision cameras

VisionConstants.java
    Stores camera locations and vision settings

Vision.java
    Filters and uses the camera measurements
```

<Note title="IO layer review">
This page assumes you already understand the IO-layer pattern from the swerve programming section. `Vision.java` talks to the `VisionIO` interface, while separate implementations handle real cameras and simulation.
</Note>

---

## How Vision Data Moves Through the Robot

Here is the complete flow:

```text
AprilTag on the field
        │
        ▼
Camera captures an image
        │
        ▼
PhotonVision detects the AprilTag
        │
        ▼
VisionIOPhoton reads the result
        │
        ▼
The result is converted into a robot pose
        │
        ▼
Vision.java checks whether the pose is reasonable
        │
        ▼
RobotState combines vision with odometry
```

The cameras do not directly control the robot. They provide measurements that help the robot estimate where it is on the field.

---

## Important Vocabulary

### Pose

A **pose** describes both an object's position and the direction it is facing.

A `Pose2d` contains:

- An x-coordinate
- A y-coordinate
- A rotation

A `Pose3d` also contains height, pitch, and roll.

Our camera calculations use `Pose3d`:

```java
Pose3d robotPose;
```

Before the measurement is sent to the robot's normal field-position estimator, it is converted to `Pose2d`:

```java
observation.pose().toPose2d()
```

---

### Transform

A **transform** describes the distance and rotation between two objects or coordinate systems.

For example:

```java
Transform3d robotToCamera;
```

This stores where the camera is mounted relative to the robot's center.

The transform is necessary because PhotonVision estimates the position of the **camera**, but the rest of the robot code needs the position of the **robot's center**.[^camera-offset]

---

### Record

A Java **record** is a compact class used mainly to store related data.

Our code uses this record:

```java
record TargetObservation(
    Rotation2d tx,
    Rotation2d ty,
    int fiducialId
) {}
```

Java automatically creates:

- A constructor
- A `tx()` method
- A `ty()` method
- A `fiducialId()` method

Example:

```java
TargetObservation observation =
    new TargetObservation(
        Rotation2d.fromDegrees(4.0),
        Rotation2d.fromDegrees(-1.5),
        7
    );

int id = observation.fiducialId();
```

Records are useful when several values belong to one complete measurement.

---

### `tx` and `ty`

`tx` and `ty` describe the angle from the center of the camera image to the target.

- `tx` is the horizontal angle
- `ty` is the vertical angle

PhotonVision calls these values yaw and pitch.

```java
Rotation2d.fromDegrees(
    result.getBestTarget().getYaw()
)

Rotation2d.fromDegrees(
    result.getBestTarget().getPitch()
)
```

These values can be used for simple aiming. For example, if `tx` is positive, the target is on one side of the camera's center. The robot can turn until `tx` is close to zero.

<Note title="Angular offsets">
`tx` and `ty` are measured as angles, not pixels and not field coordinates.
</Note>

---

### Fiducial ID

Every AprilTag has a number called its **fiducial ID**.

```java
target.fiducialId
```

The field layout uses that number to determine which AprilTag was detected and where it is located on the field.

---

### Timestamp

A **timestamp** records when a camera image was captured.

```java
result.getTimestampSeconds()
```

Camera information takes time to reach the roboRIO. The timestamp lets the pose estimator understand when the measurement actually happened instead of treating it as a measurement from the current moment.[^latency]

---

### Ambiguity

Sometimes one AprilTag image can produce more than one possible position estimate. **Ambiguity** describes how uncertain the result is.

- Low ambiguity is better
- High ambiguity means the result may be unreliable
- Seeing several tags usually makes the estimate more reliable

The subsystem uses ambiguity when deciding whether to accept a single-tag measurement.

---

### Standard Deviation

In this code, **standard deviation** tells the pose estimator how much it should trust a vision measurement.

- Smaller standard deviation means more trust
- Larger standard deviation means less trust

The estimator receives uncertainty for x, y, and rotation:

```java
VecBuilder.fill(
    linearStdDev,
    linearStdDev,
    angularStdDev
)
```

The exact values are stored and tuned in `VisionConstants`. Beginners do not need to calculate standard deviation by hand. The important idea is that nearby multi-tag measurements are usually trusted more than distant single-tag measurements.

---

### Supplier

A `Supplier` is a function that provides a value whenever its `get()` method is called.

In simulation:

```java
Supplier<Pose2d> poseSupplier;
```

This supplier gives the vision simulator the robot's current simulated pose.

---

## `VisionIO.java`

`VisionIO` defines the information every vision camera implementation must provide.

```java
public interface VisionIO {

    record TargetObservation(
        Rotation2d tx,
        Rotation2d ty,
        int fiducialId
    ) {}

    @AutoLog
    class VisionIOInputs {
        public boolean connected = false;

        public TargetObservation
            latestTargetObservation =
                new TargetObservation(
                    new Rotation2d(),
                    new Rotation2d(),
                    -1
                );

        public PoseObservation[]
            poseObservations =
                new PoseObservation[0];

        public int[] tagIds =
            new int[0];
    }

    default void updateInputs(
        VisionIOInputs inputs
    ) {}

    default String getName() {
        return "";
    }
}
```

---

### `TargetObservation`

```java
record TargetObservation(
    Rotation2d tx,
    Rotation2d ty,
    int fiducialId
) {}
```

This stores the latest simple target information:

- Horizontal angle
- Vertical angle
- AprilTag ID

---

## `VisionIOInputs`

### Camera connection

```java
public boolean connected = false;
```

This tells the subsystem whether it can communicate with the camera.

### Latest target

```java
public TargetObservation
    latestTargetObservation =
        new TargetObservation(
            new Rotation2d(),
            new Rotation2d(),
            -1
        );
```

The ID `-1` means that no target was detected.

That is why the subsystem checks for a target using:

```java
public boolean hasTarget(
    int cameraIndex
) {
    return inputs[cameraIndex]
        .latestTargetObservation
        .fiducialId() != -1;
}
```

### Pose observations

```java
public PoseObservation[]
    poseObservations =
        new PoseObservation[0];
```

This array stores robot-pose estimates produced by the camera.

There may be multiple observations because a camera can produce more than one new frame between robot-loop updates.

### Tag IDs

```java
public int[] tagIds =
    new int[0];
```

This stores the IDs of the AprilTags detected by the camera.

---

## `PoseObservation`

The complete pose measurement is stored in `RobotState`:

```java
public record PoseObservation(
    double timestamp,
    Pose3d pose,
    double ambiguity,
    int tagCount,
    double averageTagDistance,
    PoseObservationType type
) {}
```

| Value                | Meaning                                      |
|----------------------|----------------------------------------------|
| `timestamp`          | When the camera image was captured           |
| `pose`               | The estimated robot position                 |
| `ambiguity`          | How uncertain the tag pose may be            |
| `tagCount`           | How many tags were used                      |
| `averageTagDistance` | Average distance from the camera to the tags |
| `type`               | Which vision system created the observation  |

The available types are:

```java
public enum PoseObservationType {
    MEGATAG_1,
    MEGATAG_2,
    PHOTONVISION
}
```

Our PhotonVision cameras use:

```java
PoseObservationType.PHOTONVISION
```

The other types exist because the same `PoseObservation` record can also support Limelight implementations.

---

## `VisionIOPhoton.java`

`VisionIOPhoton` reads results from real PhotonVision cameras.

```java
public class VisionIOPhoton
    implements VisionIO {
```

---

### Creating the camera

```java
protected final PhotonCamera camera;
protected final Transform3d robotToCamera;
private final String name;
```

The constructor creates a `PhotonCamera` using the camera's configured PhotonVision name:

```java
public VisionIOPhoton(
    String name,
    Transform3d robotToCamera
) {
    this.name = name;
    camera = new PhotonCamera(name);
    this.robotToCamera = robotToCamera;
}
```

The name must match the name in the PhotonVision dashboard.

The `robotToCamera` transform stores the camera's mounting position and angle relative to the robot.

---

### Checking the connection

```java
inputs.connected =
    camera.isConnected();
```

This value is later used to create a driver-station warning when a camera disconnects.

---

### Reading new camera results

```java
for (
    var result :
        camera.getAllUnreadResults()
) {
```

`getAllUnreadResults()` returns every new frame that has not already been processed.

This is important because each frame has its own timestamp and may contain a useful pose measurement.

---

### Reading the best target

```java
if (result.hasTargets()) {
    inputs.latestTargetObservation =
        new TargetObservation(
            Rotation2d.fromDegrees(
                result.getBestTarget()
                    .getYaw()
            ),
            Rotation2d.fromDegrees(
                result.getBestTarget()
                    .getPitch()
            ),
            result.getBestTarget()
                .fiducialId
        );
}
```

PhotonVision chooses one detection as the **best target**. The code stores its:

- Yaw as `tx`
- Pitch as `ty`
- Fiducial ID

If no target was found:

```java
inputs.latestTargetObservation =
    new TargetObservation(
        new Rotation2d(),
        new Rotation2d(),
        -1
    );
```

---

## Multi-Tag Results

When PhotonVision detects several AprilTags in one frame, it can calculate a multi-tag pose:

```java
if (
    result.multitagResult
        .isPresent()
) {
```

Multi-tag results are normally more reliable because several known tag locations help constrain the answer.

---

### Converting camera pose to robot pose

PhotonVision provides the camera's field transform:

```java
Transform3d fieldToCamera =
    multitagResult
        .estimatedPose
        .best;
```

The code then uses the camera mounting transform to calculate the robot position:

```java
Transform3d fieldToRobot =
    fieldToCamera.plus(
        robotToCamera.inverse()
    );
```

Finally, it creates the robot pose:

```java
Pose3d robotPose =
    new Pose3d(
        fieldToRobot.getTranslation(),
        fieldToRobot.getRotation()
    );
```

The process is:

```text
Known camera position on field
            │
            ▼
Remove the camera's mounting offset
            │
            ▼
Robot-center position on field
```

---

### Calculating average tag distance

```java
double totalTagDistance = 0.0;

for (var target : result.targets) {
    totalTagDistance +=
        target.bestCameraToTarget
            .getTranslation()
            .getNorm();
}
```

The total distance is divided by the number of targets:

```java
totalTagDistance
    / result.targets.size()
```

This tells the subsystem roughly how far away the observed tags were.

---

### Creating the observation

```java
poseObservations.add(
    new PoseObservation(
        result.getTimestampSeconds(),
        robotPose,
        multitagResult
            .estimatedPose
            .ambiguity,
        multitagResult
            .fiducialIDsUsed
            .size(),
        totalTagDistance
            / result.targets.size(),
        PoseObservationType
            .PHOTONVISION
    )
);
```

This packages all the information needed by `Vision.java`.

---

## Single-Tag Results

If there is no multi-tag result, the code can still estimate robot position from one AprilTag:

```java
} else if (
    !result.targets.isEmpty()
) {
    var target =
        result.targets.get(0);
```

---

### Finding the tag on the field

```java
var tagPose =
    APRIL_TAG_LAYOUT
        .getTagPose(
            target.fiducialId
        );
```

The field layout stores the known position of every AprilTag.

If that tag exists in the layout, the code continues:

```java
if (tagPose.isPresent()) {
```

---

### Calculating the robot pose

The code starts with the tag's known field position:

```java
Transform3d fieldToTarget =
    new Transform3d(
        tagPose.get()
            .getTranslation(),
        tagPose.get()
            .getRotation()
    );
```

It then uses the camera-to-target transform reported by PhotonVision:

```java
Transform3d cameraToTarget =
    target.bestCameraToTarget;
```

The code works backward from the target to the camera:

```java
Transform3d fieldToCamera =
    fieldToTarget.plus(
        cameraToTarget.inverse()
    );
```

Then from the camera to the robot:

```java
Transform3d fieldToRobot =
    fieldToCamera.plus(
        robotToCamera.inverse()
    );
```

This creates the same final type of robot-pose observation as the multi-tag path.

---

### Saving the Inputs

While reading results, the method stores information in flexible Java collections:

```java
Set<Short> tagIds =
    new HashSet<>();

List<PoseObservation>
    poseObservations =
        new ArrayList<>();
```

A `List` is useful because new observations can be added as frames are processed.

A `Set` is useful because it prevents duplicate tag IDs.

At the end, the information is copied into the arrays inside `VisionIOInputs`.

---

## `VisionIOPhotonSim.java`

`VisionIOPhotonSim` creates simulated PhotonVision cameras.

```java
public class VisionIOPhotonSim
    extends VisionIOPhoton {
```

Because it extends `VisionIOPhoton`, it can reuse the same result-processing code used by real cameras.

---

## Creating the simulated field

```java
private static
    VisionSystemSim visionSim;
```

The simulation uses one shared virtual field.

The first simulated camera creates it:

```java
if (visionSim == null) {
    visionSim =
        new VisionSystemSim("main");

    visionSim.addAprilTags(
        APRIL_TAG_LAYOUT
    );
}
```

This adds all AprilTags from the field layout to the virtual field.

---

### Creating a simulated camera

```java
var cameraProperties =
    new SimCameraProperties();

cameraSim =
    new PhotonCameraSim(
        camera,
        cameraProperties
    );
```

`SimCameraProperties` describes how the virtual camera behaves.

The camera is then mounted on the simulated robot:

```java
visionSim.addCamera(
    cameraSim,
    robotToCamera
);
```

The same `robotToCamera` transform is used in real code and simulation.

---

### Updating simulation

```java
@Override
public void updateInputs(
    VisionIOInputs inputs
) {
    visionSim.update(
        poseSupplier.get()
    );

    super.updateInputs(inputs);
}
```

This first tells the vision simulator where the robot currently is.

Then:

```java
super.updateInputs(inputs);
```

runs the normal PhotonVision input code, allowing simulation to follow nearly the same code path as the real robot.

---

## `VisionConstants.java`

`VisionConstants` stores information shared by the vision subsystem.

Important constants include:

```java
APRIL_TAG_LAYOUT
MAX_AMBIGUITY
MAX_ZERROR

LINEAR_STD_DEV_BASELINE
ANGULAR_STD_DEV_BASELINE

HUB_TAG_IDS
ALL_ALLOWED_TAGS
```

It also stores each camera's configuration and creates the appropriate IO objects through:

```java
VisionConstants.getIO()
```

---

### Camera configurations

Each camera configuration needs:

- The camera's PhotonVision name
- The camera's mounting transform
- Any camera-specific trust factors

The mounting transform must match the camera's real position and angle on the robot.

---

### Field layout

```java
APRIL_TAG_LAYOUT
```

The AprilTag field layout maps every tag ID to its known field position.

The same correct layout must be used by both PhotonVision and robot code.

---

### Filtering constants

```java
MAX_AMBIGUITY
MAX_ZERROR
```

These values help the subsystem reject measurements that are probably incorrect.

---

### Standard-deviation constants

```java
LINEAR_STD_DEV_BASELINE
ANGULAR_STD_DEV_BASELINE
```

These values control the starting amount of trust given to vision position and vision rotation measurements.

---

## `Vision.java`

`Vision.java` is the main subsystem.

It:

- Updates each camera
- Logs camera inputs
- Rejects unreasonable poses
- Calculates how strongly to trust each pose
- Sends accepted poses to `RobotState`

---

### Creating camera inputs

```java
this.io =
    VisionConstants.getIO();
```

The correct camera implementations are selected for the current robot mode.

One logged input object is created per camera:

```java
this.inputs =
    new VisionIOInputsAutoLogged[
        io.length
    ];
```

The subsystem also creates one disconnected-camera alert per camera.

---

### Updating the Cameras

Inside `periodic()`:

```java
for (int i = 0; i < io.length; i++) {
    if (
        Toggles.Vision
            .camerasEnabled
            .get(io[i].getName())
            .get()
    ) {
        io[i].updateInputs(
            inputs[i]
        );
    }

    Logger.processInputs(
        "Vision/"
            + io[i].getName(),
        inputs[i]
    );
}
```

This performs two jobs:

1. Ask each enabled camera for new data
2. Log that camera's inputs

---

### Tag Whitelisting

The subsystem can limit which AprilTags are allowed:

```java
private static final
    Set<Integer>
        allowedTagIds =
            new HashSet<>();
```

The whitelist is filled using:

```java
public static void
    whitelistTagIds(
        int... tagIds
    ) {
    allowedTagIds.clear();

    for (int id : tagIds) {
        allowedTagIds.add(id);
    }
}
```

The `int...` syntax is called **varargs**. It allows the method to receive any number of IDs:

```java
Vision.whitelistTagIds(
    1, 2, 3, 4
);
```

The subsystem checks whether a camera sees at least one allowed tag before using its observations.

---

### Rejecting Unreasonable Poses

The code checks each observation:

```java
boolean rejectPose =
    observation.tagCount() == 0
        || (
            observation.tagCount() == 1
            && observation.ambiguity()
                > MAX_AMBIGUITY
        )
        || Math.abs(
            observation.pose().getZ()
        ) > MAX_ZERROR
        || observation.pose().getX()
            < 0.0
        || observation.pose().getX()
            > APRIL_TAG_LAYOUT
                .getFieldLength()
        || observation.pose().getY()
            < 0.0
        || observation.pose().getY()
            > APRIL_TAG_LAYOUT
                .getFieldWidth();
```

A pose is rejected when:

- No tags were used
- A single-tag result has too much ambiguity
- The robot appears far above or below the floor
- The robot appears outside the field

This prevents obviously incorrect measurements from affecting the estimated robot position.

---

### Logging accepted and rejected poses

```java
if (rejectPose) {
    robotPosesRejected.add(
        observation.pose()
    );
} else {
    robotPosesAccepted.add(
        observation.pose()
    );
}
```

This allows programmers to view both groups in AdvantageScope.

It is useful for checking whether the filters are behaving correctly.

---

### Deciding How Much to Trust a Pose

After an observation passes the rejection checks, the code calculates a trust factor:

```java
double stdDevFactor =
    Math.pow(
        observation
            .averageTagDistance(),
        2.0
    )
    / observation.tagCount();
```

You do not need to memorize the formula. Its purpose is simple:

- Farther tags are trusted less
- Observations using more tags are trusted more

Single-tag observations receive an additional penalty:

```java
if (
    observation.tagCount() == 1
) {
    stdDevFactor *= 3.0;
}
```

The factor is then applied to the baseline standard deviations:

```java
double linearStdDev =
    LINEAR_STD_DEV_BASELINE
        * stdDevFactor;

double angularStdDev =
    ANGULAR_STD_DEV_BASELINE
        * stdDevFactor;
```

Each camera can also have its own adjustment factors because different camera positions and viewing angles may produce different levels of accuracy.

<Note title="Main idea">
The subsystem does not treat every camera measurement equally. A close multi-tag result normally receives more trust than a distant single-tag result.
</Note>

---

### Sending Vision to `RobotState`

Accepted observations are sent to the robot's pose estimator:

```java
RobotState.getInstance()
    .addVisionObservation(
        new RobotState
            .VisionObservation(
                observation.timestamp(),
                observation.pose()
                    .toPose2d(),
                VecBuilder.fill(
                    linearStdDev,
                    linearStdDev,
                    angularStdDev
                )
            )
    );
```

This gives `RobotState`:

- The estimated robot pose
- The time the image was captured
- The amount of trust to give the measurement

`RobotState` then combines the vision measurement with wheel odometry and gyro data.

---

### Logging and Visualization

The subsystem records:

```text
Vision/CameraN/TagPoses
Vision/CameraN/RobotPoses
Vision/CameraN/RobotPosesAccepted
Vision/CameraN/RobotPosesRejected
```

It also records summary values across every camera:

```text
Vision/Summary/TagPoses
Vision/Summary/RobotPoses
Vision/Summary/RobotPosesAccepted
Vision/Summary/RobotPosesRejected
```

In simulation or debug mode, the code logs:

- The position of each camera
- The location of visible tags
- Lines from the cameras to the tags

These visualizations help programmers understand what each camera sees and where the subsystem believes the robot is located.

---

## Putting It All Together

```text
PhotonVision detects an AprilTag
              │
              ▼
VisionIOPhoton reads the result
              │
              ▼
Camera pose is converted to robot pose
              │
              ▼
PoseObservation stores the measurement
              │
              ▼
Vision.java checks the measurement
              │
        ┌─────┴─────┐
        ▼           ▼
    Rejected     Accepted
                    │
                    ▼
       Standard deviation is assigned
                    │
                    ▼
       Measurement is sent to RobotState
                    │
                    ▼
     Vision corrects the robot's odometry
```

---

<Quiz questions={[
{
  prompt: "What does a pose describe?",
  options: [
    "Only an object's speed",
    "An object's position and orientation",
    "Only the camera's frame rate",
    "The AprilTag's ID number"
  ],
  correct: 1,
  explanation: "A pose contains both position and orientation. Pose2d stores x, y, and rotation, while Pose3d also includes height, pitch, and roll."
},
{
  prompt: "What are tx and ty?",
  options: [
    "Field coordinates in meters",
    "Horizontal and vertical angular offsets from the camera center",
    "The width and height of the image",
    "Standard deviation values"
  ],
  correct: 1,
  explanation: "PhotonVision reports yaw and pitch angles from the camera crosshair to the target. The code stores them as tx and ty."
},
{
  prompt: "Why is robotToCamera needed?",
  options: [
    "PhotonVision estimates the camera pose, but the robot needs the pose of its own center",
    "It changes the camera's exposure",
    "It selects the AprilTag family",
    "It controls the camera frame rate"
  ],
  correct: 0,
  explanation: "The mounting transform allows the program to remove the camera offset and calculate the robot-center pose."
},
{
  prompt: "Why does PoseObservation contain a timestamp?",
  options: [
    "To name the camera",
    "To compensate for vision latency",
    "To calculate the AprilTag ID",
    "To select the field layout"
  ],
  correct: 1,
  explanation: "The timestamp tells the estimator when the image was captured, since camera results arrive after a delay."
},
{
  prompt: "What does a larger standard deviation mean?",
  options: [
    "The pose estimator trusts the measurement less",
    "The pose estimator trusts the measurement more",
    "The camera detects more tags",
    "The camera is disconnected"
  ],
  correct: 0,
  explanation: "Larger standard deviation means more expected uncertainty, so the estimator gives the measurement less weight."
},
{
  prompt: "Why are multi-tag results normally more reliable?",
  options: [
    "They remove all camera latency",
    "Several known tag locations help constrain the estimated pose",
    "They increase the camera resolution",
    "They use wheel encoders"
  ],
  correct: 1,
  explanation: "Several tags provide more information about the camera's location and reduce uncertainty."
},
{
  prompt: "What does VisionIOPhotonSim do?",
  options: [
    "Creates simulated PhotonVision camera results",
    "Controls camera brightness",
    "Uploads the field layout",
    "Replaces RobotState"
  ],
  correct: 0,
  explanation: "VisionIOPhotonSim creates virtual cameras and AprilTag detections so the vision code can be tested without the real robot."
},
{
  prompt: "What happens to an accepted pose?",
  options: [
    "It is sent directly to the motors",
    "It is sent to RobotState with a timestamp and standard deviations",
    "It changes the camera focus",
    "It is converted into a tag ID"
  ],
  correct: 1,
  explanation: "RobotState receives the pose, timestamp, and uncertainty and combines the measurement with odometry."
}
]} />

---

## Summary

- `VisionIO` defines the information every camera implementation provides.
- `TargetObservation` stores simple aiming angles and a tag ID.
- `PoseObservation` stores a complete timestamped robot-pose measurement.
- `VisionIOPhoton` reads real PhotonVision results.
- Multi-tag and single-tag results are converted from camera position into robot position.
- `VisionIOPhotonSim` creates virtual camera results for simulation.
- `VisionConstants` stores field, camera, filtering, and trust settings.
- `Vision.java` rejects unreasonable poses and sends accepted measurements to `RobotState`.
- Standard deviation controls how strongly the estimator trusts each vision measurement.
- Vision helps correct the drift that naturally develops in wheel odometry.

---

[^camera-offset]: For example, a front camera may be mounted 40 centimeters ahead of the robot center. If PhotonVision finds the camera's field position, the code must account for those 40 centimeters before it knows the robot center's position.

[^latency]: The image must be captured, processed by PhotonVision, and transferred to the roboRIO. The timestamp prevents the delayed result from being treated as if it were captured instantly.

[^sensor-fusion]: Wheel odometry updates quickly but slowly drifts. AprilTags provide known field references but camera measurements can be noisy. Combining both gives a more useful estimate.
