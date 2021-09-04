const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const availabilityElementSchema = mongoose.Schema({
  from: {
    type: Date,
    required: true
  },
  to: {
    type: Date,
    required: true
  },
  price: {type: mongoose.Types.Decimal128}
}, {_id: false})

const instanceSchema = mongoose.Schema({
  availability: {
    type: [availabilityElementSchema],
  }
}, {_id: false, strict: false})

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    stars: {
      type: Number,
    },
    coverImage: {
      type: String,
    },
    otherImages: {
      type: [String],
    },
    instances: {
      type: Map,
      of: instanceSchema
    }
  },
  {
    timestamps: true,
    collection: 'products'
  }
);

// add plugin that converts mongoose to json
productSchema.plugin(toJSON);
productSchema.plugin(paginate);

/**
 * @typedef Product
 */
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
