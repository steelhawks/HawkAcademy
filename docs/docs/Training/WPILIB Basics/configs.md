---
sidebar: 4
---

# Motor Configs
Now there are a lot of configs we apply to motors based on specific properties of the mechanism we're programming

## Initializing Motor Configs
Let's go back into our Turret file, and create a new variable called `turretConfigs`. This time, I'm not going give you the code for the variable, all I'm going to tell you is that the data type is `TalonFXConfiguration`, you decide everything else. After creating the variable of the motor, go into the constructor to assign a value. In robot container, type this line: `turretConfigs = new TalonFXConfiguration();` Now for the list of Configurations that can be made.

## Configurations
Here are the configs we'll take about:

**Neutral Mode** Every motor has two brake modes, one called Coast and one called Brake. Coast means that the motor allows the mechanism to turn, so if you attached a gear to a motor and set the motor to coast mode, when the robot is off or not moving you will still be able to manually move the gear. Brake mode is the complete opposite, where the motor won't let you turn the gear at all. you implement it by saying `turretConfigs.MotorOutput.NeutralMode = NeutralMode.Coast;`

**Inverted** Inverted determines the relationship of the motor to it's orientation. What does this mean? Let's say you have one motor oriented towards you, and one oriented away. if both turn in the same direction, you won't be able to move forward as one motor spins one way and one spins the other. This is why we set one of the motors to be inverted, so we are able to spin the same way. `turretConfigs.MotorOutput.Inverted = InvertedValue.CounterClockwise_Positive;`

**Sensor To Mechanism Ratio** This is what specifies the gear ratio. What is a gear ratio?  A gear ratio is a simple trade-off between speed and strength.
If you connect a small gear to a larger one, you trade speed to gain extra lifting power. If you connect a large gear to a smaller one, you trade that power for much faster movement. You essentially adjust the ratio to match whether your robot needs to be a heavy-lifter or a fast sprinter. To add a gear ratio do this: `turretConfigs.Feedback.SensorToMechanismRatio = [whatever you're gear ratio is]`

**Current Limits** Current limits are pretty self explanatory in my case. For a motor to run, a certain amount of current needs to be given. We can limit the current in order to reduce the risk of brownouts, which is where our robot battery is giving too much power or doesn't have enough power because of drain. To add current limits we need two lines: `turretConfigs.CurrentLimit.SupplyCurrentLimit = [whatever you're current limit is]` and then `turretConfigs.CurrentLimit.SupplyCurrentLimitEnable = true`

**Follower Motor**