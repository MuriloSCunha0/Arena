// Test for group formation logic
// This is a simple test to validate the group distribution algorithm

// Simulating the core logic from tournament.ts
function testGroupFormation(totalTeams: number, defaultGroupSize: number = 3) {
  // Simulating teams
  const teams: string[][] = Array.from({ length: totalTeams }, (_, i) => [`Team ${i + 1}A`, `Team ${i + 1}B`]);
  
  // Core logic from tournament.ts
  let groupCount = Math.floor(totalTeams / defaultGroupSize);
  const remainingTeams = totalTeams % defaultGroupSize;
  
  const groupTeamsList: string[][][] = [];
  let teamIndex = 0;
  
  console.log(`Testing with ${totalTeams} teams, defaultGroupSize=${defaultGroupSize}`);
  console.log(`Initial groupCount=${groupCount}, remainingTeams=${remainingTeams}`);
  
  if (remainingTeams === 0) {
    // Caso perfeito: todos os grupos terão exatamente defaultGroupSize times
    for (let i = 0; i < groupCount; i++) {
      const group: string[][] = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
  } 
  else if (remainingTeams === 1) {
    // Sobra 1 time: criamos um grupo com 4 times e o resto com 3
    groupCount--;
    
    // Primeiro criamos os grupos com 3 times
    for (let i = 0; i < groupCount; i++) {
      const group: string[][] = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Depois criamos o grupo com 4 times
    const specialGroup: string[][] = [];
    for (let j = 0; j < 4; j++) {
      specialGroup.push(teams[teamIndex++]);
    }
    groupTeamsList.push(specialGroup);
  }
  else if (remainingTeams === 2) {
    // Sobram 2 times: criamos dois grupos com 4 times
    
    // Primeiro criamos os grupos com 3 times
    for (let i = 0; i < groupCount - 2; i++) {
      const group: string[][] = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Depois criamos os dois grupos com 4 times
    for (let i = 0; i < 2; i++) {
      const specialGroup: string[][] = [];
      for (let j = 0; j < 4; j++) {
        specialGroup.push(teams[teamIndex++]);
      }
      groupTeamsList.push(specialGroup);
    }
  }
  else if (remainingTeams === 3) {
    // Sobram 3 times: criamos três grupos com 4 times
    
    // Primeiro criamos os grupos com 3 times
    for (let i = 0; i < groupCount - 3; i++) {
      const group: string[][] = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Depois criamos os três grupos com 4 times
    for (let i = 0; i < 3; i++) {
      const specialGroup: string[][] = [];
      for (let j = 0; j < 4; j++) {
        specialGroup.push(teams[teamIndex++]);
      }
      groupTeamsList.push(specialGroup);
    }
  }
  else if (remainingTeams === 4) {
    // Sobram 4 times: criamos um grupo adicional com 4 times
    
    // Primeiro criamos os grupos com 3 times
    for (let i = 0; i < groupCount; i++) {
      const group: string[][] = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Depois criamos o grupo adicional com 4 times
    const specialGroup: string[][] = [];
    for (let j = 0; j < 4; j++) {
      specialGroup.push(teams[teamIndex++]);
    }
    groupTeamsList.push(specialGroup);
  }
  
  // Analyze results
  console.log(`Created ${groupTeamsList.length} groups:`);
  
  groupTeamsList.forEach((group, index) => {
    console.log(`Group ${index + 1}: ${group.length} teams`);
  });
  
  // Check if all teams were included
  console.log(`Teams allocated: ${teamIndex} of ${totalTeams}`);
  
  // Verify if group sizes are as expected
  const groupSizes = groupTeamsList.map(group => group.length);
  console.log('Group sizes:', groupSizes);
  
  // Verify there are no groups with less than 3 teams
  const smallGroups = groupSizes.filter(size => size < 3);
  console.log(`Groups with less than 3 teams: ${smallGroups.length}`);
  
  // Summary
  const groupsOf3 = groupSizes.filter(size => size === 3).length;
  const groupsOf4 = groupSizes.filter(size => size === 4).length;
  console.log(`Summary: ${groupsOf3} groups of 3 teams, ${groupsOf4} groups of 4 teams`);
  
  return {
    totalTeams,
    teamsAllocated: teamIndex,
    groupCount: groupTeamsList.length,
    groupSizes,
    groupsOf3,
    groupsOf4,
    allTeamsIncluded: teamIndex === totalTeams
  };
}

// Run tests with different team counts
console.log('\n=== TEST CASES ===\n');

// Test cases with 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 teams
const testCases = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23];

const results = testCases.map(teamCount => {
  console.log(`\n--- Testing with ${teamCount} teams ---`);
  return testGroupFormation(teamCount);
});

// Validation check
console.log('\n=== VALIDATION SUMMARY ===\n');
const validationErrors = results.filter(r => !r.allTeamsIncluded || r.groupSizes.some(s => s < 3));

if (validationErrors.length === 0) {
  console.log('✅ All test cases passed! Every team was assigned to a group and all groups have at least 3 teams.');
} else {
  console.log('❌ Some test cases failed:');
  validationErrors.forEach(error => {
    console.log(`- Test with ${error.totalTeams} teams: ${error.allTeamsIncluded ? 'All teams included' : 'Some teams not included'}, Group sizes: ${error.groupSizes.join(', ')}`);
  });
}
