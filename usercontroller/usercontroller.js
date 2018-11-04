var bcrypt = require('bcrypt');
var mysql = require('mysql');
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();
var cors = require('cors');

var router = express.Router();
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
const { Client } = require('pg');
/*
app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers","Content-Type");
    next();
});*/
function newClient() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true,
    });

    client.connect();
    return client;
}


var comparePassword = function(password, hash) {
    return bcrypt.compareSync(password, hash);
}


var register = function(req, res) {
    const connection = newClient();
    var userExists;
    var vals = Object.keys(req.body).map(function(key) {
        return req.body[key];
    });
    console.log(vals); //${req.body.email}`
    connection.query(`select 1 from customers where email='${req.body.email}'`, function(err, rows) {
        if (err) throw err;
        userExists = rows.rows[0];
    });

    if (userExists) {
        res.json({ success: false, msg: "User exists already" });
        connection.end();
    } else {
        console.log("Heheehehe");

        vals[1] = bcrypt.hashSync(req.body.password, 10);
        //connection.query("INSERT INTO customers(email,password,name,surename,telephone) VALUES(?,?,?,?,?)", vals, function(err, result) {
        connection.query("INSERT INTO customers(email,password,name,surename,telephone) VALUES($1,$2,$3,$4,$5)", vals, function(err, result) {
            console.log("INSERT");
            if (err) console.log(err);
            console.log(result);
            res.json({ success: true, msg: "Rejestracja zakończona powodzeniem!" });
            connection.end();
        });
    }

}


var customers = function(req, res) {
    const connection = newClient();
    connection.query("select * from customers", function(err, rows) {
        if (err) res.json(err);
        res.json(rows.rows);
        connection.end();
    });
}

var deletecustomer = function(req, res) {
    const params = req.body;
    const connection = newClient();
    connection.query("delete from customers where id=" + params.customerid, function(err, rows) {
        if (err) res.json(err);
        res.json(rows.rows);
        connection.end();
    });
}



var login = function(req, res) {
    const connection = newClient();
    console.log(req.body);
    connection.query("select * from customers where email='" + req.body.email + "'", function(err, rows) {
        if (err) throw err
        user = rows.rows[0];
        if (user) {
            if (!comparePassword(req.body.password, user.password)) {
                //res.status(401).json({success:false, msg: 'Authentication failed. Wrong password.' });
                res.json({ success: false, msg: " Authentication failed. Wrong password" });
            } else {
                return res.json({ success: true, msg: "Loging in success!", token: 'JWT ' + jwt.sign({ email: user.email, name: user.name, surename: user.surename, id: user.id }, 'RESTFULAPIs') });
            }
        } else {
            // res.status(401).json({ msg: 'Authentication failed. User not found.' });
            res.json({ success: false, msg: " Authentication failed. User not found" });
        }
        connection.end();
    });
};


var memberinfo = function(req, res, next) {
    const connection = newClient();
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], 'RESTFULAPIs', function(err, decode) {
            console.log("DECODE: ");
            console.log(decode);
            if (err) req.user = undefined;
            if (decode === undefined) {
                res.json({ success: false, msg: "No token" });
            }
            connection.query("select email from customers where email='" + decode.email + "'", function(err, rows) {
                const user = rows.rows[0];
                if (user) {
                    res.json({ success: true, msg: decode.email });
                } else {
                    res.json({ success: false, msg: "No such user registered" });
                }
                connection.end();
            });
            req.user = decode; //?
            // next();
        });
    } else {
        res.json({ success: false, msg: "Token not provided" });
        req.user = undefined; //?
        connection.end();
        //next();
    }

};


var loginRequired = function(req, res, next) {
    //const connection = newClient();
    if (req.user) {
        console.log("loginRequired");
        next();
    } else {
        return res.status(401).json({ message: 'Unauthorized user!' });
    }
};

module.exports = { mysql, register, login, loginRequired, memberinfo, customers, deletecustomer }