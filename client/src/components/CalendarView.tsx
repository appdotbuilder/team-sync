import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Team, CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../../../server/src/schema';

interface CalendarViewProps {
  team: Team;
  currentUserId: number;
}

export function CalendarView({ team, currentUserId }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [createEventFormData, setCreateEventFormData] = useState<CreateCalendarEventInput>({
    team_id: team.id,
    title: '',
    description: null,
    start_time: new Date(),
    end_time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    is_all_day: false,
    location: null
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      // Calculate date range for current view
      const startDate = new Date(currentDate);
      startDate.setDate(1);
      startDate.setMonth(currentDate.getMonth() - 1);
      
      const endDate = new Date(currentDate);
      endDate.setDate(1);
      endDate.setMonth(currentDate.getMonth() + 2);
      
      const result = await trpc.getTeamCalendarEvents.query({
        team_id: team.id,
        start_date: startDate,
        end_date: endDate
      });
      setEvents(result);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [team.id, currentDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventFormData.title.trim()) return;

    try {
      setIsLoading(true);
      const newEvent = await trpc.createCalendarEvent.mutate(createEventFormData);
      setEvents((prev: CalendarEvent[]) => [...prev, newEvent]);
      setCreateEventFormData({
        team_id: team.id,
        title: '',
        description: null,
        start_time: new Date(),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        is_all_day: false,
        location: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const getDateRangeLabel = () => {
    switch (view) {
      case 'month':
        return currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
      case 'day':
        return currentDate.toLocaleDateString([], { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return events.filter((event: CalendarEvent) => {
      const eventDate = event.start_time.toDateString();
      return eventDate === dateStr;
    });
  };

  const getTodayEvents = () => {
    const today = new Date();
    return getEventsForDate(today).sort((a, b) => 
      a.start_time.getTime() - b.start_time.getTime()
    );
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    
    return events
      .filter((event: CalendarEvent) => 
        event.start_time > now && event.start_time <= weekFromNow
      )
      .sort((a, b) => a.start_time.getTime() - b.start_time.getTime())
      .slice(0, 5);
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = getEventsForDate(currentDateObj);
      const isCurrentMonth = currentDateObj.getMonth() === currentDate.getMonth();
      const isToday = currentDateObj.toDateString() === new Date().toDateString();
      
      days.push(
        <div
          key={currentDateObj.toISOString()}
          className={`min-h-32 p-2 border border-gray-200 ${
            isCurrentMonth ? 'bg-white' : 'bg-gray-50'
          } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          } ${isToday ? 'text-blue-600' : ''}`}>
            {currentDateObj.getDate()}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
              <div
                key={event.id}
                className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
                onClick={() => setSelectedEvent(event)}
              >
                {event.is_all_day ? event.title : `${formatTime(event.start_time)} ${event.title}`}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderEventCard = (event: CalendarEvent) => (
    <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEvent(event)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{event.title}</h4>
            {event.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {event.is_all_day ? (
                  'All day'
                ) : (
                  `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
                )}
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
              )}
            </div>
          </div>
          {event.is_all_day && (
            <Badge variant="outline" className="ml-2">
              All Day
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar - {team.name}</h2>
          <p className="text-gray-600">Manage team events and schedule collaboration</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleCreateEvent}>
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
                <DialogDescription>
                  Create a new event for your team calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    value={createEventFormData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateEventFormData((prev: CreateCalendarEventInput) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter event title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="event-description">Description (optional)</Label>
                  <Textarea
                    id="event-description"
                    value={createEventFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateEventFormData((prev: CreateCalendarEventInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Describe the event"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={createEventFormData.is_all_day}
                    onCheckedChange={(checked) =>
                      setCreateEventFormData((prev: CreateCalendarEventInput) => ({ ...prev, is_all_day: checked }))
                    }
                  />
                  <Label htmlFor="all-day">All day event</Label>
                </div>
                {!createEventFormData.is_all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={createEventFormData.start_time.toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateEventFormData((prev: CreateCalendarEventInput) => ({
                            ...prev,
                            start_time: new Date(e.target.value)
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={createEventFormData.end_time.toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateEventFormData((prev: CreateCalendarEventInput) => ({
                            ...prev,
                            end_time: new Date(e.target.value)
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                )}
                {createEventFormData.is_all_day && (
                  <div className="grid gap-2">
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={createEventFormData.start_time.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const date = new Date(e.target.value);
                        setCreateEventFormData((prev: CreateCalendarEventInput) => ({
                          ...prev,
                          start_time: date,
                          end_time: date
                        }));
                      }}
                      required
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="event-location">Location (optional)</Label>
                  <Input
                    id="event-location"
                    value={createEventFormData.location || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateEventFormData((prev: CreateCalendarEventInput) => ({
                        ...prev,
                        location: e.target.value || null
                      }))
                    }
                    placeholder="Enter location"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !createEventFormData.title.trim()}>
                  {isLoading ? 'Creating...' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar Navigation & View */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold min-w-64 text-center">{getDateRangeLabel()}</h3>
                    <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Today
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={view === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={view === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('day')}
                  >
                    Day
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {view === 'month' && renderMonthView()}
              {view === 'week' && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Week view coming soon!</p>
                </div>
              )}
              {view === 'day' && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Day view coming soon!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              {getTodayEvents().length === 0 ? (
                <div className="text-center text-gray-500">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No events today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getTodayEvents().map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-600">
                        {event.is_all_day ? 'All day' : formatTime(event.start_time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {getUpcomingEvents().length === 0 ? (
                <div className="text-center text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getUpcomingEvents().map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-gray-600">
                        {formatDate(event.start_time)}
                        {!event.is_all_day && ` at ${formatTime(event.start_time)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={true} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              {selectedEvent.description && (
                <DialogDescription>{selectedEvent.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {selectedEvent.is_all_day ? (
                  `All day on ${formatDate(selectedEvent.start_time)}`
                ) : (
                  `${formatDate(selectedEvent.start_time)} ${formatTime(selectedEvent.start_time)} - ${formatTime(selectedEvent.end_time)}`
                )}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {selectedEvent.location}
                </div>
              )}
              <div className="text-xs text-gray-500">
                Created {selectedEvent.created_at.toLocaleDateString()}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {events.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No Events Yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first event to start planning with your team!
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}