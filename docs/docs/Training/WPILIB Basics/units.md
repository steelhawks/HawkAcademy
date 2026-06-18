---
sidebar_position: 5
---


import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'
import Caption from '@site/src/components/Caption'



# WPILIB Data Types
You all should have learned about the basic data types, which we call <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Primitives</span>

In this section, we'll introduce some new and useful data types that allow you to get more information from each variable, as well as accurately represent each variable.

## Why Do We Need Custom Data Types?

When coding a robot, standard numbers (like `double` or `int`) aren't always enough. In the real world, <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>phyiscs and geometry matter</span>, and that's where WPILib's special data types come in. We use them for two main reasons:

### 1. Preventing "Unit Confusion"
A regular number doesn't know what it represents. To a computer, the number `5` could mean 5 inches, 5 meters, or 5 miles per hour. If you accidentally mix them up in your code, your robot could miscalculate a distance and crash. 

WPILib’s unit data types bundle the **number** and the **unit** together. The code explicitly knows, *"This value is exactly 5 meters."* If you try to accidentally add 5 inches to 5 meters, the code catches the mistake for you or converts the math automatically. 

### 2. Simplifying 3D Space
Robots move in a 3D world with $X$, $Y$, and $Z$ axes. You *could* keep track of a mechanism's position using a long, confusing list of regular numbers (like a multidimensional array), but that quickly becomes messy and hard to read. 

Instead, WPILib gives us specific objects (like `Pose3d` or `Translation3d`). Instead of juggling random coordinates, you have a single, neat package that represents exactly where your mechanism is in space and which way it is facing. It turns complex physics math into readable, manageable code.

## Data Types
We'll break thsi section up into 3 parts:
- 2D Geometry
- 3D Geometry
- WPILIB Units Library

### 2D Geometry (Driving on the Field)
* **`Translation2d`**: Represents a simple point on a flat grid using $(X, Y)$ coordinates. It answers the question: *"Where is the robot relative to its starting point?"* (Example: 2 meters forward, 1 meter left).
* **`Rotation2d`**: Represents a 2D angle (the direction the robot is pointing). It handles all the messy math for you, letting you easily set angles using degrees, radians, or complete rotations.
* **`Pose2d`**: The ultimate tracking type. It **combines** a `Translation2d` and a `Rotation2d`. It tells you exactly where your robot is on the field *and* which way it is facing at the same time. From a `Pose2d`, you can extract both the `Translation2d` and the `Rotation2d` values



### 3D Geometry (Moving Mechanisms)
* **`Translation3d` & `Rotation3d`**: Just like the 2D versions, but they add a $Z$-axis (height) and full 3D rotation (pitch, yaw, and roll). 
* **`Pose3d`**: Combines 3D position and rotation. This is heavily used for tracking a multi-jointed robot arm or using vision cameras (like Limelight or PhotonVision) to look at 3D targets on the field.

###  The Units Library (Tracking Measurements)

WPILib has a special `Units` library. Instead of storing measurements as plain, generic numbers, you store them in container classes that protect you from mixing up your math.

* **`Distance`**: Holds physical lengths. It handles conversions automatically so you don't accidentally add inches to meters.
  * *Common units:* `Meters`, `Inches`, `Feet`.
* **`Time`**: Keeps track of match timers, autonomous delays, or code loops.
  * *Common units:* `Seconds`, `Milliseconds`.
* **`LinearVelocity`**: Measures how fast your robot is driving in a straight line.
  * *Common units:* `MetersPerSecond`, `FeetPerSecond`.
* **`Angle` & `AngularVelocity`**: `Angle` tracks raw rotation (like how far an arm has tilted), while `AngularVelocity` tracks how fast something is spinning (crucial for flywheel shooters and motor encoders).
  * *Common units:* `Degrees`, `Radians`, `RotationsPerMinute` (RPM).
* **`Voltage`**: Tracks electrical power. This is essential when you want to feed exact, consistent power levels to your motors regardless of how drained the robot battery is.
  * *Common units:* `Volts`.

## Quiz Time
Here's a quick quiz to test your knowledge of WPILIB Data Types

<Quiz questions={[
  {
    prompt: "Why does WPILib use special Unit data types instead of standard 'double' or 'int' primitive numbers?",
    options: [
      "Custom types make the robot drive faster automatically",
      "They bundle the number and its unit together to prevent 'unit confusion' and math mistakes",
      "Standard numbers cannot be used in robotics code at all",
      "They reduce the amount of electricity the robot battery uses"
    ],
    correct: 1,
    explanation: "Standard numbers don't carry real-world meaning. WPILib units explicitly attach meaning (like meters or inches) to a number so you don't accidentally mix them up in calculations."
  },
  {
    prompt: "If you want to track both the exact (X, Y) coordinate position of your robot on the floor AND the direction it is facing, which data type should you use?",
    options: [
      "Translation2d",
      "Rotation2d",
      "Pose2d",
      "Pose3d"
    ],
    correct: 2,
    explanation: "Pose2d is the ultimate 2D tracking type because it combines a Translation2d (position) and a Rotation2d (heading) into one clean package."
  },
  {
    prompt: "Which geometry type is best suited for tracking a complex, multi-jointed robot arm that moves up, down, and rotates in 3D space?",
    options: [
      "Pose3d",
      "Translation2d",
      "LinearVelocity",
      "Voltage"
    ],
    correct: 0,
    explanation: "Because physical mechanisms like arms move across X, Y, and Z axes and rotate in multiple directions (pitch, yaw, roll), Pose3d is used to model them accurately."
  },
  {
    prompt: "What does the 'Rotation2d' data type help a programmer do?",
    options: [
      "Spin the robot's wheels at maximum RPM",
      "Manage 2D angles easily without having to manually calculate messy degrees-to-radians math",
      "Convert battery voltage into a physical distance",
      "Track how high a robot arm lifts off the ground"
    ],
    correct: 1,
    explanation: "Rotation2d abstracts away the trigonometry, allowing you to seamlessly read or set directions using degrees, radians, or fractional rotations."
  },
  {
    prompt: "If you are measuring how fast your robot is driving down the field in a straight line, which WPILib Unit type are you interacting with?",
    options: [
      "AngularVelocity",
      "Distance",
      "Time",
      "LinearVelocity"
    ],
    correct: 3,
    explanation: "LinearVelocity measures straight-line speed (like MetersPerSecond), whereas AngularVelocity measures rotational spinning speed (like RPM)."
  },
  {
    prompt: "Why is utilizing the 'Voltage' data type helpful when controlling your robot's motors?",
    options: [
      "It allows you to feed exact power levels to motors, keeping their behavior consistent even as the battery drains",
      "It changes the physical color of the wires in your robot",
      "It eliminates the need to use a roboRIO",
      "It turns a 2D position into a 3D position automatically"
    ],
    correct: 0,
    explanation: "Robot batteries drop in voltage as a match goes on. Using the Voltage data type helps you apply software compensation so your motors receive identical power from start to finish."
  }
]} />