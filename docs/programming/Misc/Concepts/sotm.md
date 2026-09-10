---
sidebar_position: 2
---

# Shoot on the Move

## What is shoot on the move?

**Shoot on the move (SOTM)** lets a robot score without stopping first. The robot, turret, and ball are all moving, so aiming directly at the goal would make the ball miss. The robot instead aims at a calculated **virtual target**: a point offset from the real goal so that the moving ball arrives at the real goal.

Think about throwing a ball from a moving car. Even if you throw the ball sideways, it still has some of the car's forward speed. A robot ball behaves the same way: when it exits the shooter, it keeps the robot's sideways and forward velocity. SOTM calculates the aim angle, hood angle, and flywheel speed needed to account for that motion.

In this robot, `RobotState.updateMovingShot()` collects the robot motion data every loop. `ShooterStructure.Moving.solveMovingShot()` turns that data into a `MovingShotSolution` containing:

| Output | What it controls |
| --- | --- |
| `exitVelocity` | Flywheel launch speed |
| `hoodAngleRad` | Hood angle for the arc |
| `turretAngle` | Turret direction to the virtual target |
| `virtualTarget` | Where the system aims instead of the real goal |
| `timeOfFlight` | Estimated seconds from ball exit to goal |

The solution is recalculated continuously, not just when the driver presses shoot. That keeps it ready as the robot drives, turns, accelerates, or changes targets.

## Start with a stationary shot

Before solving motion, the robot needs to know how to make a normal stationary shot.

### Position and distance

The field is treated like a flat coordinate grid:

- **x**: one field direction
- **y**: the other field direction
- **z**: height above the floor

The pose estimator gives the robot's position and heading. The shooter is not necessarily at the robot center, so `ShooterStructure.getTurretTranslation()` applies `ROBOT_TO_TURRET` to find the turret's real field position.

The horizontal distance to a target is the usual 2D distance formula:

```text
distance = sqrt((targetX - turretX)^2 + (targetY - turretY)^2)
```

The difference in height is:

```text
deltaH = targetZ - turretHeight
```

Keeping horizontal distance and vertical height separate makes the projectile math much easier to understand.

### Velocity is a vector

A **scalar** has only size: `4 meters per second`.

A **vector** has size and direction: `4 meters per second toward the driver station`.

Robot motion must be represented as a vector because the direction matters. Moving directly toward the goal changes the required range. Moving sideways requires the turret to lead sideways. Moving diagonally does both at once.

WPILib stores chassis translation as `vx` and `vy` in meters per second. Its speed, without direction, is:

```text
speed = sqrt(vx^2 + vy^2)
```

This is also how `RobotState.getShootingState()` decides whether a commanded shot is stationary or moving.

## Projectile motion: the ball's arc

Ignoring air resistance, a launched ball follows two independent motions:

```text
horizontal position: x(t) = v0 cos(theta) t
vertical position:   y(t) = v0 sin(theta) t - 1/2 g t^2
```

Where:

| Symbol | Meaning |
| --- | --- |
| `v0` | Ball exit speed in m/s |
| `theta` | Hood/launch angle above horizontal, in radians |
| `t` | Time after the ball exits, in seconds |
| `g` | Gravity, approximately `9.81 m/s^2` |

`v0 cos(theta)` is the horizontal part of the launch speed. `v0 sin(theta)` is the upward part. Gravity continually pulls the ball downward, which creates the curved arc.

### Time of flight

SOTM needs time of flight because the robot moves while the ball is in the air. `ShooterStructure.calculateTimeOfFlight()` uses the vertical equation and solves it for `t`:

```text
deltaH = v0 sin(theta) t - 1/2 g t^2

0 = 1/2 g t^2 - v0 sin(theta) t + deltaH
```

That is a quadratic equation, so the solver uses the quadratic formula:

```text
t = (-b +/- sqrt(b^2 - 4ac)) / (2a)
```

The code selects a positive time because a negative time would mean the ball arrived before it was launched.

For normal hub shots, the team normally uses a measured **lookup table (LUT)** for flight time, flywheel velocity, and hood angle. Elastic can switch between the LUT and the pure kinematic time-of-flight calculation. The LUT is usually more accurate on a real robot because it captures effects the simple equations leave out, such as ball compression, drag, spin, and mechanism losses.

## Why a moving robot misses

Suppose the robot is driving to its left when it fires. At ball exit, the ball already has leftward velocity from the robot. If the turret points directly at the goal, the ball drifts left and misses.

The simplest correction is:

```text
lead offset = -robotVelocity * timeOfFlight
```

The negative sign means "aim opposite the robot's expected travel." If the robot will move 0.6 meters left while the ball flies, the virtual target is shifted 0.6 meters right of the actual goal. The ball's inherited leftward motion then brings it back to the real goal.

This is vector math, performed separately in field x and y:

```text
virtualTargetX = targetX - velocityX * timeOfFlight
virtualTargetY = targetY - velocityY * timeOfFlight
```

The code calculates a complete target position, then recomputes distance, flywheel speed, hood angle, and turret direction for that virtual target.

## Use the correct coordinate frame

The drivetrain reports `vx` and `vy` in the **robot frame**: forward, backward, left, and right relative to the robot's current nose. The target and field pose are in the **field frame**: fixed x and y directions on the field.

SOTM must convert robot-frame motion into field-frame motion before comparing it with a field target. In simplified form, rotating a vector by the robot heading `phi` is:

```text
fieldVx = robotVx cos(phi) - robotVy sin(phi)
fieldVy = robotVx sin(phi) + robotVy cos(phi)
```

`RobotState.updateMovingShot()` supplies robot-relative chassis velocity, and `solveMovingShot()` rotates it by `robotHeading`. Once both the robot velocity and target are expressed in field coordinates, their directions can be safely combined.

## The turret is moving too

The turret is offset from the robot's center. When the robot turns, that offset travels in a small circle, even if the robot center does not translate.

For turret offset `(dx, dy)` in robot coordinates and chassis angular speed `omega` in radians per second, the turret's extra tangential velocity is:

```text
turretTurnVelocity = (-omega * dy, omega * dx)
```

The solver adds this to chassis translation before rotating the result into the field frame:

```text
fieldVelocity = rotateByHeading(
    robotVelocity + turretTurnVelocity,
    robotHeading)
```

This is important when the robot spins while shooting. Without it, SOTM would account for the robot center's motion but not the motion of the shooter itself.

## Acceleration: handling a changing speed

Velocity alone assumes the robot will keep the same speed and direction. A real robot can accelerate, brake, or be pushed while the ball waits in the shooter and while it flies.

For constant acceleration, future position is:

```text
futurePosition = currentPosition + velocity * t + 1/2 * acceleration * t^2
```

and future velocity is:

```text
futureVelocity = currentVelocity + acceleration * t
```

`RobotState` estimates field-relative acceleration in this order:

1. Use gravity-compensated Pigeon linear acceleration when it is valid.
2. Otherwise estimate acceleration from the change in field velocity:

   ```text
   acceleration = (currentVelocity - previousVelocity) / dt
   ```

3. If neither source is usable that loop, keep the previous filtered estimate.

Acceleration data is noisy, especially when it comes from differentiating velocity. The code applies a low-pass filter:

```text
alpha = dt / (tau + dt)
filteredAccel = previousFilteredAccel * (1 - alpha) + rawAccel * alpha
```

`tau` is the configurable filter time constant. A larger `tau` smooths noise more but responds to real acceleration changes more slowly. A smaller `tau` responds faster but can make aim corrections jittery.

## Launch latency: the ball does not leave immediately

When the code decides to shoot, the ball still has to travel through the feeder and shooter before it exits. Steelhawks models that delay as `D`, currently tuned through `SOTM/LaunchLatencySeconds` with a default of `0.135` seconds.

During that delay, the robot moves:

```text
launchPosition = currentPosition + velocity * D + 1/2 * acceleration * D^2
launchVelocity = velocity + acceleration * D
```

The ball then flies for `T` seconds. Combining the delay and flight portions gives the virtual-target equation used in `ShooterStructure`:

```text
virtualTarget = actualTarget
              - velocity * (D + T)
              - acceleration * D * T
              - 1/2 * acceleration * D^2
```

This equation may look intimidating, but each term answers a simple question:

| Term | Meaning |
| --- | --- |
| `-velocity * D` | Counter the robot motion before the ball exits |
| `-1/2 * acceleration * D^2` | Counter the extra position change caused by acceleration during the delay |
| `-velocity * T` | Counter the robot velocity carried by the ball during flight |
| `-acceleration * D * T` | Counter the changed launch velocity caused by acceleration during the delay |

Set `D` to zero and the equation reduces to the simpler velocity lead, plus no latency correction.

## Why the solver iterates

There is a circular dependency:

1. The virtual target needs time of flight `T`.
2. Time of flight depends on distance, hood angle, and launch speed.
3. Those values depend on the virtual target.

The code resolves this with a short **fixed-point iteration**:

1. Start with the stationary shot's estimated time of flight.
2. Use that time to calculate a virtual target.
3. Calculate a new shot for the virtual target.
4. Calculate the new time of flight.
5. Repeat until the change in flight time is small enough.

In code, a solution is accepted when:

```text
abs(newTimeOfFlight - oldTimeOfFlight) < timeTolerance
```

Steelhawks currently allows at most five iterations and uses a `0.01` second tolerance. In normal logs, the solution usually converges in one or two iterations. This is inexpensive because it is only repeating a few arithmetic and lookup operations.

## Turning the virtual target into a turret command

After solving for the virtual target, the field-relative aim direction is found with `atan2`:

```text
fieldAimAngle = atan2(
    virtualTargetY - turretY,
    virtualTargetX - turretX)
```

`atan2(y, x)` is better than `atan(y / x)` because it correctly handles every field quadrant and avoids division-by-zero problems.

The turret controller needs an angle relative to the robot, not the field. The solver subtracts the robot heading and the turret's mounting yaw:

```text
turretRelativeAngle = wrap(
    fieldAimAngle - robotHeading - turretMountYaw)
```

`wrap(...)` keeps the result in a standard angle range, avoiding commands such as turning almost a complete circle when a small turn in the other direction works.

## How the solution reaches the shooter

Every `RobotState.periodic()` call updates the moving-shot solution. The superstructure consumes it as follows:

```text
Robot pose, velocity, acceleration, heading, rotation rate
                    |
                    v
RobotState.updateMovingShot()
                    |
                    v
ShooterStructure.Moving.solveMovingShot()
                    |
                    v
exit velocity + hood angle + turret angle + virtual target + flight time
       |                 |                 |
       v                 v                 v
  Flywheel           Hood command      Turret command
```

At zero robot velocity and acceleration, the virtual target collapses back to the real target. That allows the turret to use the same SOTM path for both stationary and moving shots.

## Tuning and debugging

The solver logs these values under `SOTM/`:

| Log | Useful question |
| --- | --- |
| `VirtualTarget` | Is the aim point moving in the expected opposite direction? |
| `VirtualDistance` | Does the compensated range make sense? |
| `TOF` | Is estimated flight time realistic? |
| `LaunchLatency` | Is the feeder-to-ball-exit delay calibrated? |
| `ExitVelocity` | Is the commanded flywheel speed reasonable? |
| `HoodAngleDeg` | Is the calculated arc physically possible? |
| `FieldAccelEstimate` | Is acceleration stable and pointing the expected way? |
| `AccelSource` | Is the solution using Pigeon, velocity derivative, or hold? |
| `ConvergedIterations` | Is the fixed-point solver converging quickly? |
| `TurretRelativeAngleDeg` | Does the turret command lead in the correct direction? |

Tune in this order:

1. Make stationary shots reliable first. A moving-shot model cannot fix bad stationary distance, hood, or flywheel calibration.
2. Verify odometry and robot heading. A field-frame error makes every lead correction wrong.
3. Verify the turret transform and turret mounting yaw.
4. Tune launch latency. If hard acceleration makes shots trail behind the target, increase it; if shots lead too far, decrease it.
5. Check acceleration filtering. Too little filtering produces noisy aim; too much filtering reacts late.
6. Test translation, sideways motion, rotation, acceleration, braking, and diagonal motion separately before combining them.

## Important limits of the model

This solver is an approximation, not magic. It assumes the target is stationary and that the robot's velocity and acceleration remain reasonably predictable over a very short time. It also cannot fully model ball drag, spin, wheel slip, pose-estimation error, turret lag, or a changing flywheel speed. That is why the team uses measured LUT values and real shooting tests alongside the physics equations.

The goal of SOTM is not to predict every detail of the ball perfectly. Its job is to remove the largest, most repeatable miss caused by robot motion, then let calibration and testing close the remaining gap.
