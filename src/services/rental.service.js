const { Rental } = require('../models');

const addRental = async (rental) => {
    await Rental.create(rental);
};

const queryRental = async (filter, projection = {}, options = {}) => {
    const rental = await Rental.findOne(filter, projection, options);
    return rental;
  };

module.exports = {
    addRental,
    queryRental
}