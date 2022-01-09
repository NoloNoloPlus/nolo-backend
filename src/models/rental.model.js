const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const discountSchema = mongoose.Schema({
    name: {type: String},
    value: {type: Number},
    description: {
        type: String,
        default: ''
    }
}, {_id: false, strict: false});

const dateRangeSchema = mongoose.Schema({
    from: {type: Date},
    to: {type: Date},
    price: {
        type: mongoose.Types.Decimal128,
        default: 0
    },
    discounts: {
        type: [discountSchema],
        default: []
    }
}, {_id: false, strict: false})

const rentedInstanceSchema = mongoose.Schema({
    dateRanges: {type: [dateRangeSchema]},
    discounts: {
        type: [discountSchema],
        default: []
    }
}, {_id: false, strict: false})

const rentedProductSchema = mongoose.Schema({
    instances: {type: Map, of: rentedInstanceSchema},
    discounts: {
        type: [discountSchema],
        default: []
    }
}, {_id: false, strict: false})

const penaltySchema = mongoose.Schema({
    value: {type: Number},
    message: {type: String}
}, {_id: false, strict: false})

const rentalSchema = mongoose.Schema({
    products: {type: Map, of: rentedProductSchema},
    userId: {type: String},
    approvedBy: {
        type: String,
        required: false,
        default: null
    },
    discounts: {
        type: [discountSchema],
        default: []
    },
    status: {
        type: String,
        enum: ['ready', 'active', 'closed'],
        default: 'ready'
    },
    penalty: {
        type: penaltySchema,
        required: false
    }
},
{
  timestamps: true,
  collection: 'rentals',
  strict: false
});

// add plugin that converts mongoose to json
rentalSchema.plugin(toJSON);
rentalSchema.plugin(paginate);

/**
 * @typedef Rental
 */
const Rental = mongoose.model('Rental', rentalSchema);

module.exports = Rental;
