import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users, Settings, Edit3, Trash2, Crown, Shield } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Feature, CreateUserInput, UpdateUserInput, UpdateFeatureInput } from '../../../server/src/schema';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [createUserFormData, setCreateUserFormData] = useState<CreateUserInput>({
    email: '',
    name: '',
    tier: 'free',
    status: 'active'
  });

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      const result = await trpc.getFeatures.query();
      setFeatures(result);
    } catch (error) {
      console.error('Failed to load features:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadFeatures();
  }, [loadUsers, loadFeatures]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserFormData.email.trim() || !createUserFormData.name.trim()) return;

    try {
      setIsLoading(true);
      const newUser = await trpc.createUser.mutate(createUserFormData);
      setUsers((prev: User[]) => [...prev, newUser]);
      setCreateUserFormData({
        email: '',
        name: '',
        tier: 'free',
        status: 'active'
      });
      setIsCreateUserDialogOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserTier = async (userId: number, newTier: 'free' | 'paid') => {
    try {
      const updateData: UpdateUserInput = { id: userId, tier: newTier };
      const updatedUser = await trpc.updateUser.mutate(updateData);
      setUsers((prev: User[]) => 
        prev.map((user: User) => user.id === userId ? { ...user, tier: newTier } : user)
      );
    } catch (error) {
      console.error('Failed to update user tier:', error);
    }
  };

  const handleUpdateUserStatus = async (userId: number, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const updateData: UpdateUserInput = { id: userId, status: newStatus };
      const updatedUser = await trpc.updateUser.mutate(updateData);
      setUsers((prev: User[]) => 
        prev.map((user: User) => user.id === userId ? { ...user, status: newStatus } : user)
      );
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleUpdateFeature = async (featureId: number, field: 'is_enabled_free' | 'is_enabled_paid', value: boolean) => {
    try {
      const updateData: UpdateFeatureInput = { id: featureId, [field]: value };
      await trpc.updateFeature.mutate(updateData);
      setFeatures((prev: Feature[]) => 
        prev.map((feature: Feature) => 
          feature.id === featureId ? { ...feature, [field]: value } : feature
        )
      );
    } catch (error) {
      console.error('Failed to update feature:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const getTierIcon = (tier: string) => {
    return tier === 'paid' ? <Crown className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-gray-500" />;
  };

  const freeUsers = users.filter(user => user.tier === 'free');
  const paidUsers = users.filter(user => user.tier === 'paid');
  const activeUsers = users.filter(user => user.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          <p className="text-gray-600">Manage users, features, and system configuration</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Users</p>
                <p className="text-2xl font-bold text-gray-900">{paidUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Features</p>
                <p className="text-2xl font-bold text-gray-900">{features.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Feature Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Management */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Users</h3>
              <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
            </div>
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account. Users cannot self-register in this MVP.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="user-email">Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={createUserFormData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateUserFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-name">Name</Label>
                      <Input
                        id="user-name"
                        value={createUserFormData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateUserFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-tier">Tier</Label>
                      <Select
                        value={createUserFormData.tier}
                        onValueChange={(value: 'free' | 'paid') =>
                          setCreateUserFormData((prev: CreateUserInput) => ({ ...prev, tier: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-status">Status</Label>
                      <Select
                        value={createUserFormData.status}
                        onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                          setCreateUserFormData((prev: CreateUserInput) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading || !createUserFormData.email.trim() || !createUserFormData.name.trim()}>
                      {isLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>No users found. Create the first user to get started.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTierIcon(user.tier)}
                          <Select
                            value={user.tier}
                            onValueChange={(value: 'free' | 'paid') => handleUpdateUserTier(user.id, value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.status}
                          onValueChange={(value: 'active' | 'inactive' | 'suspended') => handleUpdateUserStatus(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(user.status) as any}>
                          {user.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {/* Feature Configuration */}
          <div>
            <h3 className="text-lg font-semibold">Feature Configuration</h3>
            <p className="text-sm text-gray-600">Control feature availability per subscription tier</p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Free Tier</TableHead>
                  <TableHead>Paid Tier</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      <Settings className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>No features configured yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  features.map((feature: Feature) => (
                    <TableRow key={feature.id}>
                      <TableCell className="font-medium">{feature.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {feature.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={feature.is_enabled_free}
                          onCheckedChange={(checked) => handleUpdateFeature(feature.id, 'is_enabled_free', checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={feature.is_enabled_paid}
                          onCheckedChange={(checked) => handleUpdateFeature(feature.id, 'is_enabled_paid', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {feature.updated_at.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Demo Notice for Features */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Settings className="h-5 w-5 text-amber-600 mt-0.5" />
                </div>
                <div>
                  <h4 className="font-medium text-amber-800">Feature Configuration Demo</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    In the full version, features would include items like:
                    <br />
                    • Google Calendar Sync (Paid only)
                    • Advanced Team Collaboration (Paid only)
                    • Real-time Updates (Both tiers)
                    • Unlimited Storage (Paid only)
                    <br />
                    <br />
                    Features would be dynamically loaded from the database and enforced throughout the application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}