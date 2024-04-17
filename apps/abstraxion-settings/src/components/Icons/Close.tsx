export const CloseIcon = ({
  color = "black",
  onClick,
}: {
  color?: string;
  onClick: VoidFunction;
}) => (
  <svg
    onClick={onClick}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M10.941 0L6 4.941L1.059 0L0 1.05975L4.941 6L0 10.941L1.059 12L6 7.059L10.941 12L12 10.941L7.059 6L12 1.05975L10.941 0Z"
      fill={color}
    />
  </svg>
);
