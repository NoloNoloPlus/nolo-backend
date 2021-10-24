const { Rental } = require('../models');

const addRental = async (rental) => {
    await Rental.create(rental);
};

const queryRental = async (filter, projection = {}, options = {}) => {
    const rental = await Rental.findOne(filter, projection, options);
    return rental;
};

const queryRentals = async (filter, projection, options) => {
    if (options) {
      options.projection = projection;
    }
    const products = await Rental.paginate(filter, options);
    return products;
};

module.exports = {
    addRental,
    queryRental,
    queryRentals
}