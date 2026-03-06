const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserContact = require('../models/UserContact');
const Request = require('../models/Request');
const Offer = require('../models/Offer');
const Match = require('../models/Match');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { validateQuery, validate } = require('../middleware/validate');
const { listUsersSchema, updateUserSchema, listContentSchema } = require('../validators/admin.validators');

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

/**
 * GET /admin/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [userCount, requestCount, offerCount, matchCount, activeUsers] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Request.countDocuments(),
      Offer.countDocuments(),
      Match.countDocuments(),
      User.countDocuments({ isDeleted: false, updatedAt: { $gte: thirtyDaysAgo } }),
    ]);

    res.json({ userCount, requestCount, offerCount, matchCount, activeUsers });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/users
 */
router.get('/users', validateQuery(listUsersSchema), async (req, res, next) => {
  try {
    const { page, limit, search, role } = req.query;
    const filter = { isDeleted: false };

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get emails for these users
    const userIds = users.map(u => u._id);
    const contacts = await UserContact.find({ userId: { $in: userIds } }).lean();
    const contactMap = {};
    contacts.forEach(c => { contactMap[c.userId.toString()] = c; });

    const results = users.map(u => ({
      id: u._id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      email: contactMap[u._id.toString()]?.primaryEmail || '',
      createdAt: u.createdAt,
    }));

    res.json({
      users: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: skip + limit < total },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /admin/users/:id
 */
router.patch('/users/:id', validate(updateUserSchema), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.role) updates.role = req.body.role;
    if (req.body.isDeleted !== undefined) updates.isDeleted = req.body.isDeleted;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ id: user._id, displayName: user.displayName, role: user.role, isDeleted: user.isDeleted });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/requests
 */
router.get('/requests', validateQuery(listContentSchema), async (req, res, next) => {
  try {
    const { page, limit, status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const total = await Request.countDocuments(filter);
    const skip = (page - 1) * limit;
    const requests = await Request.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const userIds = [...new Set(requests.map(r => r.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const results = requests.map(r => ({
      id: r._id,
      title: r.title,
      category: r.category,
      status: r.status,
      userName: userMap[r.userId.toString()]?.displayName || 'Unknown',
      createdAt: r.createdAt,
    }));

    res.json({
      requests: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: skip + limit < total },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/requests/:id
 */
router.delete('/requests/:id', async (req, res, next) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/offers
 */
router.get('/offers', validateQuery(listContentSchema), async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const total = await Offer.countDocuments();
    const skip = (page - 1) * limit;
    const offers = await Offer.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const userIds = [...new Set(offers.map(o => o.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const results = offers.map(o => ({
      id: o._id,
      skills: o.skills,
      isActive: o.isActive,
      userName: userMap[o.userId.toString()]?.displayName || 'Unknown',
      createdAt: o.createdAt,
    }));

    res.json({
      offers: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: skip + limit < total },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/offers/:id
 */
router.delete('/offers/:id', async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    res.json({ message: 'Offer deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
