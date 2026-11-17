// The terrain tiles of one type, alone in this layer, kept alive: params[0] says which type (0 ember, 1 tide, 2 volt, 3 stone,
// 4 bloom, the order of `TYPES`). Every effect moves or lights whole pixels, so the tiles stay pixel art.
//
// - Ash (ember): embers twinkle (each bright pixel pulses on its own clock) over a heat shimmer that sways rows a pixel.
// - Pool (tide): rows sway sideways in slow waves, like Glowmire's ponds.
// - Pylon (volt): a crackle: now and then the whole tile flickers bright, a different moment for each tile.
// - Rock (stone): a glint sweeps across it diagonally every few seconds.
// - Grove (bloom): leaves rustle, columns nudged up and down a pixel by a breeze.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 effect(vec2 uv) {
  vec2 px = 1.0 / resolution;
  vec2 p = floor(pixel);
  vec2 tile = floor(p / 16.0);
  int kind = int(params[0] + 0.5);
  if (kind == 0) {
    float sway = floor(sin(p.y * 0.9 + time * 5.0) * 0.6 + 0.5);
    vec4 c = texture(image, uv + vec2(sway * px.x, 0.0));
    if (c.a < 0.5) c = texture(image, uv);
    float bright = max(c.r - c.b, 0.0);
    float twinkle = 0.5 + 0.5 * sin(time * 4.0 + hash(p) * 6.283);
    c.rgb += bright * twinkle * vec3(0.5, 0.25, 0.0);
    return c;
  }
  if (kind == 1) {
    float sway = floor(sin(p.y * 0.8 + time * 2.2) * 0.7 + sin(p.y * 0.23 - time * 1.1) * 0.6 + 0.5);
    vec4 c = texture(image, uv + vec2(sway * px.x, 0.0));
    if (c.a < 0.5) c = texture(image, uv);
    return c;
  }
  if (kind == 2) {
    vec4 c = texture(image, uv);
    float beat = floor(time * 8.0);
    float flick = step(0.93, hash(tile + vec2(beat, beat * 0.37)));
    c.rgb += flick * vec3(0.45, 0.4, 0.1);
    return c;
  }
  if (kind == 3) {
    vec4 c = texture(image, uv);
    float along = mod(p.x + p.y - time * 30.0, 160.0);
    c.rgb += step(along, 2.0) * 0.35;
    return c;
  }
  float nudge = floor(sin(p.x * 0.7 + time * 2.6) * 0.6 + 0.5);
  vec4 c = texture(image, uv + vec2(0.0, nudge * px.y));
  if (c.a < 0.5) c = texture(image, uv);
  return c;
}
