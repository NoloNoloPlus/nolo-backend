const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService, rentalService } = require('../services');

const verifyRights = require('../utils/verifyRights');
const Decimal = require('decimal.js');

const { validRentedRanges, computeRentabilities } = require('../utils/ranges');
const { harmonizeResult } = require('../utils/misc');

const pick = require('../utils/pick');





const computeDateRangePrice = (dateRange, availability) => {
    let totalPrice = new Decimal(0);
    const prices = {};

    for (let availabilityRange of availability) {
        for (let availabilityDay = new Date(availabilityRange.from); availabilityDay <= availabilityRange.to; availabilityDay.setDate(availabilityDay.getDate() + 1)) {
            console.log('Price: ', availabilityRange.price.toString())
            prices[availabilityDay] = new Decimal(availabilityRange.price.toString());
        }
    }

    console.log('DateRange:', dateRange)

    for (let currentDay = new Date(dateRange.from); currentDay <= dateRange.to; currentDay.setDate(currentDay.getDate() + 1)) {
        totalPrice = Decimal.sum(totalPrice, prices[currentDay]);
    }

    return totalPrice;
}

const verifyRentalRights = (user, rental, allowEmptyDiscounts) => {
    if (!verifyRights(user, ['manageRentals'])) {
        if (rental.userId) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "userId" requires "manageRentals" capability.')
        }
        if (rental.approvedBy) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "approvedBy" requires "manageRentals" capability.')
        }

        const checkDiscounts = (discounts) => {
            if (discounts && !(discounts.length == 0 && allowEmptyDiscounts)) {
                throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "discounts" requires "manageRentals" capability.')
            }
        }

        checkDiscounts(rental.discounts)

        for (const productRental of Object.values(rental.products)) {
            checkDiscounts(productRental.discounts)

            for (const rentalInstance of Object.values(productRental.instances)) {
                checkDiscounts(rentalInstance.discounts)

                for (const dateRange of Object.values(rentalInstance.dateRanges)) {
                    checkDiscounts(dateRange.discounts)

                    if (dateRange.price) {
                        throw new ApiError(httpStatus.UNAUTHORIZED, 'Parameter "price" requires "manageRentals" capability.')
                    }
                }
            }
        }
    }
}

const addRental = catchAsync(async (req, res) => {
    const rental = req.body;

    verifyRentalRights(req.user, rental, true);

    console.log(req.body);

    for (const [productId, productRental] of Object.entries(rental.products)) {
        const currentProduct = (await productService.queryProduct({ _id: productId }));

        if (!currentProduct) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Product ${productId} not found.`)
        }

        const currentProductData = currentProduct.toObject();
        /*console.log('Current product: ', currentProductData)
        console.log('Current instances: ', currentProductData.instances)*/

        for (const [instanceId, instanceRental] of Object.entries(productRental.instances)) {
            if (!currentProductData.instances.get(instanceId)) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Instance ${instanceId} for product ${productId} not found.`)
            }

            const currentInstanceAvailability = currentProductData.instances.get(instanceId).toObject().availability;

            /*console.log('instanceId: ', instanceId)
            console.log('instanceRental: ', instanceRental);
            console.log('Product instances: ', currentProduct.instances)*/
            console.log('Current instance availability: ', currentInstanceAvailability)
            validRentedRanges(currentInstanceAvailability, instanceRental.dateRanges, productId, instanceId, 'available')

            const rentability = (await computeRentabilities(productId, { [instanceId]: { availability: currentInstanceAvailability }}, instanceRental.dateRanges))[instanceId];

            console.log('Rentability:', rentability)

            // TODO: Check if the rentability is valid
            validRentedRanges(rentability, instanceRental.dateRanges, productId, instanceId, 'rentable')

            for (let i = 0; i < instanceRental.dateRanges.length; i++) {
                let matchingDateRange = null;
                for (const currentDateRange of currentInstanceAvailability) {
                    if (instanceRental.dateRanges[i].from >= currentDateRange.from && instanceRental.dateRanges[i].to <= currentDateRange.to) {
                        if (matchingDateRange) {
                            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Date range ${instanceRental.dateRanges[i].from} - ${instanceRental.dateRanges[i].to} has multiple matching instance dateRanges.`);
                        }
                        
                        matchingDateRange = currentDateRange;
                    }
                }

                if (!matchingDateRange) {
                    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Date range ${instanceRental.dateRanges[i].from} - ${instanceRental.dateRanges[i].to} has no matching instance dateRanges.`);
                }

                instanceRental.dateRanges[i].price = instanceRental.dateRanges[i].price || matchingDateRange.price;
            }
        }
    }

    rental.userId = req.body.userId || req.user.id;
    rental.approvedBy = req.body.approvedBy || null;

    rentalService.addRental(rental);

    // TODO: Non contiene price, sistemare harmonization
    res.status(httpStatus.CREATED).send(harmonizeResult(rental));
})

const getRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    };
    let result = await rentalService.queryRental(filter);

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Rental id not found');
    }

    res.send(harmonizeResult(result));
})

const getRentals = catchAsync(async (req, res) => {
    // TODO: Add filters
    const filter = {
    };
    
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const result = await rentalService.queryRentals(filter, null, options);
    res.send(harmonizeResult(result));
})

const updateRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    }

    const rental = req.body;

    verifyRentalRights(req.user, rental, false);

    // TODO: Updating rentals should change the availability of the products

    const result = await rentalService.updateRental(filter, rental);
    res.send(harmonizeResult(result));
})

const deleteRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    }

    const result = await rentalService.deleteRental(filter);
    res.send(harmonizeResult(result));
})

module.exports = {
    addRental,
    getRental,
    getRentals,
    updateRental,
    deleteRental
}