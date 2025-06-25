// Test environment variables
require('dotenv').config();

console.log('=== Environment Variables Check ===');
console.log('***REMOVED***:', process.env.***REMOVED*** ? 'SET' : 'NOT SET');
console.log('***REMOVED***:', process.env.***REMOVED*** ? 'SET' : 'NOT SET');
console.log('***REMOVED***:', process.env.***REMOVED*** ? 'SET' : 'NOT SET');
console.log('PUBLIC_URL:', process.env.PUBLIC_URL ? 'SET' : 'NOT SET');
console.log('***REMOVED***:', process.env.***REMOVED*** ? 'SET' : 'NOT SET');

if (process.env.***REMOVED***) {
    console.log('Account SID length:', process.env.***REMOVED***.length);
    console.log('Account SID starts with:', process.env.***REMOVED***.substring(0, 10) + '...');
}

if (process.env.***REMOVED***) {
    console.log('Auth Token length:', process.env.***REMOVED***.length);
    console.log('Auth Token starts with:', process.env.***REMOVED***.substring(0, 10) + '...');
}

if (process.env.***REMOVED***) {
    console.log('Phone Number:', process.env.***REMOVED***);
}

console.log('\n📁 Current working directory:', process.cwd());
console.log('📄 .env file exists:', require('fs').existsSync('.env'));

console.log('\n🔧 To fix this:');
console.log('1. Create a .env file in the project root');
console.log('2. Add your Twilio credentials:');
console.log('   ***REMOVED***=your_real_account_sid');
console.log('   ***REMOVED***=your_real_auth_token');
console.log('   ***REMOVED***=your_real_phone_number');
console.log('3. Restart the server');
console.log('=== End Check ==='); 