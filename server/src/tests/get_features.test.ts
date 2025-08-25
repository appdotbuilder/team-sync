import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { featuresTable } from '../db/schema';
import { getFeatures } from '../handlers/get_features';

describe('getFeatures', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no features exist', async () => {
    const result = await getFeatures();
    
    expect(result).toEqual([]);
  });

  it('should return all features when they exist', async () => {
    // Create test features
    await db.insert(featuresTable)
      .values([
        {
          name: 'todo_lists',
          description: 'Create and manage todo lists',
          is_enabled_free: true,
          is_enabled_paid: true
        },
        {
          name: 'shopping_lists',
          description: 'Create and manage shopping lists',
          is_enabled_free: false,
          is_enabled_paid: true
        },
        {
          name: 'calendar',
          description: 'Calendar and event management',
          is_enabled_free: true,
          is_enabled_paid: true
        }
      ])
      .execute();

    const result = await getFeatures();

    expect(result).toHaveLength(3);
    
    // Verify first feature
    const todoFeature = result.find(f => f.name === 'todo_lists');
    expect(todoFeature).toBeDefined();
    expect(todoFeature!.description).toEqual('Create and manage todo lists');
    expect(todoFeature!.is_enabled_free).toBe(true);
    expect(todoFeature!.is_enabled_paid).toBe(true);
    expect(todoFeature!.id).toBeDefined();
    expect(todoFeature!.created_at).toBeInstanceOf(Date);
    expect(todoFeature!.updated_at).toBeInstanceOf(Date);

    // Verify second feature (paid only)
    const shoppingFeature = result.find(f => f.name === 'shopping_lists');
    expect(shoppingFeature).toBeDefined();
    expect(shoppingFeature!.description).toEqual('Create and manage shopping lists');
    expect(shoppingFeature!.is_enabled_free).toBe(false);
    expect(shoppingFeature!.is_enabled_paid).toBe(true);

    // Verify third feature
    const calendarFeature = result.find(f => f.name === 'calendar');
    expect(calendarFeature).toBeDefined();
    expect(calendarFeature!.description).toEqual('Calendar and event management');
    expect(calendarFeature!.is_enabled_free).toBe(true);
    expect(calendarFeature!.is_enabled_paid).toBe(true);
  });

  it('should handle features with null descriptions', async () => {
    // Create feature with null description
    await db.insert(featuresTable)
      .values({
        name: 'beta_feature',
        description: null,
        is_enabled_free: false,
        is_enabled_paid: false
      })
      .execute();

    const result = await getFeatures();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('beta_feature');
    expect(result[0].description).toBeNull();
    expect(result[0].is_enabled_free).toBe(false);
    expect(result[0].is_enabled_paid).toBe(false);
  });

  it('should return features in database order', async () => {
    // Create features in specific order
    const featureNames = ['feature_a', 'feature_b', 'feature_c'];
    
    for (const name of featureNames) {
      await db.insert(featuresTable)
        .values({
          name,
          description: `Description for ${name}`,
          is_enabled_free: true,
          is_enabled_paid: true
        })
        .execute();
    }

    const result = await getFeatures();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('feature_a');
    expect(result[1].name).toEqual('feature_b');
    expect(result[2].name).toEqual('feature_c');
  });

  it('should handle mixed feature configurations', async () => {
    // Create features with different configurations
    await db.insert(featuresTable)
      .values([
        {
          name: 'free_only',
          description: 'Available only to free users',
          is_enabled_free: true,
          is_enabled_paid: false
        },
        {
          name: 'paid_only',
          description: 'Available only to paid users',
          is_enabled_free: false,
          is_enabled_paid: true
        },
        {
          name: 'disabled',
          description: 'Disabled for all users',
          is_enabled_free: false,
          is_enabled_paid: false
        },
        {
          name: 'universal',
          description: 'Available to all users',
          is_enabled_free: true,
          is_enabled_paid: true
        }
      ])
      .execute();

    const result = await getFeatures();

    expect(result).toHaveLength(4);

    const freeOnly = result.find(f => f.name === 'free_only');
    expect(freeOnly!.is_enabled_free).toBe(true);
    expect(freeOnly!.is_enabled_paid).toBe(false);

    const paidOnly = result.find(f => f.name === 'paid_only');
    expect(paidOnly!.is_enabled_free).toBe(false);
    expect(paidOnly!.is_enabled_paid).toBe(true);

    const disabled = result.find(f => f.name === 'disabled');
    expect(disabled!.is_enabled_free).toBe(false);
    expect(disabled!.is_enabled_paid).toBe(false);

    const universal = result.find(f => f.name === 'universal');
    expect(universal!.is_enabled_free).toBe(true);
    expect(universal!.is_enabled_paid).toBe(true);
  });
});