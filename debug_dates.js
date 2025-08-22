// Teste simples de data para debugging
console.log('🔍 Testando lógica de datas...');

const today = new Date().toISOString().split('T')[0];
console.log('📅 Data de hoje (formato ISO):', today);

// Algumas datas de teste
const testDates = [
  '2024-12-20',
  '2024-12-21', 
  '2024-12-22',
  '2025-01-01',
  '2025-01-15'
];

console.log('\n📊 Teste de comparações:');
testDates.forEach(testDate => {
  const isGreater = testDate > today;
  console.log(`${testDate} > ${today} = ${isGreater} ${isGreater ? '✅' : '❌'}`);
});

// Simular consulta no Supabase
console.log('\n🔍 Simulando consulta Supabase:');
console.log('Query: .gt("date", "' + today + '")');
console.log('Isso retornará eventos com data > "' + today + '"');

// Testar a data atual em diferentes formatos
console.log('\n📅 Formatos de data:');
console.log('new Date():', new Date());
console.log('new Date().toISOString():', new Date().toISOString());
console.log('new Date().toISOString().split("T")[0]:', new Date().toISOString().split('T')[0]);
console.log('new Date().toLocaleDateString():', new Date().toLocaleDateString());
console.log('new Date().toLocaleDateString("pt-BR"):', new Date().toLocaleDateString('pt-BR'));
