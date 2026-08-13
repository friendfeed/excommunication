/**
 * ScanButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The primary scan button with the Bluesky butterfly mark.
 *
 * States:
 *   idle     — butterfly mark + "SCAN" label, normal accent style
 *   scanning — the button's butterfly mark fades out (see
 *              .scan-btn-mark--handoff in styles.css) right as the
 *              full-viewport ButterflyEngine spawns at this exact spot, so
 *              it reads as one butterfly launching off the button rather
 *              than a second one appearing alongside it. Started by the
 *              parent via useButterfly().
 *   disabled — faded, cursor-not-allowed
 *
 * The butterfly SVG is the official path from the Bluesky social-app repo.
 */

interface ScanButtonProps {
  isScanning: boolean;
  disabled: boolean;
  label: string;
  scanningLabel: string;
  onClick: () => void;
}

export function ScanButton({
  isScanning,
  disabled,
  label,
  scanningLabel,
  onClick,
}: ScanButtonProps) {
  return (
    <button
      type="button"
      className={`primary scan-btn ${isScanning ? 'scan-btn--scanning' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isScanning ? scanningLabel : label}
    >
      {/* Official Bluesky butterfly mark */}
      <span
        className={`scan-btn-mark ${isScanning ? 'scan-btn-mark--handoff' : ''}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 320 286"
          xmlns="http://www.w3.org/2000/svg"
          className="scan-btn-butterfly"
        >
          <path
            d="M69.364 19.146c36.687 27.806 76.147 84.186 90.636 114.439
               14.489-30.253 53.948-86.633 90.636-114.439
               C277.107-.917 320-16.44 320 32.957
               c0 9.865-5.603 82.875-8.889 94.729
               -11.423 41.208-53.045 51.719-90.071 45.357
               64.719 11.12 81.182 47.953 45.627 84.785
               -80 82.874-106.667-44.333-106.667-44.333
               s-26.667 127.207-106.667 44.333
               c-35.555-36.832-19.092-73.665 45.627-84.785
               -37.026 6.362-78.648-4.149-90.071-45.357
               C5.603 115.832 0 42.822 0 32.957
               0-16.44 42.893-.917 69.364 19.147Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="scan-btn-label">
        {isScanning ? scanningLabel : label}
      </span>
    </button>
  );
}
