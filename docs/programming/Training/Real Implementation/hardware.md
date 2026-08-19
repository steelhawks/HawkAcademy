---
sidebar_position: 4
---

import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Writing The Hardware File
Now that you've written the interface that all of this subsystem's code will be based on, it's time to write the actual hardware implementation in the `IndexerIOTalonFX.java` file!

`IndexerIO.java` only named what the Indexer can know and do &mdash; it never said *how*. `IndexerIOTalonFX` is where "how" finally shows up: two real `TalonFX` motor controllers and a real beam-break sensor, wired into every method the interface promised.

<Note title="Reminder">
<code>IndexerIOTalonFX implements IndexerIO</code>. Every method you write here has to match a method that already exists in the interface &mdash; same name, same parameters. If it doesn't match exactly, it's not overriding anything; it's just a new, unused method.
</Note>

---

## What This File Needs to Do

Strip it down to a checklist, and `IndexerIOTalonFX` needs exactly four things:

1. **Hold onto the hardware** &rarr; two `TalonFX` objects (spindexer, feeder), each constructed on a specific `CANbus`, plus one reusable control-request object per motor for commanding it.
2. **Configure each motor's own `TalonFXConfiguration`**, in the constructor &mdash; gear ratio, neutral mode, direction, and current limits &mdash; then register that motor's signals so the rest of the robot can refresh and trust them efficiently.
3. **Read from it** &rarr; fill in `SpindexerIOInputs` and `FeederIOInputs` with real numbers every time `updateInputs` is called.
4. **Write to it** &rarr; actually spin the motors when `runSpindexer` / `runFeeder` are called, and actually stop them when `stopSpindexer` / `stopFeeder` are called.

Most of this isn't new &mdash; you've created a `TalonFX` and built a `TalonFXConfiguration` before, back in WPILIB Basics. What's new is *how* this file reads sensor data (`StatusSignal`), *how* it commands the motors (a control request instead of `.set()`), and a few extra configuration options a real competition mechanism needs. Let's cover all of that before you write anything.

---

## New Concept: `StatusSignal`

**`StatusSignal` is a Phoenix 6 class that represents one single piece of data coming from a TalonFX** &mdash; a position, a velocity, a voltage, a current, a temperature. Whenever you ask a `TalonFX` for a reading, like `spindexer.getPosition()`, you don't get a plain number back. You get a `StatusSignal` &mdash; an object that's holding that reading for you.

Here's the part that trips people up the first time: getting that `StatusSignal` object, and getting the *actual number* out of it, are two different steps.

- `spindexer.getPosition()` &rarr; hands you the `StatusSignal` object itself.
- `.getValueAsDouble()` on that object &rarr; hands you whatever number is currently *stored* inside it.

The important detail is that `.getValueAsDouble()` does **not** go ask the motor "hey, what's your position right now?" It just reports back whatever value was stored the last time someone updated it &mdash; even if that was a while ago. To actually go grab a brand new number off the motor, you have to call a separate method: `.refresh()`. Only `.refresh()` talks to the motor. `.getValueAsDouble()` never does.

Think of a `StatusSignal` like a whiteboard with yesterday's score written on it. Looking at the whiteboard (`getValueAsDouble()`) always works instantly, but it only shows you whatever was last written down. Someone has to walk over and update the whiteboard (`refresh()`) before looking at it will show today's score.

Below is a small, fake version of this idea in plain Java &mdash; not real Phoenix 6 code, just a simplified stand-in so you can see the "stale until refreshed" behavior for yourself. Run it and read the output, then try adding a second `refresh()` call right before the second `println` and re-run it.

<JavaRunner
  starterCode={`public class Main {

    // A tiny stand-in for Phoenix 6's StatusSignal<Double>.
    static class FakeStatusSignal {
        private double cachedValue = 0.0;
        private double sensorOnTheWire = 0.0;

        // Pretend this is a real sensor reading changing over time.
        void simulateHardwareChange(double newRealValue) {
            sensorOnTheWire = newRealValue;
        }

        // Reading does NOT talk to hardware -- it just returns the cache.
        double getValueAsDouble() {
            return cachedValue;
        }

        // Refreshing is what actually pulls a new value off the "CAN bus".
        void refresh() {
            cachedValue = sensorOnTheWire;
        }
    }

    public static void main(String[] args) {
        FakeStatusSignal position = new FakeStatusSignal();

        position.simulateHardwareChange(5.0);  // the "motor" moved...
        System.out.println("Before refresh(): " + position.getValueAsDouble());

        position.refresh();                    // ...but we haven't asked for it yet
        System.out.println("After refresh():  " + position.getValueAsDouble());
    }
}`}
/>

<Note title="Why not just refresh automatically?">
It sounds annoying to have to remember to call <code>refresh()</code> yourself &mdash; so why doesn't Phoenix 6 just do it automatically every time you read a value? Because a motor controller can have a dozen or more readings (position, velocity, voltage, current, temperature...), and each one you refresh is a separate trip out over the CAN bus. If every single <code>.getValueAsDouble()</code> secretly refreshed itself, reading six values would mean six separate trips over the bus, every single loop, on every motor, on the whole robot &mdash; that adds up fast and slows everything down.

Instead, Phoenix 6 lets you refresh <strong>several signals at once</strong>, in a single trip, using <code>BaseStatusSignal.refreshAll(signalA, signalB, signalC, ...)</code>. You'll call this once for all of the spindexer's signals, and once for all of the feeder's signals, inside <code>updateInputs</code> &mdash; refreshing six values in one trip instead of six.
</Note>

One more useful thing a batched refresh gives you: it hands back a way to ask "did every signal in that batch actually come back OK?" &mdash; and that's exactly what you'll use to fill in each inputs class's `connected` field.

---

## New Concept: `PhoenixUtil`, `registerSignals`, and Bus Optimization

You met `PhoenixUtil` back on the Util section's **Hardware Helpers** page. Now it's time to actually use it, instead of just reading about it.

Rather than calling `BaseStatusSignal.refreshAll(...)` yourself inside `updateInputs`, the pattern our real codebase uses is:

1. **Register** every signal a motor has, once, in the constructor: `PhoenixUtil.registerSignals(canBus, signalA, signalB, ...)`. This doesn't refresh anything yet &mdash; it just tells `PhoenixUtil` "these signals exist, please include them the next time you refresh this bus."
2. Somewhere central &mdash; `Robot.robotPeriodic()` in the real codebase &mdash; `PhoenixUtil.refreshAll()` gets called once per loop, which refreshes *every* registered signal from *every* subsystem in as few CAN transactions as possible.
3. Because refreshing happens centrally, `updateInputs` here doesn't refresh anything itself. It just reads whatever is currently cached, and asks `BaseStatusSignal.isAllGood(signalA, signalB, ...)` &mdash; a convenience method that refreshes nothing but simply checks whether every signal you pass it is currently healthy &mdash; to fill in `connected`.

Two more calls you'll see in the constructor, both about being a good citizen on a shared CAN bus:

- **`motor.optimizeBusUtilization()`** &mdash; by default, a TalonFX broadcasts a bunch of signals nobody asked for. This call tells it to stop sending anything you haven't explicitly registered or requested, freeing up bus bandwidth for the signals you actually care about.
- **`BaseStatusSignal.setUpdateFrequencyForAll(hz, signalA, signalB, ...)`** &mdash; not every signal needs to be equally fresh. Position and velocity matter every single loop, so they're set to a high frequency (like `100` Hz); something like current draw can update a bit less often (`50` Hz) without hurting anything. Grouping signals by how fast they actually need to update, instead of refreshing everything at the same rate, is another way to keep the CAN bus from getting overloaded.

<Note title="Why wrap the config apply in PhoenixUtil.tryUntilOk(...)?">
A configuration command sent over CAN can occasionally get lost, just like a sensor read can. Unlike a sensor read, though, a config is usually only sent once, during the constructor while the robot boots up &mdash; if that one attempt is lost, the motor would silently keep running with the wrong (possibly unsafe) settings for the entire match. <code>PhoenixUtil.tryUntilOk(5, () -&gt; motor.getConfigurator().apply(config))</code> just retries the same apply call up to 5 times until one of them actually succeeds.
</Note>

---

## New Concept: Control Requests (`DutyCycleOut`)

So far you've commanded a motor with `motor.set(output)`. Phoenix 6 also supports a more explicit style called a **control request**: you build one request object describing exactly how you want to drive the motor, configure it once, and then reuse that same object every time you command the motor, just swapping out the output value.

```java
DutyCycleOut spindexerDutyCycleOut = new DutyCycleOut(0.0)
    .withUpdateFreqHz(0.0)
    .withEnableFOC(true);

// later, every time you want to command the motor:
spindexerMotor.setControl(spindexerDutyCycleOut.withOutput(output));
```

`DutyCycleOut` means "command the motor as a percent output between -1 and 1" &mdash; the same thing `.set()` does under the hood. `.withOutput(output)` doesn't mutate the original object; it returns a copy with just the output field changed, which is why it's safe to call fresh every time inside `runSpindexer`. `.withEnableFOC(true)` turns on Field-Oriented Control, a more precise (and slightly more CPU-intensive) way for the motor to translate that percent output into actual current &mdash; you'll see `torqueCurrentAmps` in your inputs class light up because of this. `.withUpdateFreqHz(0.0)` tells the request to send at the motor's default rate rather than overriding it.

<Note title="Why bother, if .set() does the same thing?">
For a simple percent-output motor like this one, <code>.set()</code> and a bare <code>DutyCycleOut</code> request are nearly interchangeable. The control-request style becomes essential once you need more advanced control types &mdash; <code>VelocityVoltage</code>, <code>PositionTorqueCurrentFOC</code>, <code>MotionMagicVoltage</code>, and others &mdash; which don't have a <code>.set()</code> equivalent at all. Building the habit of using a reusable request object now means the pattern is already familiar when a future mechanism needs one of those.
</Note>

---

## What You Need to Build

Open `IndexerIOTalonFX.java`, declare `public class IndexerIOTalonFX implements IndexerIO`, and build these four pieces yourself.

### 1. Fields

- Two `TalonFX` motors: one for the spindexer, one for the feeder &mdash; both constructed with a device ID **and** a `CANbus`.
- Two `TalonFXConfiguration` objects, one per motor, since the spindexer and feeder need different gear ratios and current limits.
- A `StatusSignal<Angle>`, `StatusSignal<AngularVelocity>`, `StatusSignal<Voltage>`, `StatusSignal<Current>` (x2, for supply and torque current), and `StatusSignal<Temperature>` &mdash; **for each motor**. (Phoenix 6's `getPosition()`, `getVelocity()`, `getMotorVoltage()`, `getSupplyCurrent()`, `getTorqueCurrent()`, and `getDeviceTemp()` each return one of these.)
- One `DutyCycleOut` control request per motor, for commanding it in `runSpindexer`/`runFeeder`.

### 2. The Constructor

- Create both `TalonFX` objects, passing in a device ID and the `CANbus` they live on.
- Build each motor's own `TalonFXConfiguration`:
  - `Feedback.SensorToMechanismRatio` &rarr; the gear ratio between the motor's internal encoder and the mechanism it's spinning, so `getPosition()`/`getVelocity()` come back already scaled to the mechanism, not the raw motor shaft.
  - `MotorOutput.NeutralMode` &rarr; `NeutralModeValue.Brake` or `.Coast`, depending on the mechanism.
  - `MotorOutput.Inverted` &rarr; which physical direction counts as "positive," based on how the motor is actually wired.
  - `CurrentLimits.SupplyCurrentLimit` **and** `CurrentLimits.StatorCurrentLimit` (each with its matching `...LimitEnable` flag).
- Apply each config with `PhoenixUtil.tryUntilOk(5, () -> motor.getConfigurator().apply(config))`, then call `motor.optimizeBusUtilization()`.
- Assign your `StatusSignal` fields from `spindexerMotor.getPosition()`, etc.
- Create your `DutyCycleOut` request objects.
- Call `BaseStatusSignal.setUpdateFrequencyForAll(...)` to set how often your signals should refresh, then `PhoenixUtil.registerSignals(canBus, ...)` to hand every signal off to be refreshed centrally.

<Note title="Supply current vs. stator current -- what's the difference?">
<strong>Supply current</strong> is how much current the motor is pulling from the battery/breaker &mdash; limiting it protects your robot's electrical system and other mechanisms sharing the same battery. <strong>Stator current</strong> is how much current is actually flowing through the motor's windings, which is what actually produces torque &mdash; limiting it protects the mechanism itself (and whatever it's attached to) from over-torquing, jamming hard, or snapping something. A motor can be well within its supply limit while still producing dangerous torque, which is why competition mechanisms usually set both.
</Note>

<Note title="Why Brake mode for an Indexer?">
Coast mode lets a motor spin freely to a stop. For a mechanism holding a game piece against gravity or momentum, that free-spin could let a piece fall out or drift out of position the instant power cuts. Brake mode resists that motion, which is why nearly every non-drivetrain mechanism in our codebase uses it.
</Note>

### 3. `updateInputs`

- Set each inputs object's `connected` field using `BaseStatusSignal.isAllGood(...)`, passing in that motor's full set of signals.
- Fill in every other field straight from the corresponding signal's `.getValueAsDouble()`. Nothing in this method refreshes anything &mdash; that already happens centrally, once per loop, wherever `PhoenixUtil.refreshAll()` is called.

### 4. The Run/Stop Methods

- `runSpindexer(double output)` and `runFeeder(double output)` &rarr; call `motor.setControl(request.withOutput(output))` on the matching motor and its `DutyCycleOut` request.
- `stopSpindexer()` and `stopFeeder()` &rarr; call `.stopMotor()` on the matching motor.

Don't forget `@Override` above each of these four methods, plus `updateInputs` &mdash; it's not required to compile, but it's how the compiler catches a typo'd method name for you instead of silently creating an unused new method.

Give it a real attempt before scrolling further. If you get stuck, here are two nudges:

<SolutionDropdown
  label="Hint 1 &rarr; the imports you'll need"
  explanation="Here are all the imports needed"
  code={`com.ctre.phoenix6.hardware.TalonFX
    com.ctre.phoenix6.CANBus
    com.ctre.phoenix6.configs.TalonFXConfiguration
    com.ctre.phoenix6.controls.DutyCycleOut
    com.ctre.phoenix6.signals.NeutralModeValue
    com.ctre.phoenix6.signals.InvertedValue 
    com.ctre.phoenix6.BaseStatusSignal
    com.ctre.phoenix6.StatusSignal
    org.steelhawks.util.PhoenixUtil`}
/>

<SolutionDropdown
  label="Hint 2 &rarr; why does each motor get its own TalonFXConfiguration instead of sharing one?"
  explanation="A single shared config would force the spindexer and feeder to have identical gear ratios, current limits, and inversion -- which happens to work if they're identical motors wired identically, but breaks the moment they're not. Giving each motor its own TalonFXConfiguration object means each one's settings can be tuned independently, which is what every real IO implementation in our codebase does."
/>

---

## The Final Code

Here's the completed implementation. Compare it against what you wrote &mdash; it's fine if your device IDs, port number, or current limit differ.

<SolutionDropdown
  label="View Full Solution"
  explanation="The full IndexerIOTalonFX implementation, with each of the four pieces labeled."
  code={`
    // subsystems/indexer/IndexerIOTalonFX.java
package frc.robot.subsystems.indexer;

import com.ctre.phoenix6.BaseStatusSignal;
import com.ctre.phoenix6.StatusCode;
import com.ctre.phoenix6.StatusSignal;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.hardware.TalonFX;
import com.ctre.phoenix6.signals.NeutralModeValue;

import edu.wpi.first.math.util.Units;
import edu.wpi.first.units.measure.Angle;
import edu.wpi.first.units.measure.AngularVelocity;
import edu.wpi.first.units.measure.Current;
import edu.wpi.first.units.measure.Temperature;
import edu.wpi.first.units.measure.Voltage;
import edu.wpi.first.wpilibj.DigitalInput;

public class IndexerIOTalonFX implements IndexerIO {

    private final StatusSignal<Angle> spindexerPosition;
	private final StatusSignal<AngularVelocity> spindexerVelocity;
	private final StatusSignal<Voltage> spindexerVoltage;
	private final StatusSignal<Current> spindexerCurrent;
	private final StatusSignal<Current> spindexerTorqueCurrent;
	private final StatusSignal<Temperature> spindexerTemp;

    private final StatusSignal<Angle> feederPosition;
    private final StatusSignal<AngularVelocity> feederVelocity;
    private final StatusSignal<Voltage> feederVoltage;
    private final StatusSignal<Current> feederCurrent;
    private final StatusSignal<Current> feederTorqueCurrent;
    private final StatusSignal<Temperature> feederTemp;

	private final TalonFX spindexerMotor;
    private final TalonFX feederMotor;
	private final TalonFXConfiguration spindexerConfig;
    private final TalonFXConfiguration feederConfig;

    private final DutyCycleOut spindexerDutyCycleOut;
    private final DutyCycleOut feederDutyCycleOut;


    // 2. CONFIGURATION
    public IndexerIOTalonFX(CANbus canBus) {

        spindexerMotor = new TalonFX(1, canBus);
        feederMotor = new TalonFX(2, canBus);

        spindexerConfig = new TalonFXConfiguration();
		spindexerConfig.Feedback.SensorToMechanismRatio = 64.0 / 16.0;
		spindexerConfig.MotorOutput.NeutralMode = NeutralModeValue.Coast;
		spindexerConfig.MotorOutput.Inverted = InvertedValue.CounterClockwise_Positive;

		spindexerConfig.CurrentLimits.SupplyCurrentLimit = CurrentLimits.SupplyLimit.spindexerCurrent;
		spindexerConfig.CurrentLimits.SupplyCurrentLimitEnable = CurrentLimits.SupplyLimit.spindexerEnabled;
        spindexerConfig.CurrentLimits.StatorCurrentLimit = CurrentLimits.StatorLimit.spindexerCurrent;
        spindexerConfig.CurrentLimits.StatorCurrentLimitEnable = CurrentLimits.StatorLimit.spindexerEnabled;

		PhoenixUtil.tryUntilOk(5, () -> spindexerMotor.getConfigurator().apply(spindexerConfig));
		PhoenixUtil.tryUntilOk(5, spindexerMotor::optimizeBusUtilization);

        feederConfig = new TalonFXConfiguration();
        feederConfig.Feedback.SensorToMechanismRatio = 1.0;
        feederConfig.MotorOutput.NeutralMode = NeutralModeValue.Coast;
        feederConfig.MotorOutput.Inverted = InvertedValue.CounterClockwise_Positive;

		feederConfig.CurrentLimits.SupplyCurrentLimit = CurrentLimits.SupplyLimit.feederCurrent;
		feederConfig.CurrentLimits.SupplyCurrentLimitEnable = CurrentLimits.SupplyLimit.feederEnabled;
        feederConfig.CurrentLimits.StatorCurrentLimit = CurrentLimits.StatorLimit.feederCurrent;
        feederConfig.CurrentLimits.StatorCurrentLimitEnable = CurrentLimits.StatorLimit.feederEnabled;

        PhoenixUtil.tryUntilOk(5, () -> feederMotor.getConfigurator().apply(feederConfig));
        PhoenixUtil.tryUntilOk(5, feederMotor::optimizeBusUtilization);

        spindexerPosition = spindexerMotor.getPosition();
        spindexerVelocity = spindexerMotor.getVelocity();
		spindexerVoltage = spindexerMotor.getMotorVoltage();
		spindexerCurrent = spindexerMotor.getSupplyCurrent();
		spindexerTorqueCurrent = spindexerMotor.getTorqueCurrent();
		spindexerTemp = spindexerMotor.getDeviceTemp();

        feederPosition = feederMotor.getPosition();
        feederVelocity = feederMotor.getVelocity();
        feederVoltage = feederMotor.getMotorVoltage();
        feederCurrent = feederMotor.getSupplyCurrent();
        feederTorqueCurrent = feederMotor.getTorqueCurrent();
        feederTemp = feederMotor.getDeviceTemp();

        spindexerDutyCycleOut = new DutyCycleOut(0.0).withUpdateFreqHz(0.0).withEnableFOC(true);
		feederDutyCycleOut = new DutyCycleOut(0.0).withUpdateFreqHz(0.0).withEnableFOC(true);

        BaseStatusSignal.setUpdateFrequencyForAll(
            100,
            spindexerVelocity,
            spindexerVoltage,
            spindexerCurrent,
            spindexerTorqueCurrent);

		BaseStatusSignal.setUpdateFrequencyForAll(
			50,
			spindexerCurrent,
			spindexerTorqueCurrent,
			feederVelocity,
			feederVoltage,
			feederCurrent,
			feederTorqueCurrent);
		PhoenixUtil.registerSignals(canBus,
			spindexerPosition,
			spindexerVelocity,
			spindexerVoltage,
			spindexerCurrent,
			spindexerTorqueCurrent,
			spindexerTemp,
			feederPosition,
			feederVelocity,
			feederVoltage,
			feederCurrent,
			feederTorqueCurrent,
			feederTemp);
    }

    // 3. READING
    @Override
    public void updateInputs(SpindexerIOInputs spindexerInputs, FeederIOInputs feederInputs) {
        spindexerInputs.connected = BaseStatusSignal.isAllGood(
            spindexer1Position, spindexer1Velocity, spindexer1Voltage, spindexer1Current, spindexer1TorqueCurrent, spindexer1Temp);
		spindexerInputs.positionRad = spindexer1Position.getValueAsDouble();
		spindexerInputs.velocityRadPerSec = spindexer1Velocity.getValueAsDouble();
		spindexerInputs.appliedVolts = spindexer1Voltage.getValueAsDouble();
		spindexerInputs.currentAmps = spindexer1Current.getValueAsDouble();
		spindexerInputs.torqueCurrentAmps = spindexer1TorqueCurrent.getValueAsDouble();
		spindexerInputs.tempCelsius = spindexer1Temp.getValueAsDouble();

        feederInputs.connected = BaseStatusSignal.isAllGood(
            feederPosition, feederVelocity, feederVoltage, feederCurrent, feederTorqueCurrent, feederTemp);
        feederInputs.positionRad = feederPosition.getValueAsDouble();
        feederInputs.velocityRadPerSec = feederVelocity.getValueAsDouble();
        feederInputs.appliedVolts = feederVoltage.getValueAsDouble();
        feederInputs.currentAmps = feederCurrent.getValueAsDouble();
        feederInputs.torqueCurrentAmps = feederTorqueCurrent.getValueAsDouble();
        feederInputs.tempCelsius = feederTemp.getValueAsDouble();
    }

    // 4. WRITING
    @Override
    public void runSpindexer(double output) {
        spindexerMotor.setControl(
			spindexerDutyCycleOut.withOutput(output));
    }

    @Override
    public void runFeeder(double output) {
        feederMotor.setControl(
            feederDutyCycleOut.withOutput(output));
    }

    @Override
    public void stopSpindexer() {
       spindexerMotor.stopMotor();
    }

    @Override
    public void stopFeeder() {
        feederMotor.stopMotor();
    }
}
  `}
/>

A few things worth pointing out now that it's in front of you:

- `IndexerIOTalonFX` is the **only** file that imports anything from `com.ctre.phoenix6`. `IndexerIO.java` doesn't know a `TalonFX` exists, and `Indexer.java` (which you'll write later) won't either &mdash; it only ever talks to the interface.
- Every `StatusSignal` field is created **once**, by calling `spindexerMotor.getPosition()` etc. a single time in the constructor. `updateInputs` never calls `.getPosition()` again &mdash; it just reads the same signal objects' cached values every loop. Creating a brand-new `StatusSignal` every loop would work, but it's wasteful and isn't the pattern you'll see anywhere else in our code.
- `updateInputs` never calls `.refresh()` or `.refreshAll()` itself. Because every signal was handed to `PhoenixUtil.registerSignals(...)` in the constructor, the actual refreshing happens centrally, once per loop, somewhere else entirely (`Robot.robotPeriodic()` in the real codebase). This file only ever reads what's already cached.
- The spindexer and feeder each get their **own** `TalonFXConfiguration`, applied through `PhoenixUtil.tryUntilOk(...)` rather than a bare `.apply(config)` call &mdash; so a dropped CAN message during boot-up gets retried instead of silently leaving the motor misconfigured for the whole match.
- `runSpindexer`/`runFeeder` build a fresh `DutyCycleOut` each call by calling `.withOutput(output)` on the one reusable request object created in the constructor, then hand it to `setControl(...)`. Nothing here calls `.set(...)` &mdash; that's the control-request style you just read about.
- This version doesn't wire up the beam-break sensor at all &mdash; `feederInputs.beamBroken` is left at its interface default (`false`). If your Indexer needs it, add a `DigitalInput` field the same way you added the motors, and remember beam breaks usually read `true` when *unbroken*, so you'll likely want `!beamBreak.get()`.

---

## Next Steps

`IndexerIOTalonFX` now satisfies every method `IndexerIO` promised, using two real TalonFX motors and a real beam break. In the next page, we'll write `IndexerIOSim.java` &rarr; a second implementation of the exact same interface that runs entirely in software, with no physical hardware at all.
