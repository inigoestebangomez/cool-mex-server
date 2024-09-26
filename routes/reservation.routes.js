const express = require("express");
const router = express.Router();
const Reservation = require("../models/Reservation.model");
require("dotenv").config();

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.PASS_NODEMAILER_USER,
    pass: process.env.PASS_NODEMAILER,
  },
  tls: {
    ciphers: "SSLv3", // para evitar problemas de seguridad
  },
});

// Duración en minutos para bloquear (1 hora antes y 1 hora 30 minutos después)
const durationBefore = 60; // 1 hora antes
const durationAfter = 90; // 1 hora 30 minutos después

// Función para convertir la hora en minutos (para hacer cálculos)
const getTimeInMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Cantidad de mesas disponibles según el número de comensales
const table = {
  2: 5,
  "3-4": 3,
  "5-6": 2,
  "7-8": 1,
};

// Horarios disponibles
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
    const { name, email, phone, date, time, place, numGuests, tableSize } =
      req.body;
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

    const mailOptions = {
      from: "nack_z4@hotmail.com",
      to: email,
      subject: "Confirmación de Reserva",
      text: `Hola ${name},\n\nTu reserva para ${numGuests} personas el ${date} a las ${time}h ha sido confirmada.\n\nTe esperamos! Ándaleee!.`,
      html: `<p>Hola <strong>${name}</strong>,</p>
               <p>Tu reserva para <strong>${numGuests}</strong> personas el <strong>${date}</strong> a las <strong>${time}</strong>h ha sido confirmada.</p>
               <p>Te esperamos! Ándaleee!</p>`,
    };

    // Enviar el correo de confirmación
    await transporter.sendMail(mailOptions);

    res.status(201).json(response);
  } catch (error) {
    // Verificar si el error es de validación de Mongoose
    if (error.name === "ValidationError") {
      // Enviar los mensajes de error específicos de cada campo
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    // En caso de otros errores
    next(error);
  }
});

// GET "/availability/:date/:numGuests" - Verificar si hay mesas disponibles
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

    // Crear un conjunto que almacena los horarios bloqueados
    const blockedTimes = new Set();

    reservationsForDate.forEach((reservation) => {
      const reservedTime = reservation.time;

      // Obtener el tiempo en minutos para la hora reservada
      const reservedTimeInMinutes = getTimeInMinutes(reservedTime);

      // Verificar cuántas mesas están reservadas para esa hora
      const tablesReservedAtThisTime = reservationsForDate.filter(
        (res) => res.time === reservedTime
      ).length;

      // Si no hay más mesas disponibles para esa hora, bloqueamos el horario
      if (tablesReservedAtThisTime >= table[tableSizeRange]) {
        blockedTimes.add(reservedTime);

        // Bloquear los horarios 60 minutos antes y 90 minutos después de la reserva
        availableTimes.forEach((availableTime) => {
          const availableTimeInMinutes = getTimeInMinutes(availableTime);

          // Bloqueamos si el horario está dentro del rango de 1 hora antes y 1h30 después
          if (
            availableTimeInMinutes >= reservedTimeInMinutes - durationBefore &&
            availableTimeInMinutes <= reservedTimeInMinutes + durationAfter
          ) {
            blockedTimes.add(availableTime);
          }
        });
      }
    });

    // Filtrar las horas disponibles, excluyendo las bloqueadas
    const availableTimesFiltered = availableTimes.filter(
      (time) => !blockedTimes.has(time)
    );

    res.status(200).json({ availableTimes: availableTimesFiltered });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
