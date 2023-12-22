export const AvatarIcon = ({
  color,
  backgroundColor,
}: {
  color: string;
  backgroundColor: string;
}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none">
    <rect width="32" height="32" fill="none" rx="16" />
    <rect width="32" height="32" fill="none" rx="16" />
    <rect width="22" height="22" x="5" y="5" fill={color} rx="11" />
    <path
      fill={backgroundColor}
      d="M16 4C9.376 4 4 9.376 4 16s5.376 12 12 12 12-5.376 12-12S22.624 4 16 4Zm0 3.6c1.992 0 3.6 1.608 3.6 3.6s-1.608 3.6-3.6 3.6-3.6-1.608-3.6-3.6 1.608-3.6 3.6-3.6Zm0 17.04c-3 0-5.652-1.536-7.2-3.864.036-2.388 4.8-3.696 7.2-3.696 2.388 0 7.164 1.308 7.2 3.696-1.548 2.328-4.2 3.864-7.2 3.864Z"
    />
  </svg>
);
