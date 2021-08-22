const Joi = require('joi')
  .extend(require('@joi/date'));

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

const getProduct = {
  params: Joi.object().keys({
    classId: Joi.string().required()
  }),
};

const getProductInstance = {
  params: Joi.object().keys({
    classId: Joi.string().required(),
    instanceId: Joi.string().required()
  }),
};

const getQuote = {
  params: Joi.object().keys({
    classId: Joi.string().required(),
  }),
    query: Joi.object().keys( {
    from: Joi.date().format('YYYY/MM/DD').utc().required(),
    to: Joi.date().format('YYYY/MM/DD').utc().required()
  })
}

module.exports = {
    getProducts,
    getProduct,
    getProductInstance,
    getQuote
};
