import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { featuresTable } from '../db/schema';
import { type UpdateFeatureInput } from '../schema';
import { updateFeature } from '../handlers/update_feature';
import { eq } from 'drizzle-orm';

describe('updateFeature', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test feature
  const createTestFeature = async () => {
    const result = await db.insert(featuresTable)
      .values({
        name: 'Test Feature',
        description: 'A feature for testing',
        is_enabled_free: true,
        is_enabled_paid: true
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update feature availability for free tier only', async () => {
    const testFeature = await createTestFeature();

    const input: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_free: false
    };

    const result = await updateFeature(input);

    expect(result.id).toEqual(testFeature.id);
    expect(result.name).toEqual('Test Feature');
    expect(result.description).toEqual('A feature for testing');
    expect(result.is_enabled_free).toEqual(false);
    expect(result.is_enabled_paid).toEqual(true); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testFeature.updated_at).toBe(true);
  });

  it('should update feature availability for paid tier only', async () => {
    const testFeature = await createTestFeature();

    const input: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_paid: false
    };

    const result = await updateFeature(input);

    expect(result.id).toEqual(testFeature.id);
    expect(result.is_enabled_free).toEqual(true); // Should remain unchanged
    expect(result.is_enabled_paid).toEqual(false);
    expect(result.updated_at > testFeature.updated_at).toBe(true);
  });

  it('should update feature availability for both tiers', async () => {
    const testFeature = await createTestFeature();

    const input: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_free: false,
      is_enabled_paid: false
    };

    const result = await updateFeature(input);

    expect(result.id).toEqual(testFeature.id);
    expect(result.is_enabled_free).toEqual(false);
    expect(result.is_enabled_paid).toEqual(false);
    expect(result.updated_at > testFeature.updated_at).toBe(true);
  });

  it('should enable features for both tiers', async () => {
    // Create a feature with both tiers disabled
    const disabledFeature = await db.insert(featuresTable)
      .values({
        name: 'Disabled Feature',
        description: 'Initially disabled feature',
        is_enabled_free: false,
        is_enabled_paid: false
      })
      .returning()
      .execute();

    const input: UpdateFeatureInput = {
      id: disabledFeature[0].id,
      is_enabled_free: true,
      is_enabled_paid: true
    };

    const result = await updateFeature(input);

    expect(result.is_enabled_free).toEqual(true);
    expect(result.is_enabled_paid).toEqual(true);
  });

  it('should save changes to database', async () => {
    const testFeature = await createTestFeature();

    const input: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_free: false,
      is_enabled_paid: false
    };

    await updateFeature(input);

    // Verify changes were saved to database
    const features = await db.select()
      .from(featuresTable)
      .where(eq(featuresTable.id, testFeature.id))
      .execute();

    expect(features).toHaveLength(1);
    expect(features[0].is_enabled_free).toEqual(false);
    expect(features[0].is_enabled_paid).toEqual(false);
    expect(features[0].updated_at > testFeature.updated_at).toBe(true);
  });

  it('should update only the updated_at timestamp when no changes provided', async () => {
    const testFeature = await createTestFeature();
    const originalUpdatedAt = testFeature.updated_at;

    const input: UpdateFeatureInput = {
      id: testFeature.id
      // No changes provided
    };

    const result = await updateFeature(input);

    expect(result.is_enabled_free).toEqual(testFeature.is_enabled_free);
    expect(result.is_enabled_paid).toEqual(testFeature.is_enabled_paid);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error when feature does not exist', async () => {
    const input: UpdateFeatureInput = {
      id: 99999, // Non-existent feature ID
      is_enabled_free: false
    };

    expect(updateFeature(input)).rejects.toThrow(/Feature with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const testFeature = await createTestFeature();

    // First update: change only free tier
    const firstInput: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_free: false
    };

    const firstResult = await updateFeature(firstInput);
    expect(firstResult.is_enabled_free).toEqual(false);
    expect(firstResult.is_enabled_paid).toEqual(true);

    // Second update: change only paid tier
    const secondInput: UpdateFeatureInput = {
      id: testFeature.id,
      is_enabled_paid: false
    };

    const secondResult = await updateFeature(secondInput);
    expect(secondResult.is_enabled_free).toEqual(false); // Should remain from first update
    expect(secondResult.is_enabled_paid).toEqual(false);
  });

  it('should handle features with null description', async () => {
    const featureWithNullDesc = await db.insert(featuresTable)
      .values({
        name: 'Feature Without Description',
        description: null,
        is_enabled_free: true,
        is_enabled_paid: true
      })
      .returning()
      .execute();

    const input: UpdateFeatureInput = {
      id: featureWithNullDesc[0].id,
      is_enabled_free: false
    };

    const result = await updateFeature(input);

    expect(result.name).toEqual('Feature Without Description');
    expect(result.description).toBeNull();
    expect(result.is_enabled_free).toEqual(false);
    expect(result.is_enabled_paid).toEqual(true);
  });
});