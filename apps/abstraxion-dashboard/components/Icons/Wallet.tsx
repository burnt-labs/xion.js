export const WalletIcon = ({
  color,
  backgroundColor,
  outlineColor,
}: {
  color: string;
  backgroundColor: string;
  outlineColor?: string;
}) => (
  <svg
    width="21"
    height="17"
    viewBox="0 0 21 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1"
      y="0.5"
      width="17.2353"
      height="11.9412"
      rx="1.5"
      stroke={color}
    />
    <path
      d="M1 14.1186V3.7511C1.00389 3.75308 1.00778 3.75504 1.01168 3.75699C1.56022 4.03126 2.2516 4.03078 2.79374 4.0304C2.81368 4.03039 2.83342 4.03037 2.85294 4.03037H18.1471C19.1704 4.03037 20 4.85996 20 5.88332V14.1186C20 15.142 19.1704 15.9715 18.1471 15.9715H2.85294C1.82959 15.9715 1 15.142 1 14.1186Z"
      fill={backgroundColor}
      stroke={color}
    />
    <line x1="4.0293" y1="7.14844" x2="16.3822" y2="7.14844" stroke={color} />
  </svg>
);
