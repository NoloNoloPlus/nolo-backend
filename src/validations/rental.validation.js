const Joi = require('joi').extend(require('@joi/date'));
const { discounts, objectId } = require('./custom.validation');

const addRental = {
    body: Joi.object().keys({
        products: Joi.object().pattern(/^/, 
            Joi.object().keys({
                instances: Joi.object().pattern(/^/,
                    Joi.object().keys({
                        dateRanges: Joi.array().items(Joi.object().keys({
                            from: Joi.date().required().format('YYYY-MM-DD').utc().required(),
                            to: Joi.date().required().format('YYYY-MM-DD').utc().required(),
                            discounts: discounts(true).default([])
                        }).required()),
                        discounts: discounts(true).default([])
                    })
                    ).required(),
                discounts: discounts(true).default([])
            })
            ).required(),
        userId: Joi.string(),
        approvedBy: Joi.string(),
        discounts: discounts(true).default([])
    })
}

const getRental = {
    params: Joi.object().keys({
        rentalId: Joi.custom(objectId).required()
    })
}

const getRentals = {
    query: Joi.object().keys({
        userId: Joi.string(),
        products: Joi.array().items(Joi.string()),
        sortBy: Joi.string().valid('createdAt', 'updatedAt').default('createdAt'),
        ascending: Joi.bool().default(true),
        limit: Joi.number().default(20),
        page: Joi.number().default(1)
    })
};

const updateRental = {
    body: Joi.object().keys({
        products: Joi.object().pattern(/^/, 
            Joi.object().keys({
                instances: Joi.object().pattern(/^/,
                    Joi.object().keys({
                        dateRanges: Joi.array().items(Joi.object().keys({
                            from: Joi.date().required().format('YYYY-MM-DD').utc(),
                            to: Joi.date().required().format('YYYY-MM-DD').utc(),
                            discounts: discounts(false)
                        })),
                        discounts: discounts(false)
                    })
                ),
                discounts: discounts(false)
            })
        ),
        userId: Joi.string(),
        approvedBy: Joi.string(),
        discounts: discounts(false)
    }),
    params: Joi.object().keys({
        rentalId: Joi.custom(objectId).required()
    })
}

const deleteRental = {
    params: Joi.object().keys({
      rentalId: Joi.custom(objectId).required()
    })
}

module.exports = {
    addRental,
    getRental,
    getRentals,
    updateRental,
    deleteRental
}