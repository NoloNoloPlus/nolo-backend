const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { productService, rentalService } = require('../services');

const verifyRights = require('../utils/verifyRights');
const Decimal = require('decimal.js');

const { validRentedRanges, computeRentability } = require('../utils/ranges');
const { harmonizeResult, mapToObjectRec } = require('../utils/misc');

const pick = require('../utils/pick');

const verifyRentalRights = (user, rental, allowEmptyDiscounts) => {
    if (!verifyRights(user, ['manageRentals'])) {
        const manageRentalsParameters = ['userId', 'approvedBy', 'status', 'penalty'];

        for (const parameter of manageRentalsParameters) {
            if (rental[parameter]) {
                throw new ApiError(httpStatus.FORBIDDEN, `Parameter "${parameter}" requires "manageRentals" capability.`)
            }
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

const preprocessRental = async (req, rental, ignoreRental) => {
    let currentRentals = mapToObjectRec((await rentalService.queryRentals()).results);

    if (ignoreRental) {
        currentRentals = currentRentals.filter(rental => rental._id != ignoreRental);
    }

    for (const [productId, productRental] of Object.entries(rental.products)) {
        const currentProductResult = await productService.queryProduct({ _id: productId })
        if (!currentProductResult) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Product ${productId} not found.`)
        }

        const currentProduct = mapToObjectRec(currentProductResult);

        for (const [instanceId, instanceRental] of Object.entries(productRental.instances)) {
            if (!currentProduct.instances[instanceId]) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Instance ${instanceId} for product ${productId} not found.`)
            }

            const currentInstance = currentProduct.instances[instanceId];

            validRentedRanges(currentInstance.availability, instanceRental.dateRanges, productId, instanceId, 'available')

            const rentability = await computeRentability(productId, instanceId, currentProduct.instances[instanceId], currentRentals);

            validRentedRanges(rentability, instanceRental.dateRanges, productId, instanceId, 'rentable')

            for (let i = 0; i < instanceRental.dateRanges.length; i++) {
                let matchingDateRange = null;
                for (const currentDateRange of currentInstance.availability) {
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

    return rental;
}

const addRental = catchAsync(async (req, res) => {
    const rental = req.body;

    verifyRentalRights(req.user, rental, true);

    const preprocessedRental = await preprocessRental(req, rental);

    rentalService.addRental(preprocessedRental);

    res.status(httpStatus.CREATED).send(harmonizeResult(preprocessedRental));
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
    // TODO: Add more filters
    const filter = pick(req.query, ['userId']);
    
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

    const result = await rentalService.updateRental(filter, rental);
    res.send(harmonizeResult(result));
})

const updateRentalPreprocessed = catchAsync(async (req, res) => {
    const { rentalId } = req.params;

    const filter = {
        _id: rentalId
    }

    const rental = req.body;

    verifyRentalRights(req.user, rental, false);

    const preprocessedRental = await preprocessRental(req, rental, rentalId);
    preprocessedRental.approvedBy = null;

    const result = await rentalService.updateRental(filter, );
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

const closeRental = catchAsync(async (req, res) => {
    const { rentalId } = req.params;
    const { penaltyValue, penaltyMessage } = req.query;

    const filter = {
        _id: rentalId
    }

    if ((penaltyValue && !penaltyMessage) || (!penaltyValue && penaltyMessage)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot use one of [penaltyValue, penaltyMessage] without the other one.');
    }

    const rental = mapToObjectRec(await rentalService.queryRental(filter));

    if (!rental) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Rental id not found.');
    }

    if (rental.status == 'closed') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Rental is already closed.');
    }

    if (penaltyValue) {
        rental.penalty = {
            value: penaltyValue,
            message: penaltyMessage
        };
    }

    rental.status = 'closed';

    await rentalService.updateRental(filter, rental);
    res.send(harmonizeResult(rental));
})


module.exports = {
    addRental,
    getRental,
    getRentals,
    updateRental,
    updateRentalPreprocessed,
    deleteRental,
    closeRental
}