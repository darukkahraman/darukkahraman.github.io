import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "./VerifiedBadge";

interface UserAvatarProps {
  user: User;
  size?: "xs" | "sm" | "md" | "lg";
  showEdit?: boolean;
  onUpload?: (file: File) => void;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg"
};

const UserAvatar = ({ 
  user, 
  size = "md", 
  showEdit = false,
  onUpload
}: UserAvatarProps) => {
  const { toast } = useToast();
  if (!user) return null;
  
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPEG, PNG, GIF, and WEBP images are allowed",
          variant: "destructive"
        });
        return;
      }
      
      if (onUpload) {
        onUpload(file);
      }
    }
  };
  
  return (
    <div className={`relative group ${showEdit ? 'cursor-pointer' : ''}`}>
      {showEdit && (
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleUpload}
          id="avatar-upload"
        />
      )}
      
      {user.profileImageUrl ? (
        <label 
          htmlFor={showEdit ? "avatar-upload" : undefined}
          className="relative"
        >
          <img 
            src={`${user.profileImageUrl}?t=${new Date().getTime()}`} 
            alt={`${user.username}'s avatar`}
            className={`${sizeClasses[size]} rounded-full flex-shrink-0 object-cover`}
          />
        </label>
      ) : (
        <label 
          htmlFor={showEdit ? "avatar-upload" : undefined}
          className={`${sizeClasses[size]} rounded-full flex-shrink-0 flex items-center justify-center text-white`}
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.avatarInitial}
        </label>
      )}
      
      {showEdit && (
        <div className="hidden group-hover:block absolute -bottom-1 -right-1 bg-primary text-white text-xs px-2 py-0.5 rounded-lg">
          Edit
        </div>
      )}
      
      {/* Mavi tik sadece ismin yanında görünsün */}
    </div>
  );
};

export default UserAvatar;
