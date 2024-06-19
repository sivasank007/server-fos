const express = require("express");
const app = express.Router();
const db = require("./db");

//*check---

app.get("/getmsg", (req, res) => {
	return res.json("Hey, I'm alive!");
});

//*GET MENU DATA

app.get("/getmenudata", (req, res) => {
	const sql = "SELECT * FROM MENU";
	db.query(sql, (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});

//*Display desired 'MENU' table data

app.get("/getdesiredmenudata/:id", (req, res) => {
	const id = req.params.id;
	const sql = `SELECT * FROM MENU where menuid = ${id}`;
	db.query(sql, (err, data) => {
		if (err) res.json(err);
		return res.json(data[0]);
	});
});

//*Display desired 'MENU' table data -> menu name

app.get("/getdesiredmenuname/:id", (req, res) => {
	const id = req.params.id;
	const sql = `SELECT menuname FROM MENU where menuid = ${id}`;
	db.query(sql, (err, data) => {
		if (err) res.json(err);
		return res.json(data[0].menuname);
	});
});

//*Display MENU_ITEMS table data

app.get("/getmenuitemsdata", (req, res) => {
	const sql = "SELECT * FROM MENUITEMS";
	db.query(sql, (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});

//*Display desired 'MENU_ITEMS' table data

app.get("/getmenuitemsdesireddata/:id", (req, res) => {
	const sql = "SELECT * FROM MENUITEMS where menuitemsid=?";
	const id = req.params.id;
	db.query(sql, [id], (err, data) => {
		if (err) res.json(err);
		return res.json(data[0]);
	});
});

//* View desired toppings price

app.get("/getdesiredtoppingdata/:id", (req, res) => {
	const id = req.params.id;
	const sql = "SELECT * FROM toppingprice WHERE menuItemId = ?";
	db.query(sql, [id], (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});

//* View desired base price

app.get("/getdesiredbasedata/:id", (req, res) => {
	const id = req.params.id;
	const sql = "SELECT * FROM baseprice WHERE menuItemId = ?";
	db.query(sql, [id], (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});


//* View desired toppings details

app.get("/getdesireddatatopping/:id", (req, res) => {
	const id = req.params.id;
	console.log('id -> '+id);
	const sql = "SELECT * FROM toppingdetails WHERE toppingId = ?";
	db.query(sql, [id], (err, data) => {
		if (err) res.json(err);
		console.log(data);
		return res.json(data);
	});
});

//* View desired base details

app.get("/getdesireddatabase/:id", (req, res) => {
	const id = req.params.id;
	const sql = "SELECT * FROM basedetails WHERE baseId = ?";
	db.query(sql, [id], (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});

// view desired toppings

app.get("/getdesiredtoppinglist", (req, res) => {
	const selectedToppings = req.query.toppingsId;
	if (!selectedToppings) {
	  return res.status(400).json({ error: "No toppingsId provided" });
	}
	const sql = `SELECT * FROM toppingPrice WHERE toppingPriceId IN (${selectedToppings})`;
	console.log("sql", sql);
	db.query(sql, (err, data) => {
	  if (err) {
		console.error(err);
		return res.status(500).json({ error: "Internal server error" });
	  }
	  return res.json(data);
	});
  });
  
// view desired base

app.get("/getdesiredbaselist", (req, res) => {
	const selectedBase =req.body.baseId;
	const sql = `SELECT * FROM basePrice WHERE basePriceId = ${selectedBase}`;
	console.log("sql",sql);
	db.query(sql, (err, data) => {
		if (err) res.json(err);
		return res.json(data);
	});
});


module.exports = app;
