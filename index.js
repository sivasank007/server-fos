const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const authRoute = require("./auth");
const noauth = require("./noauth");
const db = require("./db");
const authMiddleware = require("./middleware/authenticateToken");
require("dotenv").config();

const cookieParser = require("cookie-parser");

const app = express();

app.use(express.static("public"));

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

// const corsOptions = {
// 	origin: ["https://fos-admin.netlify.app", "https://fos-client.netlify.app"],
// 	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
// 	credentials: true, // enable set cookie
// 	optionsSuccessStatus: 204,
// };

// app.use(cors(corsOptions));

app.use(cookieParser());
app.use(authRoute);
app.use(noauth);
app.use(authMiddleware);

//!___________________CRUD DASHBOARD____________________________

//~--------------------READ OPERATION---------------------------

//*multer - used to store image from frontend to server folder

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

//~------------------------CREATE OPERATION-------------------------

//*add MENU data

app.post("/addmenu", (req, res) => {
  const sql = "insert into MENU (`menuname`,`menudescription`) values (?)";
  const val = [req.body.menuname, req.body.menudescription];
  db.query(sql, [val], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//*add MENUITEMS data
app.post("/insertproduct", upload.single("image"), (req, res) => {
  const imageFilePath = req.file.filename;
  const { menuitem, price, quantity, description, menuid, count } = req.body;

  // Insert menu item into MENUITEMS table
  const insertMenuItemQuery =
    "INSERT INTO MENUITEMS (menuitem, price, quantity, description, menuid, count, image) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const menuItemValues = [
    menuitem,
    price,
    quantity,
    description,
    menuid,
    count,
    imageFilePath,
  ];

  db.query(insertMenuItemQuery, menuItemValues, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Failed to insert menu item.", details: err });
    }

    const insertedMenuItemId = result.insertId; // Get the ID of the newly inserted menu item

    try {
      // Parse selectedToppings from request body
      const parsedToppings = JSON.parse(req.body.selectedToppings);

      // Parse selectedToppings from request body
      const parsedBases = JSON.parse(req.body.selectedBases);

      //push toppings data
      if (parsedToppings.length > 0) {
        // Prepare topping values for insertion
        const toppingValues = parsedToppings.map((topping) => [
          topping.toppingId,
          topping.price,
          topping.toppingName,
          insertedMenuItemId, // Add the menuItemId to each topping
        ]);

        // Insert toppings into toppingprice table
        const insertToppingQuery =
          "INSERT INTO toppingprice (toppingId, toppingPrice, toppingName, menuItemId) VALUES ?";

        db.query(insertToppingQuery, [toppingValues], (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to insert toppings.", details: err });
          }
        });
      }

      //push base data
      if (parsedBases.length > 0) {
        // Prepare base values for insertion
        const baseValues = parsedBases.map((base) => [
          base.baseId,
          base.basePrice,
          base.baseName,
          insertedMenuItemId, // Add the menuItemId to each base
        ]);
        // Insert bases into baseprice table
        const insertBaseQuery =
          "INSERT INTO baseprice (baseId, basePrice, baseName, menuItemId) VALUES ?";

        db.query(insertBaseQuery, [baseValues], (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Failed to insert base.", details: err });
          }

          return res.json({
            success: true,
            insertedMenuItemId: insertedMenuItemId,
          });
        });
      }
    } catch (error) {
      // Handle JSON parsing error
      return res
        .status(400)
        .json({ error: "Invalid JSON format for selectedToppings." });
    }
  });
});
//~------------------------UPDATE OPERATION---------------------------------

//*update MENU data
app.put("/updatemenu/:id", (req, res) => {
  const id = req.params.id;
  const { menuname, menudescription } = req.body;

  const sql =
    "update MENU set `menuname`=?, `menudescription`=? where `menuid`=?";
  const values = [menuname, menudescription, id];

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

//*update MENU_ITEM data
app.put("/updateproduct/:id", upload.single("image"), (req, res) => {
  const productId = req.params.id;
  const imageFilePath = req.file ? req.file.filename : null;

  const { menuitem, price, quantity, description, menuid, count } = req.body;

  let sql =
    "UPDATE MENUITEMS SET `menuitem`=?, `price`=?, `quantity`=?, `description`=?, `menuid`=?, `count`=?";

  const values = [menuitem, price, quantity, description, menuid, count];

  if (imageFilePath) {
    sql += ", `image`=?";
    values.push(imageFilePath);
  }

  sql += " WHERE `menuitemsid`=?"; // Use `menuitemsid` column for updating

  values.push(productId);

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

//~--------------------------------DELETE OPERATION---------------------------------

//*delete MENU data

app.delete("/deletemenu/:id", (req, res) => {
  const id = req.params.id;
  const q = `DELETE FROM MENU WHERE menuid=${id}`;
  db.query(q, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*delete MENU_ITEMS data

app.delete("/deletemenuitems/:id", (req, res) => {
  const id = req.params.id;
  const q = `DELETE FROM MENUITEMS WHERE menuitemsid=${id}`;
  db.query(q, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*delete MENUITEMS data based menuID

app.delete("/deletemenuitemsmenu/:id", (req, res) => {
  const id = req.params.id;
  const q = `DELETE FROM MENUITEMS WHERE menuid=${id}`;
  db.query(q, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//~------------------GET DESIRED ADMIN DATA

app.get("/getdesiredadmin", (req, res) => {
  const id = req.info.id;
  const sql = "SELECT * FROM ADMINLOGIN WHERE adminId = ?";
  db.query(sql, id, (err, result) => {
    if (err) {
      return res.json(err);
    } else {
      return res.json(result[0]);
    }
  });
});

//*GET ALL USERS

app.get("/getuser", (req, res) => {
  const sql = "SELECT * FROM CUSTOMER_REGISTRATION";
  const id = req.params.id;
  db.query(sql, [id], (err, data) => {
    if (err) res.json(err);
    res.send(data);
  });
});

//*GET SPECIFIC USER

app.get("/getsingleuser", (req, res) => {
  const sql = "SELECT * FROM CUSTOMER_REGISTRATION where customerID=?";
  const id = req.info.id;
  db.query(sql, [id], (err, data) => {
    if (err) res.json(err);
    res.send(data);
  });
});

//*Update Account Info

app.put("/updateaccountdetails", (req, res) => {
  const id = req.info.id;
  const { customerName } = req.body;

  const sql =
    "update CUSTOMER_REGISTRATION set `customername`=? where `customerID`=?";
  const values = [customerName, id];

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

//*Update User Password

app.put("/changepassword/:id", (req, res) => {
  const id = req.info.id;
  const { password } = req.body;

  const sql =
    "update CUSTOMER_REGISTRATION set `password`=? where `customerID`=?";
  const values = [password, id];

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

//~--------------------------------ADDRESS---------------------------------

//*GET CUSTOMER ADDRESS

app.get("/customerexistingaddress", (req, res) => {
  const id = req.info.id;
  const sql = `SELECT * FROM CUSTOMERS_ADDRESS where customerID=${id}`;
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

//*ADD CUSTOMER ADDRESS

app.post("/customeraddress", (req, res) => {
  const sql =
    "INSERT INTO CUSTOMERS_ADDRESS (`customerID`,`customername`,`address`,`pincode`,`phnum`) VALUES (?)";
  const val = [
    req.info.id,
    req.body.name,
    req.body.fullAddress,
    req.body.pincode,
    req.body.phoneNumber,
  ];
  db.query(sql, [val], (err, data) => {
    if (err) return res.json(err);
    res.send("Success");
  });
});

//*DELETE CUSTOMER ADDRESS

app.delete("/deleteaddress/:id", (req, res) => {
  const id = req.params.id;
  const q = `DELETE FROM CUSTOMERS_ADDRESS WHERE addressID=${id}`;
  db.query(q, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*GET SELECTED ADDRESS

app.get("/getaddress/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM CUSTOMERS_ADDRESS WHERE addressID = ?`;
  db.query(sql, [id], (err, data) => {
    if (err) {
      res.json(err);
    }
    return res.json(data[0]);
  });
});

//*UPDATE CUSTOMER ADDRESS

app.put("/editaddress/:id", (req, res) => {
  const id = req.params.id;
  const sql =
    "UPDATE CUSTOMERS_ADDRESS SET `CUSTOMERNAME` =?,`ADDRESS`=?,`PINCODE`=?,`PHNUM`=? WHERE addressID=?";
  db.query(
    sql,
    [
      req.body.name,
      req.body.fullAddress,
      req.body.pincode,
      req.body.phoneNumber,
      id,
    ],
    (err, result) => {
      if (err) return res.json("Error");
      return res.json({ updated: true });
    }
  );
});

//~--------------------------------CART---------------------------------

//*DELETE CART OF SPECFIC USER's Row

app.delete("/deletecartitem/:id", (req, res) => {
  const id = req.params.id;
  const q = "delete from CART where cartid = ?";
  db.query(q, id, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*DELETE CART OF SPECFIC USER

app.post("/handleResetCart", (req, res) => {
  const id = req.info.id;
  const q = "delete from CART where customerId = ?";
  db.query(q, [id], (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*INCREMENT CART ITEM
app.put("/cartincrement", (req, res) => {
  const id = req.body.itemId;
  console.log('id -> ', id);
  const sql = "update CART set count = count + 1, subtotal = count * semiTotal where cartid =?";
  db.query(sql, [id], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//*DECREMENT CART ITEM

app.put("/cartdecrement", (req, res) => {
  const id = req.body.itemId;
  const sql = "update CART set count = count - 1, subtotal = count * semiTotal where cartid =?";
  db.query(sql, [id], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//*INSERT INTO CART

app.post("/cart", (req, res) => {
  const cid = req.info.id;
  const semiTotal = req.body.subTotal / req.body.count;
  console.log('semiTotal' ,semiTotal);
  const sql =
    "INSERT INTO CART (`menuid`,`menuitemid`,`menuitem`,`price`,`quantity`,`count`,`image`,`customerId`,`toppingsid`,`baseid`,`subtotal`,`semiTotal`) VALUES (?)";
  const val = [
    req.body.menuid,
    req.body.menuitemid,
    req.body.menuname,
    req.body.price,
    req.body.quantity,
    req.body.count,
    req.body.image,
    cid,
    req.body.toppingsId,
    req.body.baseId,
    req.body.subTotal,
    semiTotal
  ];
  db.query(sql, [val], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//* Add Tip to cart

// app.put("/updatetipcost", (req, res) => {
// 	const { tipcost } = req.body;
// 	const sql =
// 		"UPDATE CART SET tipcost = ? where";
// 	db.query(sql, [tipcost], (err, data) => {
// 		if (err) return res.json({ success: false, err });
// 		return res.json({ success: true });
// 	});
// });

//*LOCALCART TO DATABASE CART

app.post("/cartlogin", (req, res) => {
  const sql =
    "INSERT INTO CART (`menuid`,`menuitemid`,`menuitem`,`price`,`quantity`,`count`,`image`,`customerId`,`toppingsid`,`baseid`,`subtotal`) VALUES ?";

  const values = req.body.localCart.map((item) => [
    item.menuid,
    item.menuitemid,
    item.menuname,
    item.price,
    item.quantity,
    item.count,
    item.image,
    req.body.cid,
    item.toppingsId,
    item.baseId,
    item.subTotal,
  ]);
  db.query(sql, [values], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//*GET CART OF SPECFIC USER

app.get("/cartdata", (req, res) => {
  const id = req.info.id;
  const sqlCart = "SELECT * FROM CART WHERE customerId = ?";

  try {
    db.query(sqlCart, [id], (err, cartData) => {
      if (err) return res.json(err);

      if (cartData.length === 0) {
        return res.json([]);
      }

      const cartItems = cartData;
      const toppingPriceIds = cartItems
        .flatMap((item) => {
          if (item.toppingsid !== null) {
            return item.toppingsid.split(",").map((id) => parseInt(id, 10));
          } else {
            return [];
          }
        })
        .filter((id, index, self) => self.indexOf(id) === index);
      // Remove duplicates 

      const basePriceIds = cartItems
        .map((item) => parseInt(item.baseid, 10))
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      const sqlToppings =
        toppingPriceIds.length > 0
          ? "SELECT * FROM toppingPrice WHERE toppingPriceId IN (?)"
          : null;

      const sqlBases =
        basePriceIds.length > 0
          ? "SELECT * FROM basePrice WHERE basePriceId IN (?)"
          : null;

      const fetchToppings = sqlToppings
        ? new Promise((resolve, reject) => {
            db.query(sqlToppings, [toppingPriceIds], (err, toppingsData) => {
              if (err) return reject(err);
              resolve(toppingsData);
            });
          })
        : Promise.resolve([]);

      const fetchBases = sqlBases
        ? new Promise((resolve, reject) => {
            db.query(sqlBases, [basePriceIds], (err, basesData) => {
              if (err) return reject(err);
              resolve(basesData);
            });
          })
        : Promise.resolve([]);

      Promise.all([fetchToppings, fetchBases])
        .then(([toppingsData, basesData]) => {
          const toppingsMap = toppingsData.reduce((acc, topping) => {
            acc[topping.toppingPriceId] = topping;
            return acc;
          }, {});

          const basesMap = basesData.reduce((acc, base) => {
            acc[base.basePriceId] = base;
            return acc;
          }, {});

          const response = cartItems.map((item) => {
            const itemToppingIds = item.toppingsid
              ? item.toppingsid.split(",").map((id) => parseInt(id, 10))
              : [];
            const itemToppings = itemToppingIds
              .map((id) => ({
                ...toppingsMap[id],
              }))
              .filter(Boolean);
            const itemBase = item.baseid ? { ...basesMap[item.baseid] } : null;
            console.log('base -> '+ itemBase);
            return {
              ...item,
              toppings: itemToppings,
              base: itemBase,
            };
          });
          return res.json(response);
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//~--------------------------------ORDER DETAILS----------------------------------

//* INSERT ORDER DETAILS AND INVOICE DETAILS

app.post("/orderdetails", (req, res) => {
  const cart = req.body.cart;
  const paymentMode = req.body.paymentMode;
  const customerID = req.info.id;
  const addressID = req.body.addressID;
  const collectionTime = req.body.collectionTime;
  const purchaseMode = req.body.purchaseMode;
  const tipCost = req.body.tipCost;
  const customerName = req.body.customerName;


  // Generate a random 5-digit number for order Number
  const randomFiveDigitNumber = Math.floor(1000 + Math.random() * 5000);

  // Get the current date and time in the "YYMMDDmmss" format
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const hours = currentDate.getHours().toString().padStart(2, "0");
  const minutes = currentDate.getMinutes().toString().padStart(2, "0");
  const seconds = currentDate.getSeconds().toString().padStart(2, "0");

  // Combine the random number and date/time to create the orderNumber
  const orderNumber = `${randomFiveDigitNumber}${year}${month}${day}${hours}${minutes}${seconds}`;
  const values = cart.map(
    ({ menuid, menuitemid, count, menuitem, subtotal, toppingsid, baseid, semiTotal }) => [
      customerID,
      orderNumber,
      addressID,
      menuid,
      menuitemid,
      count,
      menuitem,
      subtotal,
      collectionTime,
      toppingsid,
      baseid,
      semiTotal
    ]
  );

  let totalBill = cart.reduce((total, { subtotal }) => total + subtotal, 0);
  totalBill += totalBill/100 * 5; //5 percent tax
  totalBill = totalBill + 50; //Delivery Fees
  totalBill = totalBill + tipCost; //Tips

  const sql =
    "INSERT INTO ORDERDETAILS (customerID, orderNumber, addressId, menuid, menuitemid, quantity, menuitems, price,pickuptime, toppingsId, baseId, semiTotal) VALUES ?";

  // Insert data into the orderdetails table
  db.query(sql, [values], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send("Error inserting into ORDERDETAILS");
    } else {
      // Generate a random 3-digit number
      const randomThreeDigitNumber = Math.floor(100 + Math.random() * 900);

      // Generate 4 random alphabets
      const randomAlphabets = Array.from({ length: 4 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join("");
      const invoiceNumber = `${randomThreeDigitNumber}${randomAlphabets}${year}${month}${day}${hours}${minutes}${seconds}`;
      // After successfully inserting into orderdetails, insert into invoicedetails
      const invoiceSql =
        "INSERT INTO INVOICEDETAILS (invoiceNumber,orderNumber, customerID, addressId,totalBill,orderstatus,purchasemode,transcationmode,tipsCost,customerName) VALUES ?";

      const invoiceValues = [
        [
          invoiceNumber,
          orderNumber,
          customerID,
          addressID,
          totalBill,
          "ordered",
          purchaseMode,
          paymentMode,
          tipCost,
          customerName
        ],
      ];
      // Insert data into the invoicedetails table
      db.query(invoiceSql, [invoiceValues], (err, invoiceResults) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error inserting into invoicedetails");
        } else {
          res
            .status(200)
            .send(
              "Data inserted into orderdetails and invoicedetails successfully"
            );
        }
      });
    }
  });
});

//* change order holding to ordered

// app.post("/pushorderpending", (req, res) => {
// 	const cart = req.body.cart;
// 	const customerID = req.body.cid;
// 	const addressID = req.body.id;
// 	const collectionTime = req.body.collectionTime;

// 	const values = cart.map(({ menuid, menuitemid, count, menuitem, price }) => [
// 		menuid,
// 		menuitemid,
// 		count,
// 		menuitem,
// 		price,
// 		customerID,
// 		addressID,
// 		collectionTime,
// 	]);

// 	const sql =
// 		"INSERT INTO ORDERPENDING  (menuid, menuitemid, count, menuitem, price,customerId,addressId,deliverymode) VALUES ?";

// 	db.query(sql, [values], (err, result) => {
// 		if (err) {
// 			return res.json(err);
// 		}
// 	});
// });

// app.get("/getorderpending", (req, res) => {
// 	const sql = "select * from ORDERPENDING";
// 	db.query(sql, (err, data) => {
// 		if (err) {
// 			return res.json(err);
// 		}
// 		return res.json(data);
// 	});
// });

// //* delete order pending by admin

// app.delete("/deleteorderpendingbyadmin/:id", (req, res) => {
// 	const { id } = req.params;
// 	const sql = `delete from ORDERPENDING where pendingId = ${id}`;
// 	db.query(sql, (err, result) => {
// 		if (err) {
// 			return res.json(err);
// 		}
// 	});
// });

//* delete order completed by admin

app.delete("/deleteordercompletedbyadmin/:id", (req, res) => {
  const { id } = req.params;
  const sql = `delete from ORDERDETAILS where customer_orderID = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      return res.json(err);
    }
  });
});

//* delete order pending by customer when order gets completed

app.delete("/deleteorderpending/:id", (req, res) => {
  const id = req.info.id;
  const sql = `delete from ORDERPENDING where customerId = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      return res.json(err);
    }
  });
});

//*GET ORDER DETAILS

app.get("/getorderdetails", (req, res) => {
  const sql = "SELECT * FROM ORDERDETAILS";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

//* GET MONTHLY ORDERS COUNT

app.get("/getmonthlyorders", (req, res) => {
  const month = req.query.selectedMonth;
  const sql = `SELECT COUNT(*) AS totalOrders FROM ORDERDETAILS WHERE MONTH(orderdeddatetime) = ?`;

  db.query(sql, [month], (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* GET DAILY ORDERS COUNT

app.get("/getdailyorderscount", (req, res) => {
  const date = req.query.selectedDate; // Access the date from the query parameters
  const sql = `SELECT COUNT(*) as totalOrders FROM ORDERDETAILS WHERE DATE(orderdeddatetime) = ?`;

  db.query(sql, [date], (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});
 
//* GET TODAY ORDERS

app.get("/gettodayorders", (req, res) => {
  const date = req.query.selectedDate; // Access the date from the query parameters
  const sql = `SELECT * FROM ORDERDETAILS WHERE DATE(orderdeddatetime) = ?`;

  db.query(sql, [date], (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

//*GET INVOICE DETAILS

app.get("/getinvoicedetails", (req, res) => {
  const sql = "SELECT * FROM INVOICEDETAILS Order by invoiceDate desc";
  db.query(sql, (err, data) => {
    if (err) res.json(err); 
    return res.json(data);
  }); 
});

//*GET CLIENT INVOICE DETAILS

app.get("/getinvoicedetailsclient", (req, res) => { 
  const id = req.info.id; 
  const sql = "SELECT * FROM INVOICEDETAILS WHERE customerID = ? Order by invoiceDate DESC";
  db.query(sql,[id], (err, data) => { 
    if (err) res.json(err);
    return res.json(data);
  });
});
 
// ASSIGNING DP

app.put("/updateassignment", (req, res) => {
  const { selectedDPId, invoiceNo } = req.body;
  const sql =
    "UPDATE invoicedetails SET assignedto = ?, orderstatus = ? WHERE invoiceNumber = ?";
  db.query(sql, [selectedDPId, "assigned", invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});

//*GET INVOICE DETAILS

app.get("/getinvoicedetails/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM INVOICEDETAILS where invoiceNumber = ? Order by invoiceDate desc";
  db.query(sql, [id], (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* Get today invoices
 
app.get("/gettodayinvoice", (req, res) => {
  const date = req.query.selectedDate; // Access the date from the query parameters
  const sql = `SELECT * FROM INVOICEDETAILS WHERE DATE(invoiceDate) = ? Order by invoiceDate desc`;
  db.query(sql, [date], (err, data) => {
    if (err) res.json(err);
    return res.json(data);  
  });
});  

//*GET SPECIFIC ORDER DETAILS

app.get("/getsingleorderdetails", (req, res) => {
  const id = req.info.id;
  const sql = "SELECT * FROM ORDERDETAILS WHERE `customerID` = ? ORDER BY orderdeddatetime DESC";
  db.query(sql, [id], (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});
 
//* get order details

app.get("/getorderedlist/:id", (req, res) => {
  const orderId = req.params.id;
  const sqlOrderDetails = "SELECT * FROM ORDERDETAILS WHERE orderNumber = ?";

  try {
    db.query(sqlOrderDetails, [orderId], (err, orderData) => {
      if (err) return res.json(err);
      if (orderData.length === 0) { 
        return res.json([]);
      } 
      const orderItems = orderData;
      const toppingPriceIds = orderItems
        .flatMap((item) => {
          if (item.toppingsId.length > 0) {
            return item.toppingsId.split(",").map((id) => parseInt(id, 10));
          } else {
            return [];
          }
        })
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      const basePriceIds = orderItems
        .map((item) => parseInt(item.baseId, 10))
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      const sqlToppings =
        toppingPriceIds.length > 0
          ? "SELECT * FROM toppingPrice WHERE toppingPriceId IN (?)"
          : null;

      const sqlBases =
        basePriceIds.length > 0
          ? "SELECT * FROM basePrice WHERE basePriceId IN (?)"
          : null;

      const fetchToppings = sqlToppings
        ? new Promise((resolve, reject) => {
            db.query(sqlToppings, [toppingPriceIds], (err, toppingsData) => {
              if (err) return reject(err);
              resolve(toppingsData);
            });
          })
        : Promise.resolve([]);

      const fetchBases = sqlBases
        ? new Promise((resolve, reject) => {
            db.query(sqlBases, [basePriceIds], (err, basesData) => {
              if (err) return reject(err);
              resolve(basesData);
            });
          })
        : Promise.resolve([]);

      Promise.all([fetchToppings, fetchBases])
        .then(([toppingsData, basesData]) => {
          const toppingsMap = toppingsData.reduce((acc, topping) => {
            acc[topping.toppingPriceId] = topping;
            return acc;
          }, {});

          const basesMap = basesData.reduce((acc, base) => {
            acc[base.basePriceId] = base;
            return acc;
          }, {});

          const response = orderItems.map((item) => {
            const itemToppingIds = item.toppingsId
              ? item.toppingsId.split(",").map((id) => parseInt(id, 10))
              : [];
            const itemToppings = itemToppingIds
              .map((id) => ({
                ...toppingsMap[id],
              }))
              .filter(Boolean);
            const itemBase = item.baseId ? { ...basesMap[item.baseId] } : null;
            return {
              ...item,
              toppings: itemToppings,
              base: itemBase,
            };
          });
          return res.json(response);
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//* get order details

app.get("/getorder", (req, res) => {
  const id = req.info.id;
  const sql =
    "SELECT orderNumber, customerID, MAX(orderdeddatetime) AS order_datetime,GROUP_CONCAT(CONCAT(quantity, ' x ', menuitems) SEPARATOR '\n') AS order_items,SUM(price) AS total_amount FROM ORDERDETAILS GROUP BY orderNumber, customerID ORDER BY order_datetime";
  db.query(sql, [id], (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* get order count based on a month

app.get("/getdesiredordercount", (req, res) => {
  const sqlStatements = [
    "SET @target_week1 = 30;",
    "SET @target_week2 = 31;",
    "SET @target_week3 = 32;",
    "SET @target_week4 = 52;",
    "SELECT aw.week_number, YEAR(od.orderdeddatetime) AS year, COALESCE(COUNT(od.orderNumber), 0) AS weekly_order_count FROM (SELECT @target_week1 AS week_number UNION ALL SELECT @target_week2 UNION ALL SELECT @target_week3 UNION ALL SELECT @target_week4) AS aw LEFT JOIN ORDERDETAILS od ON aw.week_number = WEEK(od.orderdeddatetime) AND YEAR(od.orderdeddatetime) = YEAR(CURDATE()) GROUP BY aw.week_number, year ORDER BY year, aw.week_number;",
  ];

  const results = [];

  function executeQuery(index) {
    if (index >= sqlStatements.length) {
      // All queries are executed, extract and send the relevant data as JSON
      const responseData = results[results.length - 1]; // Get the last query's result
      res.json(responseData);
      return;
    }

    db.query(sqlStatements[index], (err, data) => {
      if (err) {
        console.error(`Error in SQL statement ${index + 1}:`, err);
      } else {
        results.push(data);
      }

      // Move on to the next query
      executeQuery(index + 1);
    });
  }

  // Start executing queries
  executeQuery(0);
});

//~---------------------DASHBOARD-----------------------------

//* get total order count

app.get("/gettotalorderscount", (req, res) => {
  const sql = "select COUNT(*) as count from ORDERDETAILS";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* get total customer

app.get("/gettotalcustomerscount", (req, res) => {
  const sql = "select COUNT(*) as count from CUSTOMER_REGISTRATION";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* get a customer name

app.get("/getCustomerName", (req, res) => {
  const customerId = req.info.id;
  const sql = "SELECT customername from customer_registration where customerID = ?";
  db.query(sql,[customerId], (err, data) => {
    if (err) res.json(err);
    return res.json(data[0].customername); 
  });
});

//* get total menu

app.get("/gettotalmenucount", (req, res) => {
  const sql = "select COUNT(*) as count from MENU";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* get total menu items

app.get("/gettotalmenuitemscount", (req, res) => {
  const sql = "select COUNT(*) as count from MENUITEMS";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data[0]);
  });
});

//* get recent 5 order request

app.get("/getrecentorders", (req, res) => {
  const sql =
    "SELECT * FROM ORDERDETAILS order by orderdeddatetime DESC limit 4";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

//~--------------------- DELIVER PARTNER -----------------------------

//*handle delivery partner request

app.post("/deliverypartnerrequest", (req, res) => {
  const { status, DeliveryPerson_ID } = req.body;
  const sql =
    "UPDATE DELIVERYPERSON_REGISTRATION set approvalstatus = ? where DeliveryPerson_ID = ?";
  db.query(sql, [status, DeliveryPerson_ID], (err, data) => {
    if (err) return res.json(err);
    return res.json("success");
  });
});

//* view active delivery partners

app.get("/getactivedeliverypersondetails", (req, res) => {
  const sql =
    "SELECT * FROM 	DELIVERYPERSON_REGISTRATION Where approvalstatus = ? ORDER BY Reg_date DESC";
  db.query(sql, ["approved"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//* view in-active delivery partners

app.get("/getinactivedeliverypersondetails", (req, res) => {
  const sql =
    "SELECT * FROM 	DELIVERYPERSON_REGISTRATION Where approvalstatus = ? ORDER BY Reg_date DESC";
  db.query(sql, ["inactive"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//* view rejected delivery partners

app.get("/getrejecteddeliverypersondetails", (req, res) => {
  const sql =
    "SELECT * FROM 	DELIVERYPERSON_REGISTRATION Where approvalstatus = ? ORDER BY Reg_date DESC";
  db.query(sql, ["rejected"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//* view delivery partners request

app.get("/getrequestdeliverypersondetails", (req, res) => {
  const sql =
    "SELECT * FROM 	DELIVERYPERSON_REGISTRATION Where approvalstatus = ? ORDER BY Reg_date DESC";
  db.query(sql, ["pending"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

//* get individual delivery partner details

app.get(
  "/getIndividualDeliveryPartnerDetails/:DeliveryPerson_ID",
  (req, res) => {
    const { DeliveryPerson_ID } = req.params;
    const sql =
      "SELECT * FROM DELIVERYPERSON_REGISTRATION where DeliveryPerson_ID = ? ";
    db.query(sql, [DeliveryPerson_ID], (err, data) => {
      if (err) return res.json(err);
      if (data.length > 0) {
        return res.json(data[0]);
      } else {
        return res.json("not found");
      }
    });
  }
);

//* Update dp as in-active

app.put("/setDpInActive/:DeliveryPerson_ID", (req, res) => {
  const { DeliveryPerson_ID } = req.params;
  const sql =
    "UPDATE DELIVERYPERSON_REGISTRATION set approvalstatus = ? where DeliveryPerson_ID = ?";
  db.query(sql, ["inactive", DeliveryPerson_ID], (err, data) => {
    if (err) return res.json(err);
    return res.json("success");
  });
});

//* Update dp as active

app.put("/setDpActive/:DeliveryPerson_ID", (req, res) => {
  const { DeliveryPerson_ID } = req.params;
  const sql =
    "UPDATE DELIVERYPERSON_REGISTRATION set approvalstatus = ? where DeliveryPerson_ID = ?";
  db.query(sql, ["approved", DeliveryPerson_ID], (err, data) => {
    if (err) return res.json(err);
    return res.json("success");
  });
});

//* Update dp as rejected

app.put("/setDpRejected/:DeliveryPerson_ID", (req, res) => {
  const { DeliveryPerson_ID } = req.params;
  const sql =
    "UPDATE DELIVERYPERSON_REGISTRATION set approvalstatus = ? where DeliveryPerson_ID = ?";
  db.query(sql, ["rejected", DeliveryPerson_ID], (err, data) => {
    if (err) return res.json(err);
    return res.json("success");
  });
});

//* Update delivery partener Info

app.put("/updateDeliveryPartner/:DeliveryPerson_ID", (req, res) => {
  const { DeliveryPerson_ID } = req.params;
  const {
    DP_EmpID,
    DP_Name,
    DP_EMAIL_ID,
    DP_PhoneNumber,
    DP_Addressproof,
    Del_IDproof,
  } = req.body;


  const sql = `
	  UPDATE DELIVERYPERSON_REGISTRATION
	  SET
		DP_EmpID = ?,
		DP_Name = ?,
		DP_EMAIL_ID = ?,
		DP_PhoneNumber = ?,
		DP_Addressproof = ?,
		Del_IDproof = ?
	  WHERE DeliveryPerson_ID = ?
	`;

  db.query(
    sql,
    [
      DP_EmpID,
      DP_Name,
      DP_EMAIL_ID,
      DP_PhoneNumber,
      DP_Addressproof,
      Del_IDproof,
      DeliveryPerson_ID,
    ],
    (error, results) => {
      if (error) {
        console.error("Error updating delivery partner details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res
          .status(200)
          .json({ message: "Delivery partner details updated successfully" });
      }
    }
  );
});

//* Delivery Partner application

//* get individual orders

app.get("/getwaitingindividualorders/:id", (req, res) => {
  const dpId = req.info.id;
  const sql =
    "SELECT inv.sno, inv.invoiceNumber, inv.orderNumber, inv.customerID AS invoiceCustomerID, cust.customername, cust.mail, cust.phnum, cust.addressID, cust.city, cust.state, cust.address, cust.pincode, inv.addressId AS invoiceAddressID, inv.invoiceDate, inv.totalBill, inv.orderstatus, inv.assignedto, inv.purchasemode, inv.transcationmode, inv.issuestype, CONCAT('[', GROUP_CONCAT(JSON_OBJECT('customer_orderID', od.customer_orderID, 'orderDetailOrderNumber', od.orderNumber, 'orderDetailCustomerID', od.customerID, 'orderDetailAddressID', od.addressId, 'menuid', od.menuid, 'menuitemid', od.menuitemid, 'paymentMode', od.paymentMode, 'quantity', od.quantity, 'menuitems', od.menuitems, 'price', od.price, 'orderdeddatetime', od.orderdeddatetime, 'pickuptime', od.pickuptime)), ']') AS orderDetails FROM invoicedetails inv JOIN orderdetails od ON inv.orderNumber = od.orderNumber JOIN customers_address cust ON inv.customerID = cust.customerID WHERE inv.assignedto = ? and orderstatus = ? GROUP BY inv.sno, inv.invoiceNumber, inv.orderNumber, inv.customerID, cust.customername, cust.mail, cust.phnum, cust.addressID, cust.city, cust.state, cust.address, cust.pincode, inv.addressId, inv.invoiceDate, inv.totalBill, inv.orderstatus, inv.assignedto, inv.purchasemode, inv.transcationmode, inv.issuestype DESC";
  db.query(sql, [dpId, "assigned"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

app.get("/getacceptedindividualorders/:id", (req, res) => {
  const dpId = req.info.id;
  const sql =
    "SELECT inv.sno, inv.invoiceNumber, inv.orderNumber, inv.customerID AS invoiceCustomerID, cust.customername, cust.mail, cust.phnum, cust.addressID, cust.city, cust.state, cust.address, cust.pincode, inv.addressId AS invoiceAddressID, inv.invoiceDate, inv.totalBill, inv.orderstatus, inv.assignedto, inv.purchasemode, inv.transcationmode, inv.issuestype, CONCAT('[', GROUP_CONCAT(JSON_OBJECT('customer_orderID', od.customer_orderID, 'orderDetailOrderNumber', od.orderNumber, 'orderDetailCustomerID', od.customerID, 'orderDetailAddressID', od.addressId, 'menuid', od.menuid, 'menuitemid', od.menuitemid, 'paymentMode', od.paymentMode, 'quantity', od.quantity, 'menuitems', od.menuitems, 'price', od.price, 'orderdeddatetime', od.orderdeddatetime, 'pickuptime', od.pickuptime)), ']') AS orderDetails FROM invoicedetails inv JOIN orderdetails od ON inv.orderNumber = od.orderNumber JOIN customers_address cust ON inv.customerID = cust.customerID WHERE inv.assignedto = ? and orderstatus = ? or orderstatus = ? GROUP BY inv.sno, inv.invoiceNumber, inv.orderNumber, inv.customerID, cust.customername, cust.mail, cust.phnum, cust.addressID, cust.city, cust.state, cust.address, cust.pincode, inv.addressId, inv.invoiceDate, inv.totalBill, inv.orderstatus, inv.assignedto, inv.purchasemode, inv.transcationmode, inv.issuestype;";
  db.query(sql, [dpId, "accepted", "orderpickuped"], (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});



//* handle accept or reject

app.put("/handledpresponse/:id", (req, res) => {
  const dpId = req.params.id;
  const { status } = req.body;
  const sql =
    "UPDATE invoicedetails SET orderstatus = ? where invoiceNumber = ?";
  db.query(sql, [dpId, status], (err, data) => {
    if (err) return res.json(err);
    return res.json({ status: "success" });
  });
});

// handle delivery submit

app.put("/handledeliverysubmit/:id", (req, res) => {
  const dpId = req.params.id;
  const { status } = req.body;
  const sql =
    "UPDATE invoicedetails SET orderstatus = ? where invoiceNumber = ?";
  db.query(sql, [dpId, status]);
});

app.put("/updatedeliverystatus/:id", (req, res) => {
  const invoiceNo = req.params.id;
  const { status } = req.body;
  const sql =
    "UPDATE invoicedetails SET orderstatus = ? WHERE invoiceNumber = ?";
  db.query(sql, [status, invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});

app.put("/updateIssuesstatus/:id", (req, res) => {
  const invoiceNo = req.params.id;
  const { selectedIssuesOption } = req.body;
  const status = "issues";
  const sql =
    "UPDATE invoicedetails SET orderstatus = ?, issuestype = ? WHERE invoiceNumber = ?";
  db.query(sql, [status, selectedIssuesOption, invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});
app.put("/alreadypaiddelivery/:id", (req, res) => {
  const invoiceNo = req.params.id;
  const status = "delivered";
  const sql =
    "UPDATE invoicedetails SET orderstatus = ? WHERE invoiceNumber = ?";
  db.query(sql, [status, invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});
app.put("/codpaiddelivery/:id", (req, res) => {
  const invoiceNo = req.params.id;
  const { selectedCodOption } = req.body;
  const status = "issues";
  const sql =
    "UPDATE invoicedetails SET orderstatus = ?, ifcod = ? WHERE invoiceNumber = ?";
  db.query(sql, [status, selectedCodOption, invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});

app.put("/deliverypickuped/:id", (req, res) => {
  const invoiceNo = req.body.selectedInvoiceNumber;
  const status = "pickuped";
  const sql =
    "UPDATE invoicedetails SET orderstatus = ? WHERE invoiceNumber = ?";
  db.query(sql, [status, invoiceNo], (err, data) => {
    if (err) return res.json({ success: false, err });
    return res.json({ success: true });
  });
});

//* API's for add toppings and add size

// add toppings

app.post("/addtopping", (req, res) => {
  const { toppingName, toppingDescription } = req.body;
  const sql =
    "INSERT into toppingdetails (toppingName, toppingDescription) VALUES (?,?)";
  db.query(sql, [toppingName, toppingDescription], (err, data) => {
    if (err) return res.json(err);
    return res.json({ status: true });
  });
});

// add base

app.post("/addbase", (req, res) => {
  const { baseSize, baseDescription } = req.body;
  const sql =
    "INSERT into basedetails (baseName, baseDescription) VALUES (?,?)";
  db.query(sql, [baseSize, baseDescription], (err, data) => {
    if (err) return res.json(err);
    return res.json({ status: true });
  });
});

//* View toppings

app.get("/gettopping", (req, res) => {
  const sql = "SELECT * FROM toppingdetails";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

//* View base

app.get("/getbase", (req, res) => {
  const sql = "SELECT * FROM basedetails";
  db.query(sql, (err, data) => {
    if (err) res.json(err);
    return res.json(data);
  });
});

// delete toppings

app.delete("/deletetopping/:id", (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM toppingdetails WHERE toppingId=${id}`;
  db.query(sql, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

// delete base

app.delete("/deletebase/:id", (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM basedetails WHERE baseId=${id}`;
  db.query(sql, (err, data) => {
    if (err) {
      res.json(err);
    }
    res.send("Deleted");
  });
});

//*update TOPPING data

app.put("/updatetopping/:id", (req, res) => {
  const id = req.params.id;
  const { toppingName, toppingDescription } = req.body;

  const sql =
    "update toppingdetails set `toppingName`=?, `toppingDescription`=? where `toppingId`=?";
  const values = [toppingName, toppingDescription, id];

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

//*update BASE data

app.put("/updatebase/:id", (req, res) => {
  const id = req.params.id;
  const { baseName, baseDescription } = req.body;

  const sql =
    "update basedetails set `baseName`=?, `baseDescription`=? where `baseId`=?";
  const values = [baseName, baseDescription, id];

  db.query(sql, values, (err, data) => {
    if (err) {
      return res.json(err);
    }
    return res.json(data);
  });
});

const port = process.env.PORT || 5555; // Use the PORT environment variable if available

app.listen(port, () => {
});
