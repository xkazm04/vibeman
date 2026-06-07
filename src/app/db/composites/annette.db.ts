/**
 * Annette composite export — all Annette repositories under one namespace.
 * Lives outside the @/app/db barrel so routes can import it without
 * pulling the entire repository layer into their module graph.
 */
import { closeDatabase } from '../connection';
import {
  annetteSessionRepository,
  annetteMessageRepository,
  annetteMemoryTopicRepository,
  annettePreferenceRepository,
  annetteAudioCacheRepository,
} from '../repositories/annette.repository';
import {
  annetteMemoryRepository,
  annetteKnowledgeNodeRepository,
  annetteKnowledgeEdgeRepository,
  annetteMemoryConsolidationRepository,
} from '../repositories/annette-memory.repository';
import { annetteRapportRepository } from '../repositories/annette-rapport.repository';

export const annetteDb = {
  sessions: annetteSessionRepository,
  messages: annetteMessageRepository,
  topics: annetteMemoryTopicRepository,
  preferences: annettePreferenceRepository,
  audioCache: annetteAudioCacheRepository,
  memories: annetteMemoryRepository,
  knowledgeNodes: annetteKnowledgeNodeRepository,
  knowledgeEdges: annetteKnowledgeEdgeRepository,
  consolidations: annetteMemoryConsolidationRepository,
  rapport: annetteRapportRepository,
  close: closeDatabase,
};
