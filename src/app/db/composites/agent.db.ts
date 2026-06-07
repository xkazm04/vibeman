/**
 * Agent composite export — goal and step repositories under one namespace.
 * Lives outside the @/app/db barrel so routes can import it without
 * pulling the entire repository layer into their module graph.
 */
import { closeDatabase } from '../connection';
import { agentGoalRepository, agentStepRepository } from '../repositories/agent.repository';

export const agentDb = {
  goals: agentGoalRepository,
  steps: agentStepRepository,
  close: closeDatabase,
};
