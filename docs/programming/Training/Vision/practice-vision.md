---
sidebar_position: 5
title: "Practice: Vision Filtering"
---

import JavaRunner from '@site/src/components/JavaRunner'
import Note from '@site/src/components/Note.jsx'
import SolutionDropdown from '@site/src/components/Dropdown.jsx'
import Quiz from '@site/src/components/Quiz.jsx'

# Practice: Vision Filtering

The last three pages covered a lot: fiducial markers, SolvePnP, standard deviations, `VisionIOPhoton`. This page zooms in on one small but critical piece of that pipeline — **deciding whether to trust a camera at all** — and has you rebuild it from scratch, based on something that actually happened to us.

<Note title="You do not need to have read anything else">
This page only assumes basic Java: a `Set`, a `for` loop, varargs (`int...`), and `if` statements. Everything else is explained here.
</Note>

---

## The real bug this is based on

Here's a comment straight out of our 2026 codebase, in `Vision.java`:

```java
// Gate the entire camera's pose observations if it sees no whitelisted tags.
// Without this check, the whitelist only filtered tag logging but still allowed
// pose observations solved from opposing alliance tags to enter the estimator,
// corrupting the robot's field position and causing bad shots at competition.
if (!cameraHasAllowedTag(cameraIndex)) {
    continue;
}
```

Here's what happened: every AprilTag field has tags for **both** alliances. Ours (blue, say) sit on our side; the opposing alliance's (red) sit on theirs. Early in the season, our code filtered *which tags got logged* based on a whitelist — but it never stopped a camera from feeding a **pose estimate built from the wrong alliance's tags** into the robot's actual position estimator.

During a chaotic match, a back-mounted camera briefly swung around and locked onto a couple of red tags across the field. PhotonVision happily solved a "valid" 3D pose from them — it has no idea which alliance we're on, it just sees a tag and does math. That pose got fed straight into `RobotState`, silently dragging our robot's believed position toward the wrong side of the field. The result: the robot briefly thought it was somewhere it wasn't, and took a bad shot.

The fix wasn't to filter individual tags harder — it was to add one extra rule: **if a camera doesn't see at least one of *our* tags, throw out everything it reported that frame, pose included.**

That's exactly what you're going to build.

---

## Part 1 — Build the whitelist

### Step 1: What a whitelist needs to do

A whitelist here is nothing more than "the set of tag IDs that belong to our alliance this match." It needs two operations:

- **Set the whitelist** — wipe out whatever was there before and load in a new list of allowed IDs (this happens once per match, since alliance color can change between blue and red)
- **Check the whitelist** — given one tag ID, is it in the set?

### Step 2: The real signature

In our actual code, this method is:

```java
public static void whitelistTagIds(int... tagIds) {
    allowedTagIds.clear();
    for (int id : tagIds) {
        allowedTagIds.add(id);
    }
}
```

The `int...` is called **varargs** — it lets you call `whitelistTagIds(17, 18, 19)` or `whitelistTagIds(1, 2, 3, 4, 5)` with any number of arguments, and Java packs them into an `int[]` array for you inside the method.

You're going to write this method yourself, plus a matching `isAllowed(int tagId)` check.

### Try it

<SolutionDropdown
  label="Hint 1 — whitelistTagIds()"
  explanation="Call allowedTagIds.clear() first so old IDs from a previous alliance don't stick around. Then loop over tagIds (it behaves just like a normal int[] inside the method) and call allowedTagIds.add(id) for each one."
/>

<SolutionDropdown
  label="Hint 2 — isAllowed()"
  explanation="java.util.Set has a built-in method for exactly this: allowedTagIds.contains(tagId). Return that directly."
/>

<JavaRunner
  starterCode={`public class Main {

    // ============================================================
    //  YOUR TASK: implement whitelistTagIds() and isAllowed() below.
    //  Do NOT modify anything below the "DO NOT EDIT" line.
    // ============================================================

    static class TagWhitelist {
        static final java.util.Set<Integer> allowedTagIds = new java.util.HashSet<>();

        // TODO 1: clear allowedTagIds, then add every id from tagIds into it.
        public static void whitelistTagIds(int... tagIds) {
            // your code here
        }

        // TODO 2: return true if tagId is currently in allowedTagIds.
        public static boolean isAllowed(int tagId) {
            return false; // replace this
        }
    }



    // ============================================================
    //  DO NOT EDIT BELOW THIS LINE
    // ============================================================



    public static void main(String[] args) {
        System.out.println("--- We are BLUE alliance this match ---");
        TagWhitelist.whitelistTagIds(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        System.out.println("Tag 21 (blue hub tag) allowed? " + TagWhitelist.isAllowed(21));
        System.out.println("Tag 5  (red hub tag)  allowed? " + TagWhitelist.isAllowed(5));

        System.out.println("--- Alliance selection re-ran, we are RED now ---");
        TagWhitelist.whitelistTagIds(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        System.out.println("Tag 21 (blue hub tag) allowed? " + TagWhitelist.isAllowed(21));
        System.out.println("Tag 5  (red hub tag)  allowed? " + TagWhitelist.isAllowed(5));
    }
}`}
  expectedOutput={`--- We are BLUE alliance this match ---
Tag 21 (blue hub tag) allowed? true
Tag 5  (red hub tag)  allowed? false
--- Alliance selection re-ran, we are RED now ---
Tag 21 (blue hub tag) allowed? false
Tag 5  (red hub tag)  allowed? true`}
/>



<SolutionDropdown
  label="View Full Solution"
  explanation="whitelistTagIds clears the set then re-populates it from the varargs array. isAllowed is a one-line Set.contains() check."
  code={`public static void whitelistTagIds(int... tagIds) {
    allowedTagIds.clear();
    for (int id : tagIds) {
        allowedTagIds.add(id);
    }
}

public static boolean isAllowed(int tagId) {
    return allowedTagIds.contains(tagId);
}`}
/>

<Note title="Why re-clear it every time instead of just adding more IDs?">
Alliance color can flip between matches (and even during alliance selection at an event). If old IDs from a previous match's whitelist weren't cleared, the robot could end up trusting tags from BOTH alliances at once — exactly the bug this whole page is about, just introduced a different way.
</Note>

---

## Part 2 — Gate the whole camera, not just the tag log

Now for the actual bug. In Part 1 you built a simple "is this one ID allowed?" check. That alone isn't enough — the real fix needed to answer a different question: **"did this camera see *any* of our tags at all, this frame?"** If the answer is no, the entire frame gets thrown out — not just the tags that don't match.

### Step 1: `cameraHasAllowedTag`

This is the real method name from `Vision.java`. It takes every tag ID a single camera saw in one frame and returns `true` the moment it finds even one that's on the whitelist:

```java
private boolean cameraHasAllowedTag(int cameraIndex) {
    for (int tagId : inputs[cameraIndex].tagIds) {
        if (allowedTagIds.contains(tagId)) {
            return true;
        }
    }
    return false;
}
```

You'll write a simplified standalone version of this that takes an `int[]` directly instead of a camera index.

### Step 2: Use it to gate the pose, not just log it

The bug was never in the tag *logging* — that was already filtered correctly. The bug was that a camera's **pose observation** (the actual x/y/theta guess PhotonVision solved) got sent to `RobotState` regardless of which tags produced it. The fix is a single early-exit `continue` before any pose gets used:

```java
if (!cameraHasAllowedTag(cameraIndex)) {
    // Skip this camera's pose ENTIRELY this frame — don't just filter its tags.
    continue;
}
```

You'll implement `cameraHasAllowedTag`, and a `processFrame` will use it to decide **ACCEPT** (feed the pose to `RobotState`) or **REJECT** (throw the whole frame away).

<Note title="One matched tag saves the whole frame — on purpose">
Notice the real check is "at least one allowed tag," not "every tag must be allowed." A frame where a camera sees one of our tags AND one enemy tag is still ACCEPTED. That's intentional — PhotonVision's MultiTag pose solve already combines all visible tags into one estimate, so as long as at least one tag anchors it to a location that makes sense for us, the frame is treated as real data, not garbage from across the field.
</Note>

### Try it

<SolutionDropdown
  label="Hint 1 — the loop"
  explanation="Loop over every id in tagsSeenByCamera. Inside the loop, check allowedTagIds.contains(id). The instant you find a match, return true immediately — you don't need to check the rest."
/>

<SolutionDropdown
  label="Hint 2 — common mistake"
  explanation="Don't try to require that EVERY tag in tagsSeenByCamera is allowed — that's the opposite of what the real bug fix needed. It only takes ONE matching tag to accept the whole frame. If you get through the entire loop without finding one, THEN return false."
/>

<JavaRunner
  starterCode={`public class Main {

    static final java.util.Set<Integer> allowedTagIds = new java.util.HashSet<>();

    static void whitelistTagIds(int... tagIds) {
        allowedTagIds.clear();
        for (int id : tagIds) allowedTagIds.add(id);
    }

    // ============================================================
    //  YOUR TASK: implement cameraHasAllowedTag() below.
    //  Do NOT modify anything below the "DO NOT EDIT" line.
    // ============================================================

    // TODO: return true if AT LEAST ONE id in tagsSeenByCamera is in allowedTagIds.
    static boolean cameraHasAllowedTag(int[] tagsSeenByCamera) {
        return false; // replace this
    }



    // ============================================================
    //  DO NOT EDIT BELOW THIS LINE
    // ============================================================



    static class CameraFrame {
        String cameraName;
        int[] tagsSeen;
        String reportedPose; // what pose PhotonVision solved from this frame

        CameraFrame(String cameraName, int[] tagsSeen, String reportedPose) {
            this.cameraName = cameraName;
            this.tagsSeen = tagsSeen;
            this.reportedPose = reportedPose;
        }
    }

    static void processFrame(CameraFrame frame) {
        if (!cameraHasAllowedTag(frame.tagsSeen)) {
            System.out.println("[" + frame.cameraName + "] REJECTED whole frame -> tags "
                + java.util.Arrays.toString(frame.tagsSeen) + " are not ours. Pose discarded.");
            return;
        }
        System.out.println("[" + frame.cameraName + "] ACCEPTED -> feeding pose "
            + frame.reportedPose + " into RobotState.");
    }

    public static void main(String[] args) {
        // We are BLUE alliance this match.
        whitelistTagIds(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);

        System.out.println("=== Normal play: front camera sees our own hub tags ===");
        processFrame(new CameraFrame("front-cam", new int[]{18, 19}, "x=4.10 y=2.30"));

        System.out.println("=== Chaotic scrum: back camera swings toward the far end of the field ===");
        processFrame(new CameraFrame("back-cam", new int[]{2, 3}, "x=13.90 y=6.55"));

        System.out.println("=== Back camera catches ONE of our tags again, mixed with an enemy tag ===");
        processFrame(new CameraFrame("back-cam", new int[]{2, 21}, "x=4.05 y=2.28"));
    }
}`}
  expectedOutput={`=== Normal play: front camera sees our own hub tags ===
[front-cam] ACCEPTED -> feeding pose x=4.10 y=2.30 into RobotState.
=== Chaotic scrum: back camera swings toward the far end of the field ===
[back-cam] REJECTED whole frame -> tags [2, 3] are not ours. Pose discarded.
=== Back camera catches ONE of our tags again, mixed with an enemy tag ===
[back-cam] ACCEPTED -> feeding pose x=4.05 y=2.28 into RobotState.
`}
/>



<SolutionDropdown
  label="View Full Solution"
  explanation="This mirrors the real cameraHasAllowedTag() from Vision.java almost line for line — just swapping the camera-index lookup for a plain int[] parameter."
  code={`static boolean cameraHasAllowedTag(int[] tagsSeenByCamera) {
    for (int id : tagsSeenByCamera) {
        if (allowedTagIds.contains(id)) {
            return true;
        }
    }
    return false;
}`}
/>

### Read what you just produced

- **Front camera, normal play** — sees only our tags, gets **ACCEPTED**. Nothing surprising here.
- **Back camera, chaotic scrum** — sees *only* enemy tags. Before the fix existed, PhotonVision's solved pose (`x=13.90 y=6.55`, clear across the field) would have been fed straight into `RobotState`, dragging the robot's believed position toward the wrong alliance's side. With the gate, it's **REJECTED** wholesale — the pose never even gets a chance to corrupt anything.
- **Back camera, mixed tags** — sees one enemy tag *and* one of ours. Still **ACCEPTED**, because `cameraHasAllowedTag` only needs one match. This is the subtle part: the gate isn't "purity testing" every tag, it's asking "is there at least one anchor point I can trust this frame to be genuinely about our side of the field?"

<Note title="Why gate the whole frame instead of trying to filter the pose itself?">
You can't un-mix a pose. PhotonVision's MultiTag solve combines every visible tag's geometry into a single 3D answer — there's no way to surgically remove "the part of the pose that came from the enemy tag" after the fact. The only reliable fix is upstream: decide per-frame, before any pose math is trusted, whether this camera saw enough of *our* field to be talking about a location that could plausibly be true.
</Note>

---

## What you just proved

Two ideas to carry forward:

1. **Filtering what gets logged and filtering what gets *trusted* are two different problems.** The original bug already filtered tag logging correctly — the missing piece was gating the pose observation itself, which is a completely separate code path.
2. **"At least one" is a deliberate design choice, not a shortcut.** Requiring every visible tag to match would throw away perfectly good multi-tag data any time a camera's field of view happened to catch a sliver of the opposing alliance's side. Requiring *at least one* trusted anchor is enough to accept the whole frame, because that's exactly what MultiTag pose solving already assumes.

This is a small piece of `Vision.java`, but it's a real example of something every robot programmer runs into eventually: code that looks correct, passes a casual read-through, and still corrupts your data in a specific edge case that only shows up in the chaos of an actual match.

---

<Quiz questions={[
{
prompt: "In the real bug, what did the whitelist correctly filter before the fix, even though the fix was still needed?",
options: [
"Nothing — the whitelist did not exist yet",
"Which tags got logged for display/debugging",
"Which cameras were allowed to connect",
"The camera's exposure settings"
],
correct: 1,
explanation: "The whitelist already filtered which tags were logged. The missing piece was gating the POSE observation itself — a completely separate part of the pipeline that ran regardless of the tag log filter."
},
{
prompt: "Why can't you fix this bug by filtering out just the 'bad' tag from a multi-tag pose after PhotonVision solves it?",
options: [
"PhotonVision does not report which tags were used",
"MultiTag combines all visible tags into a single pose — you can't isolate and remove one tag's contribution afterward",
"Tag filtering must happen on the roboRIO, not the coprocessor",
"Pose objects in WPILib are read-only"
],
correct: 1,
explanation: "MultiTag solves one combined pose from every visible tag's geometry at once. There's no way to subtract out 'the enemy tag's contribution' after the fact — the decision has to be made before the pose is trusted, not after."
},
{
prompt: "In cameraHasAllowedTag, why does the method return true after finding just ONE matching tag, instead of requiring every tag to match?",
options: [
"Checking every tag would be too slow for the roboRIO",
"Requiring every tag to match would reject perfectly good multi-tag frames any time an enemy tag was also visible",
"WPILib requires exactly one tag per frame",
"Multiple tags can never be seen in one frame"
],
correct: 1,
explanation: "MultiTag pose solving is designed to combine several visible tags, potentially from a wide field of view. Requiring 100% of them to be ours would throw away good data any time the camera also happened to see a sliver of the opposing alliance's side."
},
{
prompt: "Why does whitelistTagIds() call allowedTagIds.clear() before adding the new IDs?",
options: [
"Sets in Java cannot be reused without clearing",
"To make sure IDs from a previous alliance/match don't remain and get trusted alongside the new ones",
"Clearing improves performance on the roboRIO",
"It is required syntax for varargs methods"
],
correct: 1,
explanation: "If old IDs weren't cleared, a robot could end up trusting tags from both alliances after a match or alliance color change — a different flavor of the exact same corruption bug."
},
{
prompt: "What was the real-world consequence described in the Vision.java comment when this bug was present?",
options: [
"The robot failed to connect to the driver station",
"The robot's field position was corrupted, causing bad shots at competition",
"The camera overheated and disconnected",
"AprilTags stopped being detected entirely"
],
correct: 1,
explanation: "A camera solving a pose from opposing-alliance tags silently dragged the robot's believed field position toward the wrong side of the field, which led directly to inaccurate, bad shots during a match."
}
]} />

# Next Steps

You've now completed <span style={{color: '#8f0f0f', fontWeight: 'bold'}}>Vision</span>, and rebuilt a real bug fix from our 2026 codebase by hand. You understand not just what `cameraHasAllowedTag` does, but *why* it exists and what breaks without it — the mark of actually understanding a piece of code, not just reading it.

**Congratulations!**
