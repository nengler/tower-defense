// The map's palette, laid over the whole battle (and, on a layer of its own, the HUD): every pixel becomes one of the palette's
// colours, in the manner of City of None: five, and a shade and a highlight of each mid colour. params[0..4] are the background, cool, green, warm and white colours, each packed as one number
// (r × 65536 + g × 256 + b, exact in a float); params[5..7] are the lightness cuts: below params[5] is background, below params[6]
// is the background's texture (a shade above it), and from params[7] up is white. Lightness and hue are measured in OKLab, so a step
// in them looks like a step. Between the cuts the hue decides: green-ish to green, warm (yellow, orange, red) to warm, the rest cool,
// and the lightness then picks that colour's shade, itself or its highlight (`shaded`).
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

// A mid colour in three values, so the art's own shading survives: its shade (towards the background) below `lo`, the colour itself
// up to `hi`, and its highlight (towards white) above. The cuts are where the art's dark and light parts of that hue fall: a pond's
// water and its ripples, a tree's leaves and their light side, a creature's body and its shadow.
vec3 shaded(vec3 col, float L, float lo, float hi, vec3 bg, vec3 white) {
  if (L < lo) return mix(col, bg, 0.35);
  if (L > hi) return mix(col, white, 0.3);
  return col;
}

vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  if (c.a <= 0.0) return c;
  vec3 lab = oklab(c.rgb);
  float L = lab.x;
  vec3 bg = unpack(params[0]);
  vec3 white = unpack(params[4]);
  // Night is darker all over: its cuts sit lower, as its background cut does.
  float k = params[5] / 0.39;
  vec3 out_ = shaded(unpack(params[1]), L, 0.45 * k, 0.60 * k, bg, white);
  if (lab.z > 0.02 || lab.y > 0.05) out_ = shaded(unpack(params[3]), L, 0.45 * k, 0.64 * k, bg, white);
  if (lab.y < -0.03 && lab.z > -0.01) out_ = shaded(unpack(params[2]), L, 0.45 * k, 0.57 * k, bg, white);
  if (L < params[6]) out_ = mix(bg, unpack(params[1]), 0.12);
  if (L < params[5]) out_ = bg;
  if (L >= params[7]) out_ = white;
  return vec4(out_, c.a);
}
