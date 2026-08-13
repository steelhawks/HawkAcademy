---
sidebar_position: 1
---

# Real Implementation Introduction

Welcome to the next section! Up to this point, you've learned concepts one piece at a time:  motors in isolation, commands in isolation, subsystems described in the abstract. Now it's time to put all of it together and build a <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>real subsystem</span> &rarr; from an empty file to something that could actually be deployed on a robot.

This section is a **capstone**. Instead of introducing new theory, we're going to walk through the *process* of implementation: how a subsystem actually gets built in our codebase, step by step, in the same order you'd build it yourself.

To keep things simple and focused on the process rather than the mechanism, we'll build a version of the **Indexer** subsystem -- the same one used in our actual robot code to move a game piece through the robot using a beam-break sensor and a motor. It's small enough to fully understand in one sitting, but real enough to show every piece of a proper subsystem.

---

## What You'll Learn

### Setting Up in WPILib VSCode
You already have WPILib VSCode installed. You'll learn how to create a new subsystem's files inside a real robot project, where those files live, and how the project expects them to be organized.

### The IO Layer
Every subsystem in our codebase separates *what it does* from *how the hardware does it*. You'll learn what an IO layer is, why we use one, and how to define an interface that describes a subsystem's inputs and outputs without caring whether it's running on a real motor or in simulation.

### Implementing the Real Hardware (TalonFX)
You'll implement the "real" side of the IO layer using a TalonFX motor controller -- the same motor controller used on most of our mechanisms -- and see how that implementation fulfills the interface you defined.

### Implementing the Simulation
You'll implement a simulated version of the same IO layer, so the subsystem can be tested and tuned without any physical hardware. You'll see how simulation and real hardware can be swapped out interchangeably underneath the same subsystem code.

### The Subsystem File
Finally, you'll write the subsystem class itself &rarr; the piece that ties the IO layer together, exposes commands, and gets added to `RobotConfig.java` like any other subsystem.

### Seeing It In Action
Along the way, you'll use small interactive Java snippets (right here in the docs) to test individual concepts in isolation before applying them to the full subsystem &rarr; a quick way to check your understanding without needing to open your IDE.

---

## Why This Matters

Reading about subsystems and building one are very different skills. Real subsystem code has to compile, has to satisfy interfaces, and has to work whether it's running on a practice bot or in simulation on your laptop. Working through the Indexer end-to-end will show you exactly how the pieces you've already learned: motors, commands, IO abstraction, fit together in a real file, in the real order you'd write them.

By the end of this section, you should be comfortable creating a new subsystem in our codebase from scratch, following the same pattern used everywhere else in our robot code.

## Next Steps

When you're ready to begin, move on to the first page in this section to start setting up your subsystem's files!
