import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const InfoTip = ({ text, className }: { text: string; className?: string }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ${className ?? ""}`}
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);