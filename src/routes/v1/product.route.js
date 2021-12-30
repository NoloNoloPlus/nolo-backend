const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const productValidation = require('../../validations/product.validation');
const productController = require('../../controllers/product.controller');

const router = express.Router({ strict: true });

// TODO: Aggiungere gli altri verbi

router
  .route('/')
  .get(validate(productValidation.getProducts), productController.getProducts)
  .post(auth('manageProducts'), validate(productValidation.addProduct), productController.addProduct);

router.route('/:classId')
  .get(validate(productValidation.getProduct), productController.getProduct)
  .put(auth('manageProducts'), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(auth('manageProducts'), validate(productValidation.deleteProduct), productController.deleteProduct);

// Disponibilità in senso generale
router.route('/:classId/rentability')
  .get(validate(productValidation.getProduct), productController.getRentability);

// Prende from e to
router.route('/:classId/quote')
  .get(validate(productValidation.getQuote), productController.getQuote);

// Recensioni // TODO: Fare
router.route('/:classId/reviews/')
  .get(validate(productValidation.getProduct), productController.getProduct);

// Lista delle istanze
router.route('/:classId/')
  .get(auth('manageProducts'), validate(productValidation.getProduct), productController.getProductInstances);

// Istanza specifica
router
  .route('/:classId/:instanceId')
  .get(auth('manageProducts'), validate(productValidation.getProductInstance), productController.getProductInstance);

module.exports = router;
