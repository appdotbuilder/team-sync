import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckSquare, Clock, User, AlertTriangle, Circle, Minus, Square } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Team, TodoList, Task, CreateTodoListInput, CreateTaskInput, UpdateTaskInput } from '../../../server/src/schema';

interface TodoListsProps {
  team: Team;
  currentUserId: number;
}

export function TodoLists({ team, currentUserId }: TodoListsProps) {
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [selectedList, setSelectedList] = useState<TodoList | null>(null);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [createListFormData, setCreateListFormData] = useState<CreateTodoListInput>({
    team_id: team.id,
    name: '',
    description: null
  });

  const [createTaskFormData, setCreateTaskFormData] = useState<CreateTaskInput>({
    todo_list_id: 0,
    title: '',
    description: null,
    priority: null,
    assigned_to: null,
    due_date: null
  });

  const loadTodoLists = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTeamTodoLists.query({ team_id: team.id });
      setTodoLists(result);
      // Auto-select first list if available
      if (result.length > 0 && !selectedList) {
        setSelectedList(result[0]);
      }
    } catch (error) {
      console.error('Failed to load todo lists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [team.id, selectedList]);

  const loadTasks = useCallback(async (todoListId: number) => {
    try {
      const result = await trpc.getTodoListTasks.query({ todo_list_id: todoListId });
      setTasks((prev: Record<number, Task[]>) => ({ ...prev, [todoListId]: result }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTodoLists();
  }, [loadTodoLists]);

  useEffect(() => {
    if (selectedList) {
      loadTasks(selectedList.id);
    }
  }, [selectedList, loadTasks]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createListFormData.name.trim()) return;

    try {
      setIsLoading(true);
      const newList = await trpc.createTodoList.mutate(createListFormData);
      setTodoLists((prev: TodoList[]) => [...prev, newList]);
      setSelectedList(newList);
      setCreateListFormData({
        team_id: team.id,
        name: '',
        description: null
      });
      setIsCreateListDialogOpen(false);
    } catch (error) {
      console.error('Failed to create todo list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskFormData.title.trim() || !selectedList) return;

    const taskData = {
      ...createTaskFormData,
      todo_list_id: selectedList.id
    };

    try {
      setIsLoading(true);
      const newTask = await trpc.createTask.mutate(taskData);
      setTasks((prev: Record<number, Task[]>) => ({
        ...prev,
        [selectedList.id]: [...(prev[selectedList.id] || []), newTask]
      }));
      setCreateTaskFormData({
        todo_list_id: 0,
        title: '',
        description: null,
        priority: null,
        assigned_to: null,
        due_date: null
      });
      setIsCreateTaskDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskStatusChange = async (task: Task, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      const updateData: UpdateTaskInput = {
        id: task.id,
        status: newStatus
      };
      
      const updatedTask = await trpc.updateTask.mutate(updateData);
      
      if (selectedList) {
        setTasks((prev: Record<number, Task[]>) => ({
          ...prev,
          [selectedList.id]: (prev[selectedList.id] || []).map((t: Task) =>
            t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date() : null } : t
          )
        }));
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case 'P0': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'P1': return <Circle className="h-4 w-4 text-orange-500" />;
      case 'P2': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'P3': return <Square className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'P0': return 'border-l-red-500 bg-red-50';
      case 'P1': return 'border-l-orange-500 bg-orange-50';
      case 'P2': return 'border-l-yellow-500 bg-yellow-50';
      case 'P3': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-200 bg-white';
    }
  };

  const currentTasks = selectedList ? (tasks[selectedList.id] || []) : [];
  const todoTasks = currentTasks.filter((task: Task) => task.status === 'todo');
  const inProgressTasks = currentTasks.filter((task: Task) => task.status === 'in_progress');
  const completedTasks = currentTasks.filter((task: Task) => task.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Todo Lists - {team.name}</h2>
          <p className="text-gray-600">Manage shared tasks and collaborate with your team</p>
        </div>
        <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateList}>
              <DialogHeader>
                <DialogTitle>Create Todo List</DialogTitle>
                <DialogDescription>
                  Create a new shared todo list for your team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="list-name">List Name</Label>
                  <Input
                    id="list-name"
                    value={createListFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateListFormData((prev: CreateTodoListInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter list name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="list-description">Description (optional)</Label>
                  <Textarea
                    id="list-description"
                    value={createListFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateListFormData((prev: CreateTodoListInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Describe the purpose of this list"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateListDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !createListFormData.name.trim()}>
                  {isLoading ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Todo Lists Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lists</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {todoLists.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <CheckSquare className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-sm">No lists yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {todoLists.map((list: TodoList) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedList(list)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                        selectedList?.id === list.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{list.name}</div>
                      {list.description && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{list.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {currentTasks.length} tasks
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks View */}
        <div className="lg:col-span-3">
          {selectedList ? (
            <div className="space-y-6">
              {/* List Header */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedList.name}</h3>
                  {selectedList.description && (
                    <p className="text-gray-600 text-sm mt-1">{selectedList.description}</p>
                  )}
                </div>
                <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateTask}>
                      <DialogHeader>
                        <DialogTitle>Create Task</DialogTitle>
                        <DialogDescription>
                          Add a new task to {selectedList.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="task-title">Title</Label>
                          <Input
                            id="task-title"
                            value={createTaskFormData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateTaskFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                            }
                            placeholder="Enter task title"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="task-description">Description (optional)</Label>
                          <Textarea
                            id="task-description"
                            value={createTaskFormData.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setCreateTaskFormData((prev: CreateTaskInput) => ({
                                ...prev,
                                description: e.target.value || null
                              }))
                            }
                            placeholder="Describe the task"
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="task-priority">Priority</Label>
                          <Select
                            value={createTaskFormData.priority || ''}
                            onValueChange={(value) =>
                              setCreateTaskFormData((prev: CreateTaskInput) => ({
                                ...prev,
                                priority: value as 'P0' | 'P1' | 'P2' | 'P3' || null
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="P0">P0 - Critical</SelectItem>
                              <SelectItem value="P1">P1 - High</SelectItem>
                              <SelectItem value="P2">P2 - Medium</SelectItem>
                              <SelectItem value="P3">P3 - Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="task-due-date">Due Date (optional)</Label>
                          <Input
                            id="task-due-date"
                            type="date"
                            value={createTaskFormData.due_date?.toISOString().split('T')[0] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateTaskFormData((prev: CreateTaskInput) => ({
                                ...prev,
                                due_date: e.target.value ? new Date(e.target.value) : null
                              }))
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !createTaskFormData.title.trim()}>
                          {isLoading ? 'Creating...' : 'Create Task'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Task Columns */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Todo Column */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Circle className="h-4 w-4 text-gray-400" />
                    <h4 className="font-medium">To Do</h4>
                    <Badge variant="secondary">{todoTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {todoTasks.map((task: Task) => (
                      <Card key={task.id} className={`border-l-4 ${getPriorityColor(task.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getPriorityIcon(task.priority)}
                                <h5 className="font-medium text-sm">{task.title}</h5>
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {task.due_date.toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task, 'in_progress')}
                              className="text-xs"
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task, 'completed')}
                              className="text-xs"
                            >
                              Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium">In Progress</h4>
                    <Badge variant="secondary">{inProgressTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {inProgressTasks.map((task: Task) => (
                      <Card key={task.id} className={`border-l-4 ${getPriorityColor(task.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getPriorityIcon(task.priority)}
                                <h5 className="font-medium text-sm">{task.title}</h5>
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {task.due_date.toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task, 'todo')}
                              className="text-xs"
                            >
                              Back to Todo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTaskStatusChange(task, 'completed')}
                              className="text-xs"
                            >
                              Complete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Completed Column */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium">Completed</h4>
                    <Badge variant="secondary">{completedTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {completedTasks.map((task: Task) => (
                      <Card key={task.id} className="border-l-4 border-l-green-500 bg-green-50 opacity-75">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckSquare className="h-4 w-4 text-green-500" />
                                <h5 className="font-medium text-sm line-through">{task.title}</h5>
                              </div>
                              {task.completed_at && (
                                <div className="text-xs text-green-600">
                                  Completed {task.completed_at.toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskStatusChange(task, 'todo')}
                            className="text-xs mt-3"
                          >
                            Reopen
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No List Selected</h3>
                <p className="text-gray-600 text-center">
                  {todoLists.length === 0 
                    ? 'Create your first todo list to get started!'
                    : 'Select a list from the sidebar to view and manage tasks'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}