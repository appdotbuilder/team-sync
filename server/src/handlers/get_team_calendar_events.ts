import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { type GetTeamCalendarEventsInput, type CalendarEvent } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export const getTeamCalendarEvents = async (input: GetTeamCalendarEventsInput): Promise<CalendarEvent[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(calendarEventsTable.team_id, input.team_id)
    ];

    // Add optional date range filtering
    if (input.start_date) {
      conditions.push(gte(calendarEventsTable.start_time, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(calendarEventsTable.end_time, input.end_date));
    }

    // Build and execute query in one go
    const results = await db.select()
      .from(calendarEventsTable)
      .where(and(...conditions))
      .orderBy(desc(calendarEventsTable.start_time))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch team calendar events:', error);
    throw error;
  }
};