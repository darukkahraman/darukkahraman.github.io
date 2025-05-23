import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DeleteLastFivePostsProps {
  onSuccess?: () => void;
}

const DeleteLastFivePosts = ({ onSuccess }: DeleteLastFivePostsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteLastFiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/posts/user/last-five');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Başarılı',
        description: `${data.deletedCount} post silindi.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      if (onSuccess) onSuccess();
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: 'Postlar silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Son 5 postu sil
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Son 5 postu sil</AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem son 5 postunuzu (alıntılar dahil) silecek. Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteLastFiveMutation.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteLastFiveMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteLastFivePosts;