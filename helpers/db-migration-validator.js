const path = require("path");
const mysql = require("mysql");


const mockEnv = function (key, defaultValue) {
    mockEnv.get = function (key, defaultValue) {
        return process.env[key] ? process.env[key] : defaultValue;
    }
    mockEnv.int = function (key, defaultValue) {
        return mockEnv.get(key, defaultValue);
    }

    mockEnv.bool = function (key, defaultValue) {
        const b = mockEnv.get(key, defaultValue);
        if (typeof (b) == "boolean") {
            return b;
        } if (typeof (b) == "string") {
            return /^(?:f(?:alse)?|no?|of?|off?|0+)$/i.test(b) && !!b;
        } if (["bigint", "number"].includes(typeof (b))) { //
            return parseInt(b) > 0;
        }
        return !!b;
    }

    return mockEnv.get(key, defaultValue);
}

const loadStrapiDatabaseConfig = (strapiDir) => {
    const strapiDbConfig = path.join(strapiDir, 'config/database');
    const config = require(strapiDbConfig)({ env: mockEnv });
    let con = config;
    con = con.connections ? con.connections : con.connection;
    con = con.default ? con.default : con.connection;
    con = con.settings ? con.settings : con;
    con = Object.assign({}, con, {
        insecureAuth: con.ssl ? true : false,
        multipleStatements: true,
        connectionLimit: 10,
        user: con.username ? con.username : con.user,
    });
    if (!con.ssl) {
        delete con.ssl;
    }
    return con;
}

function camelto_(str) { return str.replace(/[A-Z]/g, (match, offset) => (offset > 0 ? '_' : '') + match.toLowerCase()); }

function compareLoseBothSides(left, right) {
    if (left == right) { return true; }

    if (compareLose(camelto_(right), left) || compareLose(left, camelto_(right))) { return true; }

    left = left.toLowerCase().replaceAll('-', '_');
    right = right.toLowerCase().replaceAll('-', '_');
    if (compareLose(right, left) || compareLose(left, right)) { return true; }

    //if (left.indexOf("__") > 0 || left.indexOf("__") > 0) {
    //    if (compareLose(right.split("__").reverse().join("__"), left) || compareLose(left.split("__").reverse().join("__"), right)) { return true; }
    //}
    return false;
}

function compareLose(left, right) {

    if (left == right) {
        return true;
    }

    if (left.replace('es_id', '_id') == right) {
        return true;
    }
    if (left.replace('s_id', '_id') == right) {
        return true;
    }
    if (left.startsWith('up_') && left.replace('up_', '') == right) {
        return true;
    } if (left.startsWith('admin_') && left.replace('admin_', '') == right) {
        return true;
    }
    if (left.endsWith('es') && left.substring(0, left.length - 2) == right) {
        return true;
    }
    if (left.endsWith('s') && left.substring(0, left.length - 1) == right) {
        return true;
    }
    if (left.substring(0, left.length - 1) == right) {
        return true;
    }
    if (left.replaceAll('es_', '_').substring(0, left.length - 2) == right) {
        return true;
    }
    if (left.replaceAll('es_', '_') == right) {
        return true;
    }
    return false;
}



const isInValid = (mapping) => {
    const map = mapping.mapping ? mapping.mapping : mapping;
    if (map.source.hasTable != true || map.dest.hasTable != true || map.valid != true) {
        return false;
    }
    const valid = (map.source.missing.length == 0 && map.dest.missing.length == 0);
    return !valid;
}

const dbQueryTableCols = (pool, dbName) => {
    return new Promise((resolve, reject) => {
        pool.query("SELECT TABLE_NAME tblName,COLUMN_NAME colName FROM  information_schema.COLUMNS WHERE TABLE_SCHEMA=?", [dbName], function (error, results, fields) {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

function validate(mappings, dbview) {
    mappings.forEach(m => {
        let rcols = dbview.filter(r => r.tblName == m.table);
        if (rcols.length == 0) {
            rcols = dbview.filter(r => compareLoseBothSides(r.tblName, m.table));

        }
        if (rcols.length > 0) {
            m.table = rcols[0].tblName;
        }
        m.hasTable = rcols.length > 0; m.missing = []; m.present = [];
        m.hasIdCol = !!rcols.find(f => f.colName == 'id');
        if (m.hasTable) {
            m.fields = m.fields.map(filedName => {
                let found = rcols.find(r => r.colName == filedName);
                if (!found) {
                    found = rcols.find(r => compareLoseBothSides(r.colName, filedName));
                }
                return found ? found.colName : filedName;
            });

            m.missing = m.fields.filter(f => !rcols.find(r => r.colName == f));
        }
        if (m.missing.length > 0) {
            m.present = rcols.map(r => r.colName);
        }
    });
}


const validateWithQuery = (connConfig, mappings) => {
    // console.log("CamelCase".replace(/[A-Z]/g, (match, offset) => (offset > 0 ? '_' : '') + match.toLowerCase()))

    return new Promise((resolve, reject) => {
        const pool = createConnectionPool(connConfig);
        dbQueryTableCols(pool, connConfig.database).then(dbview => {
            validate(mappings, dbview);
            //    console.log(results);
            resolve({ mappings, dbview: dbview });
            // resolve(mappings);
        }).catch(error => {
            reject(error);
            console.error(error);
        });
    });
}

const createConnectionPool = (connConfig) => {
    const pool = mysql.createPool(connConfig);
    return pool;
}

const initWithDefaultConfig = (strapiDir) => {
    return Object.assign({}, exports, {
        validate: (mappings) => {
            return validateWithQuery(loadStrapiDatabaseConfig(strapiDir), mappings);
        }
    });
}

const validateBothWithQuery = (threeDbCfg, fourDbCfg, db_mappings) => {
    return Promise.all([
        validateWithQuery(fourDbCfg, db_mappings.map(m => m.mapping.dest).flat()),
        validateWithQuery(threeDbCfg, db_mappings.map(m => m.mapping.source).flat())
    ]);
}

Object.assign(exports, { loadStrapiDatabaseConfig, dbQueryTableCols, initWithDefaultConfig, validateWithQuery, validateBothWithQuery, createConnectionPool, validate, isInValid });