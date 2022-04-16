const util = require('./migration-utils');

function combineQueries(qs) {
    const qscombined = {
        truncate: qs.map(q => q.truncate).reverse(),
        insert_select: qs.map(q => q.insert + ' ' + q.select),
        select: qs.map(q => q.select),
        insert: qs.map(q => q.insert),
        update: qs.filter(q => q.update).map(q => q.update),
        allSQl: () => {
            const queryText = ([
                ["SET FOREIGN_KEY_CHECKS=0", "SET SQL_SAFE_UPDATES = 0"],
                qscombined.truncate, qscombined.insert_select, qscombined.update,
                ["SET FOREIGN_KEY_CHECKS=1", "SET SQL_SAFE_UPDATES = 1", ""],
            ].flat().join(';\n'));
            return queryText;
        }
    };
    return qscombined;
}

function mappingToQueries(dbmaster) {

    function $where($wh) {
        if ($wh) {
            let nv = util.toNV($wh);
            return " WHERE " + nv.map(n => '`' + n.name + "`='" + n.val + "'").join(' and ');
        }
        else
            return "";
    }
    function $udated($up) {
        if ($up) {
            let nv = util.toNV($up);
            return " SET " + nv.map(n => '`' + n.name + "`='" + n.val + "'").join(' , ');
        }
        else
            return "";
    }

    return dbmaster.map(d => {
        const idCol = (d.dest.hasIdCol && d.source.hasIdCol) ? 'id`,`' : '';

        const query = {
            insert: " INSERT  INTO   dest_db_name.`" + d.dest.table + "` (`" + idCol + d.dest.fields.join('`,`') + "`)" + " /*" + d.direction + " */",
            select: " SELECT `" + idCol + d.source.fields.join('`,`') + "` from source_db_name.`" + d.source.table + '` ' + $where(d.source.$where),
            truncate: " TRUNCATE TABLE dest_db_name.`" + d.dest.table + "`",
            direction: d.direction
        };

        if (d.dest.$update) {
            query.update = d.dest.$update ? (" UPDATE dest_db_name.`" + d.dest.table + '` ' + $udated(d.dest.$update) + $where(d.dest.$where)) : null;
        }
        return query;
    });
}


Object.assign(exports, { combineQueries, mappingToQueries });
