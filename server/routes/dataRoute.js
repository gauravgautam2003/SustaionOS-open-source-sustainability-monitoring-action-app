const router = require("express").Router();
const { receiveData } = require("../controllers/dataController");

router.post("/send", receiveData);

module.exports = router;