import { type Feature } from '../schema';

export async function getFeatures(): Promise<Feature[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all system features and their tier configurations.
    // Used by admin to view and manage feature availability per tier (Free vs Paid).
    return Promise.resolve([]);
}