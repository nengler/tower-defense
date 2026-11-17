// Mist over the bog. The layer holds one faint rectangle over the field (all that shows where shaders do not run); here only its
// outline matters: inside it, two octaves of value noise drift slowly to the right, cut into a few steps so the mist reads as
// pixel art. params[0] is how thick the mist is at its thickest.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  if (c.a <= 0.0) return vec4(0.0);
  vec2 p = floor(pixel) / 30.0 + vec2(time * 0.07, 0.0);
  float n = noise(p) * 0.65 + noise(p * 2.3 + vec2(-time * 0.05, time * 0.02)) * 0.35;
  float mist = floor(smoothstep(0.42, 0.85, n) * 5.0) / 5.0;
  return vec4(0.78, 0.82, 1.0, mist * params[0]);
}
