/**
 * Monitor Service Database Layer
 * Service layer for voicebot monitoring operations
 */

import { monitorDb, DbCall, DbMessage, DbPattern, DbMessageClass } from '@/lib/monitor_database';

// Logger helpers for consistent logging
function log(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(`[MonitorServiceDb] ${message}`, data);
    } else {
      console.log(`[MonitorServiceDb] ${message}`);
    }
  }
}

function logError(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[MonitorServiceDb] ${message}`, error);
  }
}

function logWarn(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[MonitorServiceDb] ${message}`, data);
  }
}

// Type definitions for service layer
export interface Call {
  callId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  intent?: string;
  outcome?: string;
  promptVersionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  messageId: string;
  callId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  nodeId?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  evalOk: boolean;
  reviewOk: boolean;
  evalClass?: string;
  createdAt: string;
}

export interface MessageClass {
  classId: string;
  className: string;
  description?: string;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pattern {
  patternId: string;
  patternType: 'flow' | 'decision' | 'failure';
  description?: string;
  frequency: number;
  exampleCallIds?: string[];
  detectedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CallStatistics {
  total: number;
  completed: number;
  failed: number;
  abandoned: number;
  active: number;
  avgDuration: number | null;
}

// Conversion functions
function dbCallToCall(dbCall: DbCall): Call {
  return {
    callId: dbCall.call_id,
    userId: dbCall.user_id || undefined,
    startTime: dbCall.start_time,
    endTime: dbCall.end_time || undefined,
    duration: dbCall.duration || undefined,
    status: (dbCall.status as Call['status']) || 'active',
    intent: dbCall.intent || undefined,
    outcome: dbCall.outcome || undefined,
    promptVersionId: dbCall.prompt_version_id || undefined,
    metadata: dbCall.metadata ? JSON.parse(dbCall.metadata) : undefined,
    createdAt: dbCall.created_at,
    updatedAt: dbCall.updated_at
  };
}

function dbMessageToMessage(dbMessage: DbMessage): Message {
  return {
    messageId: dbMessage.message_id,
    callId: dbMessage.call_id,
    role: dbMessage.role as Message['role'],
    content: dbMessage.content,
    timestamp: dbMessage.timestamp,
    nodeId: dbMessage.node_id || undefined,
    latencyMs: dbMessage.latency_ms || undefined,
    metadata: dbMessage.metadata ? JSON.parse(dbMessage.metadata) : undefined,
    evalOk: dbMessage.eval_ok === 1,
    reviewOk: dbMessage.review_ok === 1,
    evalClass: dbMessage.eval_class || undefined,
    createdAt: dbMessage.created_at
  };
}

function dbMessageClassToMessageClass(dbClass: DbMessageClass): MessageClass {
  return {
    classId: dbClass.class_id,
    className: dbClass.class_name,
    description: dbClass.description || undefined,
    frequency: dbClass.frequency,
    createdAt: dbClass.created_at,
    updatedAt: dbClass.updated_at
  };
}

function dbPatternToPattern(dbPattern: DbPattern): Pattern {
  return {
    patternId: dbPattern.pattern_id,
    patternType: dbPattern.pattern_type as Pattern['patternType'],
    description: dbPattern.description || undefined,
    frequency: dbPattern.frequency,
    exampleCallIds: dbPattern.example_call_ids ? JSON.parse(dbPattern.example_call_ids) : undefined,
    detectedAt: dbPattern.detected_at,
    metadata: dbPattern.metadata ? JSON.parse(dbPattern.metadata) : undefined,
    createdAt: dbPattern.created_at,
    updatedAt: dbPattern.updated_at
  };
}

// Service class
class MonitorServiceDb {
  private static instance: MonitorServiceDb;
  
  private constructor() {}
  
  static getInstance(): MonitorServiceDb {
    if (!MonitorServiceDb.instance) {
      MonitorServiceDb.instance = new MonitorServiceDb();
    }
    return MonitorServiceDb.instance;
  }
  
  // ============= CALL OPERATIONS =============
  
  async getAllCalls(): Promise<Call[]> {
    try {
      const dbCalls = monitorDb.getAllCalls();
      return dbCalls.map(dbCallToCall);
    } catch (error) {
      logError('Error getting all calls:', error);
      return [];
    }
  }
  
  async getCall(callId: string): Promise<Call | null> {
    try {
      const dbCall = monitorDb.getCall(callId);
      return dbCall ? dbCallToCall(dbCall) : null;
    } catch (error) {
      logError(`Error getting call ${callId}:`, error);
      return null;
    }
  }
  
  async getCallsByStatus(status: Call['status']): Promise<Call[]> {
    try {
      const dbCalls = monitorDb.getCallsByStatus(status);
      return dbCalls.map(dbCallToCall);
    } catch (error) {
      logError(`Error getting calls by status ${status}:`, error);
      return [];
    }
  }
  
  async getCallsByDateRange(startDate: string, endDate: string): Promise<Call[]> {
    try {
      const dbCalls = monitorDb.getCallsByDateRange(startDate, endDate);
      return dbCalls.map(dbCallToCall);
    } catch (error) {
      logError('Error getting calls by date range:', error);
      return [];
    }
  }
  
  async createCall(call: {
    callId: string;
    userId?: string;
    startTime: string;
    status?: Call['status'];
    intent?: string;
    promptVersionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Call> {
    try {
      const dbCall = monitorDb.createCall({
        call_id: call.callId,
        user_id: call.userId,
        start_time: call.startTime,
        status: call.status,
        intent: call.intent,
        prompt_version_id: call.promptVersionId,
        metadata: call.metadata
      });
      
      log(`Created call ${call.callId}`);
      return dbCallToCall(dbCall);
    } catch (error) {
      logError(`Error creating call ${call.callId}:`, error);
      throw error;
    }
  }
  
  async updateCall(callId: string, updates: {
    endTime?: string;
    duration?: number;
    status?: Call['status'];
    intent?: string;
    outcome?: string;
    promptVersionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Call | null> {
    try {
      const dbCall = monitorDb.updateCall(callId, {
        end_time: updates.endTime,
        duration: updates.duration,
        status: updates.status,
        intent: updates.intent,
        outcome: updates.outcome,
        prompt_version_id: updates.promptVersionId,
        metadata: updates.metadata
      });
      
      if (!dbCall) {
        logWarn(`Call ${callId} not found for update`);
        return null;
      }
      
      log(`Updated call ${callId}`);
      return dbCallToCall(dbCall);
    } catch (error) {
      logError(`Error updating call ${callId}:`, error);
      throw error;
    }
  }
  
  async deleteCall(callId: string): Promise<boolean> {
    try {
      // Delete patterns containing this call first
      monitorDb.deletePatternsForCall(callId);
      
      // Delete the call (CASCADE will delete messages)
      const success = monitorDb.deleteCall(callId);
      if (success) {
        log(`Deleted call ${callId} and related data`);
      }
      return success;
    } catch (error) {
      logError(`Error deleting call ${callId}:`, error);
      return false;
    }
  }
  
  // ============= MESSAGE OPERATIONS =============
  
  async getCallMessages(callId: string): Promise<Message[]> {
    try {
      const dbMessages = monitorDb.getCallMessages(callId);
      return dbMessages.map(dbMessageToMessage);
    } catch (error) {
      logError(`Error getting messages for call ${callId}:`, error);
      return [];
    }
  }
  
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const dbMessage = monitorDb.getMessage(messageId);
      return dbMessage ? dbMessageToMessage(dbMessage) : null;
    } catch (error) {
      logError(`Error getting message ${messageId}:`, error);
      return null;
    }
  }
  
  async createMessage(message: {
    messageId: string;
    callId: string;
    role: Message['role'];
    content: string;
    timestamp: string;
    nodeId?: string;
    latencyMs?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    try {
      const dbMessage = monitorDb.createMessage({
        message_id: message.messageId,
        call_id: message.callId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        node_id: message.nodeId,
        latency_ms: message.latencyMs,
        metadata: message.metadata
      });
      
      return dbMessageToMessage(dbMessage);
    } catch (error) {
      logError(`Error creating message ${message.messageId}:`, error);
      throw error;
    }
  }
  
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      return monitorDb.deleteMessage(messageId);
    } catch (error) {
      logError(`Error deleting message ${messageId}:`, error);
      return false;
    }
  }

  async updateMessageEvaluation(messageId: string, evalData: {
    evalOk?: boolean;
    reviewOk?: boolean;
    evalClass?: string;
  }): Promise<Message | null> {
    try {
      const dbMessage = monitorDb.updateMessageEvaluation(messageId, {
        eval_ok: evalData.evalOk,
        review_ok: evalData.reviewOk,
        eval_class: evalData.evalClass
      });
      return dbMessage ? dbMessageToMessage(dbMessage) : null;
    } catch (error) {
      logError(`Error updating message evaluation ${messageId}:`, error);
      return null;
    }
  }

  // ============= MESSAGE CLASS OPERATIONS =============

  async getAllMessageClasses(): Promise<MessageClass[]> {
    try {
      const dbClasses = monitorDb.getAllMessageClasses();
      return dbClasses.map(dbMessageClassToMessageClass);
    } catch (error) {
      logError('Error getting all message classes:', error);
      return [];
    }
  }

  async getMessageClassByName(className: string): Promise<MessageClass | null> {
    try {
      const dbClass = monitorDb.getMessageClassByName(className);
      return dbClass ? dbMessageClassToMessageClass(dbClass) : null;
    } catch (error) {
      logError(`Error getting message class ${className}:`, error);
      return null;
    }
  }

  async createMessageClass(messageClass: {
    classId: string;
    className: string;
    description?: string;
  }): Promise<MessageClass> {
    try {
      const dbClass = monitorDb.createMessageClass({
        class_id: messageClass.classId,
        class_name: messageClass.className,
        description: messageClass.description
      });
      return dbMessageClassToMessageClass(dbClass);
    } catch (error) {
      logError('Error creating message class:', error);
      throw error;
    }
  }

  async incrementMessageClassFrequency(className: string): Promise<boolean> {
    try {
      return monitorDb.incrementMessageClassFrequency(className);
    } catch (error) {
      logError(`Error incrementing message class frequency ${className}:`, error);
      return false;
    }
  }
  
  // ============= PATTERN OPERATIONS =============
  
  async getAllPatterns(): Promise<Pattern[]> {
    try {
      const dbPatterns = monitorDb.getAllPatterns();
      return dbPatterns.map(dbPatternToPattern);
    } catch (error) {
      logError('Error getting all patterns:', error);
      return [];
    }
  }
  
  async getPatternsByType(patternType: Pattern['patternType']): Promise<Pattern[]> {
    try {
      const dbPatterns = monitorDb.getPatternsByType(patternType);
      return dbPatterns.map(dbPatternToPattern);
    } catch (error) {
      logError(`Error getting patterns by type ${patternType}:`, error);
      return [];
    }
  }
  
  async getPattern(patternId: string): Promise<Pattern | null> {
    try {
      const dbPattern = monitorDb.getPattern(patternId);
      return dbPattern ? dbPatternToPattern(dbPattern) : null;
    } catch (error) {
      logError(`Error getting pattern ${patternId}:`, error);
      return null;
    }
  }
  
  async createPattern(pattern: {
    patternId: string;
    patternType: Pattern['patternType'];
    description?: string;
    frequency?: number;
    exampleCallIds?: string[];
    detectedAt: string;
    metadata?: Record<string, unknown>;
  }): Promise<Pattern> {
    try {
      const dbPattern = monitorDb.createPattern({
        pattern_id: pattern.patternId,
        pattern_type: pattern.patternType,
        description: pattern.description,
        frequency: pattern.frequency,
        example_call_ids: pattern.exampleCallIds,
        detected_at: pattern.detectedAt,
        metadata: pattern.metadata
      });
      
      log(`Created pattern ${pattern.patternId}`);
      return dbPatternToPattern(dbPattern);
    } catch (error) {
      logError(`Error creating pattern ${pattern.patternId}:`, error);
      throw error;
    }
  }
  
  async updatePatternFrequency(patternId: string, frequency: number): Promise<Pattern | null> {
    try {
      const dbPattern = monitorDb.updatePatternFrequency(patternId, frequency);
      return dbPattern ? dbPatternToPattern(dbPattern) : null;
    } catch (error) {
      logError(`Error updating pattern frequency ${patternId}:`, error);
      return null;
    }
  }
  
  async deletePattern(patternId: string): Promise<boolean> {
    try {
      const success = monitorDb.deletePattern(patternId);
      if (success) {
        log(`Deleted pattern ${patternId}`);
      }
      return success;
    } catch (error) {
      logError(`Error deleting pattern ${patternId}:`, error);
      return false;
    }
  }
  
  // ============= STATISTICS OPERATIONS =============
  
  async getCallStatistics(): Promise<CallStatistics> {
    try {
      return monitorDb.getCallStatistics();
    } catch (error) {
      logError('Error getting call statistics:', error);
      return {
        total: 0,
        completed: 0,
        failed: 0,
        abandoned: 0,
        active: 0,
        avgDuration: null
      };
    }
  }
  
  async getMessageCount(callId: string): Promise<number> {
    try {
      return monitorDb.getMessageCount(callId);
    } catch (error) {
      logError(`Error getting message count for call ${callId}:`, error);
      return 0;
    }
  }
}

export const monitorServiceDb = MonitorServiceDb.getInstance();
