const Joi = require('joi').extend(require('@joi/date'));
const { objectId } = require('./custom.validation');

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
                            to: Joi.date().required().format('YYYY-MM-DD').utc()
                        }))
                    })
                )
            })
        ),
        userId: Joi.string(),
        approvedBy: Joi.string(),
        price: Joi.number()
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