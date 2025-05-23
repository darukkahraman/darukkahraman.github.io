import { useEffect } from "react";
import Header from "@/components/Header";
import { NotificationWithUsers } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import UserAvatar from "@/components/UserAvatar";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useAuth } from "@/hooks/use-auth";

interface NotificationsProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Notifications = ({ activeView, setActiveView }: NotificationsProps) => {
  const { currentUser } = useAuth();
  const { data: notifications, isLoading } = useQuery<NotificationWithUsers[]>({
    queryKey: [`/api/notifications/user/${currentUser?.id}`],
    enabled: !!currentUser?.id
  });

  useEffect(() => {
    if (activeView !== "notifications") {
      setActiveView("notifications");
    }
  }, [activeView, setActiveView]);

  const getNotificationText = (notification: NotificationWithUsers) => {
    switch (notification.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "mention":
        return "mentioned you in a post";
      case "follow":
        return "followed you";
      default:
        return "interacted with you";
    }
  };

  return (
    <div>
      <Header title="Notifications" />

      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold mb-4">Notifications</h2>

        {isLoading && (
          <div className="text-center text-secondary py-4">
            Loading notifications...
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="text-center text-secondary py-4">
            No notifications available
          </div>
        )}

        <div className="space-y-4">
          {notifications && notifications.map(notification => {
            const timeAgo = useTimeAgo(notification.createdAt);

            return (
              <div 
                key={notification.id}
                className={`p-3 ${notification.read ? 'bg-gray-50' : 'bg-blue-50'} rounded-xl flex items-start gap-3`}
              >
                <UserAvatar user={notification.sourceUser} />

                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{notification.sourceUser.displayName}</span> {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-secondary">{timeAgo}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Notifications;