const { Rental } = require('../models');

const addRental = async (rental) => {
    return Rental.create(rental);
};

const queryRental = async (filter, projection = {}, options = {}) => {
    return Rental.findOne(filter, projection, options);
};

const queryRentals = async (filter, projection, options) => {
    if (options) {
      options.projection = projection;
    }
    return Rental.paginate(filter, options);
};

const updateRental = async (filter, rental) => {
    return Rental.findOneAndUpdate(filter, rental);
};

const deleteRental = async (filter) => {
    return Rental.findOneAndDelete(filter);
};

module.exports = {
    addRental,
    queryRental,
    queryRentals,
    updateRental,
    deleteRental
}