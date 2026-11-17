// Glowmire's light map, as it is laid over the world (multiplied): the ambient dark plus every light added into it.
//
// - Banded: the light is cut into params[0] levels, with a 4 × 4 ordered dither between them, so the light pools step down
//   in rings the way pixel art draws them, instead of a smooth gradient no 320 × 180 sprite could have.
// - Cool shadows: where little light reaches, it is tinted toward moonlight blue; bright light keeps its own colour.
// - A vignette of strength params[1] darkens the corners.
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  ivec2 cell = ivec2(mod(floor(pixel), 4.0));
  float dither = (BAYER[cell.y * 4 + cell.x] + 0.5) / 16.0 - 0.5;
  float levels = max(params[0], 2.0);
  vec3 light = floor(c.rgb * levels + dither + 0.5) / levels;
  float lum = max(light.r, max(light.g, light.b));
  light = mix(light * vec3(0.8, 0.92, 1.25), light, smoothstep(0.3, 0.75, lum));
  vec2 q = pixel / resolution - 0.5;
  light *= 1.0 - params[1] * dot(q, q) * 2.0;
  return vec4(clamp(light, 0.0, 1.0), c.a);
}
