const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    default: undefined,
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    default: undefined,
  },
}, {
  timestamps: true,
});

// Partial filter ensures index only applies when the field actually exists
favoriteSchema.index(
  { userId: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $exists: true } } }
);
favoriteSchema.index(
  { userId: 1, offerId: 1 },
  { unique: true, partialFilterExpression: { offerId: { $exists: true } } }
);

module.exports = mongoose.model('Favorite', favoriteSchema);
