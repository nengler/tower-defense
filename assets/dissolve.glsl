// An enemy as it dies: its sprite, alone in this layer, crumbles away pixel by pixel. params[0] is how far it has gone (0 whole, 1
// gone): each pixel has its own fixed random threshold, and goes once the progress passes it; the pixels about to go burn at the
// edge in params[1..3] (its type's colour), so the crumbling front glows.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  if (c.a <= 0.0) return c;
  float n = hash(floor(pixel));
  float t = params[0];
  if (n < t) return vec4(0.0);
  if (n < t + 0.2) return vec4(min(vec3(params[1], params[2], params[3]) * 1.4 + 0.2, 1.0), 1.0);
  return c;
}
