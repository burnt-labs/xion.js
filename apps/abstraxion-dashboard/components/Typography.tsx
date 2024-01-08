const CONFIG = {
  body: "font-akkuratLL text-base font-normal",
  navigation:
    "font-akkuratLL text-xs leading-3 uppercase font-bold tracking-widest",
};

interface TypographyProps {
  children: React.ReactNode;
  variant: keyof typeof CONFIG;
}

export function Typography({ children, variant }: TypographyProps) {
  return <span className={`${CONFIG[variant]}`}>{children}</span>;
}
