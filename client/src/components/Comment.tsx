import { CommentWithUser } from "@shared/schema";
import UserAvatar from "./UserAvatar";
import { useTimeAgo } from "@/hooks/useTimeAgo";

interface CommentProps {
  comment: CommentWithUser;
}

const Comment = ({ comment }: CommentProps) => {
  const timeAgo = useTimeAgo(comment.createdAt);
  
  return (
    <div className="flex gap-2 mb-3">
      <UserAvatar user={comment.user} size="sm" />
      
      <div className="flex-1 p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-semibold text-sm">{comment.user.displayName}</span>
          <span className="text-secondary text-xs">@{comment.user.username}</span>
          <span className="text-secondary text-xs ml-auto">{timeAgo}</span>
        </div>
        
        <p className="text-sm">{comment.content}</p>
        
        <div className="flex gap-4 mt-1">
          <button className="text-xs text-secondary hover:text-primary">Like</button>
          <button className="text-xs text-secondary hover:text-primary">Reply</button>
        </div>
      </div>
    </div>
  );
};

export default Comment;
