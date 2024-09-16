const router = require("express").Router();

router.get("/", (req, res, next) => {
  res.json("All good in here");
});

//Routes Reservation
const reservationRouter = require("./reservation.routes.js")
router.use ("/reservation", reservationRouter)

module.exports = router;
