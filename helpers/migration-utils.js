const fs = require("fs");
const path = require("path");
const { singular, plural } = require("pluralize");
const pluralize = require('pluralize');
const { settings } = require("../config/settings");
const substitutions = require("../config/substitutions");


const replaceSubstitutions = (text, type) => {
    const synonyms = substitutions.literals.filter(f => f.source.indexOf("'") > 0 || f.dest.indexOf("'") > 0).map(sub => { return { source: sub.source.replaceAll("'", '"'), dest: sub.dest.replaceAll("'", '"') }; });
    [substitutions.literals, synonyms].flat().forEach(sub => { text = text.replaceAll(sub.source, sub.dest); }); return text;
};

const snapshot = (name, contents) => {
    const dir = process.env.snapshotPath = process.env.snapshotPath ? process.env.snapshotPath : path.join(__dirname, "../../", "migration-snapshots")
    let ext = path.extname(name); ext = ext ? ext : (typeof (contents) == "string" ? ".txt" : ".json")
    const fileName = path.join(dir, name + ext);
    ensureDirectoryExistence(fileName);
    if (typeof (contents) != "string") {
        const obj = { length: contents.length, /* time: new Date(),*/ snapshot: contents, };
        if (!Array.isArray(contents)) { obj.length = Object.keys(contents).length; obj.keys = Object.keys(contents); }
        contents = JSON.stringify(obj, null, 4);
    }
    fs.writeFileSync(fileName, contents);
};

const createDbView = (a, position) => {
    let view = groupBy(a.dbview, 'tblName');
    Object.keys(view).sort().forEach(key => {
        view[key] = {
            fields: view[key].map(x => x.cname), mapped: !!a.mappings.find(m => m.table == key)
        };
    });
    return view;
};

function unique(strAry) { return strAry.sort().filter(function (item, pos, ary) { return !pos || item != ary[pos - 1]; }); }

const template = (s, obj) => { for (var prop in obj) { s = s.replace(new RegExp("{" + prop + "}", "g"), obj[prop]); } return s; };

const namedAttribsOf = (schema) => { return Object.keys(schema.attributes).map(key => { let attrib = schema.attributes[key]; if (!attrib._an) { attrib._an = key; } return attrib; }); };

const relAttribsOf = (schema) => { return namedAttribsOf(schema).filter(a => a.model || a.collection); };

const cleanAttribs = (schema) => {
    namedAttribsOf(schema).forEach(attrib => {
        delete attrib.model;
        delete attrib.collection;
        delete attrib._an;
        delete attrib.via; /*delete attrib.dominant;*/
    });
};

const flatten = (lists) => { return lists.reduce((a, b) => a.concat(b), []); };
const getDirectories = (srcpath) => { return fs.readdirSync(srcpath).map(file => path.join(srcpath, file)).filter(path => fs.statSync(path).isDirectory()); };
const groupBy = (xs, key) => { return xs.reduce(function (rv, x) { (rv[x[key]] = rv[x[key]] || []).push(x); return rv; }, {}); };
const cleanJson = (obj) => { return JSON.stringify(obj, null, 2).replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, function (match) { return match.replace(/"/g, ""); }); };
const cleanCode = (text) => { return text.split('\n').map(line => line.split('\r')).flat().filter(l => { let line = l.trim(); return !(line === '' || line.startsWith('//')); }).join('\n').trim(); };


const ensureDirectoryExistence = (filePath) => { var dirname = path.dirname(filePath); if (fs.existsSync(dirname)) { return true; } ensureDirectoryExistence(dirname); fs.mkdirSync(dirname); };
const saveFile = (dir, fileName, content) => { let fileFullName = path.join(dir, fileName); ensureDirectoryExistence(fileFullName); fs.writeFileSync(fileFullName, content); };


const getFileslist = (dir) => {
    var results = []; var list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file); var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory *//* Recurse into a subdirectory */
            results = results.concat(getFileslist(file));
        }
        else { /* Is a file *//* Is a file */ results.push(file); }
    });
    return results;
};

const toNV = (obj) => { const keys = Object.keys(obj); return keys.map(keyn => { return { name: keyn, val: obj[keyn] } }) }

Object.assign(exports, {
    snapshot,
    createDbView,
    unique,
    template,
    namedAttribsOf,
    relAttribsOf,
    cleanAttribs,
    flatten,
    getDirectories,
    groupBy,
    cleanAttribs,
    cleanJson,
    cleanCode,
    ensureDirectoryExistence,
    saveFile,
    replaceSubstitutions,
    toNV,
    getFileslist
});
