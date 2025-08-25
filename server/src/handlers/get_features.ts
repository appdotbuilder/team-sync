import { db } from '../db';
import { featuresTable } from '../db/schema';
import { type Feature } from '../schema';

export const getFeatures = async (): Promise<Feature[]> => {
  try {
    const features = await db.select()
      .from(featuresTable)
      .execute();

    return features;
  } catch (error) {
    console.error('Feature retrieval failed:', error);
    throw error;
  }
};