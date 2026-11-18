interface PolriCrestSvgProps {
  className?: string;
}

export function PolriCrestSvg({ className = 'w-16 h-16' }: PolriCrestSvgProps) {
  return (
    <img
      src="/assets/aistudio/Logo_Tri_Brata__1___1__7bf85ea6.png"
      alt="Logo Tribrata Polri"
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
}
