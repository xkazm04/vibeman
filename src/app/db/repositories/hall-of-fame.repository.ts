import { getDatabase } from '../connection';

export interface DbHallOfFameStar {
  component_id: string;
  starred_at: string;
}

/**
 * Hall of Fame Repository
 * Handles starred/featured component persistence
 */
export const hallOfFameRepository = {
  /**
   * Get all starred component IDs
   */
  getStarredComponentIds: (): string[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT component_id FROM hall_of_fame_stars');
    const rows = stmt.all() as DbHallOfFameStar[];
    return rows.map(r => r.component_id);
  },

  /**
   * Check if a component is starred
   */
  isStarred: (componentId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT 1 FROM hall_of_fame_stars WHERE component_id = ?');
    const row = stmt.get(componentId);
    return !!row;
  },

  /**
   * Star a component (add to featured)
   */
  star: (componentId: string): DbHallOfFameStar => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO hall_of_fame_stars (component_id, starred_at)
      VALUES (?, ?)
    `);
    stmt.run(componentId, now);

    return { component_id: componentId, starred_at: now };
  },

  /**
   * Unstar a component (remove from featured)
   */
  unstar: (componentId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM hall_of_fame_stars WHERE component_id = ?');
    const result = stmt.run(componentId);
    return result.changes > 0;
  },

  /**
   * Toggle star status for a component
   */
  toggle: (componentId: string): { starred: boolean } => {
    const db = getDatabase();
    const isCurrentlyStarred = hallOfFameRepository.isStarred(componentId);

    if (isCurrentlyStarred) {
      hallOfFameRepository.unstar(componentId);
      return { starred: false };
    } else {
      hallOfFameRepository.star(componentId);
      return { starred: true };
    }
  },

  /**
   * Get all starred components with timestamps
   */
  getAllStars: (): DbHallOfFameStar[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM hall_of_fame_stars ORDER BY starred_at DESC');
    return stmt.all() as DbHallOfFameStar[];
  },
};
