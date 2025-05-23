import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileNavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const MobileNavbar = ({ activeView, setActiveView }: MobileNavbarProps) => {
  const { user, logoutMutation } = useAuth();
  
  const handleNavClick = (view: string) => {
    setActiveView(view);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-around py-3 px-2 bg-white border-t border-border lg:hidden z-50">
      <Link href="/">
        <a 
          className={`flex flex-col items-center ${activeView === "home" ? "text-primary" : "text-secondary"}`}
          onClick={() => handleNavClick("home")}
        >
          <span className="material-icons">home</span>
          <span className="text-xs">Home</span>
        </a>
      </Link>
      
      <Link href="/search">
        <a 
          className={`flex flex-col items-center ${activeView === "search" ? "text-primary" : "text-secondary"}`}
          onClick={() => handleNavClick("search")}
        >
          <span className="material-icons">search</span>
          <span className="text-xs">Search</span>
        </a>
      </Link>
      
      <Link href="/trending">
        <a 
          className={`flex flex-col items-center ${activeView === "trending" ? "text-primary" : "text-secondary"}`}
          onClick={() => handleNavClick("trending")}
        >
          <span className="material-icons">trending_up</span>
          <span className="text-xs">Trending</span>
        </a>
      </Link>
      
      <Link href="/notifications">
        <a 
          className={`flex flex-col items-center ${activeView === "notifications" ? "text-primary" : "text-secondary"}`}
          onClick={() => handleNavClick("notifications")}
        >
          <span className="material-icons">notifications</span>
          <span className="text-xs">Notifications</span>
        </a>
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger className="flex flex-col items-center text-secondary">
          <span className="material-icons">person</span>
          <span className="text-xs">Profile</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <Link href="/profile">
            <DropdownMenuItem className="cursor-pointer">
              <span className="material-icons text-sm mr-2">account_circle</span>
              View Profile
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem 
            className="cursor-pointer" 
            onClick={handleLogout}
          >
            <span className="material-icons text-sm mr-2">logout</span>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MobileNavbar;
