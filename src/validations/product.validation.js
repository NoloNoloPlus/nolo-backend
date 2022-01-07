const Joi = require('joi').extend(require('@joi/date'));
const { discounts, objectId } = require('./custom.validation');

const getProducts = {
  query: Joi.object().keys({
    keywords: Joi.string().default('').allow(''),
    stars: Joi.number().default(0),
    sortBy: Joi.string().valid('name', 'description', 'stars', 'updatedAt', 'createdAt').default('name'),
    ascending: Joi.bool().default(true),
    limit: Joi.number().default(200),
    page: Joi.number().default(1),
  }),
};

const getProduct = {
  params: Joi.object().keys({
    classId: Joi.custom(objectId).required(),
  }),
};

const getProductInstance = {
  params: Joi.object().keys({
    classId: Joi.custom(objectId).required(),
    instanceId: Joi.string().required(),
  }),
};

const getQuote = {
  params: Joi.object().keys({
    classId: Joi.custom(objectId).required(),
  }),
  query: Joi.object().keys({
    from: Joi.date().format('YYYY-MM-DD').utc().required(),
    to: Joi.date().format('YYYY-MM-DD').utc().required(),
    exchangeCost: Joi.number().default(2000),
    ignoreAllRentals: Joi.bool().default(false),
    ignoreRental: Joi.string().empty('').default(null)
  })
};

const log = (creation) => {
  const schema = {
    type: Joi.string().valid('broken', 'repaired', 'worn'),
    description: Joi.string().allow(''),
    date: Joi.date().format('YYYY-MM-DD').utc(),
    by: Joi.string()
  };

  if (creation) {
    schema.type = schema.type.required();
    schema.description = schema.description.default('');
    schema.date = schema.date.required();
    schema.by = schema.by.required();
  }

  return Joi.object().keys(schema);
}

const logs = (creation) => Joi.array().items(log(creation));

const instance = creation => {
  const base = creation ? Joi : Joi.allow('$delete')
  const dateRangeSchema = {
    from: Joi.date().format('YYYY-MM-DD').utc(),
    to: Joi.date().format('YYYY-MM-DD').utc(),
    price: Joi.number(),
    discounts: discounts(creation),
  }

  if (creation) {
    dateRangeSchema.from = dateRangeSchema.from.required();
    dateRangeSchema.to = dateRangeSchema.to.required();
    dateRangeSchema.price = dateRangeSchema.price.required();
    dateRangeSchema.discounts = dateRangeSchema.discounts.default([]);
  }

  const instanceSchema = {
    availability: Joi.array().items(dateRangeSchema),
    discounts: discounts(creation),
    name: Joi.string(),
    logs: logs(creation),
    currentStatus: Joi.string().valid('new', 'worn', 'broken', 'repairing', 'obliterated'),
  }

  if (creation) {
    instanceSchema.availability = instanceSchema.availability.required();
    instanceSchema.discounts = instanceSchema.discounts.default([]);
    instanceSchema.name = instanceSchema.name.required();
    instanceSchema.logs = instanceSchema.logs.default([]);
    instanceSchema.currentStatus = instanceSchema.currentStatus.default('new');
  }
  else {
    instanceSchema.availability = instanceSchema.availability.allow('$delete');
    instanceSchema.discounts = instanceSchema.discounts.allow('$delete');
    instanceSchema.name = instanceSchema.name.allow('$delete');
    instanceSchema.logs = instanceSchema.logs.allow('$delete');
    instanceSchema.currentStatus = instanceSchema.currentStatus.allow('$delete');
  }

  return Joi.object().keys(instanceSchema);
}

const addProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().default('No description provided').allow(''),
    stars: Joi.number().default(0),
    coverImage: Joi.string().default(''),
    otherImages: Joi.array().items(Joi.string()).default([]),
    instances: Joi.object().pattern(Joi.string(), instance(true)).default({}),
    discounts: discounts(false).default([])
  })
}

const updateProduct = {
  body: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    stars: Joi.number(),
    coverImage: Joi.string().allow(''),
    otherImages: Joi.array().items(Joi.string()),
    instances: Joi.object().pattern(Joi.string(), instance(false).allow('$delete')),
    discounts: discounts(false)
  }),
  params: Joi.object().keys({
    classId: Joi.custom(objectId).required()
  })
}

const deleteProduct = {
  params: Joi.object().keys({
    classId: Joi.custom(objectId).required()
  })
}

module.exports = {
  getProducts,
  getProduct,
  getProductInstance,
  getQuote,
  addProduct,
  updateProduct,
  deleteProduct
};
