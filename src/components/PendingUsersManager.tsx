
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { UserCheck, UserX, Clock, Mail, User } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  requested_role: string;
  status: string;
  created_at: string;
  assigned_to_user_id: string | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

const PendingUsersManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch pending users
  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PendingUser[];
    },
  });

  // Fetch existing users for assignment
  const { data: existingUsers } = useQuery({
    queryKey: ['existingUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(email, full_name)
        `)
        .eq('role', 'user');
      
      if (error) throw error;
      return data.map(item => ({
        id: item.user_id,
        email: item.profiles.email,
        full_name: item.profiles.full_name
      })) as User[];
    },
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async ({ pendingUserId, assignToUserId }: { pendingUserId: string; assignToUserId?: string }) => {
      // Get pending user details
      const { data: pendingUser, error: fetchError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('id', pendingUserId)
        .single();

      if (fetchError) throw fetchError;

      // Create the actual user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: pendingUser.email,
        password: pendingUser.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: pendingUser.full_name,
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: pendingUser.email,
          full_name: pendingUser.full_name,
          role: pendingUser.requested_role,
        });

      if (profileError) throw profileError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: pendingUser.requested_role,
        });

      if (roleError) throw roleError;

      // If it's a client and assigned to a user, create the client record
      if (pendingUser.requested_role === 'client' && assignToUserId) {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            name: pendingUser.full_name || pendingUser.email,
            email: pendingUser.email,
            user_id: assignToUserId,
            client_user_id: authData.user.id,
            status: 'active',
          });

        if (clientError) throw clientError;
      }

      // Update pending user status
      const { error: updateError } = await supabase
        .from('pending_users')
        .update({
          status: 'approved',
          approved_by_user_id: user?.id,
          assigned_to_user_id: assignToUserId,
        })
        .eq('id', pendingUserId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({
        title: "User Approved",
        description: "The user account has been created successfully.",
      });
      setSelectedUserId('');
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async (pendingUserId: string) => {
      const { error } = await supabase
        .from('pending_users')
        .update({
          status: 'rejected',
          approved_by_user_id: user?.id,
        })
        .eq('id', pendingUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast({
        title: "User Rejected",
        description: "The user request has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center">Loading pending users...</div>;
  }

  const pendingRequests = pendingUsers?.filter(u => u.status === 'pending') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending User Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No pending user requests</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((pendingUser) => (
              <div key={pendingUser.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{pendingUser.full_name || 'No name provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {pendingUser.email}
                    </div>
                    <Badge variant={pendingUser.requested_role === 'client' ? 'secondary' : 'default'}>
                      {pendingUser.requested_role}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(pendingUser.created_at).toLocaleDateString()}
                  </div>
                </div>

                {pendingUser.requested_role === 'client' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign to User:</label>
                    <Select 
                      value={selectedUserId} 
                      onValueChange={setSelectedUserId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to manage this client" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingUsers?.map((existingUser) => (
                          <SelectItem key={existingUser.id} value={existingUser.id}>
                            {existingUser.full_name || existingUser.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (pendingUser.requested_role === 'client' && !selectedUserId) {
                        toast({
                          title: "Assignment Required",
                          description: "Please select a user to assign this client to.",
                          variant: "destructive",
                        });
                        return;
                      }
                      approveMutation.mutate({
                        pendingUserId: pendingUser.id,
                        assignToUserId: pendingUser.requested_role === 'client' ? selectedUserId : undefined,
                      });
                    }}
                    disabled={approveMutation.isPending}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(pendingUser.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingUsersManager;
