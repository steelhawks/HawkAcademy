---
sidebar_position: 2
title: Working as a Team
---

import Quiz from '@site/src/components/Quiz.jsx'
import Note from '@site/src/components/Note.jsx'

# Working as a Team

On the last page you learned how to commit, push, and pull your own code. That works fine when you are the only person touching a project. Robot code is different: many programmers work in **one repository** at the same time, and the code in it has to run on a real robot.

This page covers the rules we follow so that everyone can work at once without breaking each other's code:

- Why nobody commits directly to `main`
- How we name branches
- How your code gets into `main` through a pull request
- What to do when two people change the same thing

---

## The One Rule: Never Commit Directly to `main`

`main` is the branch the robot runs. Whatever is on `main` should always build and should always be safe to deploy.

If everyone pushed half-finished work straight to `main`, it would be broken most of the time, and nobody would know whose change broke it. So we follow one rule above all others:

> **All work happens on a branch. Code only reaches `main` through a pull request.**

<Note title="Why this matters at a competition">
Imagine it is ten minutes before a match and someone pulls `main` to deploy. If a rookie pushed an untested change to `main` that morning, the robot might not even turn on. Keeping `main` clean means there is always a version of the code we trust.
</Note>

---

## Naming Branches

Every branch name starts with a **prefix** that says what kind of work it is, then a slash, then a short description. Look at the branches in our `Rebuilt2026` repository and you will see exactly this pattern:

| Prefix | Use it for | Real examples from our repo |
|---|---|---|
| `feat/` | A new feature or mechanism | `feat/auto-flip-autos`, `feat/systems-check` |
| `fix/` | Fixing a bug | `fix/gtsam-jumps` |
| `refactor/` | Cleaning up code without changing what it does | `refactor/b-line` |
| `event/` | Changes made at a competition | `event/hudson-valley`, `event/worlds` |
| `sandbox/` | Experiments and practice that may never be merged | `sandbox/cheesypoofs` |
| `offseason/` | Work done outside the competition season | `offseason/feat/4414-shot-envelope` |

A few rules for the part after the slash:

- Use **lowercase words separated by dashes**: `feat/intake-homing`, not `feat/IntakeHoming` or `feat/intake homing`
- Describe **the work**, not yourself: `feat/hood-tuning`, not `feat/my-branch`
- Keep it short: two to four words is enough

<Note title="Where should a rookie start?">
While you are learning, use a `sandbox/` branch. Nobody expects sandbox code to be perfect or to be merged, so it is the right place to try things out. Once you are assigned real work, a lead programmer will tell you which `feat/` or `fix/` branch to make.
</Note>

### Offseason branches

`offseason/` is different from the other prefixes because it goes **in front of** a normal one. An offseason feature is `offseason/feat/...`, and an offseason bug fix is `offseason/fix/...`.

This keeps experiments and rewrites we try between seasons clearly separated from the code that ran at competition, so nobody mistakes an offseason idea for something that has been tested in a match.

### Event branches

Competitions are special. In the pits we change code quickly, between matches, with no time for a full review. Those changes go on one shared branch named after the event, like `event/nyc-regional`.

During the event, everyone at the competition works on that branch. After the event is over, the whole branch is merged back into `main` with a pull request, so the fixes we found at competition are not lost.

---

## From Branch to `main`: The Full Workflow

Here is the full path a change takes, from an idea to being part of `main`.

### Step 1: Pull the latest `main`

Before starting anything, switch to `main` in GitHub Desktop and click **Fetch origin**, then **Pull origin**. This makes sure you are starting from the newest code.

### Step 2: Create your branch

In GitHub Desktop, click **Current Branch**, then **New Branch**, and type the name using the pattern above, for example `feat/intake-homing`. Make sure it says the branch is based on `main`.

### Step 3: Do your work and commit often

Write your code. Commit whenever you finish a small piece that works. Small commits with clear messages are much easier to review than one giant commit at the end.

#### Commit messages

Every commit message starts with a **tag in capital letters**, then a colon, then a short description of what changed:

```
FIX: dont config pathplanner more than once
FEAT: add aim bias to shot solver
CLEAN: remove legacy files from previous seasons
```

These are real commit messages from `Rebuilt2026`. The tags we use are:

| Tag | Use it when the commit... | Example |
|---|---|---|
| `FEAT:` | Adds new behavior to the robot | `FEAT: drivetrain accel and velo limits when sotm` |
| `FIX:` | Fixes something that was broken | `FIX: make CI build` |
| `CLEAN:` | Tidies or removes code without changing what the robot does | `CLEAN: tuner constants` |
| `TUNE:` | Changes numbers only: PID gains, feedforward constants, lookup tables, setpoints | `TUNE: retune turret pid to stop jitter` |

*Why bother?* Because when the robot suddenly stops working, the first thing a programmer does is read the list of recent commits to find the one that broke it. With tags, that takes seconds:

- A `CLEAN:` commit should not have changed how the robot behaves, so it is an unlikely suspect (and if it did change something, that is a bug worth knowing about).
- A `FEAT:` commit added new behavior, so it is the first place to look.
- A `FIX:` commit tells you someone already found a problem in that area.
- A `TUNE:` commit changed numbers, not logic. If a mechanism suddenly overshoots, oscillates, or misses its shots, check these first.

Without tags, every commit looks the same and you have to open each one to find out what it did.

<Note title="The description still matters">
The tag does not replace a good description. `FIX: stuff` is no more useful than `stuff`. Say what you changed: `FIX: intake rollers running backwards`.
</Note>

### Step 4: Push your branch

Click **Publish branch** (the first time) or **Push origin**. Your branch is now on GitHub where the rest of the team can see it. Pushing a branch does **not** change `main`.

### Step 5: Open a pull request

A **pull request** (PR) is you asking the team: *"Please look at my branch and merge it into `main`."*

In GitHub Desktop, click **Create Pull Request**. It opens GitHub in your browser. Fill in:

- **Title**: what the change does, in one line
- **Description**: what you changed, why, and how you tested it (in simulation, on the test board, or on the robot)

### Step 6: Review

Another programmer reads your changes on GitHub. They may leave comments or ask for changes. This is normal, and it is not a criticism of you. Every programmer on the team gets review comments, including the leads.

To respond, make the changes on the same branch, commit, and push. The pull request updates on its own.

### Step 7: Merge

Once the pull request is approved, it gets merged into `main`. After that, the branch has done its job and can be deleted.

<Note title="Do not merge your own pull request">
Even if you have permission to click the merge button, wait for a lead programmer to approve it first. The point of a pull request is that a second person has looked at the code before it reaches the robot.
</Note>

---

## Merge Conflicts

A **merge conflict** happens when two people change the same lines of the same file. Git cannot guess which version is correct, so it stops and asks a human to decide.

Conflicts are not a sign that you did something wrong. They are a normal part of working on a team. You can make them rarer and smaller:

- **Pull often.** The longer your branch goes without the latest `main`, the more it drifts.
- **Keep branches short-lived.** A branch that lives for two days conflicts far less than one that lives for two months.
- **Talk to each other.** If you know someone else is editing `RobotContainer.java`, tell them what you are changing.

When you do get a conflict, GitHub Desktop will show you which files are affected. If you are not sure which version to keep, **stop and ask a lead programmer**. Guessing can silently delete someone else's work.

---

## Team Habits

- **One branch, one job.** Do not mix a new feature and an unrelated bug fix in the same branch.
- **Never commit code that does not build.** Run a build before you push.
- **Say what you are working on.** Two people writing the same subsystem on two branches wastes both people's time.
- **Do not edit someone else's branch without asking.**
- **Ask before deleting anything** you did not create.

---

<Quiz questions={[
{
prompt: "Why do we never commit directly to main?",
options: [
"GitHub does not allow it",
"main is the code the robot runs, so it must always build and be safe to deploy",
"Commits to main are slower than commits to a branch",
"Only rookies are not allowed to commit to main"
],
correct: 1,
explanation: "main is the version of the code we trust. Keeping unfinished or untested work off of it means there is always something safe to deploy."
},
{
prompt: "You are adding a new climber mechanism. Which branch name follows our pattern?",
options: [
"Climber",
"feat/climber",
"my-climber-branch",
"main/climber"
],
correct: 1,
explanation: "New features use the feat/ prefix followed by a short lowercase description."
},
{
prompt: "The robot worked yesterday and is broken today. Why do the tags at the start of commit messages help?",
options: [
"They make the commits upload faster",
"They let you scan the recent commits and quickly see which ones changed the robot's behavior",
"GitHub refuses commits that do not have a tag",
"They automatically undo broken commits"
],
correct: 1,
explanation: "Tags like FEAT:, FIX:, TUNE: and CLEAN: tell you what kind of change each commit made, so you can find the likely cause of a break without opening every commit."
},
{
prompt: "What is an event/ branch used for?",
options: [
"Planning the team's social events",
"Code written by one person only",
"Changes made at a specific competition, merged back into main after the event",
"Code that will be deleted after the season"
],
correct: 2,
explanation: "At a competition, changes are made quickly on a shared branch such as event/nyc-regional. After the event it is merged into main with a pull request so those fixes are kept."
},
{
prompt: "What is a pull request?",
options: [
"A way to download the latest code",
"A request for the team to review your branch and merge it into main",
"A command that deletes a branch",
"A message asking someone to push their code"
],
correct: 1,
explanation: "A pull request asks the team to look at the changes on your branch and merge them into main once they are approved."
},
{
prompt: "You get a merge conflict and are not sure which version of the code to keep. What should you do?",
options: [
"Keep your own version, since it is newer",
"Delete the file and start again",
"Stop and ask a lead programmer",
"Push anyway and fix it later"
],
correct: 2,
explanation: "Guessing can silently delete someone else's work. If you are unsure, ask before resolving the conflict."
}
]} />

## Next Steps

You now know how to save your code and how to share it with the team without breaking anything.

**Move on to Robot Code Basics, where you'll set up WPILIB and start working on robot code.**
