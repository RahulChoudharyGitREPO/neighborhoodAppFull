const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

/**
 * GET /friends
 * Get friends list derived from matches (people you've interacted with).
 * Query: ?role=helper|requester (optional filter)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { role } = req.query;

    // Find all non-cancelled matches for this user
    const matchFilter = {
      $or: [{ requesterId: userId }, { helperId: userId }],
      status: { $in: ['active', 'completed', 'in-progress', 'arrived', 'en-route', 'enroute'] },
    };

    const matches = await Match.find(matchFilter)
      .populate('requesterId', 'displayName avatarUrl bio skills role')
      .populate('helperId', 'displayName avatarUrl bio skills role')
      .populate('requestId', 'title category status')
      .sort({ updatedAt: -1 })
      .lean();

    // Build a map of unique friends with their relationship
    const friendMap = new Map();

    for (const match of matches) {
      const isRequester = match.requesterId?._id?.toString() === userId;
      const friendUser = isRequester ? match.helperId : match.requesterId;
      const friendId = friendUser?._id?.toString();

      if (!friendId || friendId === userId) continue;

      if (!friendMap.has(friendId)) {
        friendMap.set(friendId, {
          id: friendId,
          displayName: friendUser.displayName,
          avatarUrl: friendUser.avatarUrl || '',
          bio: friendUser.bio || '',
          skills: friendUser.skills || [],
          userRole: friendUser.role || null,
          relationship: isRequester ? 'helper' : 'requester', // helper = they helped me, requester = I helped them
          matchCount: 1,
          lastMatchId: match._id,
          lastMatchStatus: match.status,
          lastRequest: match.requestId ? {
            id: match.requestId._id,
            title: match.requestId.title,
            category: match.requestId.category,
          } : null,
          lastInteraction: match.updatedAt,
        });
      } else {
        const existing = friendMap.get(friendId);
        existing.matchCount += 1;
        // If they've been both helper and requester, mark as 'both'
        if (
          (existing.relationship === 'helper' && !isRequester) ||
          (existing.relationship === 'requester' && isRequester)
        ) {
          existing.relationship = 'both';
        }
        // Update last interaction if newer
        if (new Date(match.updatedAt) > new Date(existing.lastInteraction)) {
          existing.lastInteraction = match.updatedAt;
          existing.lastMatchId = match._id;
          existing.lastMatchStatus = match.status;
          existing.lastRequest = match.requestId ? {
            id: match.requestId._id,
            title: match.requestId.title,
            category: match.requestId.category,
          } : null;
        }
      }
    }

    let friends = Array.from(friendMap.values());

    // Filter by role if specified
    if (role === 'helper') {
      friends = friends.filter(f => f.relationship === 'helper' || f.relationship === 'both');
    } else if (role === 'requester') {
      friends = friends.filter(f => f.relationship === 'requester' || f.relationship === 'both');
    }

    // Sort by last interaction
    friends.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime());

    res.json({ friends, total: friends.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /friends/:friendId/matches
 * Get match history with a specific friend
 */
router.get('/:friendId/matches', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { friendId } = req.params;

    const matches = await Match.find({
      $or: [
        { requesterId: userId, helperId: friendId },
        { requesterId: friendId, helperId: userId },
      ],
      status: { $nin: ['cancelled'] },
    })
      .populate('requestId', 'title category status')
      .sort({ createdAt: -1 })
      .lean();

    const Thread = require('../models/Thread');
    const results = await Promise.all(
      matches.map(async (match) => {
        const thread = await Thread.findOne({ matchId: match._id }).select('_id').lean();
        return {
          id: match._id,
          requestTitle: match.requestId?.title || 'Unknown',
          category: match.requestId?.category || '',
          status: match.status,
          chatThreadId: thread?._id || null,
          createdAt: match.createdAt,
        };
      })
    );

    res.json({ matches: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
