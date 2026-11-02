// The API keeps wrapped degrees; only the UI uses signed azimuth.
export function signedAzimuth(angle: number | null | undefined): number | null {
  if (angle == null || !Number.isFinite(angle) || angle < 0 || angle > 360) return null;
  return angle > 180 ? angle - 360 : angle;
}
