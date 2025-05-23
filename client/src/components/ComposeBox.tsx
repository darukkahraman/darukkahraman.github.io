import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import UserAvatar from "./UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const MAX_CHARS = 300;

const ComposeBox = () => {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Get current user from auth context
  const { user: currentUser } = useAuth();
  
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      return apiRequest("POST", "/api/posts", {
        userId: currentUser.id,
        content: content
      });
    },
    onSuccess: async () => {
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setImageFile(null);
      setImagePreview(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });
  
  const handleCreatePost = () => {
    if (content.trim() && content.length <= MAX_CHARS && !createPostMutation.isPending) {
      createPostMutation.mutate(content);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  const remainingChars = MAX_CHARS - content.length;
  const isOverLimit = remainingChars < 0;
  
  if (!currentUser) return null;
  
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        <UserAvatar 
          user={currentUser} 
          showEdit={true}
        />
        
        <div className="flex-1">
          <textarea 
            id="postInput"
            className="w-full p-3 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            placeholder="What's on your mind?"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
          
          {imagePreview && (
            <div className="relative mt-2">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-64 rounded-lg object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-secondary'}`}>
                {remainingChars}
              </span>
              <label className="cursor-pointer text-primary hover:text-primary/80">
                <span className="material-icons">image</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </label>
            </div>
            <button 
              className={`bg-primary text-white py-2 px-5 rounded-full font-semibold transition-colors ${
                !content.trim() || isOverLimit || createPostMutation.isPending 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-600'
              }`}
              onClick={handleCreatePost}
              disabled={!content.trim() || isOverLimit || createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeBox;
