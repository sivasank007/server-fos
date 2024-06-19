const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("./db");

router.post("/login", (req, res) => {
	const { phoneNumber, otp } = req.body;
	console.log(phoneNumber, otp);
	if (otp == 1234) {
		const getUserQuery = "SELECT * FROM CUSTOMER_REGISTRATION WHERE phnum = ?";
		db.query(getUserQuery, [phoneNumber], (err, result) => {
			if (err) {
				return res.status(500).json({ error: "Internal Server Error" });
			}
			if (result.length === 0) {
				return res.status(404).json({ error: "User not found" });
			}
 
			const user = result[0];
			const customerID = user.customerID;
			const SecretKey = process.env.SECRETKEY; // Make sure you have a secret key defined in your .env file
			console.log('key --> ',SecretKey);
			const jwtToken = jwt.sign({ id: customerID }, SecretKey);
			return res.json(jwtToken);
		});
	} else {
		return res.status(401).json({ error: "Incorrect OTP" });
	}
});

router.post("/checkexistinguser", (req, res) => {
	const checkphoneNumber = `SELECT * FROM CUSTOMER_REGISTRATION WHERE phnum = ?`;

	db.query(checkphoneNumber, [req.body.loginPhnum], (err, phoneData) => {
		if (err) {
			return res.status(500).json(err);
		}
		if (phoneData.length > 0) {
			return res.json({ status: "Valid" });
		} else {
			return res.status(404).json({ status: "Invalid" });
		}
	});
});

router.post("/adduser", (req, res) => {
	const { userName, mail, phone } = req.body;
	const checkPhoneNumberQuery = `SELECT * FROM CUSTOMER_REGISTRATION WHERE phnum = ?`;

	db.query(checkPhoneNumberQuery, [phone], (err, phoneData) => {
		if (err) {
			return res.status(500).json({ error: "Internal Server Error" });
		}
		if (phoneData.length > 0) {
			return res.status(400).json({ error: "Phone number already exists" });
		}

		const insertUserQuery =
			"INSERT INTO CUSTOMER_REGISTRATION (customername, mail, phnum) VALUES (?, ?, ?)";
		const values = [userName, mail, phone];

		db.query(insertUserQuery, values, (err, result) => {
			if (err) {
				return res.status(500).json({ error: "Internal Server Error" });
			}
			return res.status(201).json({ message: "User registered successfully" });
		});
	});
});

//~------------------CHECK ADMIN

router.post("/checkadmin", (req, res) => {
	const val = [req.body.mail, req.body.password];
	console.log('res --> '+req.body.mail, req.body.password);
	const sql =
		"SELECT * FROM ADMINLOGIN WHERE `adminMail` = ? and `adminPass` = ?";
	db.query(sql, val, (err, result) => {
		if (result.length > 0) {
			const jwtToken = jwt.sign(
				{ id: result[0].adminId },
				process.env.SECRETKEY,
			);
			return res.json(jwtToken);
		} else {
			console.log(val);
			return res.json(result);
		}
	});
});

router.post("/verifydeliverylogin", (req, res) => {
	const { phoneNumber } = req.body;
	console.log(phoneNumber);
	const sql =
		"SELECT * FROM deliveryperson_registration WHERE DP_PhoneNumber = ? AND approvalstatus = ?";
	db.query(sql, [phoneNumber, "approved"], (err, data) => {
		if (data.length > 0) {
			const jwtToken = jwt.sign(
				{ id: data[0].DeliveryPerson_ID },
				process.env.SECRETKEY,
			);
			return res.json({ status: "success", dpId: jwtToken });
		}
		return res.json("PhoneNumber Not Valid");
	});
});

//* Registration

router.post("/registerdeliverypartner", async (req, res) => {
	try {
		const {
			DP_EmpID,
			DP_Name,
			DP_EMAIL_ID,
			DP_PhoneNumber,
			DP_Addressproof,
			Del_IDproof,
			approvalstatus,
		} = req.body;
		const sql =
			"INSERT INTO DELIVERYPERSON_REGISTRATION (DP_EmpID, DP_Name, DP_EMAIL_ID, DP_PhoneNumber, DP_Addressproof, Del_IDproof,approvalstatus) VALUES (?, ?, ?, ?, ?, ?,?)";
		const data = await db.query(sql, [
			DP_EmpID,
			DP_Name,
			DP_EMAIL_ID,
			DP_PhoneNumber,
			DP_Addressproof,
			Del_IDproof,
			approvalstatus,
		]);
		res.json("success");
	} catch (err) {
		console.error("Error during registration:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
