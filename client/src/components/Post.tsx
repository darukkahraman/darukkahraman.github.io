import { useState, useRef } from "react";
import { PostWithUser } from "@shared/schema";
import UserAvatar from "./UserAvatar";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Comment from "./Comment";
import CommentInput from "./CommentInput";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, MoreVertical, X, Check } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostProps {
  post: PostWithUser;
}

const Post = ({ post }: PostProps) => {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const timeAgo = useTimeAgo(post.createdAt);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      
      if (post.isLiked) {
        return apiRequest("DELETE", `/api/likes/${post.id}/${currentUser.id}`);
      } else {
        return apiRequest("POST", "/api/likes", {
          postId: post.id,
          userId: currentUser.id
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });
  
  const handleLikeClick = () => {
    if (!toggleLikeMutation.isPending) {
      toggleLikeMutation.mutate();
    }
  };
  
  const handleCommentClick = () => {
    setShowComments(!showComments);
  };
  
  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Gönderi silindi",
        description: "Gönderiniz başarıyla silindi"
      });
      // Invalidate both main posts and user posts queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/user/${currentUser.id}`] });
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Gönderi silinirken bir hata oluştu",
        variant: "destructive"
      });
    }
  });
  
  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("PATCH", `/api/posts/${post.id}`, { content });
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({
        title: "Gönderi güncellendi",
        description: "Gönderiniz başarıyla güncellendi"
      });
      // Invalidate both main posts and user posts queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/user/${currentUser.id}`] });
      }
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Gönderi güncellenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  });
  
  const handleSaveEdit = () => {
    if (editedContent.trim() && !updatePostMutation.isPending) {
      updatePostMutation.mutate(editedContent);
    }
  };
  
  const handleCancelEdit = () => {
    setEditedContent(post.content);
    setIsEditing(false);
  };
  
  return (
    <article className="p-4 hover:bg-gray-50 transition-colors border-b border-border">
      <div className="flex gap-3">
        <UserAvatar user={post.user} />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{post.user.displayName}</span>
              {(post.user.username.toLowerCase() === 'drkkahraman' || post.user.username.toLowerCase() === 'darak') && (
                <VerifiedBadge size={15} />
              )}
            </div>
            <span className="text-secondary text-sm">@{post.user.username}</span>
            
            {/* Show dropdown menu for post owner */}
            {currentUser?.id === post.userId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto p-1 text-secondary hover:text-primary transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deletePostMutation.mutate()}
                    className="cursor-pointer text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Current user ID ve Post user ID bilgisini kaldırdık */}
            
            <span className="text-secondary text-sm ml-auto">{timeAgo}</span>
          </div>
          
          {isEditing ? (
            <div className="mb-3">
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-secondary hover:text-primary px-3 py-1 rounded-md hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  İptal
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-md hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                  Kaydet
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-3">{post.content}</p>
          )}
          
          {post.imageUrl && (
            <img 
              src={post.imageUrl} 
              alt="Post image" 
              className="w-full h-64 object-cover rounded-xl mb-3"
            />
          )}
          
          <div className="flex gap-6">
            <button 
              className={`flex items-center gap-1 ${post.isLiked ? 'text-primary' : 'text-secondary hover:text-primary'} transition-colors`}
              onClick={handleLikeClick}
            >
              <span className="material-icons text-xl">
                {post.isLiked ? 'favorite' : 'favorite_border'}
              </span>
              <span>{post.likeCount}</span>
            </button>
            
            <button 
              className={`flex items-center gap-1 ${showComments ? 'text-primary' : 'text-secondary hover:text-primary'} transition-colors`}
              onClick={handleCommentClick}
            >
              <span className="material-icons text-xl">
                {showComments ? 'chat_bubble' : 'chat_bubble_outline'}
              </span>
              <span>{post.commentCount}</span>
            </button>
            
            <button 
              className={`flex items-center gap-1 ${post.isRepost ? 'text-primary' : 'text-secondary hover:text-primary'} transition-colors`}
              onClick={() => {
                if (!currentUser) {
                  toast({
                    title: "Giriş yapmalısınız",
                    description: "Gönderi alıntılamak için giriş yapmalısınız",
                    variant: "destructive"
                  });
                  return;
                }
                
                const repostData = {
                  userId: currentUser.id,
                  content: "",
                  originalPostId: post.id
                };
                
                apiRequest("POST", "/api/posts", repostData)
                  .then(() => {
                    toast({
                      title: "Gönderi alıntılandı",
                      description: "Gönderi başarıyla profilinizde paylaşıldı"
                    });
                    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                    if (currentUser) {
                      queryClient.invalidateQueries({ queryKey: [`/api/posts/user/${currentUser.id}`] });
                    }
                  })
                  .catch(() => {
                    toast({
                      title: "Hata",
                      description: "Gönderi alıntılanırken bir hata oluştu",
                      variant: "destructive"
                    });
                  });
              }}
            >
              <span className="material-icons text-xl">repeat</span>
              <span>{post.repostCount || 0}</span>
            </button>
            
            <button className="flex items-center gap-1 text-secondary hover:text-primary transition-colors">
              <span className="material-icons text-xl">share</span>
            </button>
          </div>
          
          {showComments && (
            <div className="mt-4 pt-4 border-t border-border">
              {post.comments && [...post.comments].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              ).map(comment => (
                <Comment key={comment.id} comment={comment} />
              ))}
              
              <CommentInput postId={post.id} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default Post;
