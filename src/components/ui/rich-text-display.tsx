import React from 'react';
import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

const RichTextDisplay = React.forwardRef<HTMLDivElement, RichTextDisplayProps>(
  ({ content, className }, ref) => {
    const containsHtml = /<\/?[a-z][\s\S]*>/i.test(content || "");

    if (!containsHtml) {
      return (
        <div
          ref={ref}
          className={cn(
            "prose prose-sm max-w-none whitespace-pre-wrap",
            "prose-headings:text-foreground prose-p:text-foreground",
            "prose-strong:text-foreground prose-em:text-foreground",
            "prose-ul:text-foreground prose-ol:text-foreground",
            "prose-li:text-foreground prose-a:text-primary",
            className
          )}
        >
          {content}
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={cn(
          "prose prose-sm max-w-none",
          "prose-headings:text-foreground prose-p:text-foreground",
          "prose-strong:text-foreground prose-em:text-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-li:text-foreground prose-a:text-primary",
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
);

RichTextDisplay.displayName = "RichTextDisplay";

export { RichTextDisplay };