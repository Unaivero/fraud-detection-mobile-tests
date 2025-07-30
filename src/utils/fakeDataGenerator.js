/**
 * Fake data generator for creating test users and bet data
 * Uses faker.js to generate realistic looking test data
 */
const { faker } = require('@faker-js/faker');

class FakeDataGenerator {
  // Generate complete user registration data
  static generateUserData() {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const username = faker.internet.userName().toLowerCase();
    
    return {
      firstName,
      lastName,
      email: faker.internet.email(),
      username,
      password: faker.internet.password() + '1A!', // Ensure password complexity
      dateOfBirth: faker.date.past().toISOString().split('T')[0],
      phoneNumber: faker.phone.number(),
      address: {
        street: faker.address.streetAddress(),
        city: faker.address.city(),
        state: faker.address.state(),
        zipCode: faker.address.zipCode(),
        country: faker.address.country()
      }
    };
  }

  // Generate login credentials from user data or create new ones
  static generateLoginCredentials(userData = null) {
    if (userData) {
      return {
        username: userData.username,
        password: userData.password
      };
    }
    
    return {
      username: faker.internet.userName().toLowerCase(),
      password: faker.internet.password() + '1A!'
    };
  }

  // Generate legitimate bet data
  static generateBetData() {
    const sports = ['football', 'basketball', 'tennis', 'baseball', 'hockey'];
    const sport = faker.helpers.arrayElement(sports);
    const teams = {
      football: ['Manchester United', 'Liverpool', 'Barcelona', 'Real Madrid', 'Bayern Munich'],
      basketball: ['Lakers', 'Celtics', 'Bulls', 'Heat', 'Warriors'],
      tennis: ['Nadal', 'Djokovic', 'Federer', 'Murray', 'Williams'],
      baseball: ['Yankees', 'Red Sox', 'Cubs', 'Dodgers', 'Giants'],
      hockey: ['Canadiens', 'Maple Leafs', 'Bruins', 'Blackhawks', 'Red Wings']
    };
    
    const homeTeam = faker.helpers.arrayElement(teams[sport]);
    let awayTeam = faker.helpers.arrayElement(teams[sport]);
    
    // Make sure home and away teams are different
    while (awayTeam === homeTeam) {
      awayTeam = faker.helpers.arrayElement(teams[sport]);
    }
    
    return {
      matchId: faker.datatype.string(10).toUpperCase(),
      sport,
      homeTeam,
      awayTeam,
      betType: faker.helpers.arrayElement(['single', 'accumulator', 'system']),
      marketType: faker.helpers.arrayElement(['winner', 'total_goals', 'both_teams_to_score', 'handicap']),
      selection: faker.helpers.arrayElement(['home', 'away', 'draw', 'over', 'under', 'yes', 'no']),
      odds: (1 + (Math.random() * 10)).toFixed(2),
      amount: Math.floor(Math.random() * 95) + 5,
      timestamp: new Date().toISOString(),
      transactionId: faker.datatype.uuid()
    };
  }

  // Generate payment information
  static generatePaymentInfo() {
    return {
      cardType: faker.helpers.arrayElement(['Visa', 'Mastercard', 'Amex']),
      cardNumber: faker.finance.creditCardNumber(),
      cardExpiry: faker.date.future().toISOString().split('T')[0].substring(0, 7),
      cardCvc: faker.finance.creditCardCVV(),
      cardHolder: faker.name.findName()
    };
  }

  // Generate random alphanumeric string
  static generateRandomString(length) {
    if (length <= 0) return '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = FakeDataGenerator;
