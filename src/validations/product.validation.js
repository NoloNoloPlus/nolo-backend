const Joi = require('joi').extend(require('@joi/date'));

const getProducts = {
  query: Joi.object().keys({
    keywords: Joi.string().default('').allow(''),
    stars: Joi.number().default(0),
    sortBy: Joi.string().valid('name', 'description', 'stars', 'updatedAt', 'createdAt').default('name'),
    ascending: Joi.bool().default(true),
    limit: Joi.number().default(20),
    page: Joi.number().default(1),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    classId: Joi.string().required(),
  }),
};

const getProductInstance = {
  params: Joi.object().keys({
    classId: Joi.string().required(),
    instanceId: Joi.string().required(),
  }),
};

const getQuote = {
  params: Joi.object().keys({
    classId: Joi.string().required(),
  }),
  query: Joi.object().keys({
    from: Joi.date().format('YYYY-MM-DD').utc().required(),
    to: Joi.date().format('YYYY-MM-DD').utc().required(),
  }),
};

const instanceSchema = Joi.object().keys({
  availability: Joi.array().items(Joi.object().keys({
    from: Joi.date().format('YYYY-MM-DD').utc().required(),
    to: Joi.date().format('YYYY-MM-DD').utc().required(),
    price: Joi.number()
  })).required()
})

const addProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().default(null),
    stars: Joi.number().default(-1),
    coverImage: Joi.string().default(null),
    otherImages: Joi.array().items(Joi.string()).default([]),
    instances: Joi.object().pattern(Joi.string(), instanceSchema).default([])
  })
}

module.exports = {
  getProducts,
  getProduct,
  getProductInstance,
  getQuote,
  addProduct
};
