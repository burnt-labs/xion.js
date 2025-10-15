export function LeapLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 42 42"
      fill="none"
    >
      <rect width="42" height="42" rx="9.5" fill="url(#paint0_linear_leap)" />
      <path
        d="M21 10L28 17L21 24L14 17L21 10Z"
        fill="white"
      />
      <path
        d="M14 24L21 31L28 24L21 17L14 24Z"
        fill="white"
        opacity="0.7"
      />
      <defs>
        <linearGradient
          id="paint0_linear_leap"
          x1="0"
          y1="0"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CF3E7B" />
          <stop offset="1" stopColor="#7A3FD8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
