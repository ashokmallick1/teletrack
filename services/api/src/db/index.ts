import { IDatabase } from './types';
import { MemoryDatabase } from './memory-database';

let dbInstance: IDatabase;

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    // In production with DATABASE_URL, could initialize PostgresDatabase
    dbInstance = new MemoryDatabase();
  }
  return dbInstance;
}

export * from './types';
