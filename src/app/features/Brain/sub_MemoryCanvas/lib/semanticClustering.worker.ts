/**
 * semanticClustering.worker.ts
 * Web Worker that computes TF-IDF embeddings for signal summaries and
 * clusters them using DBSCAN. Runs off the main thread to avoid jank.
 *
 * Input:  SemanticWorkerInput  (signal summaries per group)
 * Output: SemanticWorkerOutput (sub-clusters per group + convergence events)
 */

// ── Types (duplicated here because workers can't share TS imports at runtime) ──

interface SignalSummary {
  id: string;
  groupId: string;
  contextName: string;
  summary: string;
  weight: number;
  timestamp: number;
}

interface SemanticSubCluster {
  id: string;
  centroidTerms: string[];
  signalIds: string[];
  coherence: number;  // 0-1, average pairwise similarity within cluster
}

interface ConvergenceEvent {
  concept: string[];
  contextNames: string[];
  signalIds: string[];
  strength: number;   // 0-1, cross-context similarity
}

interface GroupClusters {
  groupId: string;
  clusters: SemanticSubCluster[];
}

export interface SemanticWorkerInput {
  type: 'cluster';
  signals: SignalSummary[];
  similarityThreshold?: number;  // DBSCAN eps (default 0.35)
  minClusterSize?: number;       // DBSCAN minPts (default 2)
}

export interface SemanticWorkerOutput {
  type: 'complete';
  groupClusters: GroupClusters[];
  convergenceEvents: ConvergenceEvent[];
}

// ── Text Processing ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'about', 'up', 'out', 'if', 'then',
  'that', 'this', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
  'you', 'your', 'he', 'she', 'his', 'her', 'what', 'which', 'who',
  'when', 'where', 'how', 'why', 'also', 'only', 'new', 'used', 'using',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ── TF-IDF Vectorization ────────────────────────────────────────────────────

interface TfIdfResult {
  vectors: Map<string, Map<string, number>>;  // signalId → (term → tfidf)
  vocabulary: string[];
}

function computeTfIdf(signals: SignalSummary[]): TfIdfResult {
  // Term frequency per document
  const docTerms = new Map<string, Map<string, number>>();
  const docFreq = new Map<string, number>();
  const allTerms = new Set<string>();

  for (const sig of signals) {
    const tokens = tokenize(sig.summary);
    const tf = new Map<string, number>();
    const seen = new Set<string>();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
      allTerms.add(token);
      if (!seen.has(token)) {
        seen.add(token);
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    // Normalize TF by document length
    const maxTf = Math.max(...tf.values(), 1);
    for (const [term, count] of tf) {
      tf.set(term, 0.5 + 0.5 * (count / maxTf));
    }

    docTerms.set(sig.id, tf);
  }

  const N = signals.length;
  const vocabulary = [...allTerms];

  // Compute TF-IDF vectors
  const vectors = new Map<string, Map<string, number>>();

  for (const sig of signals) {
    const tf = docTerms.get(sig.id)!;
    const tfidf = new Map<string, number>();

    for (const term of vocabulary) {
      const tfVal = tf.get(term) || 0;
      if (tfVal === 0) continue;
      const idf = Math.log(N / (docFreq.get(term) || 1));
      tfidf.set(term, tfVal * idf);
    }

    vectors.set(sig.id, tfidf);
  }

  return { vectors, vocabulary };
}

// ── Cosine Similarity ───────────────────────────────────────────────────────

function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, val] of a) {
    normA += val * val;
    const bVal = b.get(term);
    if (bVal !== undefined) {
      dot += val * bVal;
    }
  }

  for (const val of b.values()) {
    normB += val * val;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// ── DBSCAN Clustering ───────────────────────────────────────────────────────

function dbscan(
  signalIds: string[],
  similarityMatrix: Map<string, Map<string, number>>,
  eps: number,
  minPts: number,
): string[][] {
  const labels = new Map<string, number>();  // signalId → cluster label (-1 = noise)
  let currentCluster = 0;

  function regionQuery(pointId: string): string[] {
    const neighbors: string[] = [];
    const row = similarityMatrix.get(pointId);
    if (!row) return neighbors;

    for (const otherId of signalIds) {
      if (otherId === pointId) continue;
      const sim = row.get(otherId) || 0;
      if (sim >= eps) {
        neighbors.push(otherId);
      }
    }
    return neighbors;
  }

  for (const pointId of signalIds) {
    if (labels.has(pointId)) continue;

    const neighbors = regionQuery(pointId);
    if (neighbors.length < minPts - 1) {
      labels.set(pointId, -1);  // noise
      continue;
    }

    labels.set(pointId, currentCluster);
    const seed = [...neighbors];

    while (seed.length > 0) {
      const q = seed.pop()!;

      if (labels.get(q) === -1) {
        labels.set(q, currentCluster);
      }

      if (labels.has(q)) continue;

      labels.set(q, currentCluster);
      const qNeighbors = regionQuery(q);
      if (qNeighbors.length >= minPts - 1) {
        seed.push(...qNeighbors);
      }
    }

    currentCluster++;
  }

  // Group by cluster
  const clusters: Map<number, string[]> = new Map();
  for (const [id, label] of labels) {
    if (label === -1) continue;
    if (!clusters.has(label)) clusters.set(label, []);
    clusters.get(label)!.push(id);
  }

  return [...clusters.values()];
}

// ── Top Terms Extraction ────────────────────────────────────────────────────

function getTopTerms(
  signalIds: string[],
  vectors: Map<string, Map<string, number>>,
  count: number = 3,
): string[] {
  const termScores = new Map<string, number>();

  for (const id of signalIds) {
    const vec = vectors.get(id);
    if (!vec) continue;
    for (const [term, score] of vec) {
      termScores.set(term, (termScores.get(term) || 0) + score);
    }
  }

  return [...termScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([term]) => term);
}

// ── Main Clustering Pipeline ────────────────────────────────────────────────

function processSignals(input: SemanticWorkerInput): SemanticWorkerOutput {
  const { signals, similarityThreshold = 0.35, minClusterSize = 2 } = input;

  if (signals.length === 0) {
    return { type: 'complete', groupClusters: [], convergenceEvents: [] };
  }

  // Step 1: Compute TF-IDF vectors for all signals
  const { vectors } = computeTfIdf(signals);

  // Step 2: Build similarity matrix
  const similarityMatrix = new Map<string, Map<string, number>>();
  const signalIds = signals.map(s => s.id);

  for (let i = 0; i < signalIds.length; i++) {
    const row = new Map<string, number>();
    const vecA = vectors.get(signalIds[i])!;

    for (let j = 0; j < signalIds.length; j++) {
      if (i === j) continue;
      const vecB = vectors.get(signalIds[j])!;
      row.set(signalIds[j], cosineSimilarity(vecA, vecB));
    }

    similarityMatrix.set(signalIds[i], row);
  }

  // Step 3: Cluster within each group
  const groupMap = new Map<string, SignalSummary[]>();
  for (const sig of signals) {
    if (!groupMap.has(sig.groupId)) groupMap.set(sig.groupId, []);
    groupMap.get(sig.groupId)!.push(sig);
  }

  const groupClusters: GroupClusters[] = [];

  for (const [groupId, groupSignals] of groupMap) {
    if (groupSignals.length < minClusterSize) {
      groupClusters.push({ groupId, clusters: [] });
      continue;
    }

    const gIds = groupSignals.map(s => s.id);
    const rawClusters = dbscan(gIds, similarityMatrix, similarityThreshold, minClusterSize);

    const clusters: SemanticSubCluster[] = rawClusters.map((clusterIds, idx) => {
      // Compute intra-cluster coherence
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < clusterIds.length; i++) {
        for (let j = i + 1; j < clusterIds.length; j++) {
          totalSim += similarityMatrix.get(clusterIds[i])?.get(clusterIds[j]) || 0;
          pairs++;
        }
      }

      return {
        id: `sc-${groupId.slice(0, 8)}-${idx}`,
        centroidTerms: getTopTerms(clusterIds, vectors),
        signalIds: clusterIds,
        coherence: pairs > 0 ? totalSim / pairs : 0,
      };
    });

    groupClusters.push({ groupId, clusters });
  }

  // Step 4: Detect cross-context convergence events
  const convergenceEvents: ConvergenceEvent[] = [];
  const contextNames = [...groupMap.keys()];

  // Compare cluster centroids across different groups
  for (let i = 0; i < groupClusters.length; i++) {
    for (let j = i + 1; j < groupClusters.length; j++) {
      const a = groupClusters[i];
      const b = groupClusters[j];

      for (const ca of a.clusters) {
        for (const cb of b.clusters) {
          // Compute cross-cluster similarity using average pairwise
          let crossSim = 0;
          let crossPairs = 0;

          for (const idA of ca.signalIds) {
            for (const idB of cb.signalIds) {
              crossSim += similarityMatrix.get(idA)?.get(idB) || 0;
              crossPairs++;
            }
          }

          const avgCrossSim = crossPairs > 0 ? crossSim / crossPairs : 0;

          if (avgCrossSim >= similarityThreshold * 0.8) {
            // Merge centroid terms as the convergent concept
            const conceptTerms = [...new Set([...ca.centroidTerms, ...cb.centroidTerms])].slice(0, 4);

            const aGroup = signals.find(s => s.id === ca.signalIds[0]);
            const bGroup = signals.find(s => s.id === cb.signalIds[0]);

            convergenceEvents.push({
              concept: conceptTerms,
              contextNames: [aGroup?.contextName || a.groupId, bGroup?.contextName || b.groupId],
              signalIds: [...ca.signalIds, ...cb.signalIds],
              strength: avgCrossSim,
            });
          }
        }
      }
    }
  }

  // Sort convergence events by strength descending
  convergenceEvents.sort((a, b) => b.strength - a.strength);

  return { type: 'complete', groupClusters, convergenceEvents };
}

// ── Worker Message Handler ──────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<SemanticWorkerInput>) => {
  if (e.data.type !== 'cluster') return;

  const result = processSignals(e.data);
  self.postMessage(result);
};
