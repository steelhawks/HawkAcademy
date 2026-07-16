---
sidebar_position: 2
title: 3D Model Viewer (Demo)
---

import CadRenderer from '@site/src/components/Visualizer/CadRenderer';

# 3D Model Viewer

The `CadRenderer` component renders a `.glb`/`.gltf` CAD export inside an
interactive viewport, right in the docs. Rotate, pan, and zoom the model the
same way you would in a CAD editor.

- **Left-click + drag** — rotate (orbit)
- **Right-click + drag** — pan
- **Scroll** — zoom
- **Wireframe** button — toggle wireframe / solid shading
- **Reset View** button — re-frame the camera on the model
- **Upload** — drag & drop (or pick) your own `.glb` file to preview it in place

<CadRenderer
  src="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb"
  name="Duck.glb"
  height="480px"
/>

## Usage

```mdx
import CadRenderer from '@site/src/components/Visualizer/CadRenderer';

<CadRenderer src="/files/my-robot-part.glb" name="my-robot-part.glb" />
```

Place your exported `.glb` file under `static/` (e.g. `static/files/`) and
reference it with a root-relative path like `/files/my-robot-part.glb` —
Docusaurus serves everything in `static/` from the site root.

### Props

| Prop          | Type      | Default        | Description                                             |
| ------------- | --------- | -------------- | -------------------------------------------------------- |
| `src`         | `string`  | —              | URL or static asset path to the `.glb`/`.gltf` file.      |
| `name`        | `string`  | filename of `src` | Label shown in the toolbar.                            |
| `height`      | `string`  | `"480px"`      | CSS height of the viewport (e.g. `"60vh"`).               |
| `allowUpload` | `boolean` | `true`         | Show the drag-and-drop / file-picker upload control.       |
| `showHint`    | `boolean` | `true`         | Show the orbit/pan/zoom hint text in the corner.           |
