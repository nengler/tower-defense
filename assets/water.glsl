// Glowmire's ponds: the water tiles are drawn into this layer, and each row of it sways sideways by whole pixels (so it stays
// pixel art) as slow waves pass, with glints that drift across the surface. params[0] is how bright the glints are.
vec4 effect(vec2 uv) {
  vec2 px = 1.0 / resolution;
  float wave = sin(pixel.y * 0.8 + time * 2.2) * 0.7 + sin(pixel.y * 0.23 - time * 1.1) * 0.6;
  vec4 c = texture(image, uv + vec2(floor(wave + 0.5), 0.0) * px);
  // Swaying past a pond's edge samples nothing: keep the water there as it was.
  if (c.a < 0.5) c = texture(image, uv);
  vec2 p = floor(pixel);
  float g = sin(p.x * 0.9 + p.y * 0.5 + time * 2.6) * sin(p.x * 0.31 - p.y * 1.13 - time * 1.4);
  c.rgb += step(0.9, g) * c.a * vec3(0.45, 0.65, 0.85) * params[0];
  return c;
}
