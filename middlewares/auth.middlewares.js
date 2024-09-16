const jwt = require("jsonwebtoken")

function tokenValidation(req, res, next) {
  try {
    const tokenArr = req.headers.authorization.split(" ")
    // console.log(tokenArr)
    const token = tokenArr[1]

    const payload = jwt.verify(token, process.env.TOKEN_SECRET)
    // console.log(payload)

    // si el verify falla, entra en el catch
    // 1. el token no existe
    // 2. el token es invalido
    // 3. el token ha expirado

    // pasar a la proxima ruta la información del usuario logeado
    req.payload = payload

    next() // continua con la ruta
  } catch (error) {
    res.status(401).json({errorMessage: "Token no existe o no es valido"})
  }
}

function adminValidation(req, res, next) {

  if (req.payload.role === "admin") {
    next() // continua con la ruta
  } else {
    res.status(401).json({ errorMessage: "No puedes acceder porque no eres admin" })
  }

}

module.exports = { tokenValidation, adminValidation }