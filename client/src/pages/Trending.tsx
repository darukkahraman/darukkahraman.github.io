import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Trending, PostWithUser } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Post from "@/components/Post";

interface TrendingProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const TrendingPage = ({ activeView, setActiveView }: TrendingProps) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const { data: trendingTopics, isLoading } = useQuery<Trending[]>({
    queryKey: ["/api/trending"],
  });
  
  const { data: hashtagPosts, isLoading: isLoadingPosts } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts/hashtag", selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const response = await fetch(`/api/posts/hashtag/${encodeURIComponent(selectedTopic)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts by hashtag');
      }
      return response.json();
    },
    enabled: !!selectedTopic,
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (activeView !== "trending") {
      setActiveView("trending");
    }
  }, [activeView, setActiveView]);
  
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count;
  };
  
  return (
    <div>
      <Header title="Trending" />
      
      {selectedTopic ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <button 
              onClick={() => setSelectedTopic(null)} 
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 className="text-xl font-semibold">{selectedTopic}</h2>
          </div>
          
          {isLoadingPosts ? (
            <div className="text-center text-secondary py-8">
              Gönderiler yükleniyor...
            </div>
          ) : hashtagPosts && hashtagPosts.length > 0 ? (
            <div>
              {hashtagPosts.map(post => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center text-secondary py-8">
              Bu etiketle ilgili gönderi bulunamadı
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold mb-4">Trending Topics</h2>
          
          {isLoading && (
            <div className="text-center text-secondary py-4">
              Loading trending topics...
            </div>
          )}
          
          {!isLoading && (!trendingTopics || trendingTopics.length === 0) && (
            <div className="text-center text-secondary py-4">
              No trending topics available
            </div>
          )}
          
          <div className="space-y-4">
            {trendingTopics && trendingTopics.map(topic => (
              <div 
                key={topic.id}
                className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedTopic(topic.topic)}
              >
                <div className="font-semibold">{topic.topic}</div>
                <div className="text-sm text-secondary">{formatCount(topic.postCount)} posts</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingPage;
