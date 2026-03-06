const Joi = require('joi');

const listUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(200),
  role: Joi.string().valid('helper', 'requester', 'both', 'admin'),
});

const updateUserSchema = Joi.object({
  role: Joi.string().valid('helper', 'requester', 'both', 'admin'),
  isDeleted: Joi.boolean(),
}).min(1);

const listContentSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string(),
  category: Joi.string(),
});

module.exports = {
  listUsersSchema,
  updateUserSchema,
  listContentSchema,
};
