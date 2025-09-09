import { ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-background py-6 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            <p>© 2024 IdeaFlow. All rights reserved.</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Inspired by</span>
            <a 
              href="https://ideadox.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            >
              Ideadox
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;