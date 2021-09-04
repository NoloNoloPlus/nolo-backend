const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const dateRangeSchema = mongoose.Schema({
    from: {type: Date},
    to: {type: Date}
}, {_id: false})

const rentedInstanceSchema = mongoose.Schema({
    dateRanges: {type: [dateRangeSchema]}
}, {_id: false})

const rentedProductSchema = mongoose.Schema({
    instances: {type: Map, of: rentedInstanceSchema}
}, {_id: false})

const rentalSchema = mongoose.Schema({
    products: {type: Map, of: rentedProductSchema}
},
  {
    timestamps: true,
    collection: 'rentals',
  });

// add plugin that converts mongoose to json
rentalSchema.plugin(toJSON);
rentalSchema.plugin(paginate);

/**
 * @typedef Rental
 */
const Rental = mongoose.model('Rental', rentalSchema);

module.exports = Rental;
