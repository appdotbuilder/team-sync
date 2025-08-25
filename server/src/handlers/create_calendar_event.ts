import { db } from '../db';
import { calendarEventsTable, teamsTable } from '../db/schema';
import { type CreateCalendarEventInput, type CalendarEvent } from '../schema';
import { eq } from 'drizzle-orm';

export const createCalendarEvent = async (input: CreateCalendarEventInput, userId: number): Promise<CalendarEvent> => {
  try {
    // Verify that the team exists first to prevent foreign key constraint violations
    const team = await db.select()
      .from(teamsTable)
      .where(eq(teamsTable.id, input.team_id))
      .execute();

    if (team.length === 0) {
      throw new Error(`Team with id ${input.team_id} not found`);
    }

    // Insert calendar event record
    const result = await db.insert(calendarEventsTable)
      .values({
        team_id: input.team_id,
        title: input.title,
        description: input.description || null,
        start_time: input.start_time,
        end_time: input.end_time,
        is_all_day: input.is_all_day,
        location: input.location || null,
        created_by: userId
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    throw error;
  }
};