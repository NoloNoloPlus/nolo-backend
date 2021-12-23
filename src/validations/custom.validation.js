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
    line1: Joi.string(),
    line2: Joi.string()
  }

  if (creation) {
    streetSchema.line1 = streetSchema.line1.default('');
    streetSchema.line2 = streetSchema.line2.default('');
  }

  const addressSchema = {
    street: Joi.object().keys(streetSchema),
    city: Joi.string(),
    state: Joi.string(),
    zip: Joi.string(),
    country: Joi.string()
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
    company: Joi.string(),
    address: Joi.object().keys(addressSchema),
    avatarUrl: Joi.string(),
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

module.exports = {
  objectId,
  password,
  user
};
