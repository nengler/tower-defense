// An enemy for the moment after a hit. Its sprite is alone in this layer (already flashed white by the engine), so its edge is
// wherever the alpha ends: a clear pixel beside it becomes a rim in the colour params[0..2] (its type's), the sprite's red and blue
// come from a pixel either side of its green (a colour split), and the whole of it shakes a pixel left or right, a new way every
// sixtieth of a second.
vec4 effect(vec2 uv) {
  vec2 px = 1.0 / resolution;
  float shake = fract(sin(floor(time * 60.0) * 12.9898) * 43758.5453) > 0.5 ? 1.0 : -1.0;
  vec2 at = uv + vec2(shake * px.x, 0.0);
  vec4 c = texture(image, at);
  vec4 left = texture(image, at - vec2(px.x, 0.0));
  vec4 right = texture(image, at + vec2(px.x, 0.0));
  if (c.a < 0.5) {
    float near = max(max(left.a, right.a), max(texture(image, at - vec2(0.0, px.y)).a, texture(image, at + vec2(0.0, px.y)).a));
    if (near > 0.5) return vec4(min(vec3(params[0], params[1], params[2]) * 1.3 + 0.15, 1.0), 1.0);
    return vec4(0.0);
  }
  return vec4(left.a > 0.5 ? left.r : c.r, c.g, right.a > 0.5 ? right.b : c.b, c.a);
}
