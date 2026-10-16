const BASE = "https://res.cloudinary.com/drdrwbdkp/image/upload";
const FILE = "v1782729556/IMG_20260629_113854_625_vj4gfx.jpg";

/** Original upload. */
export const LOGO = `${BASE}/${FILE}`;
/** Small optimized version for the header and favicon (falls back to LOGO if the transform is blocked). */
export const LOGO_SMALL = `${BASE}/w_96,h_96,c_fill,f_auto,q_auto/${FILE}`;