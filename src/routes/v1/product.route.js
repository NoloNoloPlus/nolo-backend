const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');

const router = express.Router({strict : true});

// TODO: Aggiungere gli altri verbi

router
  .route('/')
  .get(validate(productValidation.getProducts), productController.getProducts);
  //.post(auth('manageUsers'), validate(userValidation.createUser), userController.createUser)

router
  .route('/:classId')
  .get(validate(productValidation.getProduct), productController.getProduct);

// Disponibilità in senso generale
router
  .route('/:classId/availability')
  .get(validate(productValidation.getProduct), productController.getAvailability);

// Prende from e to
router
  .route('/:classId/quote')
  .get(validate(productValidation.getQuote), productController.getQuote);

// Recensioni // TODO: Fare
router
  .route('/:classId/reviews/')
  .get(validate(productValidation.getProduct), productController.getProduct);

// Lista delle istanze
router
  .route('/:classId/')
  .get(validate(productValidation.getProduct), productController.getProductInstances);

// Istanza specifica
router
  .route('/:classId/:instanceId')
  .get(validate(productValidation.getProductInstance), productController.getProductInstance);


module.exports = router;