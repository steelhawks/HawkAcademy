---
sidebar_position: 6
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Odometry
You've learnt everything about swerve! Congratulations. Now it's time to dive into a big and conceptually heavy topic: **Odometry**

You'll learn:
- What it is
- How to calculate it
- Where we use it

**A Warning**
This might get tricky in terms of mathematical concepts, so reference a lead programmer if needed

When you're ready, dive in!

---

## What Is Odometry?

**Odometry** is the process of estimating a robot's position and heading on the field *without* any external sensors — purely by tracking how far each wheel has spun and how the robot's gyro has rotated. The word comes from "odometer," the same idea as the mileage counter in a car, just extended to two dimensions and four independently-steered wheels.

Think of it like walking with your eyes closed while counting your steps and remembering which way you turned. You can build a decent guess of where you ended up, but small errors in your step count or turning angle slowly accumulate the longer you walk. That's exactly the tradeoff with wheel odometry: it's **fast, cheap, and always available**, but it **drifts** over time because wheels slip, encoders have tiny errors, and bumps introduce noise.

<Note title="Odometry vs. Pose Estimation">
In our codebase these are two related but distinct things:
- **Odometry** — the raw position estimate computed *only* from wheel encoders + gyro. Nothing else is fused in.
- **Pose Estimation** — odometry *plus* vision corrections (AprilTag camera measurements) blended together using a filter. This is what the rest of the robot actually trusts.

We keep both running side by side: pure odometry as a sanity-check baseline, and the fused pose estimate as the "real" answer.
</Note>

Why do we need this at all? Because almost everything the robot does autonomously — following a path, aligning to a scoring location, leading a shot while driving — requires an answer to the question **"where am I on the field, right now?"** Odometry (fused with vision) is how we answer that question every single loop cycle.

---

## How We Calculate It

### The Core Idea: Twist2d

At the lowest level, odometry works by taking a snapshot of all four **wheel positions** (`SwerveModulePosition`, which stores distance traveled + wheel angle) at two points in time, computing how far each wheel moved between them, and asking WPILib's `SwerveDriveKinematics` to convert those four deltas into a single **`Twist2d`** — a tiny robot-relative motion (dx, dy, dtheta) that happened between those two timestamps. That twist gets added on top of the last known pose to produce the new pose. Do this every loop cycle, forever, and you get a continuously updated position estimate.

```java
Twist2d twist = kinematics.toTwist2d(odometryDeltasBuffer);
rawGyroRotation = rawGyroRotation.plus(new Rotation2d(twist.dtheta));
```

We actually use the **gyro's yaw** for rotation whenever it's connected (gyros are far more accurate for heading than wheel-derived rotation), and only fall back to the kinematics-derived twist rotation if the gyro disconnects:

```java
if (gyroInputs.connected) {
    rawGyroRotation = gyroInputs.odometryYawPositions[i];
} else {
    // Fall back to kinematics
    Twist2d twist = kinematics.toTwist2d(odometryDeltasBuffer);
    rawGyroRotation = rawGyroRotation.plus(new Rotation2d(twist.dtheta));
}
```

### High-Frequency Sampling — Why 50 Hz Isn't Enough

The main robot loop (`periodic()`) only runs at 50 Hz (every 20ms). If the robot is spinning fast, sampling positions only 50 times a second isn't nearly enough — the straight-line approximation between samples starts to noticeably diverge from the real curved path the robot actually took, and odometry drifts.

To fix this, we run a dedicated background thread, `PhoenixOdometryThread`, that samples every module's drive/turn encoders and the gyro's yaw at a much higher rate — **250 Hz on CANivore (CAN FD), 100 Hz otherwise**:

```java
ODOMETRY_FREQUENCY = Constants.getRobot().equals(RobotType.OMEGABOT) ? 250.0 : 100.0;
```

```java
@Override
public void run() {
    while (true) {
        if (isCANFD && phoenixSignals.length > 0) {
            BaseStatusSignal.waitForAll(2.0 / Swerve.ODOMETRY_FREQUENCY, phoenixSignals);
        } else {
            Thread.sleep((long) (1000.0 / Swerve.ODOMETRY_FREQUENCY));
            if (phoenixSignals.length > 0) BaseStatusSignal.refreshAll(phoenixSignals);
        }
        // ...store each new sample + timestamp into ring buffers
    }
}
```

On a CAN FD bus, `waitForAll` blocks until every registered signal updates *together*, giving tightly synchronized timestamps across all four modules and the gyro. Every sample (position + timestamp) is pushed into a `DoubleRingBuffer` — a hand-written, allocation-free circular buffer, used specifically so that sampling at 250 Hz doesn't create garbage-collector pressure on the real-time robot loop.

This means that between two 20ms main-loop cycles, up to 5 extra high-frequency samples accumulate. `SwerveModule` stores all of them, and every single one gets processed as its own tiny odometry update — instead of throwing away that extra precision and only updating once per main loop.

### Processing Every Sample: `processOdometryObservations()`

Once per main loop cycle, `Swerve.processOdometryObservations()` walks through every high-frequency sample collected since the last cycle and reports each one to `RobotState`:

```java
private void processOdometryObservations() {
    double[] sampleTimestamps = swerveModules[0].getOdometryTimestamps();
    int sampleCount = sampleTimestamps.length;

    for (int i = 0; i < sampleCount; i++) {
        for (int moduleIndex = 0; moduleIndex < 4; moduleIndex++) {
            SwerveModulePosition pos = swerveModules[moduleIndex].getOdometryPositions()[i];
            odometryDeltasBuffer[moduleIndex].distanceMeters =
                pos.distanceMeters - lastModulePositions[moduleIndex].distanceMeters;
            odometryDeltasBuffer[moduleIndex].angle = pos.angle;
            odometryPositionsBuffer[moduleIndex].distanceMeters = pos.distanceMeters;
            odometryPositionsBuffer[moduleIndex].angle = pos.angle;
            lastModulePositions[moduleIndex].distanceMeters = pos.distanceMeters;
            lastModulePositions[moduleIndex].angle = pos.angle;
        }

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

Every sample is wrapped into an `OdometryObservation` record (`timestamp`, `wheelPositions`, `gyroAngle`) and handed to `RobotState`, which is the single place that actually maintains the pose.

### RobotState: Where Odometry Becomes a Pose

`RobotState` keeps **two parallel trackers** built from the exact same observations:

```java
private final SwerveDrivePoseEstimator poseEstimator =
    new SwerveDrivePoseEstimator(kinematics, rawGyroRotation, lastModulePositions, new Pose2d());
private final SwerveDriveOdometry wheelOdometry =
    new SwerveDriveOdometry(kinematics, rawGyroRotation, lastModulePositions, new Pose2d());
```

- **`wheelOdometry`** — pure `SwerveDriveOdometry`. Only ever updated from wheel + gyro data. This is "what odometry alone thinks," useful for comparing against the fused estimate to see how much vision is correcting.
- **`poseEstimator`** — a `SwerveDrivePoseEstimator`, which does everything `wheelOdometry` does internally, **plus** it can accept vision measurements and blend them in using a Kalman-filter-like approach.

Every odometry observation updates both:

```java
public void addOdometryObservation(OdometryObservation observation) {
    if (observation.gyroAngle() != null) {
        gyroRotation = observation.gyroAngle();
        rawGyroRotation = observation.gyroAngle();
    }
    Pose2d estimatedPose = poseEstimator.updateWithTime(
        observation.timestamp(), gyroRotation, observation.wheelPositions());
    wheelOdometry.update(gyroRotation, observation.wheelPositions());
    poseBuffer.addSample(observation.timestamp(), estimatedPose);
}
```

`updateWithTime` (and `.update`) both do the same core math under the hood: convert the delta in wheel positions into a `Twist2d` using kinematics, apply the gyro-corrected rotation, and integrate that twist onto the previous pose. WPILib handles this for us — we just feed in samples.

<Note title="Why keep a poseBuffer too?">
`RobotState` also stores every estimated pose into a `TimeInterpolatableBuffer<Pose2d>` (`poseBuffer`), which lets any other subsystem ask "what was the robot's pose 0.3 seconds ago?" — useful for vision latency compensation (a camera frame captured slightly in the past needs to be matched against the pose at *that* moment, not the current one) and for object detection math (see `ObjectVision`, later).
</Note>

### Fusing In Vision — Correcting the Drift

Wheel odometry alone always drifts over a match — wheels slip when accelerating hard, encoders have small errors that compound, and bumps add noise. To correct this, camera measurements (AprilTag detections) are periodically fed in as **vision observations**:

```java
public void addVisionObservation(VisionObservation observation) {
    poseEstimator.addVisionMeasurement(
        observation.robotPose(),
        observation.timestamp(),
        observation.stdDevs()
    );
}
```

Each `VisionObservation` carries a **standard deviation vector** — essentially "how much do I trust this measurement" for x, y, and rotation. `Vision.java` computes this dynamically based on how far away the tag is, how many tags were seen, and whether the camera is using MegaTag2:

```java
double stdDevFactor =
    Math.pow(observation.averageTagDistance(), 2.0) / observation.tagCount();
if (observation.tagCount() == 1) stdDevFactor *= 3.0;
// ...
double linearStdDev = LINEAR_STD_DEV_BASELINE * stdDevFactor;
double angularStdDev = ANGULAR_STD_DEV_BASELINE * stdDevFactor;
```

The intuition: a tag seen from far away, or with only one tag in frame, gives a noisier pose estimate — so its standard deviation (uncertainty) is scaled up, and the pose estimator's internal filter trusts it *less* relative to odometry. A close, multi-tag observation gets a low standard deviation and pulls the pose estimate toward it more strongly.

We also **widen the vision standard deviation whenever we detect the robot is currently unstable**, such as driving over a bump:

```java
if (RobotContainer.s_Swerve.isOnBump()) {
    linearStdDev *= VisionConstants.baselineDropOdomFactor.get();
    angularStdDev *= VisionConstants.baselineDropOdomFactor.get();
}
```

This is the opposite direction of trust: while bumping, camera images are blurry and unreliable, so vision is trusted *less* and odometry is (temporarily) trusted more.

<Note title="Rejecting bad vision data entirely">
Before a vision observation is even turned into a standard deviation, `Vision.java` rejects it outright if it looks obviously wrong: zero tags seen, a single ambiguous tag, the reported pose floating off the ground (Z error), or a position that's literally off the edge of the field. This "garbage in" filtering happens before fusion, so no amount of standard deviation tuning has to compensate for a completely wrong pose.
</Note>

### Putting the Whole Pipeline Together

```
PhoenixOdometryThread (background, 100–250 Hz)
      │  samples wheel + gyro encoders into ring buffers
      ▼
Swerve.processOdometryObservations()  (main loop, 50 Hz)
      │  every buffered sample → OdometryObservation
      ▼
RobotState.addOdometryObservation()
      ├─ wheelOdometry.update()        → pure odometry pose (drifts over time)
      └─ poseEstimator.updateWithTime() → filtered pose (still just odometry so far)
      │
      ▼
Vision.java (whenever a camera sees an AprilTag)
      │  computes VisionObservation with a trust (stdDev) value
      ▼
RobotState.addVisionObservation()
      └─ poseEstimator.addVisionMeasurement()  → corrects drift, pulls pose toward vision
      │
      ▼
RobotState.getEstimatedPose()   ← the number everything else in the robot uses
```

The end result, `getEstimatedPose()`, is odometry's speed and reliability (it never "loses" the robot, even with no cameras visible) combined with vision's long-term accuracy (it prevents the slow drift odometry alone would accumulate over a 2.5 minute match).

---

## Where We Use It

Odometry (via the fused `RobotState.getEstimatedPose()`, or occasionally the raw `getWheelOdometryPose()`) is read constantly throughout the codebase — it answers "where am I" for nearly every subsystem that isn't purely reactive to joystick input.

| Consumer | What it reads | Why |
|---|---|---|
| `Autos` / trajectory following | `getEstimatedPose()` | Compares current pose against the planned trajectory sample to compute a feedback correction (`followTrajectory`) |
| `SwerveDriveAlignment` | `getEstimatedPose()` | Drives the robot to an exact target pose for precision scoring alignment |
| `Swerve.alignAtGoal()` | `getEstimatedPose().getRotation()` | Checks if the robot's current heading matches the alignment PID's goal within tolerance |
| `TeleopSwerve` | `getEstimatedPose()` | Field-boundary checks (e.g. detecting which half of the field the robot is on) during driver control |
| `FieldConstants.getClosestPointOnLine` | `getEstimatedPose()` | Finds the nearest point on a field line (e.g. the ferrying line) relative to the robot, for aiming logic |
| `ShooterStructure` / `Flywheel` (Shoot-on-the-move) | `getEstimatedPose()`, `getRotation()` | Computes the robot's 3D pose for turret geometry and leads a moving shot using position + velocity |
| `Turret` | `getEstimatedPose` (via constructor reference) | Knows the robot's field position to calculate the angle toward a fixed target (like the hub) |
| `Boundary` / zone triggers (trench, near-hub, in-bump) | `getEstimatedPose` | Checks whether the robot's footprint has entered a rectangular field region, used to build WPILib `Trigger`s |
| `Vision` (self-referential sanity checks) | `getEstimatedPose().getX()/getY()` | Rejects vision measurements that would place the robot off the actual field, and scales down trust while off-field |
| `ObjectVision` | `getEstimatedPose()`, `getWheelOdometryPose()`, `getPoseAtTime()` | Reconstructs where the robot *was* when a game-piece detection frame was captured, to correctly place the detected object on the field despite camera + network latency |
| `Robot.java` (dashboard / logging) | `getEstimatedPose()` | Builds a 3D turret pose for AdvantageScope visualization |
| `RobotContainer` | `getEstimatedPose()` | Field-half checks used to configure driver-facing behavior |

<Note title="The general pattern">
Notice that almost nothing above talks to `Swerve`'s wheel encoders or the gyro directly — they all go through `RobotState.getEstimatedPose()`. This is the same "ask, don't recompute" rule you saw in the previous section: `RobotState` is the single owner of "where is the robot," and every other subsystem treats it as a service to query rather than re-deriving position from raw sensors itself.
</Note>

### A Special Case: `ObjectVision` and Time Travel

One of the more interesting uses of odometry is in `ObjectVision`, which detects game pieces on the field using a camera. Because there's latency between when a camera frame was captured and when the robot code processes it, the robot's *current* pose isn't the right one to use — you need to know where the robot was **at the exact timestamp the photo was taken**:

```java
Optional<Pose2d> oldWheelOdomPose = RobotState.getInstance().getPoseAtTime(observation.timestamp());
var estimatedPose = RobotState.getInstance().getEstimatedPose();
var wheelOdometryPose = RobotState.getInstance().getWheelOdometryPose();
Pose2d fieldToRobot =
    estimatedPose.transformBy(new Transform2d(wheelOdometryPose, oldWheelOdomPose.get()));
```

This blends three different pose sources: the historical pose buffer (`getPoseAtTime`, built from the `TimeInterpolatableBuffer` mentioned earlier), the current fused estimate, and the current pure-odometry pose — to reconstruct an accurate historical position even though vision corrections may have shifted the pose *after* that frame was captured. This is a good example of why keeping the raw `wheelOdometry` tracker around separately (and not just the fused estimator) turns out to be useful.

---

<Quiz questions={[
{
  prompt: "What is the core difference between 'odometry' and 'pose estimation' in this codebase?",
  options: [
    "They are the same thing, just different names",
    "Odometry only uses wheel encoders + gyro; pose estimation additionally fuses in vision (AprilTag) measurements to correct drift",
    "Pose estimation is only used in simulation",
    "Odometry uses vision and pose estimation uses only wheels"
  ],
  correct: 1,
  explanation: "wheelOdometry is a SwerveDriveOdometry updated purely from wheel + gyro data. The poseEstimator does the same thing but also accepts addVisionMeasurement() calls to correct the accumulated drift using camera data."
},
{
  prompt: "Why does PhoenixOdometryThread sample at 100-250 Hz instead of just using the 50 Hz main loop?",
  options: [
    "TalonFX motors require faster updates to function at all",
    "WPILib requires all odometry code to run above 100 Hz",
    "It has no effect on accuracy, it's just for smoother logging",
    "Higher-frequency samples reduce integration error, especially during fast rotation, since more (smaller, more accurate) position deltas are captured between main loop cycles",
  ],
  correct: 3,
  explanation: "Each Twist2d integration step is an approximation. Smaller time steps (more samples) approximate the robot's true curved motion more closely, especially when the robot is spinning quickly, reducing drift."
},
{
  prompt: "In processOdometryObservations(), why is the gyro's yaw preferred over the kinematics-derived Twist2d rotation whenever the gyro is connected?",
  options: [
    "The gyro is required by WPILib",
    "It's arbitrary, both are equally accurate",
    "Kinematics-derived rotation from wheel deltas is less accurate than a dedicated gyro, which directly measures rotation and isn't affected by wheel slip",
    "The kinematics twist doesn't include rotation data at all"
  ],
  correct: 2,
  explanation: "Wheel-derived rotation can be thrown off by wheel slip or small encoder errors on individual modules. A dedicated gyro measures rotation directly and is far more reliable, so it's used whenever available, with kinematics only as a fallback if the gyro disconnects."
},
{
  prompt: "What does a HIGHER standard deviation value passed into addVisionMeasurement() mean?",
  options: [
    "The vision measurement is trusted LESS, so the pose estimator will weight it less heavily relative to odometry",
    "The vision measurement is trusted MORE and will pull the pose estimate strongly toward it",
    "It has no effect on the fusion, only on logging",
    "It forces the pose estimator to reject the measurement entirely"
  ],
  correct: 0,
  explanation: "Standard deviation represents uncertainty/noise. A higher stdDev means 'this measurement is less certain,' so the internal filter blends it in more gently. This is why stdDevFactor is scaled up for far-away or single-tag observations, and further widened while isOnBump() is true."
},
{
  prompt: "Why does ObjectVision call getPoseAtTime(observation.timestamp()) instead of just using getEstimatedPose()?",
  options: [
    "getEstimatedPose() doesn't exist yet at that point in the code",
    "getPoseAtTime() is faster to compute",
    "It's purely a stylistic choice with no functional difference",
    "Because of latency between when the camera frame was captured and when it's processed, the robot's pose at that exact past timestamp is needed to correctly place the detected object, not the robot's current pose",

  ],
  correct: 3,
  explanation: "By the time a camera detection is processed, the robot has moved. Using the current pose would misplace the detected object. getPoseAtTime() looks up the interpolated historical pose from the poseBuffer at the exact moment the photo was taken, giving an accurate field position for the detection."
}
]} />
