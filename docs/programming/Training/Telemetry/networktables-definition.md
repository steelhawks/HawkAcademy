---
sidebar_position: 3
title: What is NetworkTables
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'
import NoteTabs, { NoteTab } from '@site/src/components/NoteTabs'

# What is NetworkTables

Every piece of telemetry on the previous page &rarr; a sensor reading, a tuned PID gain, a dashboard notification &rarr; has to physically get from the roboRIO to a laptop sitting on the driver station table, over WiFi, while the robot is running. **NetworkTables** is the system that makes that possible. It's WPILib's built-in networking protocol for sharing live data between the robot and anything else on the same network &rarr; the Driver Station, a dashboard like Elastic, a coprocessor, or a vision camera like a Limelight.

You can think of NetworkTables as a shared, real-time database in the sky above your robot: any program on the network can write a value into it under a name, and any other program can read that same value back, all without either side needing to know who's on the other end.

---

## The Key/Value Model

NetworkTables organizes every piece of data as a **key/value pair**, where the key is a string that looks like a file path:

```text
/Tuning/Hood/kP          → 0.045
/Toggles/TuningMode       → false
/Elastic/SelectedTab      → "Teleoperated"
/limelight-front/tx       → 2.31
```

<Note title="New term: hierarchical keys">
The forward slashes aren't decoration &mdash; NetworkTables genuinely organizes keys into a nested tree, the same way a filesystem organizes files into folders. `/Tuning/Hood/kP` and `/Tuning/Hood/kI` both live inside a `Hood` "folder," which itself lives inside a `Tuning` "folder." This is why dashboards like Elastic and AdvantageScope can display your robot's data as an expandable tree instead of one giant flat list &mdash; they're just rendering the same hierarchy the keys already describe.
</Note>

This is exactly the structure you've already seen throughout the Util and Telemetry sections: `Toggles.tuningMode` publishes under `/Toggles/TuningMode`, every shooter tuning parameter lives under `/ShooterTuner/...`, and `LoggedTunableNumber` prefixes every key with `/Tuning/...`. None of these classes invented their own networking &mdash; they're all just organizing their data under a chosen spot in the one shared NetworkTables tree.

---

## Topics, Publishers, and Subscribers

Underneath the key/value view, NetworkTables 4 (the version used by current WPILib, often shortened to **NT4**) is built around three core pieces:

- A **topic** is the *name and type* of a communication channel &mdash; for example, `/Elastic/SelectedTab` as a string, or `/limelight-front/tx` as a double.
- A **publisher** is the object your code calls `.set(...)` on to send a new value out on a topic.
- A **subscriber** is the object your code calls `.get()` (or reads a queue from) to receive whatever the current or most recent value on a topic is.

```java
// Elastic.java
private static final StringTopic selectedTabTopic =
    NetworkTableInstance.getDefault().getStringTopic("/Elastic/SelectedTab");
private static final StringPublisher selectedTabPublisher =
    selectedTabTopic.publish(PubSubOption.keepDuplicates(true));
```

```java
// VisionIOLimelight.java
var table = NetworkTableInstance.getDefault().getTable(name);
latencySubscriber = table.getDoubleTopic("tl").subscribe(0.0);
txSubscriber = table.getDoubleTopic("tx").subscribe(0.0);
megatag2Subscriber = table.getDoubleArrayTopic("botpose_orb_wpiblue").subscribe(new double[] {});
```

<Note title="Why separate the topic from the publisher/subscriber?">
Splitting "the name and type of the channel" (the topic) from "the thing that actually sends or receives values" (the publisher/subscriber) lets you configure *how* values are sent once, up front &mdash; instead of every time you publish. `Elastic.java` uses this to attach `PubSubOption.keepDuplicates(true)` to its publisher, so an identical notification string sent twice in a row still reaches the dashboard both times, instead of being silently dropped as "no change."
</Note>

Once you have a subscriber, reading the value back is just a method call:

```java
// ObjectVisionIOLimelight.java
double limelightLatencySec = latencySubscriber.get() / 1000.0;
```

And once you have a publisher, sending a new value out is the same, one line:

```java
// VisionIOLimelight.java
orientationPublisher.accept(
    new double[] {rotationSupplier.get().getDegrees(), 0.0, 0.0, 0.0, 0.0, 0.0});
```

---

## Data Types NetworkTables Can Carry

NetworkTables supports a fixed set of value types, each with its own topic/publisher/subscriber classes (`DoubleTopic`/`DoublePublisher`/`DoubleSubscriber`, `StringTopic`/`StringPublisher`/`StringSubscriber`, and so on):

| Type | Example in `Rebuilt2026` |
|---|---|
| `boolean` | `LoggedNetworkBoolean("Toggles/TuningMode", false)` |
| `double` | `table.getDoubleTopic("tx").subscribe(0.0)` |
| `int` (`long` internally) | `table.getIntegerTopic("tid").subscribe(0)` |
| `String` | `NetworkTableInstance.getDefault().getStringTopic("/Elastic/SelectedTab")` |
| `double[]` | `table.getDoubleArrayTopic("botpose_wpiblue").subscribe(new double[] {})` |
| structured objects (via `Struct`) | pose and geometry types logged through AdvantageKit |

<NoteTabs>
  <NoteTab title="No 'object' type &mdash; why does Elastic send JSON strings instead?">
NetworkTables has no built-in type for an arbitrary Java object like `Elastic.Notification` (which bundles a level, title, description, and display time together). That's exactly why `Elastic.sendNotification(...)` serializes the whole object into a single JSON string before publishing it &mdash; a `StringTopic` is the closest built-in type that can carry structured information, as long as both sides agree on how to encode and decode it.
  </NoteTab>
  <NoteTab title="What about Pose2d, Pose3d, and other WPILib geometry types?">
Newer versions of NetworkTables support a `Struct` type, which lets a type like `Pose2d` define exactly how it packs itself into raw bytes and back. AdvantageKit's `Logger.recordOutput(...)` uses this under the hood whenever you log a `Pose2d`, `Pose3d`, or similar geometry object directly, which is why `Boundary.log(...)` can pass `Translation2d[]` straight to `Logger.recordOutput(...)` without manually converting it to doubles first.
  </NoteTab>
</NoteTabs>

---

## Two Directions, One System

Because NetworkTables is a shared table rather than a one-way broadcast, data flows through it in both directions at once, often through the exact same key:

- **Robot &rarr; dashboard**: sensor readings, computed state, notifications &mdash; the robot publishes, a human (or AdvantageScope) reads.
- **Dashboard &rarr; robot**: a tuning slider, a checkbox, a button press &mdash; a human publishes from the dashboard, and the robot's own code reads it back.

`LoggedTunableNumber` is the clearest example of both directions happening through one class:

```java
// LoggedTunableNumber.java
public void initDefault(double defaultValue) {
    if (!hasDefault) {
        hasDefault = true;
        this.defaultValue = defaultValue;
        if (Toggles.tuningMode.get()) {
            dashboardNumber = new LoggedNetworkNumber(key, defaultValue);
        }
    }
}

public double get() {
    // ...
    return Toggles.tuningMode.get() ? dashboardNumber.get() : defaultValue;
}
```

The robot publishes a starting value (`defaultValue`) out to `/Tuning/...` so the dashboard has something to display, and then, on every subsequent `get()` call, reads back whatever value is *currently* sitting at that key &mdash; which might still be the robot's own default, or might be something we type in.  

<Note title="This is what makes tuning without redeploying possible">
There's no special "tuning mode" networking &mdash; it's the same publish/subscribe mechanism used for everything else on this page. The only thing that changes is *who last wrote to the key*: the robot at boot, or a human a moment ago on the dashboard.
</Note>

---

## Raw NetworkTables vs. AdvantageKit Wrappers

You'll see NetworkTables used two different ways throughout `Rebuilt2026`, and it's worth being able to tell them apart:

<NoteTabs>
  <NoteTab title="Raw NetworkTables API">
Code that talks to `NetworkTableInstance`, `NetworkTable`, topics, publishers, and subscribers directly. This is what you'll find in `VisionIOLimelight`, `LimelightHelpers`, `Elastic`, and the legacy `DashboardTrigger` &mdash; mostly because these classes are talking to *external* devices (a Limelight camera, the Elastic dashboard app) that only understand plain NetworkTables, not AdvantageKit's logging format.

```kotlin
// DashboardTrigger.kt
val table = NetworkTableInstance.getDefault().getTable("controls")
val retrievedEntry = table.getEntry(entry)
retrievedEntry.getBoolean(false)
```
  </NoteTab>
  <NoteTab title="AdvantageKit wrappers">
Code that uses `LoggedNetworkNumber` and `LoggedNetworkBoolean` (as seen throughout `Toggles`, `LoggedTunableNumber`, and `ShooterTuner`). Underneath, these classes still publish and subscribe over the exact same NetworkTables system &mdash; they just add one extra feature: every value they read or write is also captured into AdvantageKit's log replay system, so a value that was live-tuned during a real match gets faithfully reproduced later when that match's log is replayed.

```java
// Toggles.java
LoggedNetworkBoolean tuningMode =
    new LoggedNetworkBoolean("Toggles/TuningMode", false);
```
  </NoteTab>
</NoteTabs>

Neither approach is "more correct" &mdash; raw NetworkTables is what you reach for when talking to something outside your own AdvantageKit-aware code (a Limelight, the Elastic app), and the `LoggedNetwork...` wrappers are what you reach for almost everywhere else, specifically because they come with replay support for free.

---

## NT4-Specific Features Used in Our Code

A few NetworkTables 4 features show up repeatedly once you look past the basic `get()`/`set()` pattern:

### Reading a queue of timestamped samples

A subscriber doesn't just hold "the latest value" &mdash; it can also hand back every value it has received since you last checked, each with its own timestamp:

```java
// VisionIOLimelight.java
for (var rawSample : megatag2Subscriber.readQueue()) {
    // rawSample.timestamp and rawSample.value are both available here
    poseObservations.add(new PoseObservation(/* ... */));
}
```

<Note title="Why does this matter for vision?">
A Limelight's pose estimate for a given camera frame was computed slightly *in the past* by the time your robot code sees it (camera processing, network transfer, etc. all take real time). Reading the queue instead of just `.get()` lets vision code attach the *correct* timestamp to each pose sample, so it can be fused into odometry at the right point in the robot's motion history &mdash; not "now," but "whenever that frame was actually captured."
</Note>

### Atomic (timestamped) single reads

```java
// LimelightHelpers.java
TimestampedDoubleArray tsValue = poseEntry.getAtomic();
double[] poseArray = tsValue.value;
```

`getAtomic()` returns both a value and the exact timestamp it was published at, in one indivisible read &mdash; useful anywhere a single timestamped sample is enough, without needing the full history a queue provides.

### Connection detection via "last change" time

```java
// ObjectVisionIOLimelight.java
inputs.connected =
    ((RobotController.getFPGATime() - latencySubscriber.getLastChange()) / 1000) < 250;
```

Every NetworkTables entry tracks when it was last updated. If a Limelight stops sending new values (unplugged, crashed, lost network), `getLastChange()` stops advancing &mdash; comparing it against the current time is a simple, reliable way to detect a disconnected camera without any extra heartbeat logic.

---

## Putting It All Together

```text
Robot code (roboRIO)                          Dashboard / coprocessor
─────────────────────                          ────────────────────────
LoggedNetworkBoolean("Toggles/TuningMode")
        │  publish
        ▼
   NetworkTables  ── "/Toggles/TuningMode" ──►   Elastic checkbox reads it,
   (shared key/value tree,                       displays current state
    synced live over WiFi)
        ▲
        │  a human flips the checkbox
   NetworkTables  ◄── "/Tuning/Hood/kP" ──────   Elastic slider publishes
        │  subscribe                             a new value
        ▼
LoggedTunableNumber.get() reads the new
value back on the very next loop
```

Every example throughout this page, and everything on the previous Telemetry page, ultimately reduces to this same loop: something on one side of the network publishes a value under a key, and something on the other side subscribes to that same key to read it &mdash; NetworkTables itself doesn't care which side is "the robot" and which is "the dashboard," it just keeps every key's current value in sync across the network.

---

<Quiz questions={[
{
prompt: "What is the fundamental unit of data storage in NetworkTables?",
options: [
"A key/value pair, where the key is a hierarchical, slash-separated string",
"A single shared binary blob for the entire robot",
"A row in a SQL database",
"A fixed-size array indexed by subsystem name"
],
correct: 0,
explanation: "NetworkTables stores data as key/value pairs, with keys organized into a nested tree using forward slashes (e.g. /Tuning/Hood/kP), similar to how a filesystem organizes files into folders."
},
{
prompt: "What are the roles of a 'topic' versus a 'publisher' or 'subscriber' in NetworkTables 4?",
options: [
"A topic is the name and type of a communication channel; a publisher/subscriber is the object your code actually calls .set()/.get() on to send or receive values over that channel",
"A topic and a publisher are the exact same object with two different names",
"Topics are only used for booleans, publishers are only used for numbers",
"A subscriber can only be created after a value has already been published at least once"
],
correct: 0,
explanation: "Splitting the channel's identity (the topic) from the object that actually sends or receives data (publisher/subscriber) lets configuration like PubSubOptions be set up once, separately from every individual .set() or .get() call."
},
{
prompt: "Why does Elastic.sendNotification(...) serialize its Notification object into a JSON string before publishing it, instead of publishing it directly?",
options: [
"NetworkTables has no built-in type for an arbitrary structured Java object, so a StringTopic carrying JSON text is the closest built-in type that can represent multiple related fields (level, title, description) at once",
"JSON strings transmit faster than any other NetworkTables type",
"Notification objects are too large to fit in a single NetworkTables entry otherwise",
"Elastic does not support boolean or numeric topics"
],
correct: 0,
explanation: "NetworkTables only supports a fixed set of primitive-ish types (booleans, doubles, strings, arrays, and struct-based types). Since Notification bundles several fields together, Elastic encodes the whole object as a JSON string, which both sides know how to interpret."
},
{
prompt: "Why does VisionIOLimelight use subscriber.readQueue() for pose data instead of just calling .get() for the latest value?",
options: [
"readQueue() returns every value received since the last check, each with its own timestamp, letting vision code fuse each pose sample into odometry at the exact moment it was actually captured, rather than only using whatever value happens to be current 'now'",
"readQueue() is required by Java for all double[] topics",
"get() only works for boolean topics",
"readQueue() is faster because it skips the network entirely"
],
correct: 0,
explanation: "A vision pose estimate reflects a frame captured slightly in the past. Reading the full queue of timestamped samples (rather than just the newest value) lets the robot correctly associate each pose estimate with the exact time it was actually measured."
},
{
prompt: "How does ObjectVisionIOLimelight detect that a Limelight camera has disconnected, without any dedicated heartbeat message?",
options: [
"It compares the current time against latencySubscriber.getLastChange() — if too much time has passed since the entry's value last changed, the camera is considered disconnected",
"It pings the Limelight's IP address directly over a socket",
"It counts how many times get() has been called total",
"It relies on the Driver Station to report camera status"
],
correct: 0,
explanation: "Every NetworkTables entry tracks when it was last updated. If a camera stops publishing new values, getLastChange() stops advancing, so comparing it against the current time is a simple, reliable disconnect check with no extra protocol needed."
}
]} />

## Next Steps

Now that you understand what NetworkTables actually is &mdash; the shared, hierarchical, publish/subscribe system underneath every dashboard value, tunable number, and notification you've seen so far &mdash; the next page covers how our codebase actually *logs* data through it using AdvantageKit's `Logger`, and how that data ends up visible on Elastic and AdvantageScope.
