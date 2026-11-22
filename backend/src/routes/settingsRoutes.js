const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');
router.use(auth);
router.get('/', ctrl.getSettings);
router.put('/', ctrl.updateSettings);
module.exports = router;
