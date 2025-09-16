import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Subtle gradient background for all pages */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-purple-50 to-transparent h-48 pointer-events-none z-0"></div>
      
      <div className="relative z-20">
        <Header />
      </div>
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;