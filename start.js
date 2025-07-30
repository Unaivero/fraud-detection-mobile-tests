/**
 * Helper script to start both the mock server and run tests
 */
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.cyan}=== Fraud Detection Testing Framework ===${colors.reset}`);
console.log(`${colors.cyan}Starting mock server and test runner...${colors.reset}\n`);

// Start the mock server
const serverProcess = spawn('node', [path.join(__dirname, 'src', 'mockServer', 'server.js')], {
  stdio: 'pipe',
});

let serverStarted = false;
const PORT = process.env.MOCK_SERVER_PORT || 3000;

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`${colors.magenta}[SERVER] ${colors.reset}${output.trim()}`);
  
  // Check if server has started
  if (output.includes(`Mock API server running on port ${PORT}`)) {
    serverStarted = true;
    console.log(`\n${colors.green}Mock server started successfully on port ${PORT}${colors.reset}`);
    console.log(`${colors.cyan}Waiting 2 seconds before starting tests...${colors.reset}\n`);
    
    // Wait a bit for the server to be fully ready
    setTimeout(() => {
      startTests();
    }, 2000);
  }
});

// Handle server errors
serverProcess.stderr.on('data', (data) => {
  console.error(`${colors.red}[SERVER ERROR] ${colors.reset}${data.toString().trim()}`);
});

// Function to start the tests
function startTests() {
  console.log(`${colors.bright}${colors.green}Starting tests...${colors.reset}\n`);
  
  const testProcess = spawn('npx', ['mocha', '--timeout', '120000', 'tests/**/*.test.js'], {
    stdio: 'inherit',
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n${colors.bright}${colors.green}Tests completed successfully${colors.reset}`);
    } else {
      console.log(`\n${colors.bright}${colors.red}Tests failed with code ${code}${colors.reset}`);
    }
    
    // Shutdown the server
    console.log(`${colors.cyan}Shutting down mock server...${colors.reset}`);
    serverProcess.kill();
    process.exit(code);
  });
}

// Handle script termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
  serverProcess.kill();
  process.exit(0);
});
