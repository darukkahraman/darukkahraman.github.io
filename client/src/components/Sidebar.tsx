import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar = ({ activeView, setActiveView }: SidebarProps) => {
  const { user, logoutMutation } = useAuth();

  const handleNavClick = (view: string) => {
    setActiveView(view);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="hidden lg:flex flex-col fixed top-0 left-0 p-6 h-screen w-72">
      <div className="p-4 mb-4 text-2xl font-bold text-primary">TEDcepte</div>

      <div className="flex flex-col gap-1">
        <Link href="/">
          <a 
            className={`flex items-center gap-3 p-3 rounded-xl ${
              activeView === "home" 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-gray-100 text-secondary"
            } font-medium transition-colors`}
            onClick={() => handleNavClick("home")}
          >
            <span className="material-icons">home</span>
            <span>Home</span>
          </a>
        </Link>

        <Link href="/search">
          <a 
            className={`flex items-center gap-3 p-3 rounded-xl ${
              activeView === "search" 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-gray-100 text-secondary"
            } font-medium transition-colors`}
            onClick={() => handleNavClick("search")}
          >
            <span className="material-icons">search</span>
            <span>Search</span>
          </a>
        </Link>

        <Link href="/trending">
          <a 
            className={`flex items-center gap-3 p-3 rounded-xl ${
              activeView === "trending" 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-gray-100 text-secondary"
            } font-medium transition-colors`}
            onClick={() => handleNavClick("trending")}
          >
            <span className="material-icons">trending_up</span>
            <span>Trending</span>
          </a>
        </Link>

        <Link href="/notifications">
          <a 
            className={`flex items-center gap-3 p-3 rounded-xl ${
              activeView === "notifications" 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-gray-100 text-secondary"
            } font-medium transition-colors`}
            onClick={() => handleNavClick("notifications")}
          >
            <span className="material-icons">notifications</span>
            <span>Notifications</span>
          </a>
        </Link>

        <Link href="/messages">
          <a 
            className={`flex items-center gap-3 p-3 rounded-xl ${
              activeView === "messages" 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-gray-100 text-secondary"
            } font-medium transition-colors`}
            onClick={() => handleNavClick("messages")}
          >
            <span className="material-icons">mail</span>
            <span>Messages</span>
          </a>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-secondary font-medium transition-colors w-full cursor-pointer">
            <span className="material-icons">person</span>
            <span>Profile</span>
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

        <a href="#" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-secondary font-medium transition-colors">
          <span className="material-icons">settings</span>
          <span>Settings</span>
        </a>
      </div>

      <button 
        className="mt-6 bg-primary text-white py-3 px-6 rounded-full font-semibold w-full hover:bg-blue-600 transition-colors"
        onClick={() => {
          setActiveView("home");
          window.scrollTo(0, 0);
          document.getElementById("postInput")?.focus();
        }}
      >
        New Post
      </button>
    </nav>
  );
};

export default Sidebar;