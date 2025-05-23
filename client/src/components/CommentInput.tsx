import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import UserAvatar from "./UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface CommentInputProps {
  postId: number;
}

const CommentInput = ({ postId }: CommentInputProps) => {
  const [content, setContent] = useState("");
  
  // Get current user
  const { user: currentUser } = useAuth();
  
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/comments", {
        postId,
        userId: currentUser?.id,
        content
      });
    },
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      // Invalidate notifications to refresh them
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/notifications/user/${currentUser?.id}`] 
      });
    }
  });
  
  const handleSubmit = () => {
    if (content.trim() && !createCommentMutation.isPending) {
      createCommentMutation.mutate(content);
    }
  };
  
  if (!currentUser) return null;
  
  return (
    <div className="flex gap-2 mt-3">
      <UserAvatar user={currentUser} size="sm" />
      
      <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden">
        <textarea 
          className="w-full p-2 bg-transparent resize-none border-none focus:outline-none text-sm"
          placeholder="Write a comment..."
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>
        
        <div className="flex justify-end p-1 border-t border-gray-100">
          <button 
            className={`bg-primary text-white text-xs px-3 py-1 rounded-full ${
              !content.trim() || createCommentMutation.isPending 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
            onClick={handleSubmit}
            disabled={!content.trim() || createCommentMutation.isPending}
          >
            {createCommentMutation.isPending ? "Posting..." : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentInput;
