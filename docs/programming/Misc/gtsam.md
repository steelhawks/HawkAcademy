---
sidebar_position: 2
---

import Note from '@site/src/components/Note.jsx'

# What is GTSAM

You might be familiar with the Kalman Filter, it's what we use in ```SwerveDrivePoseEstimator``` to combine our inputs from vision, odometry, and gyro into one clean pose output. Both GTSAM and Kalman filters provide clean and reliable poses for our robot program to consume but GTSAM works in a fundamentally different approach.

# The core idea: pose estimation as inference, not filtering

A Kalman filter keeps exactly one belief – mean + covariance – and this updates forward in time. Every new measurement permanently overwrites the past measurements. GTSAM allows you to go back in the past and say "actually that pose from 0.2 seconds ago should shift because an AprilTag told us something new about it".

This is the fundamental and biggest advantage of GTSAM as compared to a Kalman filter; the idea known as a Factor Graph.

A factor graph keeps a whole window keeps a whole window as unknowns and treats every measurement as a soft constraint between them:

* Each robot pose at time ```t``` is a node – which in our case is ``` gtsam::Pose2``` (x, y, θ), which lives on SE(2), the group of 2D rigid transforms

<Note title="What is SE(2)?">
**SE(2)** stands for the "Special Euclidean group in 2 dimensions." That's a fancy way of saying: the set of every possible 2D rigid-body transform — every combination of rotating and translating in a plane, with no scaling or stretching allowed. If you've got a robot on a flat field, its pose (x, y, θ) is an element of SE(2).

The "group" part isn't just decoration — it means SE(2) comes with a rule for combining two transforms (composing them) and a rule for  undoing one (inverting it), and those rules behave consistently. In matrix form, a pose looks like:
$$
\begin{bmatrix}
\cos\theta & -\sin\theta & x \\
\sin\theta & \cos\theta & y \\
0 & 0 & 1
\end{bmatrix}
$$
</Note>