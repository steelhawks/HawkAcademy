---
sidebar_position: 5
---

# WPILIB Data Types
In Java Basics, you learned about the main data types that are used for all of programming, but we have some special WPILIB based data types that you should be aware about, so you aren't limited to just the basic data types.

## Why Do We Need These?
In robotics, a lot of math is modeled through coding, so having accurate units for each piece of data is important. WPILIB data types allow for you to account units in the data, so each value is different based on the unit. We also model the positions of certain mechanisms. A mechanism is a 3d object, having an x, y, and z axis. Instead of modeling this with a multidimensional array of doubles, we use a WPILIB data type.

## Data Types
Let's start listing out some basic data types:

**Suppliers** What are suppliers? A supplier is something that provides a value when your code asks for it. Think of it like a value source instead of a normal variable. For example, if a function takes in a parameter of `DoubleSupplier age`, we could provide it like this: `() -> 3`. This works because a `DoubleSupplier` gives back a `double` value whenever it is called. To get the value from `age`, we would use `age.get()`, which would return `3`.

**Poses**
Pose is short for position, but in WPILIB a pose also includes rotation. We have `Pose2d` for 2D space and `Pose3d` for 3D space. These are useful because they let us store where something is and how it is oriented in a single variable. We initialize a pose by creating a `Pose2d` or `Pose3d` variable. For example, a `Pose2d` represents an object's x position, y position, and rotation. To retrieve data from a `Pose2d` or `Pose3d`, we can use the methods built into those classes.