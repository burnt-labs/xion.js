import { cn } from "../../lib/utils";

export const EthereumLogo = ({ className }: { className?: string }) => {
  return (
    <svg
      className={cn("ui-h-5 ui-w-5", className)}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      version="1.1"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      imageRendering="optimizeQuality"
      fillRule="evenodd"
      clipRule="evenodd"
      viewBox="0 0 784.37 1277.39"
    >
      <g id="Layer_x0020_1">
        <metadata id="CorelCorpID_0Corel-Layer" />
        <g id="_1421394342400">
          <g>
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54 "
            />
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="392.07,0 -0,650.54 392.07,882.29 392.07,472.33 "
            />
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89 "
            />
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="392.07,1277.38 392.07,956.52 -0,724.89 "
            />
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="392.07,882.29 784.13,650.54 392.07,472.33 "
            />
            <polygon
              fill="#fff"
              fillRule="nonzero"
              points="0,650.54 392.07,882.29 392.07,472.33 "
            />
          </g>
        </g>
      </g>
    </svg>
  );
};
