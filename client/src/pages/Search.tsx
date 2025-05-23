import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Post from "@/components/Post";
import { PostWithUser } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface SearchProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Search = ({ activeView, setActiveView }: SearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: searchResults, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/posts/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to search posts');
      }
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (activeView !== "search") {
      setActiveView("search");
    }
  }, [activeView, setActiveView]);
  
  return (
    <div>
      <Header title="Search" />
      
      <div className="sticky top-[61px] z-10 p-4 bg-white border-b border-border">
        <div className="relative">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Search posts..." 
            className="w-full p-3 pl-10 bg-gray-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div id="searchResults" className="divide-y divide-border">
        {!searchQuery && (
          <div className="p-4 text-center text-secondary">
            Search for posts, people, or topics
          </div>
        )}
        
        {searchQuery && isLoading && (
          <div className="p-4 text-center text-secondary">
            Searching...
          </div>
        )}
        
        {searchQuery && !isLoading && (!searchResults || searchResults.length === 0) && (
          <div className="p-4 text-center text-secondary">
            No results found for "{searchQuery}"
          </div>
        )}
        
        {searchResults && searchResults.map(post => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default Search;
