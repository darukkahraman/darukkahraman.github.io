import { PostWithUser } from "@shared/schema";
import Post from "./Post";
import { useQuery } from "@tanstack/react-query";

const Feed = () => {
  const { data: posts, isLoading } = useQuery<PostWithUser[]>({
    queryKey: ["/api/posts"],
  });
  
  if (isLoading) {
    return (
      <div className="p-4 text-center text-secondary">
        Loading posts...
      </div>
    );
  }
  
  if (!posts || posts.length === 0) {
    return (
      <div className="p-4 text-center text-secondary">
        No posts found. Be the first to post!
      </div>
    );
  }
  
  return (
    <div id="feed" className="divide-y divide-border animate-fade-in">
      {posts.map(post => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
};

export default Feed;
