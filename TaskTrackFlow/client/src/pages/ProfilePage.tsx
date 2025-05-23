import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNavbar from "@/components/MobileNavbar";
import DeleteLastFivePosts from "@/components/DeleteLastFivePosts";

interface ProfilePageProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const ProfilePage = ({ activeView, setActiveView }: ProfilePageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: followStats } = useQuery({
    queryKey: [`/api/users/${user?.id}/follow-stats`],
    enabled: !!user
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/follows`, {
        followingId: user?.id
      });
    },
    onSuccess: () => {
      setIsFollowing(true);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/follow-stats`] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/follows/${user?.id}`);
    },
    onSuccess: () => {
      setIsFollowing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/follow-stats`] });
    }
  });
  
  // Get user's posts
  const { data: userPosts = [] } = useQuery<any[]>({
    queryKey: [`/api/posts/user/${user?.id}`],
    enabled: !!user
  });
  
  // Profile image upload mutation
  const uploadProfileImage = async (file: File) => {
    if (!user) return;
    
    setUploadLoading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`/api/users/${user.id}/profile-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile image');
      }
      
      const updatedUser = await response.json();
      
      // Update the user in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to update profile image",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setUploadLoading(false);
    }
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="flex">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex-1 max-w-2xl mx-auto px-4 pb-20 pt-4">
        <Header title="Profile" />
        
        <div className="mt-8 bg-white shadow rounded-xl p-6">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" showEdit={true} onUpload={uploadProfileImage} />
            
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.displayName}</h2>
              <p className="text-gray-500">@{user.username}</p>
            </div>
            <button
              onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
              className={`px-4 py-2 rounded-full ${
                isFollowing 
                  ? 'bg-accent hover:bg-accent/80' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/80'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>

          <div className="flex gap-4 mt-4">
            <div>
              <span className="font-bold">{followStats?.followers || 0}</span>
              <span className="text-gray-500 ml-1">followers</span>
            </div>
            <div>
              <span className="font-bold">{followStats?.following || 0}</span>
              <span className="text-gray-500 ml-1">following</span>
            </div>
          </div>
          
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-lg font-semibold mb-2">Account Information</h3>
            <p className="text-gray-600">Username: {user.username}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Your Posts</h3>
            <div className="w-40">
              <DeleteLastFivePosts onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/posts/user/${user?.id}`] });
              }} />
            </div>
          </div>
          {userPosts && userPosts.length > 0 ? (
            <div>
              {/* Post component render here */}
              <p>You have {userPosts.length} posts</p>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">You haven't posted anything yet</p>
            </div>
          )}
        </div>
      </main>
      
      <MobileNavbar activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
};

export default ProfilePage;