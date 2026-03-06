const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const { authenticate } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { toggleFavoriteSchema, listFavoritesSchema } = require('../validators/favorite.validators');

/**
 * POST /favorites
 * Toggle favorite (add if not exists, remove if exists)
 */
router.post('/', authenticate, validate(toggleFavoriteSchema), async (req, res, next) => {
  try {
    const { requestId, offerId } = req.body;
    const filter = { userId: req.user.userId };
    if (requestId) filter.requestId = requestId;
    if (offerId) filter.offerId = offerId;

    const existing = await Favorite.findOne(filter);
    if (existing) {
      await existing.deleteOne();
      return res.json({ favorited: false, message: 'Removed from favorites' });
    }

    const doc = { userId: req.user.userId };
    if (requestId) doc.requestId = requestId;
    if (offerId) doc.offerId = offerId;
    const favorite = await Favorite.create(doc);

    res.status(201).json({ favorited: true, id: favorite._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ favorited: true, message: 'Already favorited' });
    }
    next(error);
  }
});

/**
 * GET /favorites
 * List user's favorites
 */
router.get('/', authenticate, validateQuery(listFavoritesSchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const total = await Favorite.countDocuments({ userId: req.user.userId });
    const favorites = await Favorite.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('requestId')
      .populate('offerId')
      .lean();

    // Populate offer user info
    const User = require('../models/User');
    const results = [];
    for (const f of favorites) {
      const item = {
        id: f._id,
        requestId: f.requestId?._id || null,
        offerId: f.offerId?._id || null,
        request: f.requestId ? {
          id: f.requestId._id,
          title: f.requestId.title,
          category: f.requestId.category,
          status: f.requestId.status,
        } : null,
        offer: null,
        createdAt: f.createdAt,
      };
      if (f.offerId) {
        const offerUser = await User.findById(f.offerId.userId).select('displayName avatarUrl').lean();
        item.offer = {
          id: f.offerId._id,
          skills: f.offerId.skills,
          isActive: f.offerId.isActive,
          user: offerUser ? { displayName: offerUser.displayName, avatarUrl: offerUser.avatarUrl } : null,
        };
      }
      results.push(item);
    }

    res.json({
      favorites: results,
      pagination: { page, limit, total, hasMore: skip + limit < total },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /favorites/:id
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!favorite) return res.status(404).json({ error: 'Favorite not found' });
    res.json({ message: 'Favorite removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
