import odbc from 'odbc';
import dotenv from 'dotenv';

dotenv.config();

async function testQuery() {
  try {
    const connStr = `DSN=${process.env.DB_DSN2};UID=${process.env.DB_USER2};PWD=${process.env.DB_PASS2}`;
    const conn = await odbc.connect(connStr);
    
    // Get columns from the USER table
    const columns = await conn.query(
      `SELECT column_name FROM all_tab_columns 
       WHERE owner = 'QUALIDADE' AND table_name = 'GESTAO_CARGAS_TRANSPORTE_USER'
       ORDER BY column_id`
    );
    
    console.log('Colunas da tabela GESTAO_CARGAS_TRANSPORTE_USER:');
    columns.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.COLUMN_NAME || col.column_name}`);
    });
    
    // Get one user to see actual data
    const user = await conn.query(
      `SELECT * FROM QUALIDADE.GESTAO_CARGAS_TRANSPORTE_USER 
       WHERE email = 'ailton.leme@agt.com.br'
       FETCH FIRST 1 ROWS ONLY`
    );
    
    if (user.length > 0) {
      console.log('\nDados do usuário ailton.leme@agt.com.br:');
      console.log(JSON.stringify(user[0], null, 2));
    }
    
    await conn.close();
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

testQuery();
