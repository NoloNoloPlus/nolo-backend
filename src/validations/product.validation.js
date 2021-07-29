const Joi = require('joi');

const getProducts = {
  query: Joi.object().keys({
    keywords: Joi.string().default(''),
    stars: Joi.number().default(0),
    sortBy: Joi.string().default('name'),
    ascending: Joi.bool().default(true),
    limit: Joi.number().default(20),
    page: Joi.number().default(1)
  }),
};

module.exports = {
    getProducts
};
