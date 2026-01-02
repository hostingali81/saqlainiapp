"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>
}

const Tooltip = ({ children }: { children: React.ReactNode }) => {
    const [position, setPosition] = React.useState<'top' | 'bottom'>('bottom');
    const triggerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handlePosition = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                // If more space above and not enough below, show on top
                if (spaceAbove > spaceBelow && spaceBelow < 200) {
                    setPosition('top');
                } else {
                    setPosition('bottom');
                }
            }
        };

        const trigger = triggerRef.current;
        if (trigger) {
            trigger.addEventListener('mouseenter', handlePosition);
            return () => trigger.removeEventListener('mouseenter', handlePosition);
        }
    }, []);

    return (
        <div ref={triggerRef} className="relative group inline-block" data-position={position}>
            {children}
        </div>
    );
}

const TooltipTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return <div className={cn("cursor-pointer", className)}>{children}</div>
}

const TooltipContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <>
        {/* Bottom position (default) */}
        <div
            ref={ref}
            className={cn(
                "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[250px] group-data-[position=top]:hidden",
                className
            )}
            {...props}
        />
        {/* Top position (when not enough space below) */}
        <div
            className={cn(
                "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[250px] hidden group-data-[position=top]:block",
                className
            )}
            {...props}
        />
    </>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
