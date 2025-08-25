import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, UserPlus, Check, Clock, X } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Team, CreateTeamInput } from '../../../server/src/schema';

interface TeamManagementProps {
  teams: Team[];
  onTeamCreated: (team: Team) => void;
  onTeamSelected: (team: Team) => void;
  selectedTeam: Team | null;
  currentUserId: number;
}

export function TeamManagement({ teams, onTeamCreated, onTeamSelected, selectedTeam, currentUserId }: TeamManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [joinTeamId, setJoinTeamId] = useState('');
  
  const [createFormData, setCreateFormData] = useState<CreateTeamInput>({
    name: '',
    description: null
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name.trim()) return;

    try {
      setIsLoading(true);
      const newTeam = await trpc.createTeam.mutate(createFormData);
      onTeamCreated(newTeam);
      setCreateFormData({ name: '', description: null });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamId = parseInt(joinTeamId);
    if (!teamId) return;

    try {
      setIsLoading(true);
      await trpc.requestTeamMembership.mutate({ team_id: teamId });
      setJoinTeamId('');
      setIsJoinDialogOpen(false);
      // Show success message - in real app you'd show a toast
      alert('Membership request sent! You\'ll be notified when approved.');
    } catch (error) {
      console.error('Failed to request team membership:', error);
      alert('Failed to send membership request. Please check the team ID.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Teams</h2>
          <p className="text-gray-600">Create new teams or join existing ones</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateTeam}>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a team to collaborate with others on tasks, shopping, and events.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      value={createFormData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateTeamInput) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter team name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="team-description">Description (optional)</Label>
                    <Textarea
                      id="team-description"
                      value={createFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateFormData((prev: CreateTeamInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      placeholder="Describe your team's purpose"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || !createFormData.name.trim()}>
                    {isLoading ? 'Creating...' : 'Create Team'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Join Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleJoinTeam}>
                <DialogHeader>
                  <DialogTitle>Join Existing Team</DialogTitle>
                  <DialogDescription>
                    Enter the team ID to request membership. An existing team member will need to approve your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-id">Team ID</Label>
                    <Input
                      id="team-id"
                      type="number"
                      value={joinTeamId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setJoinTeamId(e.target.value)
                      }
                      placeholder="Enter team ID (e.g., 123)"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || !joinTeamId}>
                    {isLoading ? 'Sending Request...' : 'Request to Join'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first team to start collaborating with others!
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team: Team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTeam?.id === team.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onTeamSelected(team)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <Badge variant="outline">ID: {team.id}</Badge>
                </div>
                {team.description && (
                  <CardDescription className="text-sm">
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created {team.created_at.toLocaleDateString()}</span>
                  {selectedTeam?.id === team.id && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Demo Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
            </div>
            <div>
              <h4 className="font-medium text-amber-800">Demo Mode</h4>
              <p className="text-sm text-amber-700 mt-1">
                This is a demonstration version. Backend handlers are currently placeholders, 
                so created teams may not persist between sessions. In the full version, all data 
                would be stored in a database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}