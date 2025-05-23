import { useEffect, useState } from "react";
import UserAvatar from "./UserAvatar";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/username/darukkahraman"],
  });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  const formattedTime = currentTime.toISOString().slice(0, 16).replace('T', ' ');
  
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-border">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-secondary">{formattedTime}</span>
        {currentUser && (
          <UserAvatar
            user={currentUser}
            size="sm"
          />
        )}
      </div>
    </header>
  );
};

export default Header;
