export function OKXLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 42 42"
      fill="none"
    >
      <rect width="42" height="42" rx="9.5" fill="black" />
      <rect x="10" y="10" width="8" height="8" fill="white" />
      <rect x="24" y="10" width="8" height="8" fill="white" />
      <rect x="10" y="24" width="8" height="8" fill="white" />
      <rect x="24" y="24" width="8" height="8" fill="white" />
    </svg>
  );
}
