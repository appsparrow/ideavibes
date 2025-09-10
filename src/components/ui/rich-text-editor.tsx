import React, { useMemo, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const RichTextEditor = React.forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, disabled = false }, ref) => {
    const modules = useMemo(() => ({
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ],
    }), []);

    const formats = [
      'header', 'bold', 'italic', 'underline',
      'list', 'bullet', 'link'
    ];

    useEffect(() => {
      // Inject custom styles for Quill editor theming
      if (typeof document !== 'undefined') {
        const styleId = 'quill-custom-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            .ql-editor {
              min-height: 120px;
              font-family: inherit;
              font-size: 0.875rem;
              line-height: 1.25rem;
              color: hsl(var(--foreground));
            }
            
            .ql-editor.ql-blank::before {
              color: hsl(var(--muted-foreground));
              font-style: normal;
            }
            
            .ql-toolbar {
              border-top: 1px solid hsl(var(--border));
              border-left: 1px solid hsl(var(--border));
              border-right: 1px solid hsl(var(--border));
              border-bottom: none;
              background: hsl(var(--background));
            }
            
            .ql-container {
              border-bottom: 1px solid hsl(var(--border));
              border-left: 1px solid hsl(var(--border));
              border-right: 1px solid hsl(var(--border));
              border-top: none;
              background: hsl(var(--background));
              border-radius: 0 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px);
            }
            
            .ql-toolbar:first-child {
              border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
            }
            
            .ql-snow .ql-stroke {
              stroke: hsl(var(--foreground));
            }
            
            .ql-snow .ql-fill {
              fill: hsl(var(--foreground));
            }
            
            .ql-snow .ql-picker {
              color: hsl(var(--foreground));
            }
            
            .ql-snow .ql-picker-options {
              background: hsl(var(--background));
              border: 1px solid hsl(var(--border));
            }
            
            .ql-snow .ql-picker-item:hover {
              background: hsl(var(--accent));
            }
            
            .ql-snow .ql-toolbar button:hover,
            .ql-snow .ql-toolbar button:focus {
              background: hsl(var(--accent));
            }
            
            .ql-snow .ql-toolbar button.ql-active {
              background: hsl(var(--accent));
            }
          `;
          document.head.appendChild(style);
        }
      }
    }, []);

    return (
      <div className={cn("rich-text-editor", className)}>
        <ReactQuill
          ref={ref}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };