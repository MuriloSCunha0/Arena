// Script para executar o schema de teste no banco Supabase
// Execute este arquivo para criar todas as tabelas do ambiente de teste

import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function executeSchema() {
  try {
    console.log('🔄 Iniciando execução do schema de teste...');
    
    // Ler o arquivo SQL
    const schemaPath = path.join(process.cwd(), 'db', 'test_environment_schema.sql');
    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir o SQL em comandos individuais (split por ';' e filtrar vazios)
    const sqlCommands = sqlSchema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para executar`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.includes('CREATE TABLE') || command.includes('CREATE VIEW') || 
          command.includes('CREATE TRIGGER') || command.includes('CREATE FUNCTION') ||
          command.includes('CREATE OR REPLACE')) {
        
        console.log(`\n🔄 [${i + 1}/${sqlCommands.length}] Executando comando...`);
        console.log(`📄 Comando: ${command.substring(0, 100)}...`);
        
        try {
          const { data, error } = await supabase.rpc('execute_sql', { 
            sql_query: command + ';' 
          });
          
          if (error) {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
            console.error(`🔍 Comando que falhou: ${command}`);
            errorCount++;
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exceção no comando ${i + 1}:`, err);
          errorCount++;
        }
        
        // Pequena pausa entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 Resumo da execução:');
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Schema de teste criado com sucesso!');
      console.log('🚀 Você já pode usar o TestTournamentManager com banco de dados');
    } else {
      console.log('\n⚠️ Alguns comandos falharam. Verifique os erros acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal na execução do schema:', error);
  }
}

// Executar o script
executeSchema();
