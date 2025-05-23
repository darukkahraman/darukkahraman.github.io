import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge = ({ className, size = 16 }: VerifiedBadgeProps) => {
  return (
    <span 
      title="Onaylanmış hesap" 
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-blue-500',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Check 
        className="text-white" 
        size={size * 0.65} 
        strokeWidth={3}
        aria-label="Onaylanmış hesap"
      />
    </span>
  );
};

export default VerifiedBadge;