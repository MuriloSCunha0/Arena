// Test group formation logic
function testGroupFormation(totalTeams, defaultGroupSize = 3) {
  const teams = Array.from({ length: totalTeams }, (_, i) => [`Team ${i + 1}A`, `Team ${i + 1}B`]);
  
  let groupCount = Math.floor(totalTeams / defaultGroupSize);
  const remainingTeams = totalTeams % defaultGroupSize;
  
  const groupTeamsList = [];
  let teamIndex = 0;
  
  console.log(`Testing with ${totalTeams} teams, defaultGroupSize=${defaultGroupSize}`);
  console.log(`Initial groupCount=${groupCount}, remainingTeams=${remainingTeams}`);
  
  if (remainingTeams === 0) {
    // Perfect case: all groups have exactly defaultGroupSize teams
    for (let i = 0; i < groupCount; i++) {
      const group = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
  } 
  else if (remainingTeams === 1) {
    // 1 team left: create one group with 4 teams
    groupCount--;
    
    // First create groups with 3 teams
    for (let i = 0; i < groupCount; i++) {
      const group = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Then create group with 4 teams
    const specialGroup = [];
    for (let j = 0; j < 4; j++) {
      specialGroup.push(teams[teamIndex++]);
    }
    groupTeamsList.push(specialGroup);
  }
  else if (remainingTeams === 2) {
    // 2 teams left: create two groups with 4 teams
    
    // First create groups with 3 teams
    for (let i = 0; i < groupCount - 2; i++) {
      const group = [];
      for (let j = 0; j < defaultGroupSize; j++) {
        group.push(teams[teamIndex++]);
      }
      groupTeamsList.push(group);
    }
    
    // Then create two groups with 4 teams
    for (let i = 0; i < 2; i++) {
      const specialGroup = [];
      for (let j = 0; j < 4; j++) {
        specialGroup.push(teams[teamIndex++]);
      }
      groupTeamsList.push(specialGroup);
    }
  }
  
  // Analyze results
  console.log(`Created ${groupTeamsList.length} groups:`);
  
  groupTeamsList.forEach((group, index) => {
    console.log(`Group ${index + 1}: ${group.length} teams`);
  });
  
  // Check if all teams were included
  console.log(`Teams allocated: ${teamIndex} of ${totalTeams}`);
  
  // Verify group sizes
  const groupSizes = groupTeamsList.map(group => group.length);
  console.log('Group sizes:', groupSizes);
  
  // Verify there are no groups with less than 2 teams or more than 4 teams
  const invalidSizeGroups = groupSizes.filter(size => size < 2 || size > 4);
  console.log(`Groups with invalid sizes: ${invalidSizeGroups.length}`);
  
  const groupsBelow3 = groupSizes.filter(size => size < 3);
  const groupsAbove4 = groupSizes.filter(size => size > 4);
  
  return {
    totalTeams,
    teamsAllocated: teamIndex,
    groupCount: groupTeamsList.length,
    groupSizes,
    allTeamsIncluded: teamIndex === totalTeams,
    hasInvalidSizes: invalidSizeGroups.length > 0,
    groupsBelow3: groupsBelow3.length,
    groupsAbove4: groupsAbove4.length
  };
}

// Run tests with different team counts
console.log('\n=== TESTING GROUP FORMATION LOGIC ===\n');

const testCases = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const results = testCases.map(teamCount => {
  console.log(`\n--- Testing with ${teamCount} teams ---`);
  return testGroupFormation(teamCount);
});

// Validation check
console.log('\n=== VALIDATION SUMMARY ===\n');

const validationErrors = results.filter(r => 
  !r.allTeamsIncluded || 
  r.hasInvalidSizes || 
  r.groupsBelow3 > 1 || // Allow at most 1 group below 3 teams
  r.groupsAbove4 > 0    // No groups above 4 teams
);

if (validationErrors.length === 0) {
  console.log('✅ All test cases passed! Groups follow Beach Tennis rules.');
  console.log('- All teams are included');
  console.log('- All groups have 2-4 teams');
  console.log('- At most 1 group has less than 3 teams');
} else {
  console.log('❌ Some test cases failed:');
  validationErrors.forEach(error => {
    console.log(`- Test with ${error.totalTeams} teams:`);
    console.log(`  - All teams included: ${error.allTeamsIncluded}`);
    console.log(`  - Invalid sizes: ${error.hasInvalidSizes}`);
    console.log(`  - Groups below 3: ${error.groupsBelow3}`);
    console.log(`  - Groups above 4: ${error.groupsAbove4}`);
    console.log(`  - Group sizes: ${error.groupSizes.join(', ')}`);
  });
}

console.log('\n=== DETAILED RESULTS ===\n');
results.forEach(result => {
  console.log(`${result.totalTeams} teams → ${result.groupCount} groups (${result.groupSizes.join(', ')}) - ${result.allTeamsIncluded ? '✅' : '❌'}`);
});
