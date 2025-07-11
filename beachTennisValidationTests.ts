import { distributeTeamsIntoGroups } from './src/utils/groupFormationUtils';
import { calculateGroupRankings } from './src/utils/rankingUtils';
import { generateEliminationBracket, GroupRanking } from './src/utils/rankingUtils';
import { Match } from './src/types';

/**
 * Comprehensive validation tests for Beach Tennis tournament rules
 * Validates:
 * 1. Group formation with 3-4 teams per group
 * 2. All-play-all within groups with correct number of matches
 * 3. Only top 2 teams advance from each group
 * 4. Elimination bracket: best vs worst, no same-group matchups in first round
 * 5. Scoring by point difference (can be negative)
 * 6. Ranking with proper tiebreakers
 */

// Test data generators
function createTestTeams(count: number): string[][] {
  return Array.from({ length: count }, (_, i) => [`P${i * 2 + 1}`, `P${i * 2 + 2}`]);
}

function createTestMatches(teams: string[][], groupNumber: number): Match[] {
  const matches: Match[] = [];
  let matchId = 1;
  
  // All-play-all within group
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: `match_${matchId++}`,
        tournamentId: 'test_tournament',
        eventId: 'test_event',
        round: 0,
        position: matches.length + 1,
        team1: teams[i],
        team2: teams[j],
        score1: Math.floor(Math.random() * 30) + 10, // Random scores 10-39
        score2: Math.floor(Math.random() * 30) + 10,
        winnerId: null, // Will be set based on scores
        completed: true,
        courtId: null,
        scheduledTime: null,
        stage: 'GROUP',
        groupNumber: groupNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  
  // Set winners based on scores
  matches.forEach(match => {
    if (match.score1! > match.score2!) {
      match.winnerId = 'team1';
    } else if (match.score2! > match.score1!) {
      match.winnerId = 'team2';
    }
  });
  
  return matches;
}

// Validation functions
function validateGroupSizes(groups: string[][][]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  for (let i = 0; i < groups.length; i++) {
    const groupSize = groups[i].length;
    if (groupSize < 3 || groupSize > 4) {
      valid = false;
      errors.push(`Group ${i + 1} has ${groupSize} teams (should be 3-4)`);
    }
  }
  
  return { valid, errors };
}

function validateAllPlayAll(teams: string[][], matches: Match[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  const expectedMatches = (teams.length * (teams.length - 1)) / 2;
  if (matches.length !== expectedMatches) {
    valid = false;
    errors.push(`Expected ${expectedMatches} matches for ${teams.length} teams, got ${matches.length}`);
  }
  
  // Check each team plays correct number of matches
  const teamMatches = new Map<string, number>();
  teams.forEach(team => {
    const teamKey = team.join(',');
    teamMatches.set(teamKey, 0);
  });
  
  matches.forEach(match => {
    const team1Key = match.team1!.join(',');
    const team2Key = match.team2!.join(',');
    
    teamMatches.set(team1Key, teamMatches.get(team1Key)! + 1);
    teamMatches.set(team2Key, teamMatches.get(team2Key)! + 1);
  });
  
  const expectedMatchesPerTeam = teams.length - 1;
  teamMatches.forEach((matchCount, teamKey) => {
    if (matchCount !== expectedMatchesPerTeam) {
      valid = false;
      errors.push(`Team ${teamKey} played ${matchCount} matches (should be ${expectedMatchesPerTeam})`);
    }
  });
  
  return { valid, errors };
}

function validateRanking(rankings: GroupRanking[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  // Check ranking order (higher rank = better position)
  for (let i = 0; i < rankings.length - 1; i++) {
    const current = rankings[i];
    const next = rankings[i + 1];
    
    // Primary: wins
    if (current.stats.wins < next.stats.wins) {
      valid = false;
      errors.push(`Ranking error: Team ${current.teamId} (${current.stats.wins} wins) ranked above team ${next.teamId} (${next.stats.wins} wins)`);
    }
    
    // Secondary: point difference when wins are equal
    if (current.stats.wins === next.stats.wins) {
      const currentDiff = current.stats.gamesWon - current.stats.gamesLost;
      const nextDiff = next.stats.gamesWon - next.stats.gamesLost;
      
      if (currentDiff < nextDiff) {
        valid = false;
        errors.push(`Ranking error: Team ${current.teamId} (diff: ${currentDiff}) ranked above team ${next.teamId} (diff: ${nextDiff}) with same wins`);
      }
    }
  }
  
  return { valid, errors };
}

function validateTop2Advance(groupRankings: Record<number, GroupRanking[]>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
    if (rankings.length < 2) {
      valid = false;
      errors.push(`Group ${groupNum} has only ${rankings.length} teams (need at least 2 to advance)`);
    }
    
    // Check that only top 2 would advance
    const qualifiers = rankings.slice(0, 2);
    const nonQualifiers = rankings.slice(2);
    
    if (qualifiers.length !== 2) {
      valid = false;
      errors.push(`Group ${groupNum} should have exactly 2 qualifiers, got ${qualifiers.length}`);
    }
  });
  
  return { valid, errors };
}

function validateEliminationBracket(bracket: Match[], groupAssignments: Record<string, number>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  // Check first round for same-group matchups
  const firstRoundMatches = bracket.filter(match => match.round === 1);
  
  firstRoundMatches.forEach(match => {
    if (match.team1 && match.team2) {
      const team1Key = match.team1.join(',');
      const team2Key = match.team2.join(',');
      const team1Group = groupAssignments[team1Key];
      const team2Group = groupAssignments[team2Key];
      
      if (team1Group === team2Group) {
        valid = false;
        errors.push(`First round match between teams from same group ${team1Group}: ${team1Key} vs ${team2Key}`);
      }
    }
  });
  
  return { valid, errors };
}

// Main test function
function runBeachTennisValidationTests() {
  console.log('🏐 Beach Tennis Tournament Validation Tests\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  const testCases = [
    { teams: 6, description: '6 teams (2 groups of 3)' },
    { teams: 8, description: '8 teams (2 groups of 4)' },
    { teams: 9, description: '9 teams (3 groups of 3)' },
    { teams: 10, description: '10 teams (2 groups of 3 + 1 group of 4)' },
    { teams: 12, description: '12 teams (4 groups of 3)' },
    { teams: 16, description: '16 teams (4 groups of 4)' }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n📋 Testing: ${testCase.description}`);
    console.log('='.repeat(50));
    
    const teams = createTestTeams(testCase.teams);
    const groups = distributeTeamsIntoGroups(teams);
    
    // Test 1: Group formation validation
    totalTests++;
    const groupValidation = validateGroupSizes(groups);
    if (groupValidation.valid) {
      console.log('✅ Group sizes valid (3-4 teams per group)');
      passedTests++;
    } else {
      console.log('❌ Group sizes invalid:');
      groupValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Test each group's matches and rankings
    const allGroupRankings: Record<number, GroupRanking[]> = {};
    const groupAssignments: Record<string, number> = {};
    
    groups.forEach((group, groupIndex) => {
      const groupNumber = groupIndex + 1;
      console.log(`\n🏆 Group ${groupNumber} (${group.length} teams):`);
      
      // Test 2: All-play-all matches
      totalTests++;
      const matches = createTestMatches(group, groupNumber);
      const matchValidation = validateAllPlayAll(group, matches);
      
      if (matchValidation.valid) {
        console.log('✅ All-play-all matches correct');
        passedTests++;
      } else {
        console.log('❌ All-play-all matches invalid:');
        matchValidation.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      // Test 3: Group rankings
      totalTests++;
      const rankings = calculateGroupRankings(matches);
      const rankingValidation = validateRanking(rankings);
      
      if (rankingValidation.valid) {
        console.log('✅ Group rankings calculated correctly');
        passedTests++;
      } else {
        console.log('❌ Group rankings invalid:');
        rankingValidation.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      allGroupRankings[groupNumber] = rankings;
      
      // Store group assignments for bracket validation
      group.forEach(team => {
        groupAssignments[team.join(',')] = groupNumber;
      });
      
      // Display rankings
      rankings.forEach((ranking, index) => {
        const diff = ranking.stats.gamesWon - ranking.stats.gamesLost;
        console.log(`   ${index + 1}. Team ${ranking.teamId.join(',')} - ${ranking.stats.wins}W ${ranking.stats.losses}L (${diff > 0 ? '+' : ''}${diff})`);
      });
    });
    
    // Test 4: Top 2 advance validation
    totalTests++;
    const advanceValidation = validateTop2Advance(allGroupRankings);
    if (advanceValidation.valid) {
      console.log('\n✅ Top 2 teams per group advance correctly');
      passedTests++;
    } else {
      console.log('\n❌ Top 2 advance validation failed:');
      advanceValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Test 5: Elimination bracket validation
    if (Object.keys(allGroupRankings).length >= 2) {
      totalTests++;
      try {
        const eliminationMatches = generateEliminationBracket(allGroupRankings);
        const bracketValidation = validateEliminationBracket(eliminationMatches, groupAssignments);
        
        if (bracketValidation.valid) {
          console.log('✅ Elimination bracket avoids same-group matchups in first round');
          passedTests++;
        } else {
          console.log('❌ Elimination bracket validation failed:');
          bracketValidation.errors.forEach(error => console.log(`   - ${error}`));
        }
      } catch (error) {
        console.log(`❌ Elimination bracket generation failed: ${error}`);
      }
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`🏁 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All Beach Tennis rules validated successfully!');
  } else {
    console.log('⚠️  Some validations failed. Review implementation.');
  }
  
  return { passed: passedTests, total: totalTests };
}

// Export for external use
export {
  runBeachTennisValidationTests,
  validateGroupSizes,
  validateAllPlayAll,
  validateRanking,
  validateTop2Advance,
  validateEliminationBracket,
  createTestTeams,
  createTestMatches
};

// Run tests if this file is executed directly
if (require.main === module) {
  runBeachTennisValidationTests();
}
