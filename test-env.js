// Test environment variables
require('dotenv').config();

console.log('=== Environment Variables Check ===');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'SET' : 'NOT SET');
console.log('PUBLIC_URL:', process.env.PUBLIC_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

if (process.env.TWILIO_ACCOUNT_SID) {
    console.log('Account SID length:', process.env.TWILIO_ACCOUNT_SID.length);
    console.log('Account SID starts with:', process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...');
}

if (process.env.TWILIO_AUTH_TOKEN) {
    console.log('Auth Token length:', process.env.TWILIO_AUTH_TOKEN.length);
    console.log('Auth Token starts with:', process.env.TWILIO_AUTH_TOKEN.substring(0, 10) + '...');
}

if (process.env.TWILIO_PHONE_NUMBER) {
    console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER);
}

console.log('\n📁 Current working directory:', process.cwd());
console.log('📄 .env file exists:', require('fs').existsSync('.env'));

console.log('\n🔧 To fix this:');
console.log('1. Create a .env file in the project root');
console.log('2. Add your Twilio credentials:');
console.log('   TWILIO_ACCOUNT_SID=your_real_account_sid');
console.log('   TWILIO_AUTH_TOKEN=your_real_auth_token');
console.log('   TWILIO_PHONE_NUMBER=your_real_phone_number');
console.log('3. Restart the server');
console.log('=== End Check ==='); 