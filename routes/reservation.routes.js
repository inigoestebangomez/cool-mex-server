const express = require("express");
const router = express.Router();
const Reservation = require("../models/Reservation.model");

const duration = 90; // Duración en minutos (1h30)
const getTimeInMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const table = {
  "2": 5,
  "3-4": 3,
  "5-6": 2,
  "7-8": 1,
};

const availableTimes = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

// POST "/" - Crear una nueva reserva
router.post("/", async (req, res, next) => {
    try {
      const { name, email, phone, date, time, place, numGuests, tableSize } = req.body;
      let tableSizeRange;
  
      // Determinar el tamaño de mesa según el número de comensales
      if (numGuests <= 2) {
        tableSizeRange = "2";
      } else if (numGuests <= 4) {
        tableSizeRange = "3-4";
      } else if (numGuests <= 6) {
        tableSizeRange = "5-6";
      } else {
        tableSizeRange = "7-8";
      }
  
      // Verificar cuántas reservas ya existen para esa fecha, hora y tamaño de mesa
      const getReservations = await Reservation.find({
        date: new Date(date),
        time: time,
        tableSize: tableSizeRange,
      });
  
      // Comparar las reservas existentes con el número total de mesas disponibles
      const totalTablesAvailable = table[tableSizeRange];
      const tablesAlreadyReserved = getReservations.length;
  
      if (tablesAlreadyReserved >= totalTablesAvailable)
        return res.status(400).json({ message: "No hay disponibilidad" });
  
      // Crear la reserva si hay disponibilidad
      const response = await Reservation.create({
        name,
        email,
        phone,
        date,
        time,
        place,
        numGuests,
        tableSize: tableSizeRange,
      });
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

// GET "/availability/:date/:numGuests" - Verificar si ya hay mesas disponibles
router.get("/availability/:date/:numGuests", async (req, res, next) => {
    try {
      const date = req.params.date;
      const numGuests = parseInt(req.params.numGuests, 10);
      let tableSizeRange;
  
      // Determinar el tamaño de mesa según el número de comensales
      if (numGuests <= 2) {
        tableSizeRange = "2";
      } else if (numGuests <= 4) {
        tableSizeRange = "3-4";
      } else if (numGuests <= 6) {
        tableSizeRange = "5-6";
      } else {
        tableSizeRange = "7-8";
      }
  
      // Verificar cuántas reservas ya existen para esa fecha y tamaño de mesa
      const reservationsForDate = await Reservation.find({
        date: new Date(date),
        tableSize: tableSizeRange,
      });
  
      // Crear un conjunto que cuenta las reservas por hora, y bloquea las horas adicionales
      const blockedTimes = new Set();
      
      reservationsForDate.forEach((reservation) => {
        const time = reservation.time;
  
        // Obtener el tiempo en minutos para la hora reservada
        const timeInMinutes = getTimeInMinutes(time);

        // Verificar si hay mesas disponibles para esa hora específica
      const tablesReservedAtThisTime = reservationsForDate.filter(
        (res) => res.time === time
      ).length;
      // Si no hay más mesas disponibles para esta hora, bloqueamos el horario
      if (tablesReservedAtThisTime >= table[tableSizeRange]) {
        blockedTimes.add(time);
  
        // Bloquear las horas posteriores durante 1h30min
        availableTimes.forEach((availableTime) => {
          const availableTimeInMinutes = getTimeInMinutes(availableTime);
          if (
            availableTimeInMinutes > timeInMinutes &&
            availableTimeInMinutes <= timeInMinutes + duration
          ) {
            blockedTimes.add(availableTime);
          }
        });
    }
      });
  
      // Filtrar las horas disponibles
      const availableTimesFiltered = availableTimes.filter(
          (time) => !blockedTimes.has(time)
        );
      res.status(200).json({ availableTimes: availableTimesFiltered });
    } catch (error) {
      next(error);
    }
  });

module.exports = router;
