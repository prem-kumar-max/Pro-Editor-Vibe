// Central service registry. Adding a new service = adding an entry here plus a
// handler in imageProcessing.js. Keeps UI, routing and processing in sync.

export const SERVICES = {
  upscaler: {
    id: "upscaler",
    title: "Image Upscaler",
    tagline: "Upscale your images while preserving quality and details.",
    description:
      "Enhance image resolution and preserve fine detail. Choose a scale factor and get a larger, cleaner export.",
    icon: "expand",
    stages: [
      "Preparing image",
      "Analyzing image",
      "Upscaling image",
      "Enhancing details",
      "Finalizing",
    ],
    comparison: true,
  },
  "magic-layers": {
    id: "magic-layers",
    title: "Magic Layers",
    tagline: "Turn your image into an editable layered workflow.",
    description:
      "Separate image elements into editable layers you can toggle and inspect before exporting.",
    icon: "layers",
    stages: [
      "Analyzing image",
      "Detecting objects",
      "Separating elements",
      "Creating layers",
      "Preparing editable result",
    ],
    comparison: false,
  },
  "remove-background": {
    id: "remove-background",
    title: "Remove Background",
    tagline: "Automatically remove backgrounds with spill-removal controls.",
    description:
      "Cut out the subject and export a transparent image, with green and blue spill controls for cleaner edges.",
    icon: "scissors",
    stages: [
      "Uploading image",
      "Detecting subject",
      "Removing background",
      "Refining edges",
      "Removing color spill",
      "Finalizing image",
    ],
    comparison: true,
  },
}

export const SERVICE_LIST = Object.values(SERVICES)

export function getService(id) {
  return SERVICES[id] || null
}
