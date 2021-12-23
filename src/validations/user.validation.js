const Joi = require('joi');
const { password, objectId, user } = require('./custom.validation');

const createUser = {
  body: user(true, {
    role: Joi.string().required().valid('user', 'employee', 'manager', 'admin'),
  })
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

// TODO: A manager can't change someone else's passwords

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: user(false, {
      role: Joi.string().required().valid('user', 'employee', 'manager', 'admin'),
  })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
