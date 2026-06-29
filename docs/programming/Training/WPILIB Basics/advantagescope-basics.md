---
sidebar_position: 8
---

# AdvantageScope Basics
In this section, we'll go over a very important tool: **Logging**. We use logging for everything, and we'll introduce the concept of debugging. After you're done with this section, you'll learn how we write subsystems, and go into the more advanced programming skills.

## What is Logging?

Logging is the process of sending data somewhere, and using it to monitor systems and debug if something goes wrong. In our code, we log almost everything in order to have enough information to figure out where things went wrong. The logging tool we use is called AdvantageKit, which allows us to log data to a specific tool called AdvantageScope. In AdvantageScope we track data and tune values, which you'll learn about later too. 

## What Kind of Data is Logged?
For motors, we log a specific set of data for all motors regardless of which subsystem is being logged. Here it is:


| Name | Data Type |  Why We Log It |
|------|------| ------ |
| isConnected  | Boolean | We log if the motor is connected or not in order to constantly make sure that the motor is online and everything is running as expected, as well as figure out which motor is disconnected very quickly | 
| AppliedVolts | double  | applied volts is the amount of volts that we take from the battery into the motor. This is useful because a brownout (when too much power is taken from battery) could occur from a motor, and this helps check if a motor is pulling too many volts |
| PositionRad | Rotation2d or double | We track position in order to figure out how many rotations/radians/degrees a motor has travelled, and it can be used depending on the mechanism for different purposes (like zeroing/homing) |
| True/False | boolean 