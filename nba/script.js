document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('picks-table-body');
  const leaderboardList = document.getElementById('leaderboard-list');
  const knicksPPGEl = document.getElementById('knicks-avg-ppg');
  const spursPPGEl = document.getElementById('spurs-avg-ppg');
  const scoreBadgeEl = document.getElementById('live-series-score');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let allPicksData = [];

  // Fetch picks data
  async function fetchPicks() {
    try {
      const response = await fetch('/api/picks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      allPicksData = data.picks || [];
      
      // Update UI components
      updateMatchupStats(data.matchup);
      updateLeaderboard(data.leaderboard);
      renderTable(allPicksData);
    } catch (error) {
      console.error('Failed to fetch picks:', error);
      showErrorState(error.message);
    }
  }

  // Update Matchup card stats
  function updateMatchupStats(matchup) {
    if (!matchup) return;
    knicksPPGEl.textContent = matchup.team1AvgPPG || '0.0';
    spursPPGEl.textContent = matchup.team2AvgPPG || '0.0';
    
    // Update live series score in header
    const scoreBadgeText = scoreBadgeEl.querySelector('.series-score');
    if (scoreBadgeText && matchup.knicksWins !== undefined && matchup.spursWins !== undefined) {
      scoreBadgeText.textContent = `${matchup.knicksWins} - ${matchup.spursWins}`;
    }
    
    console.log(`Knicks picks: ${matchup.team1PicksCount}, Spurs picks: ${matchup.team2PicksCount}`);
  }

  // Update Leaderboard rankings
  function updateLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      leaderboardList.innerHTML = '<div class="loading-placeholder">No standings available.</div>';
      return;
    }

    leaderboardList.innerHTML = '';
    leaderboard.forEach((item, index) => {
      const rank = index + 1;
      let rankClass = 'other-rank';
      if (rank === 1) rankClass = 'top-rank';
      else if (rank === 2) rankClass = 'secondary-rank';

      const rowHtml = `
        <div class="leaderboard-item">
          <div class="rank-details">
            <span class="rank-num ${rankClass}">${rank}</span>
            <div class="rank-meta">
              <span class="rank-name">${escapeHtml(item.name)}</span>
              <span class="rank-pick-sub">Picked ${escapeHtml(item.team)}</span>
            </div>
          </div>
          <div class="rank-stats">
            <span class="rank-pts">${item.points} pts</span>
            <span class="rank-streak">Streak: ${item.streak}</span>
          </div>
        </div>
      `;
      leaderboardList.insertAdjacentHTML('beforeend', rowHtml);
    });
  }

  // Render Table rows
  function renderTable(picks) {
    if (picks.length === 0) {
      tableBody.innerHTML = '<div class="loading-placeholder">No picks submitted yet.</div>';
      return;
    }

    tableBody.innerHTML = '';
    picks.forEach(pick => {
      // Format Predicted PPG details
      let ppgDisplay = '—';
      if (pick.avgPpgKnicks > 0 && pick.avgPpgSpurs > 0) {
        ppgDisplay = `${pick.avgPpgKnicks} NYK - ${pick.avgPpgSpurs} SAS`;
      } else if (pick.avgPpgKnicks > 0) {
        ppgDisplay = `${pick.avgPpgKnicks} NYK`;
      } else if (pick.avgPpgSpurs > 0) {
        ppgDisplay = `${pick.avgPpgSpurs} SAS`;
      }

      const rowHtml = `
        <div class="table-row">
          <div class="col-name">${escapeHtml(pick.name)}</div>
          <div class="col-pick">
            <span class="pick-badge badge-${escapeHtml(pick.team)}">${escapeHtml(pick.team)}</span>
          </div>
          <div class="col-length">${pick.seriesLength ? `${pick.seriesLength} Games` : '—'}</div>
          <div class="col-ppg">${ppgDisplay}</div>
          <div class="col-notes">${escapeHtml(pick.notes) || '—'}</div>
        </div>
      `;
      tableBody.insertAdjacentHTML('beforeend', rowHtml);
    });
  }

  // Filter functionality
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active button class
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');
      if (filterVal === 'all') {
        renderTable(allPicksData);
      } else {
        const filteredPicks = allPicksData.filter(p => p.team === filterVal);
        renderTable(filteredPicks);
      }
    });
  });

  // Display error state in place of loading
  function showErrorState(msg) {
    const errorHtml = `<div class="loading-placeholder" style="color: var(--color-accent-red)">Error loading data: ${escapeHtml(msg)}</div>`;
    tableBody.innerHTML = errorHtml;
    leaderboardList.innerHTML = errorHtml;
  }

  // Simple HTML Escaper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Fetch
  fetchPicks();
});
