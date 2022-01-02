const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const discountSchema = mongoose.Schema({
  name: { type: String },
  value: { type: Number },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'containsWeekend']
  },
}, { _id: false });

const logSchema = mongoose.Schema({
  type: {
    type: String,
    enum: ['broken', 'repaired', 'worn'],
  },
  description: {
    type: String,
    default: '',
  },
  date: {
    type: Date
  },
  by: {
    type: String,
  }
}, { _id: false });

const availabilityElementSchema = mongoose.Schema({
  from: {
    type: Date,
    required: true
  },
  to: {
    type: Date,
    required: true
  },
  price: {type: mongoose.Types.Decimal128},
  discounts: {
    type: [discountSchema],
    default: []
  }
}, {_id: false})

const instanceSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  availability: {
    type: [availabilityElementSchema],
  },
  discounts: {
    type: [discountSchema],
    default: []
  },
  logs: {
    type: [logSchema],
    default: []
  },
  currentStatus: {
    type: String,
    enum: ['new', 'worn', 'broken', 'repairing', 'obliterated'],
    default: 'new'
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
      required: false,
      default: ''
    },
    otherImages: {
      type: [String],
    },
    instances: {
      type: Map,
      of: instanceSchema
    },
    discounts: {
      type: [discountSchema],
      default: []
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
