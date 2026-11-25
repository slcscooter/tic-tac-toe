// Kept apart from the 3D code so checking for WebGL doesn't load three.js.

/** True when this browser can draw WebGL. Without it the game shows the flat board instead. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
