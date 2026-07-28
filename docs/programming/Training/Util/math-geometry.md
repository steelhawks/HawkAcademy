---
sidebar_position: 2
title: Math & Geometry
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Math & Geometry

Many subsystem eventually needs to answer questions like "how far away is that?", "which way is that pointing on Red alliance?", or "is any part of my robot inside this zone on the field?" Rather than solving those problems from scratch in these subsystem, we solve them once in `org.steelhawks.util` and its `geometry` sub-package, and reuse them everywhere.

This page covers the five classes that make up our math and geometry toolkit:

- `Maths` &rarr; small, general-purpose math helpers used throughout the codebase
- `AllianceFlip` &rarr; mirrors field coordinates across Red and Blue alliance
- `geometry/RobotFootprint` &rarr; models the robot's physical shape, including extending mechanisms
- `geometry/Boundary` &rarr; turns a field zone into a WPILib `Trigger`
- `AprilTag` &rarr; a tiny record pairing a tag ID with its field pose

By the end, you'll know not just what each method does, but *why* it exists &rarr; usually because the same problem kept showing up in multiple subsystems.

---

## `Maths`

`Maths` is a grab-bag of small, `static`, stateless helper methods. None of them are complicated on their own &rarr; the value is in having them written once, tested once, and never rewritten slightly differently (and slightly wrong) in five different subsystems.

### Comparing doubles safely &rarr; `epsilonEquals`

Floating-point numbers are almost never *exactly* equal, even when they mathematically should be. Comparing `a == b` on two `double`s that both represent "the flywheel is at speed" can fail due to tiny rounding errors.

```java
private static final double kEpsilon = 1e-6;

public static boolean epsilonEquals(double a, double b, double epsilon) {
    return Math.abs(a - b) <= epsilon;
}

public static boolean epsilonEquals(double a, double b) {
    return epsilonEquals(a, b, kEpsilon);
}
```
<Note title="Definition: Epsilon">
Epsilon just means a very teensy tiny positive number, so `1e-1` just means 1/10, and as the `-1` increases it becomes 1/100, 1/1000 ...
</Note>
This is used all over the codebase to check "are we close enough to our setpoint to call it done?":

```java
// Turret.java
atGoal = Maths.epsilonEquals(getPosition().getRadians(), desiredRotation.getRadians(), tolerance);

// Hood.java
atGoal = Maths.epsilonEquals(getPositionDeg(), setpoint.getDegrees(), constants.tolerance());

// Flywheel.java
Maths.epsilonEquals(
    (inputs.leftVelocityRadPerSec + inputs.rightVelocityRadPerSec) / 2.0,
    targetVelocityRadPerSec,
    velocityTolerance.get());
```

Notice the three-argument overload lets each subsystem supply its own tolerance, while the two-argument version falls back to a tiny default (`1e-6`) for cases where you just want "basically equal."

<Note title="Why not just use == ?">
Two doubles that represent the same real-world value can differ by a tiny amount purely from how floating-point math rounds intermediate calculations. `epsilonEquals` treats "close enough" as equal, which is what you actually want when checking "did the mechanism reach its target?" That's the purpose of <strong>tolerance</strong> It is used to determine *how close can x get to y*
</Note>

---

### Angle wrapping and conversion

Angles are a constant source of bugs in robot code because there's no single "correct" range &rarr; sometimes you want `0°`–`360°`, sometimes `-180°`–`180°`, sometimes radians instead of degrees. `Maths` centralizes all four conversions so nobody has to re-derive the modulo math:

```java
/**
 * @param angle angle in degrees
 * @return angle in the range of 0 to 360
 */
public static double continuous180To360(double angle) {
    return (angle + 360) % 360;
}

/**
 * @param angle angle in radians
 * @return returns a continuous angle from 0-2pi to an angle that is -pi to pi
 */
public static double convert360To180Rad(double angle) {
    return MathUtil.angleModulus(angle);
}

/**
 * @param angle angle in degrees
 * @return returns a continuous angle from 0-360 to an angle that is -180 to 180
 */
public static double convert360To180(double angle) {
    return Math.toDegrees(convert360To180Rad(Math.toRadians(angle)));
}
```

`convert360To180Rad` leans on WPILib's own `MathUtil.angleModulus` instead of reinventing wrap-around math, and the degree version just converts to radians, calls the radian version, and converts back. This is a good example of a utility method whose entire value is **not having to remember which library function does the wrapping** every time you need it.

<Note title="New term: angle wrapping">
"Wrapping" an angle means constraining it back into a fixed range (like -180° to 180°) after some calculation might have pushed it outside that range &rarr; for example, subtracting two headings can produce something like 350°, which really means -10° once wrapped. This is a concept learned in algebra 2 about angles, and the unit circle. Ask a lead programmer for more information if curious!
</Note>

<Note title="What does % (the modulo operator) actually do?">
`%` gives you the *remainder* after division. `370 % 360` is `10`, because `370` is exactly one full `360` "lap" plus `10` left over. That's exactly what you want for angles: going past `360°` should just wrap back around to the small leftover amount, the same way an odometer rolling past `99999` miles wraps back to `00000`. `continuous180To360` adds `360` before taking `% 360` specifically so that negative angles (like `-10°`) also come out positive (`350°`) instead of staying negative.
</Note>

<Note title="Radians vs. degrees">
Degrees split a full circle into 360 equal pieces &rarr; a leftover from ancient Babylonian astronomy. Radians instead measure an angle by the length of the arc it traces out on a circle of radius 1, which means a full circle is exactly `2π` radians (`π ≈ 3.14159`) instead of `360`. Most robotics math (trig functions, rotation matrices, WPILib's own `Rotation2d`) is written in radians internally because the formulas come out cleaner, but degrees are usually easier for a human to reason about ("turn 90°"), which is why `Maths` provides conversions in both directions.
</Note>

---

### Unit conversions: wheel speed and distance

Swerve modules report their state in rotations and rotations-per-second, but the rest of the robot generally thinks in meters and meters-per-second. `Maths` provides both directions of each conversion so you never have to remember whether to multiply or divide by circumference:

```java
public static double RPSToMPS(double wheelRPS, double circumference) {
    return wheelRPS * circumference;
}

public static double MPSToRPS(double wheelMPS, double circumference) {
    return wheelMPS / circumference;
}

public static double rotationsToMeters(double wheelRotations, double circumference) {
    return wheelRotations * circumference;
}

public static double metersToRotations(double wheelMeters, double circumference) {
    return wheelMeters / circumference;
}
```

The pattern is always the same: multiplying by the wheel's circumference converts a "spins" quantity into a "meters" quantity, and dividing does the reverse. Having all four spelled out as named methods (instead of an inline `* circumference` scattered through swerve code) makes it obvious at the call site which direction the conversion is going.

<Note title="Why does circumference matter here?">
A wheel's circumference is the distance around its outer edge (`circumference = π × diameter`). One full rotation of the wheel rolls it forward exactly one circumference's worth of distance &rarr; picture unrolling the wheel's edge onto the ground like a tape measure. So "0.5 rotations" times "a 0.3 m circumference" tells you the wheel rolled `0.15 m` forward. That's the whole trick behind every one of these four conversions: rotations become meters (or meters-per-second) by multiplying by circumference, and meters become rotations by dividing by it.
</Note>

---

### Bridging WPILib geometry and `dyn4j`

Some of our physics-adjacent code (like trajectory and shot-solving math) uses the [`dyn4j`](https://dyn4j.org/) physics library, which has its own `Vector2`/`Vector3` types, separate from WPILib's `Translation2d`/`Translation3d`/`Pose2d`/`Pose3d`. `Maths` provides small converters so the two libraries can talk to each other:

```java
public static Vector2 toVector2(Translation2d translation) {
    return new Vector2(translation.getX(), translation.getY());
}

public static Vector2 toVector2(Pose2d pose) {
    return toVector2(pose.getTranslation());
}

public static Translation2d toTranslation2d(Vector2 vector) {
    return new Translation2d(vector.x, vector.y);
}

public static Vector3 toVector3(Translation3d translation) {
    return new Vector3(translation.getX(), translation.getY(), translation.getZ());
}

public static Vector3 toVector3(Pose3d translation) {
    return toVector3(translation.getTranslation());
}
```

There's also a batch version for converting whole arrays at once:

```java
public static Translation2d[] toTranslation2dArray(Vector2[] vector) {
    Translation2d[] translation = new Translation2d[vector.length];
    for (int i = 0; i < vector.length; i++) {
        translation[i] = new Translation2d(vector[i].x, vector[i].y);
    }
    return translation;
}
```

<Note title="Why keep two different vector types around at all?">
`dyn4j` is a general-purpose 2D physics engine with its own math types, built long before WPILib existed. Rather than rewriting our shot-solving physics code to avoid `dyn4j`, we just convert at the boundary, wherever WPILib types need to become `dyn4j` types (or back).
</Note>

<Note title="New terms: Vector, Translation, Pose, and Rotation">
These four types all describe "where something is," but each answers a slightly different question:
- A **vector** (`Vector2`/`Vector3`) is just an arrow with a length and direction, most commonly used to represent a displacement (like "3 meters this way, 2 meters that way") or a velocity.
- A **`Translation2d`/`Translation3d`** is WPILib's version of the same idea: a specific point in space, described as an X (and Y, and Z) offset from some origin. Practically, `Translation2d` and `Vector2` hold the exact same information (`x` and `y`) &rarr; that's why converting between them is as simple as copying the two numbers over, as seen above.
- A **`Rotation2d`** describes *only* an orientation (which way something is facing), with no position information at all.
- A **`Pose2d`/`Pose3d`** combines a translation *and* a rotation together &rarr; both "where" and "which way it's facing." This is why you'll see poses used for anything that needs a full description of the robot, like its estimated position on the field.
</Note>

---

### Building poses and translations from partial data

Sometimes you have a `Rotation2d` but need a full `Pose2d`, or a `Translation2d` but need to add a height to make it a 3D point. Rather than writing `new Pose2d(Translation2d.kZero, rotation)` inline everywhere, `Maths` gives these a name:

```java
public static Pose2d pose2dFromRotation(Rotation2d rotation) {
    return new Pose2d(Translation2d.kZero, rotation);
}

public static Pose2d pose2dFromTranslation(Translation2d translation) {
    return new Pose2d(translation, Rotation2d.kZero);
}

public static Translation3d fromTranslation2dWithZ(Translation2d translation, double z) {
    return new Translation3d(translation.getX(), translation.getY(), z);
}

public static Translation3d fromTranslation2dWithZ(Pose2d pose, double z) {
    return fromTranslation2dWithZ(pose.getTranslation(), z);
}
```

You'll see these used when logging or when lifting a flat 2D field position into 3D space for shot-solving math. For example, `Constants.java` uses `pose2dFromTranslation` purely so a bare `Translation2d` can be logged to AdvantageScope's field view (which expects full poses):

```java
// Constants.java
Logger.recordOutput("Coordinate/" + name, Maths.pose2dFromTranslation(translation));
```

And `RobotState.java` uses `fromTranslation2dWithZ` to add a height component when working with object-detection data:

```java
// RobotState.java
Maths.fromTranslation2dWithZ(/* ... */)
```

---

### One more: seconds to microseconds

```java
/**
 * @param seconds Time in seconds
 * @return Time in microseconds
 */
public static double secondsToMicroseconds(double seconds) {
    return seconds * 1e6;
}
```

Small, but it exists for the same reason as everything else in `Maths`: multiplying by `1e6` inline is easy to get wrong (is it `1e6` or `1e-6`?) if you have to remember it every time.

<Note title="The theme across all of Maths">
Nothing in `Maths` is hard math. The entire value of this class is that these tiny, easy-to-get-subtly-wrong conversions are written **once**, given a clear name, and documented with a Javadoc comment, instead of being retyped (and occasionally miscalculated) in a dozen different subsystems.
</Note>

---

## `AllianceFlip`

FRC fields are symmetric: the Red alliance's side of the field is a mirror image of the Blue alliance's side. Rather than writing every autonomous routine, every scoring target, and every field boundary twice (once for each alliance), we write everything assuming Blue alliance, and then **flip** it at the last moment if we're actually on Red.

```java
public class AllianceFlip {

    public static boolean shouldFlip() {
        return DriverStation.getAlliance().isPresent()
            && DriverStation.getAlliance().get() == DriverStation.Alliance.Red;
    }

    public static double applyX(double x) {
        return shouldFlip() ? FieldConstants.FIELD_LENGTH - x : x;
    }

    public static double applyY(double y) {
        return shouldFlip() ? FieldConstants.FIELD_WIDTH - y : y;
    }
    // ...
}
```

`shouldFlip()` is the one method everything else is built on: it asks the Driver Station what alliance we're on, and returns `true` only if we're Red. Every other method in the class follows the same shape &rarr; *if we should flip, mirror the coordinate; otherwise, pass it through unchanged.*

### Flipping a single coordinate

Mirroring an X coordinate across the field just means subtracting it from the field's total length; mirroring Y works the same way with the field's width:

```java
public static double applyX(double x) {
    return shouldFlip() ? FieldConstants.FIELD_LENGTH - x : x;
}

public static double applyY(double y) {
    return shouldFlip() ? FieldConstants.FIELD_WIDTH - y : y;
}
```

<Note title="Why does subtracting from the field length mirror a coordinate?">
Picture the field as a number line from `0` to `FIELD_LENGTH`. A point 2 meters from the Blue wall (`x = 2`) should mirror to a point 2 meters from the Red wall, which is `FIELD_LENGTH - 2`. In general, for any point `x` on that line, its mirror image across the midpoint is `FIELD_LENGTH - x` &rarr; you can check this works because a point sitting exactly on the midline (`x = FIELD_LENGTH / 2`) maps to itself, and a point at `x = 0` maps to `x = FIELD_LENGTH` (the opposite wall), which is exactly what "mirroring" should do.
</Note>

### Flipping every WPILib geometry type

Once `applyX`/`applyY` exist, every other overload is built by combining them. A `Translation2d` flips both its coordinates:

```java
public static Translation2d apply(Translation2d translation) {
    return new Translation2d(applyX(translation.getX()), applyY(translation.getY()));
}
```

A `Rotation2d` flips by adding 180° (`Rotation2d.kPi`) &rarr; facing "away from your alliance wall" on Blue becomes facing "away from your alliance wall" on Red, which is a rotation of exactly π radians:

```java
public static Rotation2d apply(Rotation2d rotation) {
    return shouldFlip() ? rotation.rotateBy(Rotation2d.kPi) : rotation;
}
```

A `Pose2d` is just a `Translation2d` plus a `Rotation2d`, so it flips both parts together:

```java
public static Pose2d apply(Pose2d pose) {
    return shouldFlip()
        ? new Pose2d(apply(pose.getTranslation()), apply(pose.getRotation()))
        : pose;
}
```

The 3D versions (`Translation3d`, `Rotation3d`, `Pose3d`) work identically, except a translation's height (`Z`) is never flipped &rarr; only X and Y are field-relative:

```java
public static Translation3d apply(Translation3d translation) {
    return new Translation3d(
        applyX(translation.getX()), applyY(translation.getY()), translation.getZ());
}
```

There's also an overload for `Rectangle2d`, which flips the rectangle's center point and rotation the same way &rarr; this is what lets a single rectangle definition (like a trigger zone) work correctly on both alliances:

```java
public static Rectangle2d apply(Rectangle2d rectangle) {
    Translation2d center = apply(
        new Translation2d(
            rectangle.getCenter().getX(),
            rectangle.getCenter().getY()));
    return new Rectangle2d(
        new Pose2d(center, apply(rectangle.getRotation())),
            rectangle.getMeasureXWidth().in(Meters),
            rectangle.getMeasureYWidth().in(Meters));
}
```
<Note title="Function Naming">
A lot of the functions you just saw have the same name: `apply` A function can only be named the same name as another one if the return type is different and the parameters are different.
</Note>

### Where we actually use it

`AllianceFlip` shows up constantly, anywhere a field-relative coordinate is hardcoded assuming Blue alliance. A few real examples from `Rebuilt2026`:

**Aiming at the hub**, no matter which alliance we're on &rarr; the hub's *position on the field* is different for Red vs. Blue, but the code only ever needs to define it once:

```java
// Robot.java
var projectileData = ShooterStructure.Static.calculateShot(
    AllianceFlip.apply(FieldConstants.Hub.HUB_CENTER_3D),
    AllianceFlip.apply(FieldConstants.Hub.HUB_CENTER_3D));
```

**Field boundary triggers**, so a trench or "near hub" zone is defined once (relative to Blue) and mirrored automatically for Red:

```java
// RobotState.java
Boundary.asTrigger(
    "LeftTrench",
    () -> AllianceFlip.apply(FieldConstants.Trench.TRENCH_LEFT_TRIGGER_BOX),
    this::getEstimatedPose,
    footprint,
    Boundary.Mode.PERIMETER)
```

**Autonomous starting pose error checking**, comparing the robot's actual position against where a Blue-defined trajectory's start pose would be if flipped onto our real alliance:

```java
// Autos.java
double xError = AllianceFlip.applyX(trajectory.initialPoseBlue().getX())
    - RobotState.getInstance().getEstimatedPose().getX();
```

<Note title="The alternative nobody wants">
Without `AllianceFlip`, every single field constant, autonomous path, and scoring target would need a Red version and a Blue version defined separately &rarr; doubling the amount of field geometry to maintain, and doubling the chance that one of the two versions has a typo that only shows up during a Red-alliance match.
</Note>

---

## `geometry/RobotFootprint`

Most of the time, "where is the robot" means "where is the robot's center" &rarr; a single `Pose2d`. But some questions need more than a single point: *is any part of the robot, including an extended intake, inside this zone?* That requires knowing the robot's actual physical shape, not just its center.

`RobotFootprint` models that shape as a rectangle (the bumpers) plus zero or more **extensions** &rarr; mechanisms that stick out from the robot in some direction by a variable amount.

### The base rectangle

```java
private final double bumperHalfX; // half-width along robot X axis (front/back), meters
private final double bumperHalfY; // half-width along robot Y axis (left/right), meters

public RobotFootprint(double bumperWidthX, double bumperWidthY) {
    this.bumperHalfX = bumperWidthX / 2.0;
    this.bumperHalfY = bumperWidthY / 2.0;
}
```

The constructor just takes the robot's full bumper dimensions and stores half-widths, since almost every calculation that follows needs "distance from center to edge," not "total width."

### Adding an extension

An `Extension` is a named mechanism that protrudes from the robot center in a fixed robot-relative direction, with a length that can change live (like an intake sliding in and out):

```java
public static class Extension {
    private final String name;
    private final Rotation2d direction;
    private final DoubleSupplier extensionMeters;

    public Extension(String name, Rotation2d direction, DoubleSupplier extensionMeters) {
        this.name = name;
        this.direction = direction;
        this.extensionMeters = extensionMeters;
    }
    // ...
}
```

Using a `DoubleSupplier` instead of a plain `double` means the extension's length is always read fresh &rarr; if the intake retracts, the footprint shrinks back down automatically on the very next call, with no manual updating required.

<Note title="New term: DoubleSupplier">
A `DoubleSupplier` is a *functional interface* &rarr; instead of storing a fixed number, it stores a tiny piece of code (usually written as a lambda, `() -> ...`) that gets run fresh every time you call `.getAsDouble()` on it. Storing `double extLength = intake.getPosition()` would freeze in whatever the intake's position happened to be *at that instant*, and it would never update again. Storing `DoubleSupplier` instead means every call to `getExtensionMeters()` re-runs the lambda and asks the intake for its *current* position, so the footprint is always accurate even as the intake moves in real time.
</Note>

`RobotState` wires this up for our actual intake:

```java
// RobotState.java
private final RobotFootprint footprint =
    new RobotFootprint(
        Constants.RobotConstants.ROBOT_LENGTH_WITH_BUMPERS,
        Constants.RobotConstants.ROBOT_WIDTH_WITH_BUMPERS)
            .withExtension(new RobotFootprint.Extension(
            "Intake",
                Rotation2d.fromDegrees(0.0),
            () -> RobotContainer.s_Intake == null ? 0.0 : RobotContainer.s_Intake.getPosition()));
```

`withExtension` returns `this`, so extensions can be chained fluently right in the constructor call, as shown above.

### Computing the actual footprint points

Given the robot's current pose, `getPoints` returns every point that currently defines the robot's outline: the four bumper corners, plus the tip of every extension that's currently extended.

```java
public List<Translation2d> getPoints(Pose2d robotPose) {
    List<Translation2d> points = new ArrayList<>();
    double[][] corners = {
        { bumperHalfX,  bumperHalfY},
        { bumperHalfX, -bumperHalfY},
        {-bumperHalfX, -bumperHalfY},
        {-bumperHalfX,  bumperHalfY}
    };
    for (double[] corner : corners) {
        points.add(toFieldFrame(robotPose, corner[0], corner[1]));
    }

    for (Extension ext : extensions) {
        double extLength = ext.getExtensionMeters();
        if (extLength <= 0.0) continue;

        Rotation2d fieldAngle = robotPose.getRotation().plus(ext.getDirection());
        double bumpOffset = bumperProjection(ext.getDirection());

        double totalReach = bumpOffset + extLength;
        double dx = totalReach * fieldAngle.getCos();
        double dy = totalReach * fieldAngle.getSin();

        points.add(robotPose.getTranslation().plus(new Translation2d(dx, dy)));
    }
    return points;
}
```

Two ideas are doing the real work here:

- **`toFieldFrame`** takes a robot-relative point (like a bumper corner) and rotates + translates it into field coordinates, using the exact same rotation formula from the odometry practice page (`fx = x*cos - y*sin`, `fy = x*sin + y*cos`, then add the robot's position).
- **`bumperProjection`** answers "how far is it from the robot's center to the bumper's edge, in this specific direction?" &rarr; this matters because an extension pointing diagonally out of a corner has a different bumper-to-edge distance than one pointing straight out of a flat side.

<Note title="New terms: robot frame vs. field frame">
A "frame" is just a choice of origin `(0, 0)` and axis directions to measure coordinates from. The **robot frame** measures everything relative to the robot's own center and the direction it's currently facing &rarr; "1 meter in front of the robot" always means the same thing regardless of where the robot is or which way it's turned. The **field frame** measures everything relative to a fixed spot on the actual field (usually a corner) &rarr; "1 meter from the Blue wall" always means the same physical spot regardless of where the robot is. Bumper corners and extension directions are naturally defined in the robot frame (they don't move when the robot drives around), but a `Boundary`/`Rectangle2d` check needs field-frame points, so `toFieldFrame` converts one into the other.
</Note>

<Note title="Where does fx = x*cos - y*sin come from?">
This is called a **rotation matrix**, and it's the standard formula for rotating a 2D point by some angle `θ` around the origin. If you rotate a point `(x, y)` by angle `θ`, the new coordinates are `x' = x·cos(θ) - y·sin(θ)` and `y' = x·sin(θ) + y·cos(θ)`. Here, `θ` is the robot's current heading &rarr; rotating the robot-relative corner by the robot's heading turns "2 meters to my front-left" into "2 meters in *this specific compass direction*," matching however the robot is actually oriented on the field. After rotating, you still need to **translate** (add the robot's field position) to shift the point from "relative to the robot" to "an absolute spot on the field" &rarr; rotate first, then translate, in that order.
</Note>

```java
private double bumperProjection(Rotation2d robotRelativeAngle) {
    double cos = Math.abs(robotRelativeAngle.getCos());
    double sin = Math.abs(robotRelativeAngle.getSin());
    double tx = (cos > 1e-6) ? bumperHalfX / cos : Double.MAX_VALUE;
    double ty = (sin > 1e-6) ? bumperHalfY / sin : Double.MAX_VALUE;
    return Math.min(tx, ty);
}
```

This is a **ray-box intersection** &rarr; the same math used in graphics and physics engines to find where a ray first exits a rectangle. Whichever wall (front/back or left/right) the ray hits first is the actual bumper distance in that direction.

<Note title="New term: ray-box intersection">
A **ray** is like a vector, but thought of as a starting point plus a direction that extends forever (think of a laser beam, not an arrow with a fixed length). "Ray-box intersection" is the general problem of figuring out where that infinite ray first crosses the edge of a box (here, the rectangle formed by the robot's bumpers).

Here's the intuition behind `bumperProjection`: imagine standing at the robot's center and shooting a laser out in the extension's direction. That laser has to exit the bumper rectangle through *one* of its four walls. `tx` calculates how far the laser would have to travel to reach the left/right walls if the front/back walls didn't exist, and `ty` does the same for the front/back walls. Since the rectangle's actual walls block the laser earlier than either of those two hypothetical distances individually (except in the case where it exits at a corner), the real exit distance is always the **smaller** of the two &rarr; which is exactly why the function returns `Math.min(tx, ty)`.

For example: if `bumperHalfX = 0.4` (front/back) and `bumperHalfY = 0.3` (left/right), and the extension points nearly straight out the front (small `sin`, large `cos`), then `tx = 0.4 / cos` will be small and `ty = 0.3 / sin` will be huge, so `min` correctly picks `tx` &rarr; the laser exits through the front wall, not the sides. This same core idea (find the smallest distance to each pair of parallel walls, then take the minimum) is the standard algorithm used in 3D graphics engines to check whether a ray hits a bounding box, just simplified here to 2D and to a box centered at the origin.
</Note>

<Note title="Why does an extension's reach include bumpOffset, not just extLength?">
`extensionMeters` measures how far a mechanism sticks out *past the bumper*, not from the robot's center. To get the extension tip's true distance from the robot center (which is what field-frame math needs), you have to add the bumper-to-edge distance first, then add the extension length on top of that.
</Note>

---

## `geometry/Boundary`

Once you can compute the robot's footprint, the natural next step is: *is that footprint inside a rectangular zone on the field?* `Boundary` wraps that question into a WPILib `Trigger`, so the rest of the codebase can just bind commands to "entering the trench" the same way it binds commands to a controller button.

<Note title="New term: point-in-rectangle test">
`Rectangle2d.contains(point)` is answering a classic geometry question: given a rectangle (possibly rotated) and a point, is that point inside the rectangle? For an axis-aligned rectangle this is easy &rarr; check that the point's X is between the rectangle's left/right edges *and* its Y is between the top/bottom edges. For a rotated rectangle (like a boundary zone that isn't lined up with the field's X/Y axes), WPILib internally does the opposite of the rotation math from `toFieldFrame` above: it rotates the point *backwards* by the rectangle's own rotation so the rectangle becomes "axis-aligned" from the point's perspective, then does the simple X/Y range check. You don't need to implement this yourself &rarr; it's exactly why `Boundary` calls WPILib's built-in `.contains(...)` instead of writing this math again.
</Note>

### Two modes

```java
public enum Mode {
    CENTER_ONLY,
    PERIMETER
}
```

- **`CENTER_ONLY`** &rarr; only checks whether the robot's pose *center* is inside the zone. Cheap and simple, good enough when the zone is large relative to the robot.
- **`PERIMETER`** &rarr; checks every point of the robot's `RobotFootprint` (all 4 bumper corners plus every extension tip). Slower, but catches cases where the robot's center hasn't entered a zone yet, but an extended intake already has.

### Turning a mode into a live check

```java
public BooleanSupplier isActive(Mode mode) {
    return switch (mode) {
        case CENTER_ONLY -> () -> boundary.get().contains(poseSupplier.get().getTranslation());
        case PERIMETER -> () -> {
            Rectangle2d b = boundary.get();
            for (Translation2d pt : footprint.getPoints(poseSupplier.get())) {
                if (b.contains(pt)) return true;
            }
            return false;
        };
    };
}
```

Both branches return a `BooleanSupplier` &rarr; a lambda that re-checks the condition fresh every time it's called, rather than a one-time answer. `CENTER_ONLY` just asks WPILib's own `Rectangle2d.contains(...)` about the robot's translation. `PERIMETER` loops over every footprint point and returns `true` the moment any single point is inside the boundary.

### From a `BooleanSupplier` to a real `Trigger`

```java
public Trigger asTrigger(Mode mode) {
    return new Trigger(isActive(mode));
}
```

A WPILib `Trigger` is exactly a wrapper around a `BooleanSupplier` that the `CommandScheduler` polls every loop cycle &rarr; which means once you have `isActive(mode)`, wrapping it in a `Trigger` gets you all of `Trigger`'s usual features for free: `.onTrue()`, `.whileTrue()`, `.debounce()`, `.and()`, `.or()`, and so on.

### The static convenience factory

Most of the codebase never constructs a `Boundary` object directly &rarr; instead, it calls the static `asTrigger` factory, which builds the `Boundary`, optionally logs it, and returns just the `Trigger`:

```java
public static Trigger asTrigger(
    String loggedName,
    Supplier<Rectangle2d> boundary,
    Supplier<Pose2d> poseSupplier,
    RobotFootprint footprint,
    Mode mode
) {
    var bound = new Boundary(boundary, poseSupplier, footprint);
    if (!loggedName.isBlank()) {
        bound.log(loggedName);
    }
    return bound.asTrigger(mode);
}
```

This is exactly what `RobotState` uses to build its trench, bump, and near-hub triggers:

```java
// RobotState.java
inTrenchTrigger =
    Boundary.asTrigger(
        "LeftTrench",
        () -> AllianceFlip.apply(FieldConstants.Trench.TRENCH_LEFT_TRIGGER_BOX),
        this::getEstimatedPose,
        footprint,
        Boundary.Mode.PERIMETER)
    .or(Boundary.asTrigger(
        "RightTrench",
        () -> AllianceFlip.apply(FieldConstants.Trench.TRENCH_RIGHT_TRIGGER_BOX),
        this::getEstimatedPose,
        footprint,
        Boundary.Mode.PERIMETER))
    .debounce(0.3);
```

Notice how three utility classes stack together in this one call: `AllianceFlip.apply(...)` mirrors the trench zone for whichever alliance we're on, `Boundary.asTrigger(...)` turns that zone plus our live pose and footprint into a `Trigger`, and `.or(...)` / `.debounce(0.3)` are ordinary WPILib `Trigger` methods layered on top &rarr; debouncing so a robot that's just barely clipping the edge of the zone doesn't rapidly flicker the trigger on and off.

### Logging for AdvantageScope

`Boundary` can also log itself, which is what the `loggedName` argument above is for:

```java
public void log(String key) {
    Pose2d robotPose = poseSupplier.get();
    Rectangle2d b = boundary.get();

    Logger.recordOutput(key + "/boundary", getBoundaryCorners());

    List<Translation2d> footprintPoints = footprint.getPoints(robotPose);
    Logger.recordOutput(key + "/footprint", footprintPoints.toArray(new Translation2d[0]));

    Logger.recordOutput(key + "/centerActive", b.contains(robotPose.getTranslation()));
    // ...
}
```

Because AdvantageScope renders a `Translation2d[]` as a path on its field view, logging the boundary's four corners (closing the loop back to the first corner) draws the zone as a box, and logging the live footprint points draws dots showing exactly what the robot's `PERIMETER` check is testing against &rarr; extremely useful for debugging why a trigger did or didn't fire during a match replay.

<Note title="Composability is the whole point">
Neither `RobotFootprint` nor `Boundary` know anything about "the trench" or "the hub" specifically &rarr; they only know about rectangles, points, and suppliers. All of the game-specific meaning comes from what you pass in from `FieldConstants` and `AllianceFlip`. This is what makes them reusable across completely different games in future seasons.
</Note>

---

## `AprilTag`

The smallest class on this page, but a good example of using a Java `record` to bundle two related pieces of data &rarr; a tag's ID and its known pose on the field &rarr; into a single, clearly-named type.

<Note title="New term: Java record">
A `record` is a compact way to define a class whose entire purpose is holding a fixed set of values together, like `id` and `pose` here. Writing `public record AprilTag(int id, Pose3d pose) {}` automatically generates a constructor, getter methods (`id()` and `pose()`), `equals()`, `hashCode()`, and `toString()` &rarr; all the boilerplate you'd normally have to type out by hand for a simple "data holder" class. You can still add your own methods (like `tagToArrayIndex` below) or override the auto-generated ones (like `pose()` is overridden here) when you need custom behavior.
</Note>

<Note title="What's an AprilTag, physically?">
An AprilTag is a small black-and-white square pattern (similar to a QR code) placed at known, fixed locations around the field. A camera on the robot can detect these tags and, because their exact field position is published ahead of time, use the tag's apparent size/angle in the camera image to figure out where the robot itself must be standing. `id` identifies *which* physical tag was seen, and `pose` is that tag's known, fixed location and orientation on the field &rarr; this class doesn't do any of the vision math itself, it's just a clean way to carry "which tag" and "where is it" around together.
</Note>

```java
public record AprilTag(int id, Pose3d pose) {
    @Override
    public Pose3d pose() {
        return VisionConstants.APRIL_TAG_LAYOUT.getTagPose(id).get();
    }

    public static int tagToArrayIndex(int tag) {
        return tag - 1;
    }
}
```

Two details are worth calling out:

**The overridden `pose()` accessor.** Normally a Java record auto-generates a `pose()` method that just returns whatever `Pose3d` was passed into the constructor. Here, `pose()` is overridden to *ignore* the constructor argument entirely and instead look the pose up fresh from the official field layout, using `id`. This guarantees the returned pose can never go stale or be constructed incorrectly &rarr; as long as you have the right `id`, you always get the field layout's correct, up-to-date pose for that tag.

**`tagToArrayIndex`.** AprilTag IDs on our fields start at `1`, but Java arrays are zero-indexed. This one-line static helper exists purely so nobody has to remember to subtract 1 (or, worse, forgets and gets an off-by-one bug) when using a tag ID to index into an array.

### Where it's used

`FieldConstants` provides the one factory method the rest of the codebase actually calls:

```java
// FieldConstants.java
public static AprilTag getAprilTag(int id) {
    return new AprilTag(id, VisionConstants.APRIL_TAG_LAYOUT.getTagPose(id).get());
}
```

Even though the record's own `pose()` override re-fetches the pose from the layout anyway, `getAprilTag` still passes a pose into the constructor &rarr; this keeps the constructor call type-correct and self-documenting, even though the override means the passed-in value is effectively unused after construction.

---

## Putting it together: a realistic example

Here's how several of these classes typically combine in a single real feature &rarr; detecting whether the robot has driven into the trench zone, regardless of alliance color, accounting for the intake sticking out:

```text
FieldConstants.Trench.TRENCH_LEFT_TRIGGER_BOX   (a Rectangle2d, defined for Blue alliance)
                │
                ▼
     AllianceFlip.apply(...)      (mirrors it onto Red, only if we're on Red)
                │
                ▼
   Boundary.asTrigger(..., footprint, Mode.PERIMETER)
                │
        ┌───────┴────────┐
        ▼                ▼
 RobotFootprint       RobotState::getEstimatedPose
 (bumpers + intake)   (live robot pose)
                │
                ▼
       A WPILib Trigger you can call
         .onTrue(...) / .debounce(...) on,
         exactly like a controller button
```

Every one of the five classes on this page plays exactly one small, clearly-named role in that chain &rarr; which is the entire philosophy behind writing utility classes in the first place.

---

<Quiz questions={[
{
prompt: "Why does Maths.epsilonEquals compare abs(a - b) <= epsilon instead of using a == b?",
options: [
"Floating-point rounding can make two doubles that represent the same real value slightly unequal",
"Java does not allow == on doubles",
"epsilonEquals is faster than ==",
"== only works on integers"
],
correct: 0,
explanation: "Floating-point math can introduce tiny rounding errors, so two values that should be mathematically equal (like a mechanism's position and its setpoint) might differ by a fraction of a unit. epsilonEquals treats values within a small tolerance as equal."
},
{
prompt: "In AllianceFlip, why does apply(Rotation2d) add 180 degrees (Rotation2d.kPi) instead of using applyX/applyY math?",
options: [
"Rotation2d does not support addition",
"180 degrees is a rounding safeguard",
"Rotations are never flipped in our code",
"Mirroring a heading across the field means facing the opposite direction, which is a rotation of exactly pi radians",
],
correct: 3,
explanation: "Position (X/Y) mirrors by reflecting across the field's midline, but a heading mirrors by pointing the opposite way, which is the same as rotating by pi radians (180 degrees)."
},
{
prompt: "Why does RobotFootprint.Extension use a DoubleSupplier for its length instead of a plain double?",
options: [
"DoubleSupplier is required by WPILib's Trigger class",
"To avoid using arrays",
"So the extension's current length is always read fresh, automatically reflecting mechanisms like an intake sliding in and out",
"DoubleSupplier is faster than double at runtime"
],
correct: 2,
explanation: "A DoubleSupplier is re-evaluated every time getPoints() is called, so if the intake extends or retracts, the footprint automatically grows or shrinks on the very next call with no manual updates needed."
},
{
prompt: "What is the practical difference between Boundary.Mode.CENTER_ONLY and Boundary.Mode.PERIMETER?",
options: [
"CENTER_ONLY only works in simulation",
"PERIMETER checks every point of the robot's footprint (bumpers + extensions), while CENTER_ONLY only checks the robot's pose center",
"CENTER_ONLY is only for autonomous, PERIMETER is only for teleop",
"There is no difference, they are aliases"
],
correct: 1,
explanation: "CENTER_ONLY is a cheaper check that just tests the robot's pose translation against the rectangle. PERIMETER additionally checks every bumper corner and extension tip, catching cases where an extended mechanism enters a zone before the robot's center does."
},
{
prompt: "Why does AprilTag's pose() method ignore the constructor's Pose3d argument and re-fetch the pose from VisionConstants.APRIL_TAG_LAYOUT instead?",
options: [
"To guarantee the returned pose always matches the official field layout for that tag ID, rather than a potentially stale or incorrectly constructed value",
"To save memory by not storing the Pose3d",
"Because Pose3d cannot be stored in a record",
"Because the field layout changes every frame"
],
correct: 0,
explanation: "By always looking the pose up fresh using the tag's id, the record guarantees correctness &rarr; you can never end up with an AprilTag whose pose doesn't match what the official field layout says for that id."
}
]} />

## Next Steps

Now that you've seen the math and geometry utilities, move on to the next page to explore the rest of the `util` package &rarr; tuning, dashboard, and hardware helpers.
