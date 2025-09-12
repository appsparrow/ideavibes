import { useAuth } from '@/hooks/useAuth';
import { useGroupContext } from '@/hooks/useGroupContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Home, TrendingUp, Plus, Users2, Calendar, UserCircle, Menu, Building2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const { user, signOut } = useAuth();
  const { selectedGroupName } = useGroupContext();
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  // Simplified navigation items
  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/ideas', label: 'Ideas', icon: TrendingUp },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/submit-idea', label: 'Submit', icon: Plus },
  ];

  const renderNavItems = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl sm:text-2xl font-bold text-primary">
            IdeaFlow
          </Link>
          
          {/* Workspace indicator */}
          {selectedGroupName && (
            <Link to="/groups" className="flex items-center space-x-2 text-sm bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-md transition-colors">
              <Building2 className="h-4 w-4" />
              <span className="max-w-32 truncate font-medium">{selectedGroupName}</span>
            </Link>
          )}
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            {renderNavItems()}
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Mobile Submit Button */}
          {isMobile && (
            <Button asChild size="sm" className="px-2">
              <Link to="/submit-idea">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          )}
          
          {/* User Avatar */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Mobile Menu */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col space-y-4 mt-8">
                  {renderNavItems()}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;