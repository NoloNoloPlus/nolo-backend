const Joi = require('joi').extend(require('@joi/date'));

const addRental = {
    body: Joi.object().keys({
        products: Joi.object().pattern(/^/, 
            Joi.object().keys({
                instances: Joi.object().pattern(/^/,
                    Joi.object().keys({
                        dateRanges: Joi.array().items(Joi.object().keys({
                            from: Joi.date().required()/*.format('YYYY/MM/DD').utc()*/,
                            to: Joi.date().required()/*.format('YYYY/MM/DD').utc()*/
                        }).required())
                    })
                    ).required()
            })
            ).required()
    })
}

module.exports = {
    addRental
}