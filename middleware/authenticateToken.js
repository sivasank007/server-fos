const jwt = require("jsonwebtoken");
require("dotenv").config();

const secretKey = process.env.SECRETKEY;

//* Check For Token
const authenticateToken = (req, res, next) => {
	const token = req.headers.authorization;
	if (!token) {
		return res.status(401).json({ err: "Token Not Available" });
	}
	jwt.verify(token, secretKey, (err, decode) => {
		if (err) {
			return res.status(401).json({ err: "Invalid Token" });
		}
		req.info = decode;
		next();
	});
};

module.exports = authenticateToken;
