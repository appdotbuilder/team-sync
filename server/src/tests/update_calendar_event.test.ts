import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, calendarEventsTable } from '../db/schema';
import { type UpdateCalendarEventInput } from '../schema';
import { updateCalendarEvent } from '../handlers/update_calendar_event';
import { eq } from 'drizzle-orm';

describe('updateCalendarEvent', () => {
  let testUserId: number;
  let testTeamId: number;
  let testEventId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test team
    const teamResult = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A team for testing',
        created_by: testUserId
      })
      .returning()
      .execute();
    testTeamId = teamResult[0].id;

    // Create test calendar event
    const eventResult = await db.insert(calendarEventsTable)
      .values({
        team_id: testTeamId,
        title: 'Original Event',
        description: 'Original description',
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        is_all_day: false,
        location: 'Original Location',
        created_by: testUserId
      })
      .returning()
      .execute();
    testEventId = eventResult[0].id;
  });

  afterEach(resetDB);

  it('should update calendar event title', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Updated Event Title'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.title).toEqual('Updated Event Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.location).toEqual('Original Location'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update calendar event description', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      description: 'Updated description with more details'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.title).toEqual('Original Event'); // Unchanged
    expect(result.description).toEqual('Updated description with more details');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update calendar event times', async () => {
    const newStartTime = new Date('2024-01-16T14:00:00Z');
    const newEndTime = new Date('2024-01-16T16:00:00Z');

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      start_time: newStartTime,
      end_time: newEndTime
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.is_all_day).toEqual(false); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update is_all_day flag', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      is_all_day: true
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.is_all_day).toEqual(true);
    expect(result.title).toEqual('Original Event'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update calendar event location', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      location: 'Conference Room B'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.location).toEqual('Conference Room B');
    expect(result.title).toEqual('Original Event'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields simultaneously', async () => {
    const newStartTime = new Date('2024-01-17T09:00:00Z');
    const newEndTime = new Date('2024-01-17T17:00:00Z');

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'All Day Workshop',
      description: 'Full day team building workshop',
      start_time: newStartTime,
      end_time: newEndTime,
      is_all_day: true,
      location: 'Retreat Center'
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.title).toEqual('All Day Workshop');
    expect(result.description).toEqual('Full day team building workshop');
    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.is_all_day).toEqual(true);
    expect(result.location).toEqual('Retreat Center');
    expect(result.team_id).toEqual(testTeamId); // Unchanged
    expect(result.created_by).toEqual(testUserId); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set nullable fields to null', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      description: null,
      location: null
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.title).toEqual('Original Event'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: testEventId,
      title: 'Database Persistence Test',
      location: 'Test Location'
    };

    await updateCalendarEvent(updateInput);

    // Verify changes persisted to database
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, testEventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Database Persistence Test');
    expect(events[0].location).toEqual('Test Location');
    expect(events[0].description).toEqual('Original description'); // Unchanged
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent calendar event', async () => {
    const updateInput: UpdateCalendarEventInput = {
      id: 99999,
      title: 'Non-existent Event'
    };

    await expect(updateCalendarEvent(updateInput)).rejects.toThrow(/Calendar event with id 99999 not found/i);
  });

  it('should update only the updated_at timestamp when no fields provided', async () => {
    const originalEvent = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, testEventId))
      .execute();

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCalendarEventInput = {
      id: testEventId
    };

    const result = await updateCalendarEvent(updateInput);

    expect(result.id).toEqual(testEventId);
    expect(result.title).toEqual(originalEvent[0].title);
    expect(result.description).toEqual(originalEvent[0].description);
    expect(result.location).toEqual(originalEvent[0].location);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalEvent[0].updated_at.getTime());
  });
});