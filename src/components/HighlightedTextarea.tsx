import { useRef, useEffect } from 'react';
import './HighlightedTextarea.css';

interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
}

export const HighlightedTextarea = ({ 
  value, 
  onChange, 
  placeholder, 
  rows = 15,
  id 
}: HighlightedTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sincronizar scroll entre el textarea y el div de highlight
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  // Resaltar placeholders {{nombre}}
  const highlightPlaceholders = (text: string) => {
    if (!text) return '';
    
    // Escapar HTML
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Resaltar {{placeholders}}
    return escaped.replace(
      /(\{\{[^}]+\}\})/g, 
      '<span class="placeholder-highlight">$1</span>'
    );
  };

  return (
    <div className="highlighted-textarea-container">
      <div 
        ref={highlightRef}
        className="highlighted-textarea-backdrop"
        dangerouslySetInnerHTML={{ __html: highlightPlaceholders(value) + '\n' }}
      />
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        className="highlighted-textarea-input"
        spellCheck={false}
      />
    </div>
  );
};
