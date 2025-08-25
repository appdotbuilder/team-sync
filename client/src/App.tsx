import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, CheckSquare, ShoppingCart, Calendar, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import components
import { TeamManagement } from '@/components/TeamManagement';
import { TodoLists } from '@/components/TodoLists';
import { ShoppingLists } from '@/components/ShoppingLists';
import { CalendarView } from '@/components/CalendarView';
import { AdminPanel } from '@/components/AdminPanel';

// Import types
import type { Team } from '../../server/src/schema';

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock current user - in a real app this would come from auth context
  const currentUser = {
    id: 1,
    name: 'Demo User',
    email: 'demo@example.com',
    tier: 'free' as 'free' | 'paid',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    isAdmin: true // Set to true to show admin features
  };

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUserTeams.query();
      setTeams(result);
      // Auto-select first team if available
      if (result.length > 0 && !selectedTeam) {
        setSelectedTeam(result[0]);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleTeamCreated = (newTeam: Team) => {
    setTeams((prev: Team[]) => [...prev, newTeam]);
    setSelectedTeam(newTeam);
    setActiveTab('todos');
  };

  const handleTeamSelected = (team: Team) => {
    setSelectedTeam(team);
    setActiveTab('todos');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">TeamSync</h1>
            </div>
            <div className="flex items-center space-x-4">
              {selectedTeam && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {selectedTeam.name}
                </Badge>
              )}
              <div className="text-sm text-gray-600">
                {currentUser.name} 
                <Badge variant={currentUser.tier === 'paid' ? 'default' : 'outline'} className="ml-2">
                  {currentUser.tier}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Message for Empty State */}
        {teams.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TeamSync! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first team or joining an existing one.
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="todos" disabled={!selectedTeam} className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" disabled={!selectedTeam} className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" disabled={!selectedTeam} className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            {currentUser.isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="teams" className="space-y-6">
            <TeamManagement
              teams={teams}
              onTeamCreated={handleTeamCreated}
              onTeamSelected={handleTeamSelected}
              selectedTeam={selectedTeam}
              currentUserId={currentUser.id}
            />
          </TabsContent>

          <TabsContent value="todos" className="space-y-6">
            {selectedTeam ? (
              <TodoLists
                team={selectedTeam}
                currentUserId={currentUser.id}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Select a team to view todo lists</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="shopping" className="space-y-6">
            {selectedTeam ? (
              <ShoppingLists
                team={selectedTeam}
                currentUserId={currentUser.id}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Select a team to view shopping lists</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {selectedTeam ? (
              <CalendarView
                team={selectedTeam}
                currentUserId={currentUser.id}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Select a team to view calendar</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {currentUser.isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;