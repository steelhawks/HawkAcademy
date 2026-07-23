---
sidebar_position: 3
title: Setting Up Vision
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Setting Up Vision

Before we can use AprilTags to estimate the robot's position, the vision system needs to be set up correctly. A camera that is mounted poorly, focused incorrectly, or calibrated at the wrong resolution can produce inaccurate measurements even when the programming is perfect.

Setting up vision has five main parts:

1. Mounting and connecting the cameras
2. Configuring each camera in PhotonVision
3. Focusing and calibrating each camera
4. Tuning the cameras for competition lighting
5. Giving the robot accurate camera and field measurements

---

## Step 1: Mount and Connect the Cameras

For our 2026 robot, we used **six Arducam global-shutter cameras**:

- Three OV2311 cameras
- Three OV9281 cameras

We worked with CAD to design and 3D-print rigid camera mounts and pick spots for our cameras that optimized robot space, stability and view. 

At first, we mounted two cameras each on the back-left and back-right corners of our robot, and had one camera each on the left and right of our robot. However, due to the left and right cameras being mounted on floppy lexan, they provided blurry, inaccurate data.

Ultimately, we ended up mounting the cameras on the back-left and back-right corners of our robot. This choice was simple, stable (due to the L-channels on the corner of our robot) and provided effective vision all around the robot.

After that, we worked with Electrical connected the cameras to two Orange Pi coprocessors.

Using coprocessors allows PhotonVision to process camera images without placing that work on the roboRIO. Splitting the cameras between two Orange Pis also helps distribute the processing and USB bandwidth load.

<!-- Replace this comment with a picture of the robot and labeled camera locations. -->

> **[Picture of the robot and camera locations]**

<Note title="More cameras are not always better">
Every additional camera uses USB bandwidth, processing power, network bandwidth, electrical power, and physical space. The goal is not to install as many cameras as possible. The goal is to obtain reliable tag coverage while maintaining an acceptable frame rate and latency on every camera.
</Note>

### Camera-Mounting Guidelines

A camera mount should be:

- **Rigid** — vibration or movement changes the camera's measured position
- **Protected** — another robot or game piece should not be able to hit the lens easily
- **Unobstructed** — robot mechanisms should not frequently block the view
- **Accessible** — the lens and cable should still be reachable for maintenance
- **Repeatable** — if the camera is removed, it should return to the same position

Once a camera has been calibrated and its position has been measured, do not rotate the lens or move the mount unless you plan to redo the affected measurements.

---

## Step 2: Open PhotonVision and Configure the Cameras

PhotonVision is controlled through a web interface. For our robot, the two Orange Pis use these addresses:

- `http://photonvision-left.local:5800`
- `http://photonvision-right.local:5800`

The default address is usually:

- `http://photonvision.local:5800`

The exact address depends on the hostname assigned to the coprocessor. If the `.local` address does not work, you may need to connect using the coprocessor's IP address.

### Add and Identify Each Camera

In PhotonVision's **Cameras** tab:

1. Find each connected camera.
2. Select the correct Arducam model when PhotonVision provides a model selector.
3. Activate the camera.
4. Give it a unique and descriptive nickname.
5. Select the resolution and frame rate that the pipeline will use.

We named our cameras based on the directions they face. Names such as `front-left`, `rear-right`, and `side-left` are much easier to understand than names such as `camera1` or `USB Camera 3`.

<Note title="Camera names matter in code">
The name used to create a <code>PhotonCamera</code> in robot code must match the camera's nickname in PhotonVision. Every active camera should have a unique name.
</Note>

You can use Arducam's [UVC Camera Configuration Guide](https://docs.arducam.com/UVC-Camera/UVC-Camera-Configuration-Guide/) and the model information printed on the camera or packaging to identify the correct camera model.

---

## Step 3: Focus the Camera

**Focus the camera before calibrating it.** Changing the lens focus afterward can change the camera's optical properties and make the saved calibration less accurate.

To focus a camera:

1. Secure the camera in its final mount.
2. Open the camera in PhotonVision.
3. Enable **Focus Mode**.
4. Place a detailed target or AprilTag near the distance at which the camera will normally operate.
5. Slowly rotate the lens.
6. Stop when the focus score is as high and stable as possible.
7. Tighten or secure the lens so it cannot rotate during robot movement.

Repeat this process for every camera.

<Note title="Do not chase the score blindly">
The focus score is a useful guide, but also inspect the image. The AprilTag's edges and black-and-white squares should look sharp at the distances where the robot needs to detect it.
</Note>

---

## Step 4: Calibrate the Camera

Camera calibration teaches PhotonVision the camera's **intrinsic properties**, including:

- Focal length
- Optical center
- Lens distortion
- Horizontal and vertical field of view

PhotonVision needs these values to calculate accurate 3D camera-to-tag measurements.

<Note title="Calibration is camera- and resolution-specific">
Each physical camera must be calibrated separately. A calibration is also valid only for the resolution at which it was created. Even two cameras of the same model should not share one calibration file.
</Note>

### Prepare the ChArUco Board

PhotonVision strongly recommends using a **ChArUco board** instead of a standard chessboard.

PhotonVision's provided calibration target is:

- An 8 × 8 grid
- Approximately 1-inch squares
- 0.75-inch ArUco markers
- A 4 × 4 ArUco dictionary

Print the board at **100% scale** with no “fit to page” scaling. After printing, measure the actual square and marker sizes with calipers or another accurate measuring tool. Printers are not perfectly precise, so enter the measured values—not just the intended values—into PhotonVision.

Attach the board to a flat, rigid surface. Wrinkles, bending, or folding can make the calibration inaccurate.

### Capture Calibration Images

In the **Camera Calibration** section:

1. Select the exact resolution used by the AprilTag pipeline.
2. Enter the measured board width, height, square spacing, marker size, and dictionary.
3. Start calibration.
4. Move the board through different parts of the camera's view.
5. Capture images from different distances and angles.
6. Make sure the detected overlay lines up with the printed board.
7. Finish the calibration and inspect the results.

PhotonVision requires a **minimum of 12 useful images**. More images can help only when they add meaningful variety. Twelve to twenty high-quality, varied images are usually more useful than many nearly identical images.

Your image set should include:

- At least one image where the board fills most of the frame
- Images near every corner and edge of the frame
- Images at different distances
- Images tilted horizontally and vertically
- Images with the board rotated in the frame

Avoid taking most of the pictures straight-on. PhotonVision recommends varied angles, but the board should generally not be tilted more than about **45°**.

### Check the Calibration Result

After calibration, PhotonVision displays values including the calculated field of view and mean reprojection error.

A good calibration should generally have:

- A field of view reasonably close to the camera's specification
- A mean reprojection error below approximately **1 pixel**
- No individual snapshot with an unusually large error
- Calibration overlays that closely follow the real board corners

If the error is high, delete poor snapshots and recalibrate. Common causes include blur, a bent board, incorrect board measurements, repeated camera angles, or the wrong ChArUco dictionary.

Repeat the entire focusing and calibration process for every camera.

---

## Step 5: Create and Tune an AprilTag Pipeline

After calibration, create an **AprilTag pipeline** for the camera and enable 3D tracking if the robot needs camera-to-tag pose measurements.

### Choose a Resolution

Higher resolutions usually allow AprilTags to be detected more accurately and from farther away, but they require more processing power and can reduce frame rate.

Use the highest resolution that still gives the robot an acceptable:

- Frames per second
- Processing latency
- Coprocessor CPU usage
- Network bandwidth usage

Remember that the camera must be calibrated at that exact processing resolution.

### Tune Exposure, Brightness, and Gain

For AprilTags, the main goal is to reduce **motion blur** while keeping the tags detectable.

1. Turn off automatic exposure controls when the camera supports it.
2. Lower exposure as much as possible while the camera can still detect tags reliably.
3. Increase gain or brightness only enough to recover visibility.
4. Test the camera while the robot is moving, not only while it is stationary.

**Exposure** controls how long the sensor gathers light. A longer exposure creates a brighter image but produces more motion blur and may reduce the achievable frame rate.

**Brightness** is generally a digital adjustment applied after the image is captured. Raising it too far can wash out detail.

**Gain** amplifies the camera signal. It can brighten a dark image, but excessive gain adds noise.

| Setting    | Main Benefit                                | Risk When Too High        |
|------------|---------------------------------------------|---------------------------|
| Exposure   | Brighter raw image                          | Motion blur and lower FPS |
| Brightness | Makes a dark stream easier to see           | Washed-out details        |
| Gain       | Brightens the image without a long exposure | Image noise               |

<Note title="A dark image can still be a good image">
The camera feed does not need to look attractive to a person. It needs to preserve sharp, readable tag edges while the robot is moving.
</Note>

### Test Under Realistic Conditions

Test from the closest and farthest distances where the robot will use vision. Drive the robot at realistic speeds and rotate quickly while watching:

- Whether tags remain detected
- Detection range
- Frames per second
- Pipeline latency
- Pose stability
- MultiTag results

Competition lighting can change throughout the day. If your team has repeatedly observed two distinct lighting conditions—such as direct sunlight and indoor lighting—you may save and validate separate pipelines or settings for each condition. Do not switch settings during a match unless your code and drive team have a clear, tested procedure for doing so.

---

## Step 6: Measure the Camera's Position on the Robot

Intrinsic calibration tells PhotonVision how the **lens** behaves. It does not tell the robot where the camera is physically mounted.

For every camera, measure its position and rotation relative to the robot's coordinate system. This is called the **robot-to-camera transform**.

You need to measure:

- Forward/backward position
- Left/right position
- Height above the floor
- Roll
- Pitch
- Yaw

These measurements are normally entered in robot code as a `Transform3d` and supplied to the pose-estimation system.

<Note title="Small measurement errors matter">
A camera that is several centimeters away from its programmed location, or a few degrees away from its programmed angle, can noticeably shift the estimated robot pose. Measure from a clearly defined robot origin and document the convention your team uses.
</Note>

If a camera mount bends, shifts, or is replaced, measure the transform again. If the lens or resolution changes, recalibrate the camera as well.

---

## Step 7: Use the Correct AprilTag Field Layout

An **AprilTag field layout** stores the known position and orientation of every tag on the field. PhotonVision uses this information for MultiTag localization and field-relative pose estimation.

For any field, including ones at competition, the physical tag locations may differ from the official dimensions. The **PractiCal AR** app can scan tags, compare their locations with an ideal field, and export a measured layout. Using a measured layout can improve localization when the AprilTags are not mounted exactly where the official layout expects them.

**ALWAYS** make sure to use the PractiCal AR app when switching between fields. A field manufactured by the Steel Hawks, an official FRC field, and a practice FRC field can all differ greatly from each other, and it is your job to make sure your robot knows where all the AprilTags are. 

To upload a custom layout in current PhotonVision versions:

1. Open **Settings**.
2. Find the **Device Control** card.
3. Select **Import Settings**.
4. Choose the **AprilTag Layout** import type.
5. Select the WPILib-format JSON file.
6. Confirm the layout shown in the **AprilTag Field Layout** card.

If MultiTag localization is used, enable **Do Multi-Target Estimation** in the pipeline's Output settings. An inaccurate field layout will directly create inaccurate pose estimates.

---

## Step 8: Validate and Back Up the System

Before competition, verify every camera individually and then test the complete system while the robot is driving.

For each camera, confirm:

- The correct camera is connected to the expected Orange Pi
- The camera nickname matches the name used in code
- The correct AprilTag pipeline is active
- The correct resolution is selected and calibrated
- Focus is sharp and the lens is secure
- Exposure, brightness, and gain are tested in motion
- The robot-to-camera transform is accurate
- The same field layout is used by PhotonVision and robot code
- Frame rate and latency remain acceptable with all cameras active

After validation, use PhotonVision's **Export Settings** feature to save a backup of each coprocessor. Store the backup somewhere the team can access at competition.

<Note title="Competition rule: freeze known-good settings">
Do not update PhotonVision, change camera settings, or modify calibrations immediately before an event unless the complete robot system can be tested afterward. A known-good configuration is usually safer than an untested last-minute improvement.
</Note>

---

<Quiz questions={[
{
prompt: "Why must each camera be calibrated at the resolution used by its AprilTag pipeline?",
options: [
"Resolution changes the camera's calculated intrinsic properties",
"PhotonVision only permits one resolution per Orange Pi",
"AprilTags use a different family at each resolution",
"The roboRIO cannot receive low-resolution images"
],
correct: 0,
explanation: "Camera calibration is specific to both the physical camera and the image resolution. Changing resolution changes how image coordinates correspond to rays through the lens."
},
{
prompt: "When should a manually adjustable lens be focused?",
options: [
"After calibration is complete",
"Before calibration, while the camera is secured in its final mount",
"Only after arriving at competition",
"Focus does not affect AprilTag measurements"
],
correct: 1,
explanation: "Focus should be finalized before calibration. Rotating the lens afterward can change the camera's optical properties and reduce calibration accuracy."
},
{
prompt: "What is the main reason to keep AprilTag exposure low?",
options: [
"To make the image look more colorful",
"To reduce motion blur while the robot moves",
"To increase the physical field of view",
"To change the tag family"
],
correct: 1,
explanation: "A short exposure reduces streaking and smearing, helping PhotonVision preserve readable tag edges while the robot is moving."
},
{
prompt: "What does the robot-to-camera transform describe?",
options: [
"The position and rotation of the camera relative to the robot",
"The location of every AprilTag on the field",
"The camera's USB device number",
"The brightness difference between two cameras"
],
correct: 0,
explanation: "The robot-to-camera transform tells the pose estimator where the camera is mounted relative to the robot's coordinate system."
},
{
prompt: "When is a PractiCal AR field layout most useful?",
options: [
"Whenever the official field layout already matches perfectly",
"For measuring a practice field whose tags may not match official positions",
"To replace camera intrinsic calibration",
"To identify the camera's USB model"
],
correct: 1,
explanation: "PractiCal AR can measure real tag positions on a practice field and export a layout when those positions differ from the ideal field dimensions."
}
]} />

## Summary

- Mount every camera rigidly and protect it from impacts and vibration.
- Give every camera a unique PhotonVision nickname and select the correct model.
- Focus the lens **before** performing calibration.
- Calibrate every physical camera separately at its exact processing resolution.
- Use at least 12 varied, high-quality ChArUco images that cover the entire frame.
- Keep exposure low enough to reduce motion blur, then use gain or brightness carefully.
- Measure an accurate robot-to-camera transform for every camera.
- Use the correct official field layout at competition and measured layouts when appropriate for practice fields.
- Test with all cameras active while the robot moves at match speed.
- Export a backup after the complete system has been validated.