/* eslint-disable @next/next/no-img-element */

type Props = {
  /** Pixel height. Width auto-scales. Default 40. */
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = "" }: Props) {
  return (
    <img
      src="/logo.jpg"
      alt="SafeTrack"
      height={size}
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}
