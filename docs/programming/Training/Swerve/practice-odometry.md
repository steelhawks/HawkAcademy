---
sidebar_position: 7
---

import JavaRunner from '@site/src/components/JavaRunner'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import Quiz from '@site/src/components/Quiz.jsx'

# Practice: Odometry

The last page threw a lot at you: `Twist2d`, ring buffers, `SwerveDrivePoseEstimator`, standard deviations. This page slows all the way back down. You're going to build **one tiny class, one method**, entirely from scratch, and use it to *prove to yourself* (with real numbers you compute) the two biggest ideas from the odometry page:

- **Part 1** — how a robot turns a bunch of little movements into a single field position (the "twist" idea).
- **Part 2** — why sampling faster (250 Hz vs 50 Hz) actually matters, using the exact same code you wrote in Part 1.

<Note title="You do not need to have read anything else">
This page assumes nothing except basic Java: a class, a few `double` fields, a method, a `for` loop, and `Math.sin` / `Math.cos`. Every other idea is explained right here, from zero.
</Note>

---

## Before you write any code: the idea in plain English

Forget swerve modules and encoders for a second. Imagine you're standing in a big empty parking lot, blindfolded, holding a piece of chalk. Someone calls out instructions:

> "Walk forward 2 steps. Now turn left 90 degrees. Now walk forward 2 more steps."

After each instruction, you drag the chalk and mark an **X** where you now think you are. To do that, you need to track three numbers the whole time:

- **x** &rarr; how far right/left of where you started
- **y** &rarr; how far forward/back of where you started
- **theta (θ)** &rarr; which way you're currently facing

Every instruction ("walk forward 2 steps") is relative to **which way you're currently facing**, not to the parking lot's fixed directions. If you've already turned 90 degrees, "walk forward" now drags your X sideways relative to where you started, not straight up. This is exactly the problem a swerve robot has: the modules report "we moved forward 0.3 meters," but forward *relative to the robot*, and it's the robot's current heading that decides what that means on the actual field.

This "one small movement, applied to a running total position" is called a **`Twist2d`** in our real codebase (`dx`, `dy`, `dtheta`), tiny nudge in x, y, and rotation. Odometry is nothing more than: **take a twist, rotate it into field directions using your current heading, add it to your running total, repeat forever.**

That's the entire idea. Let's write it.

---

## Part 1 &mdash;  Build the twist integrator

### Step 1: The `Pose` class (given to you)

A **pose** is just a position + heading bundled together &rarr; exactly the three numbers from the parking lot example. Here's the shell you'll be working in:

```java
static class Pose {
    double x = 0.0;      // meters, field-relative
    double y = 0.0;      // meters, field-relative
    double theta = 0.0;  // radians, field-relative heading

    public void addTwist(double dx, double dy, double dtheta) {
        // <-- YOU write this method
    }
}
```

`addTwist` is called every time the robot reports "I just moved `dx` meters forward and `dy` meters sideways (relative to the way I'm currently facing), and I turned `dtheta` radians." Your job is to update `x`, `y`, and `theta` so the `Pose` reflects the new field position.

### Step 2: The rotation math (fully explained, no calculus)

The tricky part is: `dx` and `dy` are **robot-relative** (forward/sideways from the robot's point of view), but `x` and `y` are **field-relative**. You have to rotate `(dx, dy)` by the robot's current heading, `theta`, before adding it in.

This is a standard 2D rotation. If a vector `(dx, dy)` gets rotated by an angle `theta`, the rotated vector `(fieldDx, fieldDy)` is:

$$\text{fieldDx} = dx\cos(\theta) - dy\sin(\theta)$$

$$\text{fieldDy} = dx\sin(\theta) + dy\cos(\theta)$$
> A vector is a line drawn from the origin to a specific point. A vector (dx, dy) just means a line drawn from the origin to that point

<Note title="You don't need to derive this — just use it">
This is the same rotation formula WPILib's real `Rotation2d` / `Twist2d` math uses internally. You're allowed to just trust it and plug in the numbers &mdash; the goal of this exercise is to see it work, not to re-derive trigonometry.
</Note>

In Java, `Math.cos(theta)` and `Math.sin(theta)` take **radians**, and `theta` is already in radians in our `Pose` class, so you can plug it straight in.

Once you have `fieldDx` and `fieldDy`, updating the pose is simple addition:

```java
x += fieldDx;
y += fieldDy;
theta += dtheta;
```

### Step 3: Put it together

Fill in `addTwist` using the three lines above (plus the two lines that compute `fieldDx` / `fieldDy`). That's the whole method &rarr; five lines total.

<SolutionDropdown
  label="Hint 1:  what goes in addTwist, in order"
  explanation="Inside addTwist, first compute fieldDx and fieldDy using the two formulas above (with Math.cos(theta) and Math.sin(theta) using the CURRENT theta, before you change it). Then add fieldDx to x, fieldDy to y, and dtheta to theta &rarr; in that order, so you rotate using the OLD heading, not the new one."
/>

<SolutionDropdown
  label="Hint 2:  common mistake"
  explanation="Make sure you update theta LAST. If you do theta += dtheta before computing fieldDx/fieldDy, you'll rotate using the wrong (already-updated) heading and your numbers will be off for any twist that both moves AND turns at once."
/>

### Try it

The `main` method below sends your `Pose` through the exact parking-lot example from above: drive forward 2 meters, turn 90 degrees, drive forward 2 more meters. If your `addTwist` is correct, after the turn, "forward" should now point along the field's Y axis instead of X &mdash; so the final position should be `x=2.000 y=2.000`, **not** `x=4.000 y=0.000`.

<JavaRunner
  starterCode={`public class Main {

    // ============================================================
    //  YOUR TASK: implement addTwist() below.
    //  Do NOT modify anything below the "DO NOT EDIT" line.
    // ============================================================

    static class Pose {
        double x = 0.0;      // meters, field-relative
        double y = 0.0;      // meters, field-relative
        double theta = 0.0;  // radians, field-relative heading

        // TODO: rotate (dx, dy) by the CURRENT theta into field-relative
        //       coordinates, add the result into x/y, then add dtheta to theta.
        //
        //   fieldDx = dx * cos(theta) - dy * sin(theta)
        //   fieldDy = dx * sin(theta) + dy * cos(theta)
        public void addTwist(double dx, double dy, double dtheta) {
            // your code here
        }



        // ============================================================
        //  DO NOT EDIT BELOW THIS LINE
        // ============================================================



        public void print(String label) {
            System.out.printf("%s -> x=%.3f y=%.3f theta=%.3f%n", label, x, y, theta);
        }
    }

    public static void main(String[] args) {
        Pose pose = new Pose();
        pose.print("start");

        // Drive forward 2 meters (robot-relative: dx=2, dy=0, dtheta=0)
        pose.addTwist(2.0, 0.0, 0.0);
        pose.print("after driving forward 2m");

        // Turn 90 degrees in place (dx=0, dy=0, dtheta=PI/2)
        pose.addTwist(0.0, 0.0, Math.PI / 2);
        pose.print("after turning 90 degrees");

        // Drive forward 2 meters AGAIN -- but now "forward" means something
        // different on the field, because theta has changed!
        pose.addTwist(2.0, 0.0, 0.0);
        pose.print("after driving forward 2m again");
    }

    
}`}
  expectedOutput={`start -> x=0.000 y=0.000 theta=0.000
after driving forward 2m -> x=2.000 y=0.000 theta=0.000
after turning 90 degrees -> x=2.000 y=0.000 theta=1.571
after driving forward 2m again -> x=2.000 y=2.000 theta=1.571`}
/>

<SolutionDropdown
  label="View Full Solution"
  explanation="The full addTwist implementation: rotate (dx, dy) using the CURRENT theta, add the rotated vector to x/y, then add dtheta to theta last."
  code={`public void addTwist(double dx, double dy, double dtheta) {
    double fieldDx = dx * Math.cos(theta) - dy * Math.sin(theta);
    double fieldDy = dx * Math.sin(theta) + dy * Math.cos(theta);

    x += fieldDx;
    y += fieldDy;
    theta += dtheta;
}`}
/>

<Note title="What you just built">
This is a working (simplified) version of what the real <code>SwerveDriveOdometry</code>/<code>SwerveDrivePoseEstimator</code> do internally every single loop cycle. WPILib's version uses <code>SwerveDriveKinematics</code> to turn <strong>four wheel deltas</strong> into a single <code>Twist2d</code> first, but once it has that twist, it applies it to the running pose in <em>exactly</em> the way you just wrote by hand.
</Note>

---

## Part 2 &mdash; Why 250 Hz beats 50 Hz

Go back to the odometry page for a second — it says the robot samples wheel + gyro data at 100&ndash;250 Hz in a background thread, instead of relying on the 50 Hz main loop. It explains *why* in words: "the straight-line approximation between samples starts to noticeably diverge from the real curved path." Let's turn that sentence into actual numbers, using the exact `addTwist` method you just wrote.

### Step 1: The setup

Imagine the robot drives a **perfect quarter-circle**: a smooth curve, turning left the entire time, ending up having turned exactly 90 degrees. We know the *exact* mathematical answer for where it ends up (this is a basic geometry fact, given to you &rarr; you don't need to derive it): if the circle has radius `R`, driving a quarter circle moves the robot to position `(R, R)` on the field.

But your `addTwist` method doesn't know about smooth curves; it only knows about small, straight little steps (twists). So to simulate the curve, we're going to **chop it into `N` small straight steps**, call `addTwist` once per step, and see how close the *final* position lands to the true answer of `(R, R)`.

This is exactly what the real robot does: it can't measure a perfectly smooth curve either &rarr; it only gets discrete samples, one twist at a time. **More samples (a higher sample rate) means each individual step is smaller and straighter, which means the zig-zag path your code traces hugs the real curve more closely.**

### Step 2: What's given to you

The `driveArc(int numSamples)` method below is mostly filled in &mdash; it splits the 90-degree turn and the arc's total distance evenly across `numSamples` steps. Your only job is the **one line inside the loop** that calls `addTwist` with the right per-step values.

Each step should be a **tiny straight-forward twist that also turns a little bit** &mdash; just like Part 1's "drive forward" twist, but now every single step also carries a small slice of the 90-degree turn.

<SolutionDropdown
  label="Hint: what to pass into addTwist inside the loop"
  explanation="Each step moves dDistance meters forward (robot-relative, so dy=0) and turns dTheta radians. That's exactly the same shape of call as Part 1's 'drive forward' twist, just with the small per-step numbers instead of the full 2.0 meters: pose.addTwist(dDistance, 0.0, dTheta);"
/>

### Try it

This reuses your exact `addTwist` from Part 1 (already filled in below so this part works standalone) &mdash; only the loop is new. Watch what happens to the `error` column as `numSamples` goes from 4, to 40, to 400: it should shrink dramatically, exactly the same way going from a 50 Hz sample rate to a 250 Hz sample rate shrinks real odometry drift.

<JavaRunner
  starterCode={`public class Main {

    static class Pose {
        double x = 0.0;
        double y = 0.0;
        double theta = 0.0;

        // Same addTwist from Part 1 -- already filled in for you here.
        public void addTwist(double dx, double dy, double dtheta) {
            double fieldDx = dx * Math.cos(theta) - dy * Math.sin(theta);
            double fieldDy = dx * Math.sin(theta) + dy * Math.cos(theta);
            x += fieldDx;
            y += fieldDy;
            theta += dtheta;
        }
    }

    static final double RADIUS = 2.0;                 // meters
    static final double TOTAL_TURN = Math.PI / 2;      // 90 degrees, in radians
    static final double ARC_LENGTH = RADIUS * TOTAL_TURN;

    // The TRUE answer for a quarter circle of this radius (given -- trust this).
    static final double TRUE_X = RADIUS;
    static final double TRUE_Y = RADIUS;

    // ============================================================
    //  YOUR TASK: fill in the ONE line inside the loop below.
    //  Do NOT modify anything else in this method.
    // ============================================================
    public static double driveArc(int numSamples) {
        Pose pose = new Pose();

        double dTheta = TOTAL_TURN / numSamples;     // turn amount per step
        double dDistance = ARC_LENGTH / numSamples;  // forward distance per step

        for (int i = 0; i < numSamples; i++) {
            // TODO: call pose.addTwist(...) here with ONE step's worth of
            //       forward motion (dDistance) and turn (dTheta).
            //       Remember: this is robot-relative, so sideways (dy) is 0.
        }


        // ============================================================
        //  DO NOT EDIT BELOW THIS LINE
        // ============================================================

        double errorX = pose.x - TRUE_X;
        double errorY = pose.y - TRUE_Y;
        double error = Math.sqrt(errorX * errorX + errorY * errorY);

        System.out.printf("samples=%4d  x=%.4f  y=%.4f  error=%.4f%n",
            numSamples, pose.x, pose.y, error);

        return error;
    }

    public static void main(String[] args) {
        // Same quarter-circle, sampled at 3 different rates.
        driveArc(4);    // like sampling very slowly
        driveArc(40);   // 10x more samples
        driveArc(400);  // 100x more samples
    }

    
}`}
  expectedOutput={`samples=   4  x=2.3669  y=1.5815  error=0.5566
samples=  40  x=2.0390  y=1.9605  error=0.0555
samples= 400  x=2.0039  y=1.9961  error=0.0056`}
/>

<SolutionDropdown
  label="View Full Solution"
  explanation="Inside the loop, each step advances the pose by one small forward-only twist (dy = 0, since the step is robot-relative) plus its share of the total turn."
  code={`for (int i = 0; i < numSamples; i++) {
    pose.addTwist(dDistance, 0.0, dTheta);
}`}
/>

### Read the numbers you just produced

- At **4 samples**, the error is over half a meter &mdash; way off. Four big, chunky straight-line steps cut the corner of the curve badly.
- At **40 samples**, the error shrinks by about 10x.
- At **400 samples**, the error shrinks by about 10x again &mdash; down to just a few millimeters.

<Note title="This is the whole justification for PhoenixOdometryThread">
On the real robot, the main loop runs at 50 Hz. If the robot were only updating its pose once per main loop cycle while spinning fast, it would be exactly like your <code>driveArc(4)</code> run &rarr; a handful of big, inaccurate steps. Sampling wheel and gyro data at 100&ndash;250 Hz in a background thread (like <code>PhoenixOdometryThread</code> does) is exactly like calling <code>driveArc(400)</code> instead of <code>driveArc(4)</code>: more, smaller, more accurate twist steps, chasing the true curved path much more closely.
</Note>

---

## What you just proved

Two lines of intuition to carry forward:

1. **Odometry = repeatedly rotating a small robot-relative twist into field coordinates and adding it to a running total.** That's it &mdash; the `addTwist` method you wrote by hand is a real, working simplification of what `SwerveDriveOdometry` does every loop.
2. **More samples = smaller steps = a path that hugs the true motion more closely = less drift.** You didn't just read that fact &mdash; you computed the actual error numbers (0.56m -> 0.055m -> 0.0056m) that show it happening.

Everything else on the odometry page &mdash; fusing in vision, standard deviations, the pose buffer for time travel &mdash; all sits on top of this same idea: keep a running pose, and carefully control how much you trust each new piece of information that nudges it.