import Pool from 'pg-pool';
import toSnakeCase from 'to-snake-case';

const Postgres = (configObject) => {
  const pool = new Pool(configObject);
  const close = pool.end.bind(pool);
  const ready = Promise.resolve();
  const database = {
    query: (sql, variables = null) => {
      if (!variables || Array.isArray(variables)) {
        return pool.query(sql, variables);
      }
      const params = Object.keys(variables).map(key => `@${key}`);
      const re = new RegExp(params.join('|'), 'g');
      const pgSql = sql.replace(re, matched => `$${params.indexOf(matched) + 1}`);
      return pool.query(pgSql, Object.values(variables));
    },
    table: tableName => ({
      insert: (variables) => {
        let cols;
        let rowsToInsert;
        if (Array.isArray(variables)) {
          cols = Object.keys(variables[0]).map(toSnakeCase);
          rowsToInsert = variables;
        } else {
          cols = Object.keys(variables).map(toSnakeCase);
          rowsToInsert = [variables];
        }
        let rowNum = 0;
        let sql = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES `;
        const values = rowsToInsert.reduce((memo, row) => {
          const vals = Object.values(row);
          const substOffset = rowNum * vals.length;
          const substVals = Array.from(Array(vals.length).keys()).map(i => `$${substOffset + i + 1}`);
          sql = `${sql} (${substVals.join(',')}),`;
          rowNum += 1;
          return [...memo, ...vals];
        }, []);
        sql = `${sql.slice(0, -1)} RETURNING *`;
        return pool.query(sql, values);
      },
      upsert: (variables, { conflictTarget, excludeOnConflict }) => {
        if (!conflictTarget) {
          throw new Error('parameter conflictTarget is required for upserting');
        }
        let cols;
        let rowsToUpsert;
        if (Array.isArray(variables)) {
          cols = Object.keys(variables[0]).map(toSnakeCase);
          rowsToUpsert = variables;
        } else {
          cols = Object.keys(variables).map(toSnakeCase);
          rowsToUpsert = [variables];
        }
        let rowNum = 0;
        let sql = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES `;
        const values = rowsToUpsert.reduce((memo, row) => {
          const vals = Object.values(row);
          const substOffset = rowNum * vals.length;
          const substVals = Array.from(Array(vals.length).keys()).map(i => `$${substOffset + i + 1}`);
          sql = `${sql} (${substVals.join(',')}),`;
          rowNum += 1;
          return [...memo, ...vals];
        }, []);
        const conflictTargetStr = Array.isArray(conflictTarget) ? conflictTarget.join(',') : conflictTarget;
        const excludedCols = Array.isArray(excludeOnConflict) ? excludeOnConflict : [excludeOnConflict];
        const colsWithoutExcluded = cols.filter(col => !excludedCols.includes(col));
        const updateClause = colsWithoutExcluded.map(col => `${col} = excluded.${col}`).join(',');
        sql = `${sql.slice(0, -1)} ON CONFLICT (${conflictTargetStr}) DO UPDATE SET ${updateClause} RETURNING *`;
        return pool.query(sql, values);
      },
    }),
  };
  return { close, ready, database };
};

module.exports = Postgres;
export default Postgres;
