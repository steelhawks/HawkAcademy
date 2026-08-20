---
sidebar_position: 5
---

import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import JavaRunner from '@site/src/components/JavaRunner'

# Writing the Sim File

Now that you've written the actual hardware, let's write the simulation, so you can SAFELY test before your code touches any real materials.

`IndexerIOSim` satisfies the exact same `IndexerIO` contract as `IndexerIOTalonFX` did &mdash; same method names, same inputs classes &mdash; but there's no CAN bus, no real TalonFX, and no real motor spinning anywhere. Instead, it runs a small physics model of the motors entirely in software, and reports numbers out of *that* instead of out of real hardware.

<Note title="Why bother simulating a motor at all?">
Because `Indexer.java` (the actual subsystem, which you'll write next) is only ever going to talk to the `IndexerIO` interface &mdash; it has no idea whether it's driving `IndexerIOTalonFX` or `IndexerIOSim`. That means you can run and test your entire subsystem's logic on a laptop, with no robot, no motors, and no way to hurt anyone, just by swapping which implementation gets constructed.
</Note>

---

## What This File Needs to Do

`IndexerIOSim` needs the same four things every `IndexerIO` implementation needs, just built out of simulated physics instead of real hardware:

1. **Hold onto the "hardware"** &rarr; two `DCMotorSim` objects (spindexer, feeder) standing in for the two `TalonFX`s.
2. **Configure each motor sim** in the constructor &mdash; which motor it's modeling and its gear ratio, so the simulated numbers come out at a realistic scale.
3. **Read from it** &rarr; fill in `SpindexerIOInputs` and `FeederIOInputs`, just like the real hardware file did, except every number comes from the physics model instead of a `StatusSignal`.
4. **Write to it** &rarr; turn a commanded output into a voltage the simulated motor "feels," and turn that off again to stop it.

Most of the shape here should feel familiar &mdash; it's the same four pieces as `IndexerIOTalonFX`. What's different is *where the numbers come from*.

---

## New Concept: `DCMotorSim`

**`DCMotorSim` is a WPILib class that models how a DC motor actually behaves &mdash; how fast it spins, how far it's turned, and how much current it draws &mdash; given nothing but the voltage you feed it.** It's not talking to any real hardware; it's running the actual physics equations of a motor, on your computer, in real time.

The pattern is always the same three steps, every loop:

1. **Tell it what voltage to apply** &mdash; `motorSim.setInputVoltage(volts)`.
2. **Let time pass** &mdash; `motorSim.update(dt)`, where `dt` is how many seconds have passed since the last update. This is the step that actually runs the physics &mdash; without calling `update`, the motor's position and velocity never change, no matter what voltage you set.
3. **Read the result back out** &mdash; `motorSim.getAngularPositionRad()`, `.getAngularVelocityRadPerSec()`, `.getCurrentDrawAmps()`, `.getInputVoltage()`.

Here's a tiny, simplified stand-in for that same idea, in plain Java &mdash; not real WPILib code, just enough to show why the `update(dt)` step matters. Run it, then try changing `dt` to see how it changes how fast the fake motor "spins up."

<JavaRunner
  starterCode={`public class Main {

    // A tiny, simplified stand-in for DCMotorSim.
    static class FakeMotorSim {
        private double velocity = 0.0;
        private double position = 0.0;
        private double appliedVolts = 0.0;

        void setInputVoltage(double volts) {
            appliedVolts = volts;
        }

        // Nothing changes until update() is called -- just like the real thing.
        void update(double dt) {
            double targetVelocity = appliedVolts * 10.0; // pretend 10 rad/s per volt
            velocity += (targetVelocity - velocity) * 0.5; // ease toward target
            position += velocity * dt;
        }

        double getAngularPositionRad() { return position; }
        double getAngularVelocityRadPerSec() { return velocity; }
    }

    public static void main(String[] args) {
        FakeMotorSim sim = new FakeMotorSim();
        sim.setInputVoltage(6.0);

        double dt = 0.02; // 20ms, one robot loop
        for (int i = 0; i < 5; i++) {
            sim.update(dt);
            System.out.println("t=" + (i + 1) * dt
                + "s  velocity=" + sim.getAngularVelocityRadPerSec()
                + "  position=" + sim.getAngularPositionRad());
        }
    }
}`}
/>

<Note title="Where does dt actually come from?">
In the real codebase, <code>updateInputs</code> is called once every robot loop, and every robot loop is a fixed <code>20ms</code>, exposed as the constant <code>Constants.UPDATE_LOOP_DT</code> (<code>0.020</code>). You'll pass that same constant into <code>motorSim.update(...)</code> every time <code>updateInputs</code> runs, so simulated time advances at the same rate real time would.
</Note>

---

## New Concept: Building a `DCMotorSim`

A `DCMotorSim` doesn't know on its own whether it's modeling a Kraken X44, a NEO, or anything else &mdash; you have to tell it, using two pieces:

```java
DCMotorSim spindexerMotorSim = new DCMotorSim(
    LinearSystemId.createDCMotorSystem(
        DCMotor.getKrakenX44(1), // which real motor this represents
        0.001,                   // moment of inertia (kg*m^2) -- how "heavy" it feels to spin
        64.0 / 16.0              // gear ratio, same number you used in TalonFXConfiguration
    ),
    DCMotor.getKrakenX44(1)
);
```

- **`DCMotor.getKrakenX44(1)`** &mdash; a built-in WPILib description of a real motor's characteristics (stall torque, free speed, resistance, etc.). The `1` means "one motor" &mdash; if two motors were physically mechanically linked together driving the same shaft, you'd pass `2` instead.
- **`LinearSystemId.createDCMotorSystem(...)`** &mdash; turns "this motor, this much inertia, this gear ratio" into the actual math `DCMotorSim` needs to simulate. You won't need to understand the math itself, just that these three inputs are what shape how the simulated motor behaves.
- **The moment of inertia** (`0.001` above) doesn't need to be exact &mdash; it's a rough guess at how much mass is actually spinning. A small value like this is a reasonable placeholder for a lightweight mechanism like a spindexer or feeder roller.

<Note title="Why pass the gear ratio again? Didn't the real hardware file already use it?">
Yes &mdash; and that's exactly why it belongs here too. In <code>IndexerIOTalonFX</code>, <code>Feedback.SensorToMechanismRatio</code> told the real motor controller to report position and velocity already scaled to the mechanism. <code>DCMotorSim</code> has no motor controller doing that translation for you, so the gear ratio has to be baked into the physics model itself, at construction time, or your simulated numbers will come out scaled wrong.
</Note>

---

## New Concept: Back-EMF and `currentToVolts`

Multiplying a `[-1, 1]` output by a flat `12` volts is *a* way to drive a `DCMotorSim`, but it's not the pattern you'll find in the rest of our real sim files (`FlywheelIOSim`, `HoodIOSim`, `TurretIOSim`, `IntakeIOSim`). All of those instead run the motor by commanding **current**, then converting that current to volts with a small helper method, usually called `currentToVolts`:

```java
private double currentToVolts(double current) {
    DCMotor motor = DCMotor.getKrakenX44(1);
    double omega = motorSim.getAngularVelocityRadPerSec();
    double backEMF = omega / motor.KvRadPerSecPerVolt;
    return current * motor.rOhms + backEMF;
}
```

Here's why this extra step exists. A spinning motor doesn't just draw current &mdash; it also generates its own tiny voltage that pushes *back* against whatever you're feeding it, called **back-EMF** (electromotive force). The faster the motor is already spinning, the bigger that back-EMF gets, and the more voltage it takes to push the same amount of current through it. A real motor controller running in FOC mode (remember `.withEnableFOC(true)` from the hardware file?) is doing exactly this kind of correction internally, constantly adjusting voltage to hit a target current regardless of how fast the motor happens to already be spinning.

The formula breaks into two pieces, both drawn straight off the `DCMotor` object:

- **`current * motor.rOhms`** &mdash; the voltage it takes to push your desired current through the motor's own internal resistance (`rOhms`), ignoring motion entirely.
- **`omega / motor.KvRadPerSecPerVolt`** &mdash; the back-EMF itself: how much the motor's *current* spinning speed (`omega`, in rad/s) is already fighting you, based on the motor's velocity constant (`KvRadPerSecPerVolt` &mdash; how many rad/s the motor spins per volt at no load).

Add them together and you get the actual voltage needed, right now, at this exact speed, to produce your desired current &mdash; which is a noticeably more realistic model than a flat, speed-independent `output * 12`.

<Note title="Do I need to understand the derivation of this formula?">
No &mdash; treat <code>currentToVolts</code> as a small reusable tool, the same way you treated <code>LinearSystemId.createDCMotorSystem(...)</code>. What matters is knowing <em>when</em> to reach for it: any time you're commanding a motor sim with something that represents current (torque-current, amps) rather than a plain voltage or percent output.
</Note>

---

## What You Need to Build

Open `IndexerIOSim.java`, declare `public class IndexerIOSim implements IndexerIO`, and build these four pieces yourself.

### 1. Fields

- Two `DCMotorSim` objects: one for the spindexer, one for the feeder.

That's it &mdash; no `TalonFXConfiguration`, no `StatusSignal`, no `DutyCycleOut`. All of that existed to talk to real hardware over a real CAN bus; none of it applies here.

### 2. The Constructor

- Build each `DCMotorSim` with `LinearSystemId.createDCMotorSystem(...)`, using the **same gear ratios** you used for that motor back in `IndexerIOTalonFX`, so the two implementations behave consistently.

### 3. `updateInputs`

- Call `.update(Constants.UPDATE_LOOP_DT)` on **both** motor sims first &mdash; nothing else will reflect the passage of time until you do.
- Set `connected = true` for both inputs objects &mdash; there's no real hardware to disconnect, so it's always healthy.
- Fill in the rest of each inputs object straight from the sim: `getAngularPositionRad()` &rarr; `positionRad`, `getAngularVelocityRadPerSec()` &rarr; `velocityRadPerSec`, `getInputVoltage()` &rarr; `appliedVolts`, `getCurrentDrawAmps()` &rarr; `currentAmps`, and `getTorqueNewtonMeters() / motor.KtNMPerAmp` &rarr; `torqueCurrentAmps` (`KtNMPerAmp` is the motor's torque constant, so dividing torque by it gets you back to an amps figure).

<Note title="What about tempCelsius?">
<code>DCMotorSim</code> doesn't model temperature at all, so there's nothing "real" to read for that field. The pattern used elsewhere in our codebase is to fake something reasonable instead of leaving it at zero &mdash; estimating it as roughly proportional to current draw, something like <code>currentAmps * 0.1</code>. It doesn't need to be physically perfect &mdash; it just needs to move in a sane direction so anything watching that field in sim isn't staring at a flat zero the whole time.
</Note>

### 4. The Run/Stop Methods

- Write a small `currentToVolts(DCMotorSim motorSim, double current)` helper &mdash; see the Back-EMF section above &mdash; that both run methods can share.
- `runSpindexer(double output)` / `runFeeder(double output)` &rarr; treat `output` as a percentage of the motor's stall current, convert it to amps, then run it through `currentToVolts(...)` to get an actual voltage: `motorSim.setInputVoltage(currentToVolts(motorSim, output * DCMotor.getKrakenX44(1).stallCurrentAmps))`.
- `stopSpindexer()` / `stopFeeder()` &rarr; `motorSim.setInputVoltage(0)`.

Don't forget `@Override` above each of these, plus `updateInputs`.

Give it a real attempt before scrolling further. If you get stuck, here are two nudges:

<SolutionDropdown
  label="Hint 1 &rarr; the imports you'll need"
  explanation="Here are all the imports needed"
  code={`edu.wpi.first.math.system.plant.DCMotor
    edu.wpi.first.math.system.plant.LinearSystemId
    edu.wpi.first.wpilibj.simulation.DCMotorSim
    org.steelhawks.Constants`}
/>

<SolutionDropdown
  label="Hint 2 &rarr; why go through currentToVolts instead of just output * 12?"
  explanation="output * 12 assumes the motor needs the same voltage no matter how fast it's already spinning, which isn't how a real motor behaves - a motor that's already spinning fast generates back-EMF that fights the voltage you apply, so the same output should take more volts at high speed than at a standstill. Routing output through currentToVolts (treating it as a percentage of stall current, then converting that current to the actual volts needed at the sim's current speed) is exactly the pattern FlywheelIOSim, HoodIOSim, TurretIOSim, and IntakeIOSim all use for the same reason."
/>

---

## The Final Code

Here's the completed implementation. Compare it against what you wrote!

<SolutionDropdown
  label="View Full Solution"
  explanation="The full IndexerIOSim implementation, with each of the four pieces labeled."
  code={`
    // subsystems/indexer/IndexerIOSim.java
package frc.robot.subsystems.indexer;

import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.math.system.plant.LinearSystemId;
import edu.wpi.first.wpilibj.simulation.DCMotorSim;
import org.steelhawks.Constants;

public class IndexerIOSim implements IndexerIO {

    // 1. FIELDS
    private final DCMotorSim spindexerMotorSim;
    private final DCMotorSim feederMotorSim;

    // 2. CONFIGURATION
    public IndexerIOSim() {
        spindexerMotorSim = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(
                DCMotor.getKrakenX44(1),
                0.001,
                64.0 / 16.0),
            DCMotor.getKrakenX44(1));

        feederMotorSim = new DCMotorSim(
            LinearSystemId.createDCMotorSystem(
                DCMotor.getKrakenX44(1),
                0.001,
                1.0),
            DCMotor.getKrakenX44(1));
    }

    // 3. READING
    @Override
    public void updateInputs(SpindexerIOInputs spindexerInputs, FeederIOInputs feederInputs) {
        spindexerMotorSim.update(Constants.UPDATE_LOOP_DT);
        feederMotorSim.update(Constants.UPDATE_LOOP_DT);

        spindexerInputs.connected = true;
        spindexerInputs.positionRad = spindexerMotorSim.getAngularPositionRad();
        spindexerInputs.velocityRadPerSec = spindexerMotorSim.getAngularVelocityRadPerSec();
        spindexerInputs.appliedVolts = spindexerMotorSim.getInputVoltage();
        spindexerInputs.currentAmps = spindexerMotorSim.getCurrentDrawAmps();
        spindexerInputs.torqueCurrentAmps =
            spindexerMotorSim.getTorqueNewtonMeters() / DCMotor.getKrakenX44(1).KtNMPerAmp;
        spindexerInputs.tempCelsius = spindexerInputs.currentAmps * 0.1;

        feederInputs.connected = true;
        feederInputs.positionRad = feederMotorSim.getAngularPositionRad();
        feederInputs.velocityRadPerSec = feederMotorSim.getAngularVelocityRadPerSec();
        feederInputs.appliedVolts = feederMotorSim.getInputVoltage();
        feederInputs.currentAmps = feederMotorSim.getCurrentDrawAmps();
        feederInputs.torqueCurrentAmps =
            feederMotorSim.getTorqueNewtonMeters() / DCMotor.getKrakenX44(1).KtNMPerAmp;
        feederInputs.tempCelsius = feederInputs.currentAmps * 0.1;
    }

    // 4. WRITING
    private double currentToVolts(DCMotorSim motorSim, double current) {
        DCMotor motor = DCMotor.getKrakenX44(1);
        double omega = motorSim.getAngularVelocityRadPerSec();
        double backEMF = omega / motor.KvRadPerSecPerVolt;
        return current * motor.rOhms + backEMF;
    }

    @Override
    public void runSpindexer(double output) {
        double current = output * DCMotor.getKrakenX44(1).stallCurrentAmps;
        spindexerMotorSim.setInputVoltage(currentToVolts(spindexerMotorSim, current));
    }

    @Override
    public void runFeeder(double output) {
        double current = output * DCMotor.getKrakenX44(1).stallCurrentAmps;
        feederMotorSim.setInputVoltage(currentToVolts(feederMotorSim, current));
    }

    @Override
    public void stopSpindexer() {
        spindexerMotorSim.setInputVoltage(0);
    }

    @Override
    public void stopFeeder() {
        feederMotorSim.setInputVoltage(0);
    }
}
  `}
/>

A few things worth pointing out now that it's in front of you:

- `IndexerIOSim` never imports anything from `com.ctre.phoenix6` &rarr; the whole point of the IO interface pattern is that neither this file nor `Indexer.java` needs to know a `TalonFX` exists at all.
- `updateInputs` calls `.update(...)` on both motor sims **before** reading anything back out of them &rarr; if you read first and update second, every value you report would be one loop stale.
- There's no `connected` logic to compute here the way `BaseStatusSignal.isAllGood(...)` did on the real hardware &rarr; simulated motors can't disconnect, so it's just hardcoded to `true`.
- `torqueCurrentAmps` comes from `getTorqueNewtonMeters() / KtNMPerAmp`, an actual (if approximate) physics-based reading. `tempCelsius` is faked from `currentAmps`, since `DCMotorSim` has no concept of temperature at all &rarr; that one's a normal, expected gap in simulation, not a bug.
- `runSpindexer`/`runFeeder` don't feed `output` straight into `setInputVoltage(...)`. They convert it to a current, then run it through `currentToVolts(...)` so the actual voltage applied depends on how fast the motor is already spinning &rarr; the same back-EMF-aware pattern `FlywheelIOSim`, `HoodIOSim`, `TurretIOSim`, and `IntakeIOSim` all use, instead of a flat `output * 12`.
- The gear ratios (`64.0 / 16.0` for the spindexer, `1.0` for the feeder) match exactly what `IndexerIOTalonFX` used &rarr; keeping those numbers in sync across both files is what makes testing in sim actually predictive of how the real robot will behave.

---

## Next Steps

Both `IndexerIOTalonFX` and `IndexerIOSim` now fully satisfy `IndexerIO` &rarr; one talking to real motors, one running physics in software, with identical method signatures either way. From here, the last piece is `Indexer.java` itself: the actual subsystem class that owns an `IndexerIO` and turns it into the commands the rest of the robot's code will call.
