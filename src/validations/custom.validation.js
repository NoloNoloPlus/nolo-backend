const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const password = (value, helpers) => {
  if (value.length < 8) {
    return helpers.message('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.message('password must contain at least 1 letter and 1 number');
  }
  return value;
};

const paymentPreferences = Joi.array().items(Joi.string().valid(
  'barter',
)).unique()

const user = (creation, additionalFields) => {
  const streetSchema = {
    line1: Joi.string().allow(''),
    line2: Joi.string().allow('')
  }

  if (creation) {
    streetSchema.line1 = streetSchema.line1.default('');
    streetSchema.line2 = streetSchema.line2.default('');
  }

  const addressSchema = {
    street: Joi.object().keys(streetSchema),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow('')
  }

  if (creation) {
    addressSchema.street = addressSchema.street.default({
      line1: '',
      line2: ''
    });
    addressSchema.city = addressSchema.city.default('');
    addressSchema.state = addressSchema.state.default('');
    addressSchema.zip = addressSchema.zip.default('');
    addressSchema.country = addressSchema.country.default('');
  }

  const schema = {
    firstName: Joi.string(),
    lastName: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string().custom(password),
    company: Joi.string().allow(''),
    address: Joi.object().keys(addressSchema),
    avatarUrl: Joi.string().allow(''),
    paymentPreferences
  };

  if (creation) {
    schema.firstName = schema.firstName.required();
    schema.lastName = schema.lastName.required();
    schema.email = schema.email.required();
    schema.password = schema.password.required();
    schema.company = schema.company.default('');
    schema.address = schema.address.default({
      street: {
        line1: '',
        line2: ''
      },
      city: '',
      state: '',
      zip: '',
      country: ''
    });
    schema.avatarUrl = schema.avatarUrl.default(null);
    schema.paymentPreferences = schema.paymentPreferences.default([]);
  }

  return Joi.object().keys({ ...schema, ...additionalFields });
}

const discount = (required) => Joi.object().keys({
  name: required ? Joi.string().required() : Joi.string(),
  type: required ? Joi.string().valid('percentage', 'fixed', 'containsWeekend').required() : Joi.string(),
  value: required ? Joi.number().required() : Joi.number(),
  description: Joi.string()
})

const discounts = (required) => Joi.array().items(discount(required))

module.exports = {
  discounts,
  objectId,
  password,
  user
};
