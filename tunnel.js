const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    // Use a short random string as subdomain to reduce likelihood of password requirement
    const randomId = Math.random().toString(36).substring(2, 8);
    const subdomain = 'frp-' + randomId;
    
    // Create the tunnel without specifying subdomain first
    const tunnel = await localtunnel({ 
      port: 5000
    });
    
    console.log('');
    console.log('==================================================');
    console.log('🚀 Local tunnel established!');
    console.log('');
    console.log('📱 Your Face Recognition Platform is available at:');
    console.log(`🔗 ${tunnel.url}`);
    console.log('');
    console.log('🌐 Visit the application page directly at:');
    console.log(`🔗 ${tunnel.url}/app`);
    console.log('==================================================');
    console.log('');
    
    // Handle errors and reconnect if needed
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        startTunnel();
      }, 1000);
    });
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        startTunnel();
      }, 1000);
    });
    
    // Keep the process running
    process.on('SIGINT', () => {
      tunnel.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error creating tunnel:', error);
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      startTunnel();
    }, 3000);
  }
}

startTunnel();