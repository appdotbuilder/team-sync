import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teamsTable, calendarEventsTable } from '../db/schema';
import { type GetTeamCalendarEventsInput } from '../schema';
import { getTeamCalendarEvents } from '../handlers/get_team_calendar_events';
import { eq } from 'drizzle-orm';

describe('getTeamCalendarEvents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for team with no events', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toEqual([]);
  });

  it('should return all events for team without date filters', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test events with different dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const events = await db.insert(calendarEventsTable)
      .values([
        {
          team_id: team.id,
          title: 'Today Event',
          description: 'Event happening today',
          start_time: today,
          end_time: new Date(today.getTime() + 60 * 60 * 1000), // 1 hour later
          is_all_day: false,
          location: 'Office',
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Tomorrow Event',
          description: 'Event happening tomorrow',
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour later
          is_all_day: false,
          location: 'Conference Room',
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Yesterday Event',
          description: 'Event that happened yesterday',
          start_time: yesterday,
          end_time: new Date(yesterday.getTime() + 60 * 60 * 1000), // 1 hour later
          is_all_day: false,
          location: 'Remote',
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(3);
    
    // Results should be ordered by start_time descending (newest first)
    expect(result[0].title).toBe('Tomorrow Event');
    expect(result[1].title).toBe('Today Event');
    expect(result[2].title).toBe('Yesterday Event');

    // Verify all fields are properly returned
    expect(result[0].id).toBeDefined();
    expect(result[0].team_id).toBe(team.id);
    expect(result[0].description).toBe('Event happening tomorrow');
    expect(result[0].start_time).toBeInstanceOf(Date);
    expect(result[0].end_time).toBeInstanceOf(Date);
    expect(result[0].is_all_day).toBe(false);
    expect(result[0].location).toBe('Conference Room');
    expect(result[0].created_by).toBe(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter events by start_date', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(calendarEventsTable)
      .values([
        {
          team_id: team.id,
          title: 'Past Event',
          description: 'Event in the past',
          start_time: yesterday,
          end_time: new Date(yesterday.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Future Event',
          description: 'Event in the future',
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id,
      start_date: today // Only events starting from today
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Future Event');
  });

  it('should filter events by end_date', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    await db.insert(calendarEventsTable)
      .values([
        {
          team_id: team.id,
          title: 'Near Future Event',
          description: 'Event ending soon',
          start_time: today,
          end_time: tomorrow, // Ends tomorrow
          is_all_day: false,
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Far Future Event',
          description: 'Event ending later',
          start_time: tomorrow,
          end_time: dayAfter, // Ends day after tomorrow
          is_all_day: false,
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id,
      end_date: tomorrow // Only events ending by tomorrow
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Near Future Event');
  });

  it('should filter events by date range', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test events spanning different time periods
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    await db.insert(calendarEventsTable)
      .values([
        {
          team_id: team.id,
          title: 'Past Event',
          description: 'Event before range',
          start_time: yesterday,
          end_time: new Date(yesterday.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Current Event',
          description: 'Event within range',
          start_time: today,
          end_time: tomorrow,
          is_all_day: false,
          created_by: user.id
        },
        {
          team_id: team.id,
          title: 'Future Event',
          description: 'Event after range',
          start_time: dayAfter,
          end_time: new Date(dayAfter.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id,
      start_date: today,
      end_date: tomorrow
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Current Event');
  });

  it('should only return events for the specified team', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create two test teams
    const teams = await db.insert(teamsTable)
      .values([
        {
          name: 'Team A',
          description: 'First team',
          created_by: user.id
        },
        {
          name: 'Team B',
          description: 'Second team',
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const today = new Date();

    // Create events for both teams
    await db.insert(calendarEventsTable)
      .values([
        {
          team_id: teams[0].id,
          title: 'Team A Event',
          description: 'Event for team A',
          start_time: today,
          end_time: new Date(today.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        },
        {
          team_id: teams[1].id,
          title: 'Team B Event',
          description: 'Event for team B',
          start_time: today,
          end_time: new Date(today.getTime() + 60 * 60 * 1000),
          is_all_day: false,
          created_by: user.id
        }
      ])
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: teams[0].id
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Team A Event');
    expect(result[0].team_id).toBe(teams[0].id);
  });

  it('should handle all_day events correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    const today = new Date();

    // Create all-day event
    const [event] = await db.insert(calendarEventsTable)
      .values({
        team_id: team.id,
        title: 'All Day Event',
        description: 'An all-day event',
        start_time: today,
        end_time: today,
        is_all_day: true,
        location: null,
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetTeamCalendarEventsInput = {
      team_id: team.id
    };

    const result = await getTeamCalendarEvents(input);
    expect(result).toHaveLength(1);
    expect(result[0].is_all_day).toBe(true);
    expect(result[0].location).toBeNull();
  });

  it('should verify database persistence', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'Test User',
        tier: 'free',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test team
    const [team] = await db.insert(teamsTable)
      .values({
        name: 'Test Team',
        description: 'A test team',
        created_by: user.id
      })
      .returning()
      .execute();

    const today = new Date();

    // Create test event
    await db.insert(calendarEventsTable)
      .values({
        team_id: team.id,
        title: 'Test Event',
        description: 'A test event',
        start_time: today,
        end_time: new Date(today.getTime() + 60 * 60 * 1000),
        is_all_day: false,
        location: 'Test Location',
        created_by: user.id
      })
      .returning()
      .execute();

    // Fetch through handler
    const result = await getTeamCalendarEvents({ team_id: team.id });
    expect(result).toHaveLength(1);

    // Verify data was actually saved to database
    const dbEvents = await db.select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.team_id, team.id))
      .execute();

    expect(dbEvents).toHaveLength(1);
    expect(dbEvents[0].title).toBe('Test Event');
    expect(dbEvents[0].description).toBe('A test event');
    expect(dbEvents[0].location).toBe('Test Location');
    expect(dbEvents[0].is_all_day).toBe(false);
    expect(dbEvents[0].start_time).toBeInstanceOf(Date);
    expect(dbEvents[0].end_time).toBeInstanceOf(Date);
  });
});