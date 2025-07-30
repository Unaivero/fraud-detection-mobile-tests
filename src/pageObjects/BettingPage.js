/**
 * Betting Page Object for handling betting flow and checking bet history
 */
const BasePage = require('./BasePage');

class BettingPage extends BasePage {
  // Selectors for betting elements
  selectors = {
    betTab: 'id=com.example.bettingapp:id/betTabButton',
    betHistoryTab: 'id=com.example.bettingapp:id/betHistoryTabButton',
    sportSelector: 'id=com.example.bettingapp:id/sportSelector',
    matchSelector: 'id=com.example.bettingapp:id/matchSelector',
    betTypeSelector: 'id=com.example.bettingapp:id/betTypeSelector',
    selectionSelector: 'id=com.example.bettingapp:id/selectionSelector',
    oddsDisplay: 'id=com.example.bettingapp:id/oddsDisplay',
    betAmountInput: 'id=com.example.bettingapp:id/betAmountInput',
    placeBetButton: 'id=com.example.bettingapp:id/placeBetButton',
    betConfirmationMessage: 'id=com.example.bettingapp:id/betConfirmationMessage',
    betErrorMessage: 'id=com.example.bettingapp:id/betErrorMessage',
    noBetsMessage: 'id=com.example.bettingapp:id/noBetsMessage',
    betHistoryItems: 'id=com.example.bettingapp:id/betHistoryItem',
    betMatchId: 'id=com.example.bettingapp:id/betHistoryMatchId',
    betAmount: 'id=com.example.bettingapp:id/betHistoryAmount',
    betDate: 'id=com.example.bettingapp:id/betHistoryDate'
  };

  /**
   * Navigate to the betting tab
   */
  async navigateToBettingTab() {
    await this.click(this.selectors.betTab);
  }

  /**
   * Navigate to bet history tab
   */
  async navigateToBetHistory() {
    await this.click(this.selectors.betHistoryTab);
  }

  /**
   * Select a sport from dropdown
   * @param {string} sport - Sport name
   */
  async selectSport(sport) {
    await this.click(this.selectors.sportSelector);
    const sportOption = `xpath=//android.widget.TextView[@text="${sport}"]`;
    await this.click(sportOption);
  }

  /**
   * Select a match from available matches
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   */
  async selectMatch(homeTeam, awayTeam) {
    await this.click(this.selectors.matchSelector);
    const matchOption = `xpath=//android.widget.TextView[contains(@text, "${homeTeam}") and contains(@text, "${awayTeam}")]`;
    await this.click(matchOption);
  }

  /**
   * Select bet type
   * @param {string} betType - Type of bet (e.g., "Winner", "Total Goals")
   */
  async selectBetType(betType) {
    await this.click(this.selectors.betTypeSelector);
    const betTypeOption = `xpath=//android.widget.TextView[@text="${betType}"]`;
    await this.click(betTypeOption);
  }

  /**
   * Select betting option
   * @param {string} selection - Betting selection (e.g., "Home", "Away", "Draw")
   */
  async selectOption(selection) {
    await this.click(this.selectors.selectionSelector);
    const selectionOption = `xpath=//android.widget.TextView[@text="${selection}"]`;
    await this.click(selectionOption);
  }

  /**
   * Enter bet amount
   * @param {string} amount - Bet amount
   */
  async enterBetAmount(amount) {
    await this.sendKeys(this.selectors.betAmountInput, amount.toString());
  }

  /**
   * Get current odds
   * @returns {string} - Current odds
   */
  async getOdds() {
    return await this.getText(this.selectors.oddsDisplay);
  }

  /**
   * Place a bet
   */
  async placeBet() {
    await this.click(this.selectors.placeBetButton);
  }

  /**
   * Place a bet with all the required information
   * @param {Object} betData - Data for the bet
   * @returns {boolean} - Whether bet was successfully placed
   */
  async placeCompleteBet(betData) {
    await this.navigateToBettingTab();
    await this.selectSport(betData.sport);
    await this.selectMatch(betData.homeTeam, betData.awayTeam);
    
    let betType = 'Winner';
    switch (betData.marketType) {
      case 'winner':
        betType = 'Winner';
        break;
      case 'total_goals':
        betType = 'Total Goals';
        break;
      case 'both_teams_to_score':
        betType = 'Both Teams to Score';
        break;
      case 'handicap':
        betType = 'Handicap';
        break;
    }
    await this.selectBetType(betType);
    
    let selection = 'Home';
    switch (betData.selection) {
      case 'home':
        selection = 'Home';
        break;
      case 'away':
        selection = 'Away';
        break;
      case 'draw':
        selection = 'Draw';
        break;
      case 'over':
        selection = 'Over';
        break;
      case 'under':
        selection = 'Under';
        break;
      case 'yes':
        selection = 'Yes';
        break;
      case 'no':
        selection = 'No';
        break;
    }
    await this.selectOption(selection);
    
    await this.enterBetAmount(betData.amount);
    await this.placeBet();
    
    // Wait for confirmation or error message
    try {
      await this.waitFor(
        async () => {
          return await this.isDisplayed(this.selectors.betConfirmationMessage) ||
                 await this.isDisplayed(this.selectors.betErrorMessage);
        },
        10000,
        'Bet placement result not determined'
      );
      
      const isSuccess = await this.isDisplayed(this.selectors.betConfirmationMessage);
      
      if (isSuccess) {
        console.log(`Successfully placed bet of ${betData.amount} on ${betData.selection}`);
      } else {
        const errorMsg = await this.getText(this.selectors.betErrorMessage);
        console.error(`Bet placement failed: ${errorMsg}`);
      }
      
      return isSuccess;
    } catch (error) {
      console.error(`Bet placement timeout: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a bet is present in bet history
   * @param {string} matchId - ID of the match to look for
   * @returns {boolean} - Whether bet was found in history
   */
  async isBetInHistory(matchId) {
    await this.navigateToBetHistory();
    
    // Check if there are any bets
    if (await this.isDisplayed(this.selectors.noBetsMessage)) {
      return false;
    }
    
    // Try to find the bet with the given match ID
    const betItems = await this.driver.$$(this.selectors.betHistoryItems);
    for (const item of betItems) {
      const isVisible = await item.isDisplayed();
      if (!isVisible) continue;
      
      const matchIdEl = await item.$(this.selectors.betMatchId.replace('id=', ''));
      const matchIdText = await matchIdEl.getText();
      
      if (matchIdText.includes(matchId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all bets from history
   * @returns {Array} - List of bets found in history
   */
  async getAllBets() {
    await this.navigateToBetHistory();
    
    // Check if there are any bets
    if (await this.isDisplayed(this.selectors.noBetsMessage)) {
      return [];
    }
    
    // Get all bet items
    const bets = [];
    const betItems = await this.driver.$$(this.selectors.betHistoryItems);
    
    for (const item of betItems) {
      const isVisible = await item.isDisplayed();
      if (!isVisible) continue;
      
      const matchIdEl = await item.$(this.selectors.betMatchId.replace('id=', ''));
      const amountEl = await item.$(this.selectors.betAmount.replace('id=', ''));
      const dateEl = await item.$(this.selectors.betDate.replace('id=', ''));
      
      bets.push({
        matchId: await matchIdEl.getText(),
        amount: await amountEl.getText(),
        date: await dateEl.getText()
      });
    }
    
    return bets;
  }
}

module.exports = BettingPage;
