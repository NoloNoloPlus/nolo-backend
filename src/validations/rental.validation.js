const Joi = require('joi').extend(require('@joi/date'));

const addRental = {
    body: Joi.object().keys({
        products: Joi.object().pattern(/^/, 
            Joi.object().keys({
                instances: Joi.object().pattern(/^/,
                    Joi.object().keys({
                        dateRanges: Joi.array().items(Joi.object().keys({
                            from: Joi.date().required().format('YYYY-MM-DD').utc().required(),
                            to: Joi.date().required().format('YYYY-MM-DD').utc().required()
                        }).required())
                    })
                    ).required()
            })
            ).required(),
        userId: Joi.string(),
        approvedBy: Joi.string(),
        price: Joi.number()
    })
}

const getRental = {
    params: Joi.object().keys({
        rentalId: Joi.string().required()
    })
}

const getRentals = {
    query: Joi.object().keys({
        sortBy: Joi.string().valid('createdAt', 'updatedAt').default('createdAt'),
        ascending: Joi.bool().default(true),
        limit: Joi.number().default(20),
        page: Joi.number().default(1)
    })
};

module.exports = {
    addRental,
    getRental,
    getRentals
}