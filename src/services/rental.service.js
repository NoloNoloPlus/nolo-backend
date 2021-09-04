const { Rental } = require('../models');

const addRental = async (rental) => {
    await Rental.create(rental);
};

module.exports = {
    addRental
}