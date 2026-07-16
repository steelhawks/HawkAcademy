---
sidebar_position: 99
title: CAD Orientation Test
---

import CadRenderer from '@site/src/components/Visualizer/CadRenderer';

# CAD Orientation Test (temporary)

Default orientation:

<CadRenderer src="/other/swerve.glb" name="default" height="300px" />

With upAxis="z" set as a prop (not via picker):

<CadRenderer src="/other/swerve.glb" name="z-up" height="300px" upAxis="z" />

With upAxis="-y" set as a prop:

<CadRenderer src="/other/swerve.glb" name="neg-y" height="300px" upAxis="-y" />

With orientation=[0, 45, 0] set as a prop:

<CadRenderer src="/other/swerve.glb" name="rotated-45" height="300px" orientation={[0, 45, 0]} />

With orientation control enabled:

<CadRenderer src="/other/swerve.glb" name="picker" height="300px" allowOrientationControl />
