---
sidebar_position: 1
---

# Introduction to AdvantageKit & Sims

Welcome to the next section! In this section we're going to cover <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>AdvantageKit</span> &rarr; the logging framework our codebase is built around, and the simulation tools that let us test and tune robot code without ever touching a real robot.

You've already seen the IO interface pattern show up throughout our subsystems: an interface with an `@AutoLog` inputs class, a "Real" implementation that talks to actual motors and sensors, and a "Sim" implementation that fakes those same values with physics. What you haven't seen yet is *why* that pattern exists. The answer is AdvantageKit &rarr; a framework built by FRC team 6328 that logs every single input and output our robot code touches, and can then feed those exact same logs back into the code later. That second part is called **replay**, and it's the reason our IO layers are structured the way they are.

Once you understand logging and replay, the rest of this section builds outward from it: how our code decides whether it's running on a **real robot**, in **simulation**, or in **replay**, how those three modes swap out IO implementations underneath identical subsystem code, and how libraries like maple-sim layer realistic swerve drive and game piece physics on top of it all.

---

## What You'll Learn

### What Is AdvantageKit?
You'll learn what AdvantageKit actually does under the hood &rarr; wrapping WPILib's robot loop, recording every logged input and output to a `.wpilog` file, and publishing live data to NetworkTables so it shows up in AdvantageScope.

### Real, Sim, and Replay Modes
You'll learn about the three modes our robot code can run in (`Mode.REAL`, `Mode.SIM`, `Mode.REPLAY`), how `Constants.getMode()` decides which one is active, and what data receiver gets registered for each one &rarr; a `WPILOGWriter` on the real robot, an `NT4Publisher` in sim, and a `WPILOGReader` feeding a saved log back in during replay.

### The IO Layer, Revisited
You already know how to write an IO interface. Here you'll see the *reason* it exists: the same `updateInputs()` call and `@AutoLog` inputs class works identically whether it's being filled in by real hardware, a physics simulation, or values read back out of a log file.

### Logging Inputs and Outputs
You'll learn the difference between `Logger.processInputs()`, which logs (or replays) an entire `@AutoLog` inputs object at once, and `Logger.recordOutput()`, which logs one computed value at a time &rarr; things like setpoints, PID error, or a simulated game piece's position on the field.

### Simulating Physics
You'll see how our Sim IO implementations use WPILib's own simulation classes (like `DCMotorSim`) alongside **maple-sim**, a third-party library that simulates an entire swerve drivetrain, its gyro, and game pieces bouncing around the field &rarr; all without any real hardware.

### Replaying a Match
Finally, you'll learn what replay is actually used for: taking a log file recorded on the real robot (or off a USB stick after a match) and re-running our exact robot code against it on a laptop, to debug what happened or test a code change against real recorded sensor data.

---

## Why This Matters

Logging isn't just a debugging nicety in our codebase &rarr; it's the foundation the IO layer is built on. Every subsystem is written so that its logic doesn't care whether its inputs came from a real motor, a simulated one, or a log file recorded weeks ago. Understanding AdvantageKit is what makes that possible, and it's what lets us catch and fix bugs by replaying a match from Nationals just as easily as we can tune a mechanism in simulation the night before build season ends.

By the end of this section, you'll understand how our robot code moves between real, simulated, and replayed data, and how logging ties every subsystem's IO layer together.

## Next Steps

When you're ready to begin, move on to the first page in this section to start learning about AdvantageKit itself!
