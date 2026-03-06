const Joi = require('joi');

const toggleFavoriteSchema = Joi.object({
  requestId: Joi.string().hex().length(24),
  offerId: Joi.string().hex().length(24),
}).xor('requestId', 'offerId'); // Exactly one must be provided

const listFavoritesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

module.exports = {
  toggleFavoriteSchema,
  listFavoritesSchema,
};
