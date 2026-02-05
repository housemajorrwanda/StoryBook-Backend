import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestimonyConnectionService {
  private readonly logger = new Logger(TestimonyConnectionService.name);

  // Enhanced tiered similarity thresholds for better accuracy
  private readonly SIMILARITY_THRESHOLD_STRONG = 0.85; // Strong connection
  private readonly SIMILARITY_THRESHOLD_MODERATE = 0.75; // Moderate connection
  private readonly SIMILARITY_THRESHOLD_WEAK = 0.70; // Weak connection (minimum)
  private readonly SIMILARITY_THRESHOLD = this.SIMILARITY_THRESHOLD_MODERATE; // Default to moderate

  private readonly MAX_CONNECTIONS_PER_TESTIMONY = 10;

  // Weighted hybrid scoring configuration
  private readonly SEMANTIC_WEIGHT = 0.6; // 60% weight on semantic similarity
  private readonly RULE_BASED_WEIGHT = 0.4; // 40% weight on rule-based matches

  constructor(private readonly prisma: PrismaService) {}

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

      if (!testimony || testimony.embeddings.length === 0) {
        this.logger.warn(
          `No embeddings found for testimony ${testimonyId}, skipping connection discovery`,
        );
        return;
      }

      // Get all other approved testimonies with embeddings
      const otherTestimonies = await this.prisma.testimony.findMany({
        where: {
          id: { not: testimonyId },
          status: 'approved',
          isPublished: true,
          embeddings: { some: {} },
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
          `No other testimonies with embeddings found for comparison`,
        );
        return;
      }

      const edges: Array<{
        fromId: number;
        toId: number;
        type: string;
        score: number;
        source: string;
      }> = [];

      // 1. Semantic similarity based on embeddings
      const semanticEdges = this.findSemanticConnections(
        testimony,
        otherTestimonies,
      );
      edges.push(...semanticEdges);

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

      // Create edges in database
      if (uniqueEdges.length > 0) {
        await this.prisma.testimonyEdge.createMany({
          data: uniqueEdges,
          skipDuplicates: true,
        });
        this.logger.log(
          `Created ${uniqueEdges.length} connections for testimony ${testimonyId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to discover connections for testimony ${testimonyId}`,
        error as Error,
      );
    }
  }

  /**
   * Find semantic connections using multi-vector embedding similarity
   * Improved version: compares ALL embedding sections and uses weighted average
   */
  private findSemanticConnections(
    testimony: {
      id: number;
      embeddings: Array<{ section: string; vector: number[] }>;
    },
    otherTestimonies: Array<{
      id: number;
      embeddings: Array<{ section: string; vector: number[] }>;
    }>,
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

      // Multi-vector comparison across all sections
      const similarity = this.calculateMultiVectorSimilarity(
        testimony.embeddings,
        other.embeddings,
      );

      // Determine connection strength based on tiered thresholds
      let connectionType = 'semantic_similarity';
      let source = 'multi_vector_comparison';

      if (similarity >= this.SIMILARITY_THRESHOLD_STRONG) {
        connectionType = 'semantic_similarity_strong';
        source = 'multi_vector_strong';
      } else if (similarity >= this.SIMILARITY_THRESHOLD_MODERATE) {
        connectionType = 'semantic_similarity_moderate';
        source = 'multi_vector_moderate';
      } else if (similarity >= this.SIMILARITY_THRESHOLD_WEAK) {
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
   */
  private findRuleBasedConnections(
    testimony: {
      id: number;
      relationToEvent?: string | null;
      events: Array<{ eventId: number }>;
      locations: Array<{ locationId: number }>;
      relatives: Array<{
        personName: string;
        relativeTypeId: number;
        relativeType?: { id: number; slug: string; displayName: string } | null;
      }>;
      dateOfEventFrom?: Date | null;
      dateOfEventTo?: Date | null;
    },
    otherTestimonies: Array<{
      id: number;
      relationToEvent?: string | null;
      events: Array<{ eventId: number }>;
      locations: Array<{ locationId: number }>;
      relatives: Array<{
        personName: string;
        relativeTypeId: number;
        relativeType?: { id: number; slug: string; displayName: string } | null;
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

    const testimonyEventIds = new Set(testimony.events.map((e) => e.eventId));
    const testimonyLocationIds = new Set(
      testimony.locations.map((l) => l.locationId),
    );
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
      const otherEventIds = new Set(other.events.map((e) => e.eventId));
      const otherLocationIds = new Set(
        other.locations.map((l) => l.locationId),
      );
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

      // Same event
      const sharedEvents = [...testimonyEventIds].filter((id) =>
        otherEventIds.has(id),
      );
      if (sharedEvents.length > 0) {
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: 'same_event',
          score: 0.9,
          source: `shared_event_${sharedEvents[0]}`,
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

      // Same location
      const sharedLocations = [...testimonyLocationIds].filter((id) =>
        otherLocationIds.has(id),
      );
      if (sharedLocations.length > 0) {
        edges.push({
          fromId: testimony.id,
          toId: other.id,
          type: 'same_location',
          score: 0.8,
          source: `shared_location_${sharedLocations[0]}`,
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
   * This helps improve future connection accuracy
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
   * This gives more accurate overall connection scores
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
        const hybridScore =
          semanticScore * this.SEMANTIC_WEIGHT +
          ruleScore * this.RULE_BASED_WEIGHT;

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
