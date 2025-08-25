import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { calendarEventsTable, usersTable, teamsTable } from '../db/schema';
import { type CreateCalendarEventInput } from '../schema';
import { createCalendarEvent } from '../handlers/create_calendar_event';
import { eq } from 'drizzle-orm';

describe('createCalendarEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTeamId: number;

  beforeEach(async () => {
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
  });

  it('should create a calendar event', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Team Meeting',
      description: 'Weekly team sync meeting',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T11:00:00Z'),
      is_all_day: false,
      location: 'Conference Room A'
    };

    const result = await createCalendarEvent(testInput, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Team Meeting');
    expect(result.description).toEqual('Weekly team sync meeting');
    expect(result.team_id).toEqual(testTeamId);
    expect(result.start_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-15T11:00:00Z'));
    expect(result.is_all_day).toEqual(false);
    expect(result.location).toEqual('Conference Room A');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save calendar event to database', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Project Review',
      description: 'Monthly project status review',
      start_time: new Date('2024-02-01T14:00:00Z'),
      end_time: new Date('2024-02-01T15:30:00Z'),
      is_all_day: false,
      location: 'Room B'
    };

    const result = await createCalendarEvent(testInput, testUserId);

    // Query using proper drizzle syntax
    const events = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Project Review');
    expect(events[0].description).toEqual('Monthly project status review');
    expect(events[0].team_id).toEqual(testTeamId);
    expect(events[0].start_time).toEqual(new Date('2024-02-01T14:00:00Z'));
    expect(events[0].end_time).toEqual(new Date('2024-02-01T15:30:00Z'));
    expect(events[0].is_all_day).toEqual(false);
    expect(events[0].location).toEqual('Room B');
    expect(events[0].created_by).toEqual(testUserId);
    expect(events[0].created_at).toBeInstanceOf(Date);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create all-day event', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Company Holiday',
      description: 'National Holiday',
      start_time: new Date('2024-07-04T00:00:00Z'),
      end_time: new Date('2024-07-04T23:59:59Z'),
      is_all_day: true,
      location: null
    };

    const result = await createCalendarEvent(testInput, testUserId);

    expect(result.title).toEqual('Company Holiday');
    expect(result.description).toEqual('National Holiday');
    expect(result.is_all_day).toEqual(true);
    expect(result.location).toBeNull();
    expect(result.team_id).toEqual(testTeamId);
    expect(result.created_by).toEqual(testUserId);
  });

  it('should handle optional fields with defaults', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Quick Meeting',
      start_time: new Date('2024-01-20T09:00:00Z'),
      end_time: new Date('2024-01-20T09:30:00Z'),
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput, testUserId);

    expect(result.title).toEqual('Quick Meeting');
    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
    expect(result.is_all_day).toEqual(false);
    expect(result.team_id).toEqual(testTeamId);
    expect(result.created_by).toEqual(testUserId);
  });

  it('should handle events spanning multiple days', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Conference',
      description: 'Annual tech conference',
      start_time: new Date('2024-03-01T09:00:00Z'),
      end_time: new Date('2024-03-03T17:00:00Z'),
      is_all_day: false,
      location: 'Convention Center'
    };

    const result = await createCalendarEvent(testInput, testUserId);

    expect(result.title).toEqual('Conference');
    expect(result.start_time).toEqual(new Date('2024-03-01T09:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-03-03T17:00:00Z'));
    expect(result.location).toEqual('Convention Center');
    
    // Verify the event spans multiple days
    const daysDiff = (result.end_time.getTime() - result.start_time.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThan(1);
  });

  it('should throw error when team does not exist', async () => {
    const nonExistentTeamId = 99999;
    const testInput: CreateCalendarEventInput = {
      team_id: nonExistentTeamId,
      title: 'Invalid Event',
      start_time: new Date('2024-01-15T10:00:00Z'),
      end_time: new Date('2024-01-15T11:00:00Z'),
      is_all_day: false
    };

    await expect(createCalendarEvent(testInput, testUserId)).rejects.toThrow(/Team with id 99999 not found/i);
  });

  it('should create event with minimal required fields', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Minimal Event',
      start_time: new Date('2024-01-10T15:00:00Z'),
      end_time: new Date('2024-01-10T16:00:00Z'),
      is_all_day: false
    };

    const result = await createCalendarEvent(testInput, testUserId);

    expect(result.title).toEqual('Minimal Event');
    expect(result.team_id).toEqual(testTeamId);
    expect(result.start_time).toEqual(new Date('2024-01-10T15:00:00Z'));
    expect(result.end_time).toEqual(new Date('2024-01-10T16:00:00Z'));
    expect(result.is_all_day).toEqual(false);
    expect(result.created_by).toEqual(testUserId);
    expect(result.description).toBeNull();
    expect(result.location).toBeNull();
  });

  it('should handle events with empty string description and location', async () => {
    const testInput: CreateCalendarEventInput = {
      team_id: testTeamId,
      title: 'Event with Empty Strings',
      description: '',
      start_time: new Date('2024-01-12T12:00:00Z'),
      end_time: new Date('2024-01-12T13:00:00Z'),
      is_all_day: false,
      location: ''
    };

    const result = await createCalendarEvent(testInput, testUserId);

    expect(result.title).toEqual('Event with Empty Strings');
    expect(result.description).toBeNull(); // Empty string converted to null
    expect(result.location).toBeNull(); // Empty string converted to null
  });
});