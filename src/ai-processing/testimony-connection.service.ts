import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TestimonyConnectionService {
  private readonly logger = new Logger(TestimonyConnectionService.name);

  // Configurable similarity thresholds (via env vars)
  private readonly SIMILARITY_THRESHOLD_STRONG: number;
  private readonly SIMILARITY_THRESHOLD_MODERATE: number;
  private readonly SIMILARITY_THRESHOLD_WEAK: number;

  private readonly MAX_CONNECTIONS_PER_TESTIMONY = 10;

  // Configurable hybrid scoring weights (via env vars)
  private readonly SEMANTIC_WEIGHT: number;
  private readonly RULE_BASED_WEIGHT: number;

  // Minimum keyPhrases overlap ratio before skipping expensive vector comparison
  private readonly KEYPHRASES_MIN_OVERLAP = 0.1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.SIMILARITY_THRESHOLD_STRONG = parseFloat(
      this.configService.get<string>('TESTIMONY_THRESHOLD_STRONG') ?? '0.85',
    );
    this.SIMILARITY_THRESHOLD_MODERATE = parseFloat(
      this.configService.get<string>('TESTIMONY_THRESHOLD_MODERATE') ?? '0.75',
    );
    this.SIMILARITY_THRESHOLD_WEAK = parseFloat(
      this.configService.get<string>('TESTIMONY_THRESHOLD_WEAK') ?? '0.70',
    );
    this.SEMANTIC_WEIGHT = parseFloat(
      this.configService.get<string>('TESTIMONY_SEMANTIC_WEIGHT') ?? '0.6',
    );
    this.RULE_BASED_WEIGHT = parseFloat(
      this.configService.get<string>('TESTIMONY_RULE_WEIGHT') ?? '0.4',
    );
  }

  /**
   * Discover and create connections for a newly processed testimony
   */
  async discoverConnections(testimonyId: number) {
    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id: testimonyId },
        include: {
          embeddings: true,
          events: { include: { event: true } },
          locations: { include: { location: true } },
          relatives: {
            include: {
              relativeType: true,
            },
          },
        },
      });

      if (!testimony) {
        this.logger.warn(
          `Testimony ${testimonyId} not found, skipping connection discovery`,
        );
        return;
      }

      const hasEmbeddings = testimony.embeddings.length > 0;
      if (!hasEmbeddings) {
        this.logger.warn(
          `No embeddings for testimony ${testimonyId}, will use rule-based connections only`,
        );
      }

      // Preserve edges that have user ratings instead of deleting everything
      const ratedEdges = await this.prisma.testimonyEdge.findMany({
        where: {
          OR: [{ fromId: testimonyId }, { toId: testimonyId }],
          userRating: { not: null },
        },
        select: {
          id: true,
          fromId: true,
          toId: true,
          userRating: true,
          type: true,
        },
      });

      // Only delete unrated edges
      await this.prisma.testimonyEdge.deleteMany({
        where: {
          OR: [{ fromId: testimonyId }, { toId: testimonyId }],
          userRating: null,
        },
      });

      // Build set of rated edge keys for deduplication
      const ratedEdgeKeys = new Set<string>();
      for (const re of ratedEdges) {
        ratedEdgeKeys.add(`${re.fromId}-${re.toId}`);
      }

      // Get all other approved testimonies (with or without embeddings for rule-based matching)
      const otherTestimonies = await this.prisma.testimony.findMany({
        where: {
          id: { not: testimonyId },
          status: 'approved',
          isPublished: true,
        },
        include: {
          embeddings: true,
          events: { include: { event: true } },
          locations: { include: { location: true } },
          relatives: {
            include: {
              relativeType: true,
            },
          },
        },
      });

      if (otherTestimonies.length === 0) {
        this.logger.log(
          `No other approved testimonies found for comparison`,
        );
        return;
      }

      // Get adaptive thresholds based on user rating feedback
      const thresholds = await this.getAdaptiveThresholds();

      const edges: Array<{
        fromId: number;
        toId: number;
        type: string;
        score: number;
        source: string;
      }> = [];

      // 1. Semantic similarity based on embeddings (only if this testimony has embeddings)
      let semanticEdges: typeof edges = [];
      if (hasEmbeddings) {
        semanticEdges = this.findSemanticConnections(
          testimony,
          otherTestimonies,
          thresholds,
        );
        edges.push(...semanticEdges);
      }

      // 2. Rule-based connections (same events, locations, dates, people)
      const ruleBasedEdges = this.findRuleBasedConnections(
        testimony,
        otherTestimonies,
      );
      edges.push(...ruleBasedEdges);

      // 3. Apply weighted hybrid scoring - combine semantic + rule-based scores
      const hybridEdges = this.applyHybridScoring(
        edges,
        semanticEdges,
        ruleBasedEdges,
      );

      // Remove duplicates and keep highest score
      const uniqueEdges = this.deduplicateEdges(hybridEdges);

      // Create edges in database (bidirectional: A->B and B->A)
      if (uniqueEdges.length > 0) {
        // Separate into new edges vs edges that need score updates (already rated)
        const newEdges: typeof uniqueEdges = [];
        const edgesToUpdate: typeof uniqueEdges = [];

        for (const edge of uniqueEdges) {
          if (
            ratedEdgeKeys.has(`${edge.fromId}-${edge.toId}`) ||
            ratedEdgeKeys.has(`${edge.toId}-${edge.fromId}`)
          ) {
            edgesToUpdate.push(edge);
          } else {
            newEdges.push(edge);
          }
        }

        // Create new edges (with reverse)
        if (newEdges.length > 0) {
          const reverseEdges = newEdges.map((edge) => ({
            fromId: edge.toId,
            toId: edge.fromId,
            type: edge.type,
            score: edge.score,
            source: edge.source,
          }));
          await this.prisma.testimonyEdge.createMany({
            data: [...newEdges, ...reverseEdges],
            skipDuplicates: true,
          });
        }

        // Update scores on rated edges (preserve userRating)
        for (const edge of edgesToUpdate) {
          await this.prisma.testimonyEdge.updateMany({
            where: { fromId: edge.fromId, toId: edge.toId },
            data: { score: edge.score, type: edge.type, source: edge.source },
          });
          // Also update the reverse edge
          await this.prisma.testimonyEdge.updateMany({
            where: { fromId: edge.toId, toId: edge.fromId },
            data: { score: edge.score, type: edge.type, source: edge.source },
          });
        }

        this.logger.log(
          `Created ${newEdges.length} new + updated ${edgesToUpdate.length} rated connections for testimony ${testimonyId}`,
        );

        // Notify about strong new connections (non-blocking)
        if (newEdges.length > 0) {
          const strongEdges = newEdges.filter((e) => e.score >= 0.80);
          for (const edge of strongEdges) {
            void this.notificationService
              .notifyAiConnectionSuggestion({
                testimonyId: edge.fromId,
                relatedTestimonyId: edge.toId,
                similarityScore: edge.score,
              })
              .catch((err) =>
                this.logger.warn(
                  `Failed to send connection notification:`,
                  err,
                ),
              );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to discover connections for testimony ${testimonyId}`,
        error as Error,
      );
    }
  }

  /**
   * Calculate adaptive thresholds based on user rating feedback.
   * If semantic connections have 20+ ratings and avg < 3.0, raise thresholds.
   * If avg > 4.0, lower thresholds to find more good connections.
   */
  private async getAdaptiveThresholds(): Promise<{
    strong: number;
    moderate: number;
    weak: number;
  }> {
    const baseThresholds = {
      strong: this.SIMILARITY_THRESHOLD_STRONG,
      moderate: this.SIMILARITY_THRESHOLD_MODERATE,
      weak: this.SIMILARITY_THRESHOLD_WEAK,
    };

    try {
      const stats = await this.prisma.$queryRaw<
        Array<{
          type: string;
          avg_rating: number | null;
          rating_count: bigint;
        }>
      >`
        SELECT
          type,
          AVG(user_rating) as avg_rating,
          COUNT(CASE WHEN user_rating IS NOT NULL THEN 1 END) as rating_count
        FROM testimony_edges
        WHERE user_rating IS NOT NULL
        GROUP BY type
        HAVING COUNT(CASE WHEN user_rating IS NOT NULL THEN 1 END) >= 20
      `;

      if (stats.length === 0) {
        return baseThresholds;
      }

      // Check semantic connection types for threshold adjustments
      const semanticTypes = stats.filter((s) =>
        s.type.startsWith('semantic_'),
      );

      if (semanticTypes.length > 0) {
        const avgRating =
          semanticTypes.reduce(
            (sum, s) => sum + Number(s.avg_rating ?? 0),
            0,
          ) / semanticTypes.length;

        if (avgRating < 3.0) {
          // Users find connections poor — raise thresholds
          baseThresholds.strong = Math.min(
            0.95,
            baseThresholds.strong + 0.03,
          );
          baseThresholds.moderate = Math.min(
            0.90,
            baseThresholds.moderate + 0.03,
          );
          baseThresholds.weak = Math.min(0.85, baseThresholds.weak + 0.03);
          this.logger.log(
            `Adaptive thresholds: RAISED (avg semantic rating ${avgRating.toFixed(2)})`,
          );
        } else if (avgRating > 4.0) {
          // Users love connections — lower thresholds to find more
          baseThresholds.strong = Math.max(
            0.80,
            baseThresholds.strong - 0.02,
          );
          baseThresholds.moderate = Math.max(
            0.70,
            baseThresholds.moderate - 0.02,
          );
          baseThresholds.weak = Math.max(0.65, baseThresholds.weak - 0.02);
          this.logger.log(
            `Adaptive thresholds: LOWERED (avg semantic rating ${avgRating.toFixed(2)})`,
          );
        }
      }

      return baseThresholds;
    } catch (error) {
      this.logger.warn(
        'Failed to compute adaptive thresholds, using defaults',
        error,
      );
      return baseThresholds;
    }
  }

  /**
   * Find semantic connections using multi-vector embedding similarity
   * With keyPhrases pre-filtering and adaptive thresholds
   */
  private findSemanticConnections(
    testimony: {
      id: number;
      keyPhrases?: string[];
      embeddings: Array<{ section: string; vector: number[] }>;
    },
    otherTestimonies: Array<{
      id: number;
      keyPhrases?: string[];
      embeddings: Array<{ section: string; vector: number[] }>;
    }>,
    thresholds: { strong: number; moderate: number; weak: number },
  ) {
    const edges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }> = [];

    if (testimony.embeddings.length === 0) {
      return edges;
    }

    for (const other of otherTestimonies) {
      if (other.embeddings.length === 0) {
        continue;
      }

      // KeyPhrases pre-filter: skip expensive vector comparison if overlap is too low
      const overlap = this.calculateKeyPhrasesOverlap(
        testimony.keyPhrases ?? [],
        other.keyPhrases ?? [],
      );
      if (overlap < this.KEYPHRASES_MIN_OVERLAP) {
        continue;
      }

      // Multi-vector comparison across all sections
      const similarity = this.calculateMultiVectorSimilarity(
        testimony.embeddings,
        other.embeddings,
      );

      // Determine connection strength based on adaptive thresholds
      let connectionType = 'semantic_similarity';
      let source = 'multi_vector_comparison';

      if (similarity >= thresholds.strong) {
        connectionType = 'semantic_similarity_strong';
        source = 'multi_vector_strong';
      } else if (similarity >= thresholds.moderate) {
        connectionType = 'semantic_similarity_moderate';
        source = 'multi_vector_moderate';
      } else if (similarity >= thresholds.weak) {
        connectionType = 'semantic_similarity_weak';
        source = 'multi_vector_weak';
      } else {
        // Below threshold, skip
        continue;
      }

      edges.push({
        fromId: testimony.id,
        toId: other.id,
        type: connectionType,
        score: similarity,
        source,
      });
    }

    // Sort by score and take top N
    return edges
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONNECTIONS_PER_TESTIMONY);
  }

  /**
   * Calculate keyPhrases overlap ratio between two testimonies.
   * Returns 0.0-1.0 representing what fraction of the smaller set is shared.
   * Returns 1.0 if either has no keyPhrases (safe fallback — don't filter).
   */
  private calculateKeyPhrasesOverlap(
    phrases1: string[],
    phrases2: string[],
  ): number {
    if (phrases1.length === 0 || phrases2.length === 0) {
      return 1.0;
    }

    const set1 = new Set(phrases1.map((p) => p.toLowerCase()));
    const set2 = new Set(phrases2.map((p) => p.toLowerCase()));
    const intersection = [...set1].filter((p) => set2.has(p));
    const minSize = Math.min(set1.size, set2.size);

    return minSize > 0 ? intersection.length / minSize : 0;
  }

  /**
   * Calculate similarity using multi-vector comparison
   * Compares all embedding sections with weighted averaging
   */
  private calculateMultiVectorSimilarity(
    embeddings1: Array<{ section: string; vector: number[] }>,
    embeddings2: Array<{ section: string; vector: number[] }>,
  ): number {
    const sectionWeights: Record<string, number> = {
      fullTestimony: 0.4, // Most important - full content
      transcript: 0.4, // Equally important - transcribed content
      description: 0.15, // Moderate importance
      title: 0.05, // Least important but still useful
    };

    const similarities: Array<{ similarity: number; weight: number }> = [];

    // Compare each section with its counterpart
    for (const [section, weight] of Object.entries(sectionWeights)) {
      const emb1 = embeddings1.find((e) => e.section === section);
      const emb2 = embeddings2.find((e) => e.section === section);

      if (emb1 && emb2) {
        const similarity = this.cosineSimilarity(emb1.vector, emb2.vector);
        similarities.push({ similarity, weight });
      }
    }

    if (similarities.length === 0) {
      return 0;
    }

    // Calculate weighted average
    const totalWeight = similarities.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = similarities.reduce(
      (sum, s) => sum + s.similarity * s.weight,
      0,
    );

    return weightedSum / totalWeight;
  }

  /**
   * Find rule-based connections (same events, locations, dates, people)
   * Uses confidence fields for weighted scoring
   */
  private findRuleBasedConnections(
    testimony: {
      id: number;
      relationToEvent?: string | null;
      events: Array<{ eventId: number; confidence?: number | null }>;
      locations: Array<{ locationId: number; confidence?: number | null }>;
      relatives: Array<{
        personName: string;
        relativeTypeId: number;
        relativeType?: {
          id: number;
          slug: string;
          displayName: string;
        } | null;
      }>;
      dateOfEventFrom?: Date | null;
      dateOfEventTo?: Date | null;
    },
    otherTestimonies: Array<{
      id: number;
      relationToEvent?: string | null;
      events: Array<{ eventId: number; confidence?: number | null }>;
      locations: Array<{ locationId: number; confidence?: number | null }>;
      relatives: Array<{
        personName: string;
        relativeTypeId: number;
        relativeType?: {
          id: number;
          slug: string;
          displayName: string;
        } | null;
      }>;
      dateOfEventFrom?: Date | null;
      dateOfEventTo?: Date | null;
    }>,
  ) {
    const edges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }> = [];

    // Build event/location maps with confidence for the source testimony
    const testimonyEventMap = new Map<number, number>();
    testimony.events.forEach((e) => {
      testimonyEventMap.set(e.eventId, e.confidence ?? 1.0);
    });

    const testimonyLocationMap = new Map<number, number>();
    testimony.locations.forEach((l) => {
      testimonyLocationMap.set(l.locationId, l.confidence ?? 1.0);
    });

    // Create a map of person name -> relativeTypeId for better matching
    const testimonyPeople = new Map<
      string,
      Array<{ relativeTypeId: number; relativeTypeSlug?: string }>
    >();
    testimony.relatives.forEach((r) => {
      const nameKey = r.personName.toLowerCase().trim();
      const existing = testimonyPeople.get(nameKey) || [];
      existing.push({
        relativeTypeId: r.relativeTypeId,
        relativeTypeSlug: r.relativeType?.slug,
      });
      testimonyPeople.set(nameKey, existing);
    });

    for (const other of otherTestimonies) {
      // Build event/location maps with confidence for the other testimony
      const otherEventMap = new Map<number, number>();
      other.events.forEach((e) => {
        otherEventMap.set(e.eventId, e.confidence ?? 1.0);
      });

      const otherLocationMap = new Map<number, number>();
      other.locations.forEach((l) => {
        otherLocationMap.set(l.locationId, l.confidence ?? 1.0);
      });

      // Create a map for other testimony's people
      const otherPeople = new Map<
        string,
        Array<{ relativeTypeId: number; relativeTypeSlug?: string }>
      >();
      other.relatives.forEach((r) => {
        const nameKey = r.personName.toLowerCase().trim();
        const existing = otherPeople.get(nameKey) || [];
        existing.push({
          relativeTypeId: r.relativeTypeId,
          relativeTypeSlug: r.relativeType?.slug,
        });
        otherPeople.set(nameKey, existing);
      });

      // Same event — confidence-weighted
      const sharedEvents = [...testimonyEventMap.keys()].filter((id) =>
        otherEventMap.has(id),
      );
      if (sharedEvents.length > 0) {
        const eventId = sharedEvents[0];
        const conf1 = testimonyEventMap.get(eventId) ?? 1.0;
        const conf2 = otherEventMap.get(eventId) ?? 1.0;
        const confidenceMultiplier = Math.max(conf1, conf2);
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: 'same_event',
          score: 0.9 * confidenceMultiplier,
          source: `shared_event_${eventId}`,
        });
      }

      // Same relation to event (e.g., both are "Survivor" or "Witness")
      if (
        testimony.relationToEvent &&
        other.relationToEvent &&
        testimony.relationToEvent.toLowerCase().trim() ===
          other.relationToEvent.toLowerCase().trim()
      ) {
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: 'same_relation_to_event',
          score: 0.75,
          source: `shared_relation_${testimony.relationToEvent}`,
        });
      }

      // Same location — confidence-weighted
      const sharedLocations = [...testimonyLocationMap.keys()].filter((id) =>
        otherLocationMap.has(id),
      );
      if (sharedLocations.length > 0) {
        const locId = sharedLocations[0];
        const conf1 = testimonyLocationMap.get(locId) ?? 1.0;
        const conf2 = otherLocationMap.get(locId) ?? 1.0;
        const confidenceMultiplier = Math.max(conf1, conf2);
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: 'same_location',
          score: 0.8 * confidenceMultiplier,
          source: `shared_location_${locId}`,
        });
      }

      // Same person mentioned - with RelativeType consideration
      const sharedPeople: Array<{
        name: string;
        sameType: boolean;
        relativeTypeSlug?: string;
      }> = [];
      for (const [name, testimonyTypes] of testimonyPeople.entries()) {
        const otherTypes = otherPeople.get(name);
        if (otherTypes) {
          // Check if they share the same relative type
          const hasSameType = testimonyTypes.some((t) =>
            otherTypes.some((ot) => ot.relativeTypeId === t.relativeTypeId),
          );
          sharedPeople.push({
            name,
            sameType: hasSameType,
            relativeTypeSlug: testimonyTypes[0]?.relativeTypeSlug,
          });
        }
      }

      if (sharedPeople.length > 0) {
        // Higher score if same person AND same relative type
        const bestMatch =
          sharedPeople.find((p) => p.sameType) || sharedPeople[0];
        const score = bestMatch.sameType ? 0.9 : 0.85;
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: bestMatch.sameType ? 'same_person_same_type' : 'same_person',
          score,
          source: `shared_person_${bestMatch.name}${
            bestMatch.relativeTypeSlug ? `_${bestMatch.relativeTypeSlug}` : ''
          }`,
        });
      }

      // Date-based connections
      const dateConnection = this.findDateConnection(
        testimony.dateOfEventFrom,
        testimony.dateOfEventTo,
        other.dateOfEventFrom,
        other.dateOfEventTo,
      );
      if (dateConnection) {
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: dateConnection.type,
          score: dateConnection.score,
          source: dateConnection.source,
        });
      }
    }

    return edges;
  }

  /**
   * Get primary embedding (prefer fullTestimony/transcript, fallback to description)
   */
  private getPrimaryEmbedding(
    embeddings: Array<{ section: string; vector: number[] }>,
  ) {
    // Prefer fullTestimony or transcript (most complete content)
    const fullContent = embeddings.find(
      (e) => e.section === 'fullTestimony' || e.section === 'transcript',
    );
    if (fullContent) {
      return fullContent;
    }

    // Fallback to description
    const description = embeddings.find((e) => e.section === 'description');
    if (description) {
      return description;
    }

    // Last resort: title
    return embeddings.find((e) => e.section === 'title') ?? null;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const valA = vecA[i];
      const valB = vecB[i];
      if (valA === undefined || valB === undefined) {
        continue;
      }
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Find date-based connection between two testimonies
   */
  private findDateConnection(
    dateFrom1?: Date | null,
    dateTo1?: Date | null,
    dateFrom2?: Date | null,
    dateTo2?: Date | null,
  ): {
    type: string;
    score: number;
    source: string;
  } | null {
    if (!dateFrom1 || !dateFrom2) {
      return null;
    }

    // Use dateTo if available, otherwise use dateFrom as single date
    const end1 = dateTo1 || dateFrom1;
    const end2 = dateTo2 || dateFrom2;

    // Same exact date (or very close - within 1 day)
    const daysDiff1 = Math.abs(
      (dateFrom1.getTime() - dateFrom2.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysDiff2 = Math.abs(
      (end1.getTime() - end2.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff1 <= 1 && daysDiff2 <= 1) {
      return {
        type: 'same_date',
        score: 0.95,
        source: 'exact_date_match',
      };
    }

    // Same month and year
    if (
      dateFrom1.getFullYear() === dateFrom2.getFullYear() &&
      dateFrom1.getMonth() === dateFrom2.getMonth()
    ) {
      return {
        type: 'same_month',
        score: 0.8,
        source: 'same_month_year',
      };
    }

    // Same year
    if (dateFrom1.getFullYear() === dateFrom2.getFullYear()) {
      return {
        type: 'same_year',
        score: 0.7,
        source: 'same_year',
      };
    }

    // Overlapping date ranges
    if (dateTo1 && dateTo2) {
      const overlap = this.dateRangeOverlap(
        dateFrom1,
        dateTo1,
        dateFrom2,
        dateTo2,
      );
      if (overlap > 0) {
        return {
          type: 'overlapping_dates',
          score: Math.min(0.75, 0.6 + overlap * 0.15),
          source: 'date_range_overlap',
        };
      }
    }

    // Nearby dates (within 30 days)
    const minDaysDiff = Math.min(daysDiff1, daysDiff2);
    if (minDaysDiff <= 30) {
      return {
        type: 'nearby_dates',
        score: Math.max(0.5, 0.7 - minDaysDiff / 100),
        source: 'nearby_timeframe',
      };
    }

    return null;
  }

  /**
   * Calculate date range overlap (0-1, where 1 is full overlap)
   */
  private dateRangeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): number {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart >= overlapEnd) {
      return 0;
    }

    const overlapDuration = overlapEnd.getTime() - overlapStart.getTime();
    const range1Duration = end1.getTime() - start1.getTime();
    const range2Duration = end2.getTime() - start2.getTime();
    const minRange = Math.min(range1Duration, range2Duration);

    return minRange > 0 ? overlapDuration / minRange : 0;
  }

  /**
   * Get connection details with accuracy scores (0-100) for a testimony
   */
  async getConnectionDetails(testimonyId: number) {
    const edges = await this.prisma.testimonyEdge.findMany({
      where: {
        fromId: testimonyId,
      },
      include: {
        to: {
          select: {
            id: true,
            eventTitle: true,
            summary: true,
            status: true,
            isPublished: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return edges.map((edge) => ({
      edgeId: edge.id,
      testimonyId: edge.toId,
      testimony: edge.to,
      connectionType: edge.type,
      accuracyScore: Math.round(edge.score * 100), // Convert 0-1 to 0-100
      rawScore: edge.score,
      source: edge.source,
      connectionReason: this.getConnectionReason(edge.type),
      userRating: edge.userRating, // Include user rating in response
    }));
  }

  /**
   * Rate a connection quality (1-5 stars)
   * This helps improve future connection accuracy via adaptive thresholds
   */
  async rateConnection(edgeId: number, rating: number) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const edge = await this.prisma.testimonyEdge.update({
      where: { id: edgeId },
      data: { userRating: rating },
    });

    this.logger.log(
      `Connection ${edgeId} rated ${rating}/5 (type: ${edge.type}, score: ${edge.score})`,
    );

    // Log poor ratings for analysis
    if (rating <= 2) {
      this.logger.warn(
        `Poor connection rating (${rating}/5) for edge ${edgeId}: type=${edge.type}, score=${edge.score}, source=${edge.source}`,
      );
    }

    return edge;
  }

  /**
   * Get connection quality statistics based on user ratings
   * Useful for tuning thresholds and weights
   */
  async getConnectionQualityStats() {
    const stats = await this.prisma.$queryRaw<
      Array<{
        type: string;
        avg_score: number;
        avg_rating: number;
        rating_count: bigint;
        total_count: bigint;
      }>
    >`
      SELECT
        type,
        AVG(score) as avg_score,
        AVG(user_rating) as avg_rating,
        COUNT(CASE WHEN user_rating IS NOT NULL THEN 1 END) as rating_count,
        COUNT(*) as total_count
      FROM testimony_edges
      GROUP BY type
      ORDER BY avg_rating DESC NULLS LAST
    `;

    return stats.map((stat) => ({
      type: stat.type,
      avgScore: Number(stat.avg_score),
      avgUserRating: stat.avg_rating ? Number(stat.avg_rating) : null,
      ratedCount: Number(stat.rating_count),
      totalCount: Number(stat.total_count),
      ratingPercentage:
        Number(stat.total_count) > 0
          ? (Number(stat.rating_count) / Number(stat.total_count)) * 100
          : 0,
    }));
  }

  /**
   * Identify low-quality connection types based on user ratings.
   * Returns warnings for types with avg rating < 3.0 and 10+ ratings.
   */
  async getLowQualityConnectionWarnings(): Promise<
    Array<{
      type: string;
      avgRating: number;
      ratedCount: number;
      recommendation: string;
    }>
  > {
    const stats = await this.getConnectionQualityStats();

    return stats
      .filter(
        (s) =>
          s.avgUserRating !== null &&
          s.avgUserRating < 3.0 &&
          s.ratedCount >= 10,
      )
      .map((s) => ({
        type: s.type,
        avgRating: s.avgUserRating!,
        ratedCount: s.ratedCount,
        recommendation:
          s.avgUserRating! < 2.0
            ? `CRITICAL: Users rate "${s.type}" connections very poorly (${s.avgUserRating!.toFixed(1)}/5). Consider raising thresholds or disabling this type.`
            : `WARNING: "${s.type}" connections rated below average (${s.avgUserRating!.toFixed(1)}/5). Consider raising thresholds.`,
      }));
  }

  /**
   * Get human-readable reason for connection
   */
  private getConnectionReason(type: string): string {
    const reasons: Record<string, string> = {
      // Semantic similarity (tiered)
      semantic_similarity_strong:
        'Very similar content and themes (strong match)',
      semantic_similarity_moderate: 'Similar content and themes (good match)',
      semantic_similarity_weak: 'Similar content and themes (weak match)',
      semantic_similarity: 'Similar content and themes',
      // Hybrid connections
      hybrid_connection:
        'Strong connection (both semantic similarity and shared attributes)',
      // Rule-based connections
      same_event: 'Share the same event',
      same_location: 'Mention the same location',
      same_person: 'Mention the same person',
      same_person_same_type: 'Mention the same person with same relationship',
      same_relation_to_event: 'Both have the same relation to the event',
      same_date: 'Occurred on the same date',
      same_month: 'Occurred in the same month',
      same_year: 'Occurred in the same year',
      overlapping_dates: 'Overlapping time periods',
      nearby_dates: 'Occurred within 30 days',
    };

    return reasons[type] || 'Connected testimonies';
  }

  /**
   * Apply weighted hybrid scoring - combine semantic and rule-based scores
   * Includes confidence boost when both signals are strong
   */
  private applyHybridScoring(
    allEdges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }>,
    semanticEdges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }>,
    ruleBasedEdges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }>,
  ) {
    // Create maps for quick lookup
    const semanticMap = new Map<string, number>();
    const ruleBasedMap = new Map<string, number>();

    for (const edge of semanticEdges) {
      const key = `${edge.fromId}-${edge.toId}`;
      semanticMap.set(key, edge.score);
    }

    for (const edge of ruleBasedEdges) {
      const key = `${edge.fromId}-${edge.toId}`;
      const existing = ruleBasedMap.get(key);
      // Keep highest rule-based score if multiple rules match
      if (!existing || edge.score > existing) {
        ruleBasedMap.set(key, edge.score);
      }
    }

    // Calculate hybrid scores for connections that have BOTH semantic and rule-based matches
    const hybridEdges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }> = [];

    const processedKeys = new Set<string>();

    // Process all edges and calculate hybrid scores where applicable
    for (const edge of allEdges) {
      const key = `${edge.fromId}-${edge.toId}`;

      if (processedKeys.has(key)) {
        continue;
      }
      processedKeys.add(key);

      const semanticScore = semanticMap.get(key);
      const ruleScore = ruleBasedMap.get(key);

      if (semanticScore && ruleScore) {
        // Both semantic AND rule-based match - calculate hybrid score
        let hybridScore =
          semanticScore * this.SEMANTIC_WEIGHT +
          ruleScore * this.RULE_BASED_WEIGHT;

        // Apply confidence boost when both signals are strong
        if (semanticScore > 0.80 && ruleScore > 0.85) {
          hybridScore = Math.min(0.98, hybridScore * 1.05);
        }

        hybridEdges.push({
          fromId: edge.fromId,
          toId: edge.toId,
          type: 'hybrid_connection', // Indicates both semantic + rule match
          score: hybridScore,
          source: `hybrid:${edge.source}`,
        });
      } else {
        // Only one type of match - keep original
        hybridEdges.push(edge);
      }
    }

    return hybridEdges;
  }

  /**
   * Deduplicate edges, keeping the one with highest score
   */
  private deduplicateEdges(
    edges: Array<{
      fromId: number;
      toId: number;
      type: string;
      score: number;
      source: string;
    }>,
  ) {
    const edgeMap = new Map<string, (typeof edges)[0]>();

    for (const edge of edges) {
      const key = `${edge.fromId}-${edge.toId}`;
      const existing = edgeMap.get(key);

      if (!existing || edge.score > existing.score) {
        edgeMap.set(key, edge);
      }
    }

    return Array.from(edgeMap.values());
  }
}
