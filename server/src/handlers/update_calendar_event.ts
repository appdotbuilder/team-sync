import { db } from '../db';
import { calendarEventsTable } from '../db/schema';
import { type UpdateCalendarEventInput, type CalendarEvent } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCalendarEvent = async (input: UpdateCalendarEventInput): Promise<CalendarEvent> => {
  try {
    // Build update object only with provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time;
    }
    
    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time;
    }
    
    if (input.is_all_day !== undefined) {
      updateData.is_all_day = input.is_all_day;
    }
    
    if (input.location !== undefined) {
      updateData.location = input.location;
    }

    // Update the calendar event
    const result = await db.update(calendarEventsTable)
      .set(updateData)
      .where(eq(calendarEventsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Calendar event with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Calendar event update failed:', error);
    throw error;
  }
};