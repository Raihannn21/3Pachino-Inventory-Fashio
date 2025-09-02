import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'sidebar';
  showText?: boolean;
  className?: string;
  linkable?: boolean;
  usePng?: boolean; // New prop to choose PNG format
}

const sizeConfig = {
  sm: { image: 'w-6 h-6', text: 'text-sm', subText: 'text-xs' },
  md: { image: 'w-8 h-8', text: 'text-base', subText: 'text-xs' },
  lg: { image: 'w-12 h-12', text: 'text-xl', subText: 'text-sm' },
  xl: { image: 'w-16 h-16', text: 'text-2xl', subText: 'text-base' },
  sidebar: { image: 'w-20 h-20', text: 'text-2xl', subText: 'text-base' }, // Extra large for sidebar
};

export function Logo({ 
  size = 'md', 
  showText = true, 
  className = '', 
  linkable = false,
  usePng = false 
}: LogoProps) {
  const config = sizeConfig[size];
  const logoSrc = usePng ? '/3pachino.png' : '/3pachino.jpg';
  
  const LogoContent = () => (
    <div className={cn("flex items-center", className)}>
      <div className={cn("relative mr-3", config.image)}>
        <Image
          src={logoSrc}
          alt="3PACHINO Logo"
          fill
          className={cn(
            "object-contain",
            usePng ? "" : "rounded-lg" // No rounded corners for PNG (transparent)
          )}
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-slate-800", config.text)}>
            3PACHINO
          </span>
          <span className={cn("text-slate-500", config.subText)}>
            Fashion Brand
          </span>
        </div>
      )}
    </div>
  );

  if (linkable) {
    return (
      <Link href="/" className="group hover:opacity-80 transition-opacity">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
