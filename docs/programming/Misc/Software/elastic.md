---
sidebar_position: 2
title: "Elastic Dashboard"
---

# Using the FRC Elastic Dashboard

Elastic is our drivers', testing, and debugging dashboard. It displays robot data published through NetworkTables and lets operators change selected NetworkTables values, such as booleans and autonomous choices.

This guide uses the layout and conventions in the `Rebuilt2026` project. The checked-in layout is `elastic-layout.json`, with two tabs:

- `Teleoperated`: the driver-facing tab for a match.
- `Autonomous`: the pre-match tab for choosing and verifying autonomous.

## Installation

1. Open the **[Elastic releases page](https://github.com/Gold872/elastic_dashboard/releases)**
2. Download the current release for the computer's operating system. For the 2026 control system, use the 2026 release, not a 2027 alpha/pre-release.
3. Install or extract Elastic.
4. Start the FRC Driver Station before connecting to the robot. The dashboard computer and roboRIO must be on the same robot network.

Elastic is also available as a web application from the **[official Elastic documentation](https://frc-elastic.gitbook.io/docs)** The desktop application is preferable for competition because the team can keep a local layout and launch it consistently.

## Connect to the robot

1. Connect the laptop to the robot radio or practice-network Wi-Fi.
2. Confirm that Driver Station shows the expected team number and that the robot is communicating.
3. Open Elastic.
4. Select the NetworkTables connection for the robot.
5. Wait for the robot program to start publishing values. The widget picker is populated from the NetworkTables topics currently visible to Elastic.

Elastic does not create robot data. Robot code must publish it first through WPILib `SmartDashboard`, `Sendable` objects, AdvantageKit's NetworkTables publisher, or direct NetworkTables publishers.

## Load the Steelhawks layout

Our code contains two useful layout files:

- `elastic-layout.json`: the editable team layout, including the named `Teleoperated` and `Autonomous` tabs.
- `2026Rebuilt.json`: an exported dashboard configuration used by the project.

Use Elastic's layout open/import command and select the JSON file. Keep the layout in the robot repository so changes can be reviewed and shared. After editing the dashboard, save or export the updated layout and commit it when appropriate.

If a layout is loaded while the robot is disconnected, widgets may appear empty until their NetworkTables topics become available.

## Tabs and widgets

### Autonomous

The `Autonomous` tab is used while disabled before a match. The layout includes:

- an `Auto Chooser` widget from `/SmartDashboard/Auto Chooser/*`;
- a `Field2d` view of the estimated robot pose;
- measured swerve state;
- gyro yaw, pitch, and roll;
- subsystem connection indicators;
- match time and FMS information.

Select the autonomous routine before enabling the robot and verify the chooser shows the intended option.

### Teleoperated

The `Teleoperated` tab is the operator's primary match view. The layout includes:

- the robot field pose and other field objects;
- the camera stream from the roboRIO CameraServer;
- match time and game data;
- alerts from `/SmartDashboard/Alerts/*`;
- match type and other Driver Station values;
- dashboard controls under the `Toggles` and `Dashboard` NetworkTables paths;
- subsystem status and tuning values when those topics are available.

During a match, use this tab for information that helps the drive team make decisions. Avoid changing tuning or override values during a match unless the lead operator has approved the change.

## Add and configure widgets

1. Select **Add Widget**.
2. Search for a NetworkTables topic or expand its table and subtables.
3. Drag the topic onto the grid.
4. Move or resize the widget.
5. Right-click the widget to edit its title, display type, or NetworkTables settings.

Common topics from `Rebuilt2026`:

| Topic | Purpose |
| --- | --- |
| `/SmartDashboard/Auto Chooser/*` | Select the autonomous routine |
| `/SmartDashboard/Field` | WPILib `Field2d` visualization |
| `/SmartDashboard/CommandScheduler` | See scheduled commands |
| `/SmartDashboard/Alerts/*` | Show robot notifications and alerts |
| `/AdvantageKit/RealOutputs/RobotState/PoseEstimation/Odometry` | Display the estimated pose |
| `/AdvantageKit/RealOutputs/SwerveStates/Measured` | Display measured swerve module state |
| `/Toggles/...` | Persistent robot behavior toggles |
| `/Dashboard/...` | One-shot dashboard commands |

The topic and update-period settings should normally be left alone. Change them only when you understand the NetworkTables topic and update rate. Widgets can be copied between tabs using Elastic's internal copy/paste menu.

## Our Toggles

`Toggles.java` creates NetworkTables booleans with `LoggedNetworkBoolean`. Elastic displays those booleans as controls. A toggle's full path is part of its API: changing the name in code creates a different topic and breaks the existing widget binding.

### Persistent toggles

These remain at their selected value until code changes them or the dashboard publishes another value:

```text
Toggles/DebugMode
Toggles/TuningMode
Toggles/MotionMagicEnabled
Toggles/ShooterTuningMode
Toggles/LUT
Toggles/KinematicsTOF
Toggles/Vision/VisionEnabled
Toggles/Vision/<camera name>Enabled
Toggles/Swerve/DriveOpenLoopOverride
Toggles/Swerve/TurnOpenLoopOverride
Toggles/Flywheel/IsEnabled
Toggles/Flywheel/ToggleVoltageOverride
Toggles/Flywheel/ToggleCurrentOverride
Toggles/Turret/IsEnabled
Toggles/Turret/ToggleVoltageOverride
Toggles/Intake/IsEnabled
Toggles/Indexer/Spindexer/IsEnabled
Toggles/Indexer/Feeder/IsEnabled
Toggles/Hood/IsEnabled
```

Use these for controlled testing only. Motor `IsEnabled`, voltage/current overrides, open-loop overrides, and vision enable switches can change robot behavior immediately.

### Momentary dashboard commands

`Toggles.configureOverrides()` creates one-shot controls under `Dashboard/`. When the boolean becomes true, a `Trigger` schedules the command; the code then sets the boolean back to false:

```text
Dashboard/Zero/Turret
Dashboard/Zero/Hood
Dashboard/Zero/Intake
Dashboard/VisionReset/LeftCorner
Dashboard/VisionReset/RightCorner
Dashboard/LUT/UseLUTHardBalls
Dashboard/LUT/UseLUTSoftBalls
```

The zeroing and vision-reset commands are potentially disruptive. Use them only with the robot disabled or in a controlled test procedure. The LUT commands are allowed while disabled through `ignoringDisable(true)`; that does not make every dashboard control safe while enabled.

## Mode-based tab selection

The team includes an `Elastic` helper that publishes to Elastic's selection topic:

```java
Elastic.selectTab("Teleoperated");
```

`Robot.teleopInit()` calls this method, so entering teleoperated mode automatically selects the `Teleoperated` tab. The autonomous call is currently commented out in `Robot.java`:

```java
// Elastic.selectTab("Autonomous");
```

To enable automatic autonomous selection, uncomment it and make sure the layout tab is named exactly `Autonomous`. Tab names are case-sensitive; `auto`, `Auton`, and `Autonomous` are different names. Named tabs are easier to maintain than numeric indexes.

## Alerts and notifications

Steelhawks' `Elastic` helper publishes notifications to `/Elastic/RobotNotifications`. A notification has a level (`INFO`, `WARNING`, or `ERROR`), title, description, display time, and optional dimensions. Use notifications for conditions the operator should notice immediately; use ordinary logged values for continuously changing telemetry.

```java
Elastic.sendNotification(
    new Elastic.Notification()
        .withLevel(Elastic.Notification.NotificationLevel.WARNING)
        .withTitle("Vision unavailable")
        .withDescription("Check the camera connection")
        .withDisplaySeconds(5));
```

The `Teleoperated` layout subscribes to `/SmartDashboard/Alerts/*` for the alert widget. Keep the two systems distinct: the custom `Elastic` notification API is for Elastic notifications, while the SmartDashboard alert widget displays topics published under the SmartDashboard alert path.

## Cameras and field views

Elastic can display a camera only when the stream is published through the roboRIO CameraServer. The `Teleoperated` layout contains a camera widget using the CameraServer stream on port `1181`. If it is blank:

1. Confirm the camera is connected to the roboRIO.
2. Confirm robot code starts and publishes the camera stream.
3. Confirm the dashboard is connected to the correct robot NetworkTables instance.
4. Lower the camera resolution or frame rate if the dashboard or robot network is overloaded.

`Field2d` widgets display the pose and named field objects published by robot code. Steelhawks registers the field with `SmartDashboard.putData("Field", FieldConstants.FIELD_2D)` and publishes pose data through AdvantageKit. A field widget with no robot is usually a publishing, connection, or topic-path problem.

## Safe operating procedure

Before testing:

1. Put the robot in a safe position with an emergency stop available.
2. Confirm the correct robot and dashboard layout.
3. Start with all overrides off.
4. Change one toggle at a time.
5. Watch the corresponding telemetry and confirm the expected behavior.
6. Return temporary overrides to their normal values before handing the robot to another operator.

Before a match:

1. Load the intended layout.
2. Confirm the robot connection and camera stream.
3. On `Autonomous`, select and verify the autonomous routine.
4. Confirm the field pose, subsystem connection indicators, and match-time widget.
5. Switch to `Teleoperated` and leave test-only tuning and override controls untouched.

Never use Elastic as a substitute for an emergency stop, safety interlock, or FMS control. A dashboard value travels over NetworkTables and can be stale, disconnected, or changed by another client.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No topics appear | Driver Station connection, robot radio network, and Elastic's selected NetworkTables connection |
| Widget says disconnected | Confirm the robot program is running and the topic path still exists |
| A toggle does nothing | Check the exact case-sensitive path and confirm the code creates the toggle for this robot configuration |
| A one-shot command stays true | Check that the robot code is running and that the command reaches the reset-to-false step |
| Autonomous tab is not selected automatically | Confirm the tab is named `Autonomous` and uncomment `Elastic.selectTab("Autonomous")` if desired |
| Camera is blank | Confirm CameraServer publication, stream availability, and network bandwidth |
| Field is blank | Confirm `Field2d`/AdvantageKit publishers and the widget's topic path |
| Layout looks empty after loading | Connect to the robot; widgets may not resolve until their topics are published |
| Dashboard becomes slow | Remove high-rate or unnecessary widgets and reduce camera resolution/FPS |

## References

- **[Elastic documentation](https://frc-elastic.gitbook.io/docs)**
- **[Elastic installation and releases](https://github.com/Gold872/elastic_dashboard/releases)**
- **[Adding and customizing widgets](https://frc-elastic.gitbook.io/docs/customizing-your-dashboard/adding-and-customizing-widgets)**
- **[Widget and property reference](https://frc-elastic.gitbook.io/docs/additional-features-and-references/widgets-list-and-properties-reference)**
- **[WPILib NetworkTables documentation](https://docs.wpilib.org/en/stable/docs/software/networktables/index.html)**
- **[Steelhawks `elastic-layout.json`](https://github.com/SteelHawks/Rebuilt2026/blob/main/elastic-layout.json)**
- **[Steelhawks `Toggles.java`](https://github.com/SteelHawks/Rebuilt2026/blob/main/src/main/java/org/steelhawks/Toggles.java)**
- **[Steelhawks `Elastic.java`](https://github.com/SteelHawks/Rebuilt2026/blob/main/src/main/java/org/steelhawks/util/Elastic.java)**
