---
sidebar_position: 1
---

# Introduction to Telemetry

Welcome to the next section! In this section we're going to cover <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Telemetry</span> &rarr; how the robot talks to us, and how we talk back to it.

So far you've mostly thought about robot code as one-directional: you write logic, deploy it, and the robot runs it. But while the robot is running  (whether it's sitting on a workbench, driving around at practice, or competing in a match) it's constantly generating data: motor voltages, sensor readings, pose estimates, battery draw, state machine transitions. **Telemetry** is the general term for collecting that data and getting it off the robot so a human (or a log file) can actually see it.

Alongside telemetry, we'll introduce **NetworkTables** &rarr; the live networking system that makes two-way communication between the robot and the driver station possible while the robot is running, and the **dashboard** software our drive team and programmers actually look at during a match or practice session.

We won't be diving into every detail of these two topics just yet, that's what the rest of this section is for. For now, here's a preview of what you'll learn:

---

## What You'll Learn

### What Is Telemetry?
You'll learn what telemetry means in the context of a robot, why "you can't fix what you can't measure" applies just as much to code as it does to hardware, and the difference between data that's *logged* (saved for later) and data that's *live* (visible right now).

### What Is NetworkTables?
You'll learn what NetworkTables is, how it lets the robot and the driver station computer share data over WiFi as key/value pairs, and why that same system is used for everything from sensor values to tuning a PID gain live without redeploying code.

### How We Log & Use the Dashboard
You'll learn how our codebase actually logs data &rarr; using AdvantageKit's `Logger` to publish values, and how those values end up on the dashboards we use, like Elastic and AdvantageScope, for both live viewing and after-the-fact match replay.

### Where We Use It In Our Code
You'll see where telemetry and NetworkTables show up throughout our codebase &rarr; from subsystem sensor readings to tuning knobs to driver station notifications, so you can connect the concepts to real, working code.

By the end of this section, you'll understand what telemetry and NetworkTables are, why they matter for both debugging and driving, and how they come together in our code.

## Next Steps

When you're ready to begin this section, move on to the What is Telemetry section!
