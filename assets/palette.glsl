// The map's palette, laid over the whole battle (and, on a layer of its own, the HUD): every pixel becomes one of five colours,
// in the manner of City of None. params[0..4] are the background, cool, green, warm and white colours, each packed as one number
// (r × 65536 + g × 256 + b, exact in a float); params[5..7] are the lightness cuts: below params[5] is background, below params[6]
// is the background's texture (a shade above it), and from params[7] up is white. Lightness and hue are measured in OKLab, so a step
// in them looks like a step. Between the cuts the hue decides: green-ish to green, warm (yellow, orange, red) to warm, the rest cool.
vec3 unpack(float v) {
  float r = floor(v / 65536.0);
  float g = floor((v - r * 65536.0) / 256.0);
  float b = v - r * 65536.0 - g * 256.0;
  return vec3(r, g, b) / 255.0;
}

vec3 linear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 oklab(vec3 c) {
  c = linear(c);
  float l = pow(max(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b, 0.0), 1.0 / 3.0);
  float m = pow(max(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b, 0.0), 1.0 / 3.0);
  float s = pow(max(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b, 0.0), 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
              1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
              0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}

vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  if (c.a <= 0.0) return c;
  vec3 lab = oklab(c.rgb);
  vec3 bg = unpack(params[0]);
  vec3 out_ = unpack(params[1]);
  if (lab.z > 0.02 || lab.y > 0.05) out_ = unpack(params[3]);
  if (lab.y < -0.03 && lab.z > -0.01) out_ = unpack(params[2]);
  if (lab.x < params[6]) out_ = mix(bg, unpack(params[1]), 0.12);
  if (lab.x < params[5]) out_ = bg;
  if (lab.x >= params[7]) out_ = unpack(params[4]);
  return vec4(out_, c.a);
}
