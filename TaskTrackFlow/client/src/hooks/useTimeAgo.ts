import { useState, useEffect } from 'react';

export function useTimeAgo(date: Date | string) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const targetDate = date instanceof Date ? date : new Date(date);
    
    const updateTimeAgo = () => {
      const now = new Date();
      const secondsAgo = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
      
      let interval = secondsAgo / 31536000; // seconds in a year
      
      if (interval > 1) {
        setTimeAgo(`${Math.floor(interval)}y ago`);
        return;
      }
      
      interval = secondsAgo / 2592000; // seconds in a month
      if (interval > 1) {
        setTimeAgo(`${Math.floor(interval)}mo ago`);
        return;
      }
      
      interval = secondsAgo / 86400; // seconds in a day
      if (interval > 1) {
        setTimeAgo(`${Math.floor(interval)}d ago`);
        return;
      }
      
      interval = secondsAgo / 3600; // seconds in an hour
      if (interval > 1) {
        setTimeAgo(`${Math.floor(interval)}h ago`);
        return;
      }
      
      interval = secondsAgo / 60; // seconds in a minute
      if (interval > 1) {
        setTimeAgo(`${Math.floor(interval)}m ago`);
        return;
      }
      
      setTimeAgo(`${Math.floor(secondsAgo)}s ago`);
    };
    
    updateTimeAgo();
    
    const timer = setInterval(updateTimeAgo, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [date]);
  
  return timeAgo;
}
