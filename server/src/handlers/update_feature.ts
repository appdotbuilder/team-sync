import { db } from '../db';
import { featuresTable } from '../db/schema';
import { type UpdateFeatureInput, type Feature } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFeature = async (input: UpdateFeatureInput): Promise<Feature> => {
  try {
    // First, check if the feature exists
    const existingFeature = await db.select()
      .from(featuresTable)
      .where(eq(featuresTable.id, input.id))
      .execute();

    if (existingFeature.length === 0) {
      throw new Error(`Feature with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof featuresTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.is_enabled_free !== undefined) {
      updateData.is_enabled_free = input.is_enabled_free;
    }

    if (input.is_enabled_paid !== undefined) {
      updateData.is_enabled_paid = input.is_enabled_paid;
    }

    // Update the feature record
    const result = await db.update(featuresTable)
      .set(updateData)
      .where(eq(featuresTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Feature update failed:', error);
    throw error;
  }
};